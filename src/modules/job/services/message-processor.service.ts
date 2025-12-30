import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  InvocationType,
  LambdaClient,
  InvokeCommand,
} from '@aws-sdk/client-lambda';
import {
  SchedulerClient,
  CreateScheduleCommand,
} from '@aws-sdk/client-scheduler';
import { UnifiedJobMessageDto } from '../dto/unified-job-message.dto';
import { ExecutionType } from '@common/enums';
import axios from 'axios';
import { SignatureV4 } from '@aws-sdk/signature-v4';
import { Sha256 } from '@aws-crypto/sha256-js';
import { HttpRequest } from '@smithy/protocol-http';
import {
  AWS_LAMBDA_CLIENT,
  AWS_SCHEDULER_CLIENT,
} from '../../../infra/aws/aws-clients.module';

/**
 * Message Processor Service
 * @description Processes unified job messages without DB dependencies
 * @note Stateless service for fast Lambda cold starts
 * @important NO database connections - pure execution logic only
 */
@Injectable()
export class MessageProcessorService {
  private readonly logger = new Logger(MessageProcessorService.name);

  constructor(
    @Inject(AWS_LAMBDA_CLIENT)
    private readonly lambdaClient: LambdaClient,
    @Inject(AWS_SCHEDULER_CLIENT)
    private readonly schedulerClient: SchedulerClient,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Process unified job message
   * @param message - Unified job message
   * @throws Error if execution fails (caller handles retry logic)
   */
  async processMessage(message: UnifiedJobMessageDto): Promise<void> {
    const { execution } = message;

    this.logger.log(
      `Processing message: jobId=${message.metadata.jobId}, type=${execution.type}`,
    );

    switch (execution.type) {
      case ExecutionType.LAMBDA_INVOKE:
        await this.executeLambdaInvoke(message);
        return;

      case ExecutionType.LAMBDA_URL:
        await this.executeLambdaUrl(message);
        return;

      case ExecutionType.REST_API:
        await this.executeRestApi(message);
        return;

      case ExecutionType.SCHEDULE:
        await this.executeSchedule(message);
        return;

      default:
        throw new Error(`Unknown execution type: ${execution.type}`);
    }
  }

  /**
   * Execute Lambda invoke (AWS SDK)
   * @private
   */
  private async executeLambdaInvoke(
    message: UnifiedJobMessageDto,
  ): Promise<void> {
    const { execution, lambdaProxyMessage } = message;

    if (!execution.functionName) {
      throw new Error('functionName is required for lambda-invoke');
    }

    const invocationType: InvocationType =
      execution.invocationType ?? InvocationType.Event;

    const command = new InvokeCommand({
      FunctionName: execution.functionName,
      InvocationType: invocationType,
      Payload: Buffer.from(JSON.stringify(lambdaProxyMessage)),
    });

    const response = await this.lambdaClient.send(command);

    if (response.StatusCode !== 202 && response.StatusCode !== 200) {
      throw new Error(
        `Lambda invoke failed: StatusCode=${response.StatusCode}, ` +
          `FunctionError=${response.FunctionError}`,
      );
    }

    this.logger.log(`Lambda invoked successfully: ${execution.functionName}`);
  }

  /**
   * Execute Lambda Function URL with SigV4
   * @private
   */
  private async executeLambdaUrl(
    message: UnifiedJobMessageDto,
  ): Promise<void> {
    const { execution, lambdaProxyMessage } = message;

    if (!execution.functionUrl) {
      throw new Error('functionUrl is required for lambda-url');
    }

    // Parse URL
    const url = new URL(execution.functionUrl);
    const fullPath = lambdaProxyMessage.path.startsWith('/')
      ? lambdaProxyMessage.path
      : `/${lambdaProxyMessage.path}`;
    const body = lambdaProxyMessage.body || '';

    // Create HTTP request for signing
    const request = new HttpRequest({
      method: lambdaProxyMessage.httpMethod,
      protocol: url.protocol,
      hostname: url.hostname,
      path: fullPath,
      headers: {
        ...lambdaProxyMessage.headers,
        host: url.hostname,
      },
      body,
    });

    // Sign request with SigV4
    const signer = new SignatureV4({
      service: 'lambda',
      region: this.configService.get<string>('aws.lambda.region') || 'ap-northeast-2',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
      sha256: Sha256,
    });

    const signedRequest = await signer.sign(request);

    // Execute HTTP request
    await axios({
      method: lambdaProxyMessage.httpMethod,
      url: execution.functionUrl.replace(/\/$/, '') + fullPath,
      data: body ? JSON.parse(body) : undefined,
      headers: signedRequest.headers as Record<string, string>,
      timeout: 30000,
      validateStatus: (status) => status >= 200 && status < 300,
    });

    this.logger.log(`Lambda URL invoked successfully: ${execution.functionUrl}`);
  }

  /**
   * Execute REST API call
   * @private
   */
  private async executeRestApi(message: UnifiedJobMessageDto): Promise<void> {
    const { execution, lambdaProxyMessage } = message;

    if (!execution.baseUrl) {
      throw new Error('baseUrl is required for rest-api');
    }

    const fullPath = lambdaProxyMessage.path.startsWith('/')
      ? lambdaProxyMessage.path
      : `/${lambdaProxyMessage.path}`;
    const url = `${execution.baseUrl.replace(/\/$/, '')}${fullPath}`;
    const body = lambdaProxyMessage.body
      ? JSON.parse(lambdaProxyMessage.body)
      : undefined;

    await axios({
      method: lambdaProxyMessage.httpMethod,
      url,
      data: body,
      headers: lambdaProxyMessage.headers,
      timeout: 30000,
      validateStatus: (status) => status >= 200 && status < 300,
    });

    this.logger.log(`REST API called successfully: ${url}`);
  }

  /**
   * Create EventBridge Schedule
   * @private
   */
  private async executeSchedule(
    message: UnifiedJobMessageDto,
  ): Promise<void> {
    const { execution, metadata } = message;

    if (!execution.scheduleExpression || !execution.targetJob) {
      throw new Error(
        'scheduleExpression and targetJob are required for schedule',
      );
    }

    const scheduleName = `job-${metadata.jobId}-${Date.now()}`;
    const roleArn = this.configService.get<string>('aws.scheduler.roleArn');
    const targetUrl = this.configService.get<string>('aws.scheduler.targetUrl');

    if (!roleArn) {
      throw new Error('aws.scheduler.roleArn not configured');
    }

    if (!targetUrl) {
      throw new Error('aws.scheduler.targetUrl not configured');
    }

    // Create schedule
    const command = new CreateScheduleCommand({
      Name: scheduleName,
      ScheduleExpression: execution.scheduleExpression,
      Target: {
        Arn: targetUrl, // HTTP endpoint ARN (API Gateway or Lambda Function URL)
        RoleArn: roleArn,
        Input: JSON.stringify(execution.targetJob),
      },
      FlexibleTimeWindow: {
        Mode: 'OFF',
      },
      Description: `Scheduled job: ${metadata.jobId}`,
    });

    const response = await this.schedulerClient.send(command);
    this.logger.log(
      `Schedule created: ${scheduleName}, ARN: ${response.ScheduleArn}`,
    );
  }
}
