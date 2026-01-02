import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  SendMessageCommand,
  Message,
} from "@aws-sdk/client-sqs";
import { plainToInstance } from "class-transformer";
import { validateOrReject } from "class-validator";
import { randomUUID } from "crypto";
import {
  UnifiedJobMessageDto,
  LambdaProxyMessageDto,
} from "../dto/unified-job-message.dto";
import { SourceMessageDto } from "../dto/source-message.dto";
import { ExecutionType } from "../../../common/enums";
import { JobService } from "../job.service";
import { JobCreationMode } from "../dto/create-job.dto";
import { AWS_SQS_CLIENT } from "../../../infra/aws/aws-clients.module";

/**
 * Queue Configuration Interface
 */
interface QueueConfig {
  queueUrl: string;
  maxMessages: number;
  visibilityTimeout: number;
  enabled: boolean;
}

/**
 * Multi-Queue Polling Service
 * @description Polls multiple source queues (crypto.fifo, ox.fifo) and forwards messages to jobs-main.fifo
 */
@Injectable()
export class MultiQueuePollingService {
  private readonly logger = new Logger(MultiQueuePollingService.name);
  private readonly mainQueueUrl: string;

  constructor(
    private readonly configService: ConfigService,
    @Inject(AWS_SQS_CLIENT) private readonly sqsClient: SQSClient,
    private readonly jobService: JobService
  ) {
    this.mainQueueUrl =
      this.configService.get<string>("aws.sqs.queueUrl") || "";
  }

