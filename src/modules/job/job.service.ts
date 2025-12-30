import { Injectable, Logger, NotFoundException, Inject } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { EntityManager } from 'typeorm';
import { SQSClient, SendMessageCommand, ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';
import { JobRepository } from './repositories/job.repository';
import { AppRepository } from '../platform/repositories/app.repository';
import { JobEntity } from '../../database/entities/job.entity';
import { JobType, JobStatus, ExecutionType } from '../../common/enums';
import { buildCanonicalString, signRequest } from '../../common/utils/hmac.util';
import axios from 'axios';
import { JsonObject } from '@common/types/json-value.type';
import { AppEntity } from '../../database/entities/app.entity';
import { MessageProcessorService } from './services/message-processor.service';
import {
  ExecutionConfigDto,
  JobMetadataDto,
  LambdaProxyMessageDto,
  UnifiedJobMessageDto,
} from './dto/unified-job-message.dto';
import { CreateUnifiedJobDto, JobCreationMode } from './dto/create-job.dto';
import { AWS_SQS_CLIENT } from '../../infra/aws/aws-clients.module';
import { randomUUID } from 'crypto';
import { instanceToPlain, plainToInstance } from 'class-transformer';

type CallbackJobPayload = {
  method: string;
  path: string;
  body?: JsonObject;
  headers?: Record<string, string>;
  expectedStatuses: number[];
  hmacSignature: string;
  hmacTimestamp: number;
};

/**
 * Job Service
 * @description Handles asynchronous job creation and execution with retry logic
 */
@Injectable()
export class JobService {
  private readonly logger = new Logger(JobService.name);

  constructor(
    private readonly jobRepository: JobRepository,
    private readonly appRepository: AppRepository,
    private readonly messageProcessor: MessageProcessorService,
    private readonly configService: ConfigService,
    @Inject(AWS_SQS_CLIENT)
    private readonly sqsClient: SQSClient,
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
  ) {}

  /**
   * Create HTTP callback job
   * @param appId - App UUID
   * @param payload - Job payload (method, path, body, headers, expectedStatuses)
   * @param idempotencyKey - Optional idempotency key
   * @returns Created job entity
   * @example
   * createCallbackJob(appId, {
   *   method: 'POST',
   *   path: '/v1/callbacks/reward',
   *   body: { userId: '123', amount: '1000' },
   *   headers: {},
   *   expectedStatuses: [200, 201]
   * })
   */
  async createCallbackJob(
    appId: string,
    payload: {
      method: string;
      path: string;
      body?: JsonObject;
      headers?: Record<string, string>;
      expectedStatuses?: number[];
    },
    idempotencyKey?: string,
  ): Promise<JobEntity> {
    return this.entityManager.transaction(async (manager) => {
      // Get app to retrieve callback settings
      const app = await this.appRepository.findById(appId, manager);
      if (!app) {
        throw new NotFoundException(`App ${appId} not found`);
      }

      if (!app.callbackBaseUrl || !app.callbackSecretRef) {
        throw new Error('App callback configuration incomplete');
      }

      // Generate HMAC signature for the callback
      const timestamp = Math.floor(Date.now() / 1000);
      const canonical = buildCanonicalString(
        payload.method,
        payload.path,
        payload.body,
        timestamp,
      );
      const signature = signRequest(app.callbackSecretRef, canonical);

      // Store signature in payload for reuse
      const jobPayload: CallbackJobPayload = {
        ...payload,
        hmacSignature: signature,
        hmacTimestamp: timestamp,
        expectedStatuses: payload.expectedStatuses || [200, 201],
      };

      // Create job
      return this.jobRepository.create(
        {
          appId,
          type: JobType.CALLBACK_HTTP,
          payload: jobPayload,
          maxRetries: 10,
          nextRetryAt: new Date(),
        },
        manager,
      );
    });
  }

  /**
   * Run due jobs (called by scheduler)
   * @param limit - Maximum jobs to process
   * @returns Number of jobs processed
   */
  async runDueJobs(limit: number = 100): Promise<number> {
    return this.entityManager.transaction(async (manager) => {
      // Get due jobs with SELECT FOR UPDATE SKIP LOCKED
      const jobs = await this.jobRepository.getDueJobsForUpdate(limit, manager);

      this.logger.log(`Processing ${jobs.length} due jobs`);

      let processed = 0;
      for (const job of jobs) {
        try {
          await this.executeJob(job, manager);
          processed++;
        } catch (error) {
          this.logger.error(
            `Failed to execute job ${job.id}: ${error.message}`,
            error.stack,
          );
        }
      }

      return processed;
    });
  }

  /**
   * Execute single job
   * @param job - Job entity
   * @param manager - Transaction manager
   */
  private async executeJob(
    job: JobEntity,
    manager: EntityManager,
  ): Promise<void> {
    const app = await this.appRepository.findById(job.appId, manager);
    if (!app) {
      throw new Error(`App ${job.appId} not found`);
    }

    if (job.type === JobType.CALLBACK_HTTP) {
      await this.executeHttpCallback(job, app, manager);
    } else {
      throw new Error(`Unknown job type: ${job.type}`);
    }
  }

  /**
   * Execute HTTP callback job
   */
  private async executeHttpCallback(
    job: JobEntity,
    app: AppEntity,
    manager: EntityManager,
  ): Promise<void> {
    const {
      method,
      path,
      body,
      headers,
      hmacSignature,
      hmacTimestamp,
      expectedStatuses,
    } = job.payload as CallbackJobPayload;

    const url = `${app.callbackBaseUrl}${path}`;

    try {
      const response = await axios({
        method,
        url,
        data: body,
        headers: {
          ...headers,
          'Content-Type': 'application/json',
          'X-HMAC-Signature': hmacSignature,
          'X-HMAC-Timestamp': hmacTimestamp.toString(),
        },
        timeout: 30000,
        validateStatus: (status) => expectedStatuses.includes(status),
      });

      // Success
      this.logger.log(`Job ${job.id} completed successfully`);
      await this.jobRepository.update(
        job.id,
        {
          status: JobStatus.SUCCEEDED,
          nextRetryAt: null,
          lastError: null,
        },
        manager,
      );
    } catch (error) {
      // Retry logic
      const retryCount = job.retryCount + 1;
      const errorMessage = error.response?.data?.message || error.message;

      if (retryCount >= job.maxRetries) {
        // Max retries reached - mark as FAILED
        this.logger.error(`Job ${job.id} failed after ${retryCount} retries`);
        await this.jobRepository.update(
          job.id,
          {
            status: JobStatus.FAILED,
            retryCount,
            nextRetryAt: null,
            lastError: errorMessage,
          },
          manager,
        );
      } else {
        // Schedule retry with exponential backoff
        const delaySeconds = Math.min(Math.pow(2, retryCount) * 60, 86400); // Cap at 24h
        const nextRetryAt = new Date(Date.now() + delaySeconds * 1000);

        this.logger.warn(
          `Job ${job.id} retry ${retryCount}/${job.maxRetries} scheduled for ${nextRetryAt}`,
        );
        await this.jobRepository.update(
          job.id,
          {
            retryCount,
            nextRetryAt,
            lastError: errorMessage,
          },
          manager,
        );
      }
    }
  }

  /**
   * Get job by ID
   * @param jobId - Job UUID
   * @returns Job entity
   */
  async getJob(jobId: string): Promise<JobEntity> {
    const job = await this.jobRepository.findById(jobId);
    if (!job) {
      throw new NotFoundException(`Job ${jobId} not found`);
    }
    return job;
  }

  /**
   * Retry failed job (admin operation)
   * @param jobId - Job UUID
   * @returns Updated job entity
   */
  async retryJob(jobId: string): Promise<JobEntity> {
    return this.entityManager.transaction(async (manager) => {
      const job = await this.jobRepository.findById(jobId, manager);
      if (!job) {
        throw new NotFoundException(`Job ${jobId} not found`);
      }

      await this.jobRepository.update(
        jobId,
        {
          status: JobStatus.PENDING,
          retryCount: 0,
          nextRetryAt: new Date(),
          lastError: null,
        },
        manager,
      );

      return this.jobRepository.findById(jobId, manager);
    });
  }

  /**
   * Mark job as dead letter (admin operation)
   * @param jobId - Job UUID
   * @returns Updated job entity
   */
  async deadletterJob(jobId: string): Promise<JobEntity> {
    return this.entityManager.transaction(async (manager) => {
      const job = await this.jobRepository.findById(jobId, manager);
      if (!job) {
        throw new NotFoundException(`Job ${jobId} not found`);
      }

      await this.jobRepository.update(
        jobId,
        {
          status: JobStatus.DEAD,
          nextRetryAt: null,
        },
        manager,
      );

      return this.jobRepository.findById(jobId, manager);
    });
  }

  // ========== Unified Job System Methods ==========

  /**
   * Create unified job (supports SQS, DB, or both)
   * @param dto - Create unified job DTO
   * @returns Created job entity or null (SQS-only mode)
   */
  async createUnifiedJob(dto: CreateUnifiedJobDto): Promise<JobEntity | null> {
    const mode = dto.mode || JobCreationMode.BOTH;
    const jobId = randomUUID();

    // Set metadata
    dto.message.metadata.jobId = jobId;
    dto.message.metadata.appId = dto.appId;
    dto.message.metadata.messageGroupId = dto.message.execution.type;
    dto.message.metadata.createdAt = new Date().toISOString();
    dto.message.metadata.retryCount = 0;

    switch (mode) {
      case JobCreationMode.DB:
        return this.createJobInDb(dto.message);

      case JobCreationMode.SQS:
        await this.sendToSqs(dto.message);
        return null;

      case JobCreationMode.BOTH:
        return this.entityManager.transaction(async (manager) => {
          const job = await this.createJobInDb(dto.message, manager);
          await this.sendToSqs(dto.message);
          return job;
        });

      default:
        throw new Error(`Unknown job creation mode: ${mode}`);
    }
  }

  /**
   * Poll SQS and process messages
   * @param limit - Maximum messages to process (max 10)
   * @returns Number of messages processed
   */
  async pollAndProcessSqs(limit: number = 10): Promise<number> {
    const queueUrl = this.configService.get<string>('aws.sqs.queueUrl');
    if (!queueUrl) {
      throw new Error('aws.sqs.queueUrl not configured');
    }

    const command = new ReceiveMessageCommand({
      QueueUrl: queueUrl,
      MaxNumberOfMessages: Math.min(limit, 10),
      WaitTimeSeconds: 0,
      VisibilityTimeout: 300,
    });

    const response = await this.sqsClient.send(command);
    const messages = response.Messages || [];

    this.logger.log(`Received ${messages.length} messages from SQS`);

    let processed = 0;
    for (const sqsMessage of messages) {
      try {
        const message: UnifiedJobMessageDto = JSON.parse(sqsMessage.Body || '{}');

        // Process message
        await this.messageProcessor.processMessage(message);

        // Success - delete from SQS
        await this.sqsClient.send(new DeleteMessageCommand({
          QueueUrl: queueUrl,
          ReceiptHandle: sqsMessage.ReceiptHandle,
        }));

        this.logger.log(`SQS message processed successfully: jobId=${message.metadata.jobId}`);
        processed++;
      } catch (error) {
        this.logger.error(
          `Failed to process SQS message: ${error.message}`,
          error.stack,
        );

        // Parse message for DB save
        try {
          const message: UnifiedJobMessageDto = JSON.parse(sqsMessage.Body || '{}');
          await this.saveFailedJobToDb(message, error.message);
        } catch (parseError) {
          this.logger.error('Failed to save failed job to DB', parseError.stack);
        }
        // Keep message in SQS (visibility timeout will make it available again)
      }
    }

    return processed;
  }

  /**
   * Run due DB jobs (called by scheduler)
   * @param limit - Maximum jobs to process
   * @returns Number of jobs processed
   */
  async runDueDbJobs(limit: number = 100): Promise<number> {
    return this.entityManager.transaction(async (manager) => {
      const jobs = await this.jobRepository.getDueJobsForUpdate(limit, manager);

      this.logger.log(`Processing ${jobs.length} due DB jobs`);

      let processed = 0;
      for (const job of jobs) {
        try {
          // Convert DB job to unified message
          const message = this.dbJobToMessage(job);

          // Process message
          await this.messageProcessor.processMessage(message);

          // Success
          await this.jobRepository.update(
            job.id,
            {
              status: JobStatus.SUCCEEDED,
              nextRetryAt: null,
              lastError: null,
            },
            manager,
          );

          this.logger.log(`DB job ${job.id} completed successfully`);
          processed++;
        } catch (error) {
          // Retry logic
          const retryCount = job.retryCount + 1;

          if (retryCount >= job.maxRetries) {
            // Max retries reached
            this.logger.error(`DB job ${job.id} failed after ${retryCount} retries`);
            await this.jobRepository.update(
              job.id,
              {
                status: JobStatus.FAILED,
                retryCount,
                nextRetryAt: null,
                lastError: error.message,
              },
              manager,
            );
          } else {
            // Schedule retry with exponential backoff
            const nextRetryAt = this.calculateNextRetry(retryCount);

            this.logger.warn(
              `DB job ${job.id} retry ${retryCount}/${job.maxRetries} scheduled for ${nextRetryAt}`,
            );
            await this.jobRepository.update(
              job.id,
              {
                status: JobStatus.RETRYING,
                retryCount,
                nextRetryAt,
                lastError: error.message,
              },
              manager,
            );
          }
        }
      }

      return processed;
    });
  }

  /**
   * Process scheduled message (called by EventBridge Schedule)
   * @param message - Unified job message
   */
  async processScheduledMessage(message: UnifiedJobMessageDto): Promise<void> {
    try {
      // Process the targetJob from schedule
      await this.messageProcessor.processMessage(message);

      // TODO: Delete EventBridge Schedule after success
      // if (message.metadata.scheduleArn) {
      //   await schedulerClient.send(new DeleteScheduleCommand({
      //     Name: extractScheduleNameFromArn(message.metadata.scheduleArn)
      //   }));
      // }

      this.logger.log(`Scheduled message processed successfully: jobId=${message.metadata.jobId}`);
    } catch (error) {
      this.logger.error(
        `Failed to process scheduled message: ${error.message}`,
        error.stack,
      );

      // Save to DB for manual intervention
      await this.saveFailedJobToDb(message, error.message);
    }
  }

  // ========== Private Helper Methods ==========

  /**
   * Create job in database
   * @private
   */
  private async createJobInDb(
    message: UnifiedJobMessageDto,
    manager?: EntityManager,
  ): Promise<JobEntity> {
    const em = manager || this.entityManager;
    const appId = message.metadata.appId;

    if (!appId) {
      throw new Error('metadata.appId is required to create a job');
    }

    const lambdaProxyMessage: JsonObject = instanceToPlain(
      message.lambdaProxyMessage,
    );
    const executionConfig: JsonObject = instanceToPlain(message.execution);

    return this.jobRepository.create(
      {
        appId,
        executionType: message.execution.type,
        lambdaProxyMessage,
        executionConfig,
        messageGroupId: message.metadata.messageGroupId,
        idempotencyKey: message.metadata.idempotencyKey || null,
        maxRetries: 10,
        nextRetryAt: new Date(),
        // Legacy fields (null for new jobs)
        type: null,
        payload: null,
      },
      em,
    );
  }

  /**
   * Send message to SQS
   * @private
   */
  private async sendToSqs(message: UnifiedJobMessageDto): Promise<void> {
    const queueUrl = this.configService.get<string>('aws.sqs.queueUrl');
    if (!queueUrl) {
      throw new Error('aws.sqs.queueUrl not configured');
    }

    const command = new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify(message),
      MessageGroupId: message.metadata.messageGroupId,
      MessageDeduplicationId: message.metadata.idempotencyKey || `${message.metadata.jobId}-${Date.now()}`,
    });

    await this.sqsClient.send(command);
    this.logger.log(`Message sent to SQS: jobId=${message.metadata.jobId}`);
  }

  /**
   * Save failed job to database
   * @private
   */
  private async saveFailedJobToDb(
    message: UnifiedJobMessageDto,
    error: string,
  ): Promise<void> {
    try {
      const appId = message.metadata.appId;

      if (!appId) {
        throw new Error('metadata.appId is required to persist failed job');
      }

      const lambdaProxyMessage: JsonObject = instanceToPlain(
        message.lambdaProxyMessage,
      );
      const executionConfig: JsonObject = instanceToPlain(message.execution);

      await this.jobRepository.create({
        appId,
        executionType: message.execution.type,
        lambdaProxyMessage,
        executionConfig,
        messageGroupId: message.metadata.messageGroupId,
        idempotencyKey: message.metadata.idempotencyKey || null,
        status: JobStatus.RETRYING,
        retryCount: message.metadata.retryCount || 0,
        maxRetries: 10,
        nextRetryAt: this.calculateNextRetry(message.metadata.retryCount || 0),
        lastError: error,
        type: null,
        payload: null,
      });

      this.logger.log(`Failed job saved to DB: jobId=${message.metadata.jobId}`);
    } catch (dbError) {
      this.logger.error('Failed to save job to DB', dbError.stack);
    }
  }

  /**
   * Convert DB job entity to unified message
   * @private
   */
  private dbJobToMessage(job: JobEntity): UnifiedJobMessageDto {
    const lambdaProxyMessage = plainToInstance(
      LambdaProxyMessageDto,
      job.lambdaProxyMessage ?? {},
    );

    const execution = plainToInstance(
      ExecutionConfigDto,
      job.executionConfig ?? {},
    );

    if (!job.messageGroupId) {
      throw new Error(`Job ${job.id} is missing messageGroupId`);
    }

    const metadata: JobMetadataDto = {
      jobId: job.id,
      appId: job.appId,
      messageGroupId: job.messageGroupId,
      idempotencyKey: job.idempotencyKey || undefined,
      createdAt: job.createdAt.toISOString(),
      retryCount: job.retryCount,
    };

    return {
      lambdaProxyMessage,
      execution,
      metadata,
    };
  }

  /**
   * Calculate next retry time with exponential backoff
   * @private
   */
  private calculateNextRetry(retryCount: number): Date {
    const delaySeconds = Math.min(Math.pow(2, retryCount) * 60, 86400); // Cap at 24h
    return new Date(Date.now() + delaySeconds * 1000);
  }
}