  /**
   * Poll specific source queue and forward messages to jobs-main.fifo
   * @param queueName Queue name ('crypto' or 'ox')
   * @param limit Optional limit (overrides config)
   * @returns Number of messages processed
   */
  async pollQueue(queueName: string, limit?: number): Promise<number> {
    const startTime = Date.now();

    try {
      // 1. Get queue configuration
      const queueConfig = this.getQueueConfig(queueName);

      if (!queueConfig.enabled) {
        this.logger.warn(`Queue "${queueName}" is disabled in configuration`);
        return 0;
      }

      if (!queueConfig.queueUrl) {
        this.logger.warn(`Queue URL not configured for "${queueName}"`);
        return 0;
      }

      // 2. Receive messages from source queue
      const maxMessages =
        limit !== undefined ? Math.min(limit, 10) : queueConfig.maxMessages;
      const messages = await this.receiveMessages(queueConfig, maxMessages);

      if (messages.length === 0) {
        this.logger.log({
          event: "queue_poll_completed",
          queueName,
          messagesReceived: 0,
          messagesForwarded: 0,
          messagesFailed: 0,
          durationMs: Date.now() - startTime,
        });
        return 0;
      }

      this.logger.log(`[${queueName}] Received ${messages.length} messages`);

      // 3. Process each message
      let forwarded = 0;
      let failed = 0;

      for (const sqsMessage of messages) {
        try {
          // 4. Parse and validate message
          const sourceMessage = await this.parseAndValidateMessage(sqsMessage);

          // 5. Transform to unified format
          const unifiedMessage = this.transformMessage(
            sourceMessage,
            queueName
          );

          // 6. Forward to jobs-main.fifo
          await this.forwardToMainQueue(unifiedMessage);

          // 7. Delete from source queue (success)
          await this.deleteMessage(
            queueConfig.queueUrl,
            sqsMessage.ReceiptHandle!
          );

          forwarded++;
          this.logger.log(
            `[${queueName}] Forwarded msgId=${sqsMessage.MessageId}`
          );
        } catch (error) {
          failed++;
          this.logger.error({
            event: "message_forward_failed",
            queueName,
            messageId: sqsMessage.MessageId,
            error: error instanceof Error ? error.message : String(error),
          });

          // 8. Save to DB on failure (never lose messages)
          await this.saveFailedMessage(
            sqsMessage,
            queueName,
            error instanceof Error ? error.message : String(error)
          );
        }
      }

      // 8. Log completion
      const durationMs = Date.now() - startTime;
      this.logger.log({
        event: "queue_poll_completed",
        queueName,
        messagesReceived: messages.length,
        messagesForwarded: forwarded,
        messagesFailed: failed,
        durationMs,
      });

      return forwarded;
    } catch (error) {
      this.logger.error({
        event: "queue_poll_error",
        queueName,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get queue configuration by name
   * @param queueName Queue name
   * @returns Queue configuration
   */
  private getQueueConfig(queueName: string): QueueConfig {
    const config =
      this.configService.get<Record<string, QueueConfig>>(
        "aws.sqs.sourceQueues"
      ) || {};

    if (!config[queueName]) {
      throw new Error(`Queue "${queueName}" not found in configuration`);
    }

    return config[queueName];
  }

  /**
   * Receive messages from SQS queue
   * @param queueConfig Queue configuration
   * @param maxMessages Maximum number of messages to receive
   * @returns Array of SQS messages
   */
  private async receiveMessages(
    queueConfig: QueueConfig,
    maxMessages: number
  ): Promise<Message[]> {
    const command = new ReceiveMessageCommand({
      QueueUrl: queueConfig.queueUrl,
      MaxNumberOfMessages: Math.min(maxMessages, 10), // SQS limit
      VisibilityTimeout: queueConfig.visibilityTimeout,
      WaitTimeSeconds: 0, // Short polling (can be increased for long polling)
    });

    const response = await this.sqsClient.send(command);
    return response.Messages || [];
  }

  /**
   * Parse and validate SQS message body
   * @param sqsMessage SQS message
   * @returns Validated SourceMessageDto
   */
  private async parseAndValidateMessage(
    sqsMessage: Message
  ): Promise<SourceMessageDto> {
    try {
      // Parse JSON body
      const rawData = sqsMessage.Body ? JSON.parse(sqsMessage.Body) : {};

      // Transform to DTO instance
      const sourceMessage = plainToInstance(SourceMessageDto, rawData);

      // Validate (will throw if validation fails)
      await validateOrReject(sourceMessage);

      return sourceMessage;
    } catch (error) {
      // If JSON parse or validation fails, create a minimal DTO
      this.logger.warn({
        event: "message_validation_failed",
        messageId: sqsMessage.MessageId,
        error: error instanceof Error ? error.message : String(error),
      });

      // Return minimal DTO with raw body
      return plainToInstance(SourceMessageDto, {
        rawBody: sqsMessage.Body,
        body: {},
      });
    }
  }

  /**
   * Transform source message to UnifiedJobMessageDto
   * @param sourceMessage Validated source message
   * @param queueName Source queue name
   * @returns Unified job message
   */
  private transformMessage(
    sourceMessage: SourceMessageDto,
    queueName: string
  ): UnifiedJobMessageDto {
    const timestamp = Date.now();

    const lambdaProxyMessage = this.buildLambdaProxyMessage(sourceMessage);

    // Determine execution type (priority: direct field > nested > default)
    const executionType =
      sourceMessage.executionType ||
      sourceMessage.execution?.type ||
      ExecutionType.REST_API;

    return {
      lambdaProxyMessage,
      execution: {
        type: executionType,
        baseUrl: sourceMessage.baseUrl || sourceMessage.execution?.baseUrl,
        functionName:
          sourceMessage.functionName || sourceMessage.execution?.functionName,
        functionUrl:
          sourceMessage.functionUrl || sourceMessage.execution?.functionUrl,
        invocationType:
          sourceMessage.invocationType ||
          sourceMessage.execution?.invocationType,
      },
      metadata: {
        jobId: sourceMessage.jobId || randomUUID(),
        appId: sourceMessage.appId || sourceMessage.metadata?.appId,
        messageGroupId:
          sourceMessage.messageGroupId ||
          sourceMessage.metadata?.messageGroupId ||
          queueName,
        idempotencyKey:
          sourceMessage.idempotencyKey ||
          sourceMessage.metadata?.idempotencyKey ||
          `${queueName}-${timestamp}-${randomUUID()}`,
        createdAt: new Date().toISOString(),
        retryCount:
          sourceMessage.retryCount || sourceMessage.metadata?.retryCount || 0,
      },
    };
  }

  private buildLambdaProxyMessage(
    sourceMessage: SourceMessageDto
  ): LambdaProxyMessageDto {
    const providedMessage = sourceMessage.lambdaProxyMessage;

    const path =
      providedMessage?.path ||
      sourceMessage.path ||
      sourceMessage.requestContext?.path ||
      "/";

    const httpMethod =
      providedMessage?.httpMethod ||
      sourceMessage.httpMethod ||
      sourceMessage.method ||
      "POST";

    const resource =
      providedMessage?.resource ||
      sourceMessage.resource ||
      sourceMessage.requestContext?.resourcePath ||
      "/{proxy+}";

    const headers = this.resolveHeaders(
      providedMessage?.headers || sourceMessage.headers
    );

    const pathParameters = providedMessage?.pathParameters ||
      sourceMessage.pathParameters || {
        proxy: path.replace(/^\//, ""),
      };

    return {
      body: this.resolveBody(
        providedMessage?.body ?? sourceMessage.body,
        sourceMessage.rawBody
      ),
      resource,
      path,
      httpMethod,
      isBase64Encoded:
        providedMessage?.isBase64Encoded ??
        sourceMessage.isBase64Encoded ??
        false,
      pathParameters,
      queryStringParameters:
        providedMessage?.queryStringParameters ??
        sourceMessage.queryStringParameters,
      headers,
      requestContext: providedMessage?.requestContext ?? {
        path,
        resourcePath: resource,
        httpMethod,
      },
    };
  }

  private resolveBody(
    body: string | Record<string, unknown> | null | undefined,
    rawBody?: string
  ): string | null {
    if (typeof body === "string") {
      return body;
    }

    if (body && typeof body === "object") {
      return JSON.stringify(body);
    }

    if (rawBody) {
      return rawBody;
    }

    return null;
  }

  private resolveHeaders(
    headers?: Record<string, string>
  ): Record<string, string> {
    if (headers && Object.keys(headers).length > 0) {
      return headers;
    }

    return {
      "Content-Type": "application/json",
    };
  }

  /**
   * Forward unified message to jobs-main.fifo
   * @param message Unified job message
   */
  private async forwardToMainQueue(
    message: UnifiedJobMessageDto
  ): Promise<void> {
    if (!this.mainQueueUrl) {
      throw new Error("Main queue URL not configured (AWS_SQS_QUEUE_URL)");
    }

    const command = new SendMessageCommand({
      QueueUrl: this.mainQueueUrl,
      MessageBody: JSON.stringify(message),
      MessageGroupId: message.metadata.messageGroupId,
      MessageDeduplicationId: message.metadata.idempotencyKey,
    });

    await this.sqsClient.send(command);
  }

  /**
   * Delete message from source queue
   * @param queueUrl Source queue URL
   * @param receiptHandle Message receipt handle
   */
  private async deleteMessage(
    queueUrl: string,
    receiptHandle: string
  ): Promise<void> {
    const command = new DeleteMessageCommand({
      QueueUrl: queueUrl,
      ReceiptHandle: receiptHandle,
    });

    await this.sqsClient.send(command);
  }

  /**
   * Save failed message to database for retry
   * @param sqsMessage Original SQS message
   * @param queueName Source queue name
   * @param error Error message
   */
  private async saveFailedMessage(
    sqsMessage: Message,
    queueName: string,
    error: string
  ): Promise<void> {
    try {
      // Parse and validate message (with fallback)
      const sourceMessage = await this.parseAndValidateMessage(sqsMessage);

      // Transform to unified format
      const unifiedMessage = this.transformMessage(sourceMessage, queueName);

      // Save to DB using JobService (DB-only mode)
      await this.jobService.createUnifiedJob({
        appId: unifiedMessage.metadata.appId,
        message: unifiedMessage,
        mode: JobCreationMode.DB, // DB-only mode for failed messages
      });

      this.logger.log({
        event: "failed_message_saved_to_db",
        queueName,
        messageId: sqsMessage.MessageId,
        error,
      });
    } catch (dbError) {
      this.logger.error({
        event: "failed_to_save_message_to_db",
        queueName,
        messageId: sqsMessage.MessageId,
        originalError: error,
        dbError: dbError instanceof Error ? dbError.message : String(dbError),
      });
      // Message will remain in SQS for retry (visibility timeout)
    }
  }
}
