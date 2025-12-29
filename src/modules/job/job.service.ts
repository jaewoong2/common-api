import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { JobRepository } from './repositories/job.repository';
import { AppRepository } from '../platform/repositories/app.repository';
import { JobEntity } from '../../database/entities/job.entity';
import { JobType, JobStatus } from '../../common/enums';
import { buildCanonicalString, signRequest } from '../../common/utils/hmac.util';
import axios from 'axios';
import { JsonObject } from '@common/types/json-value.type';
import { AppEntity } from '../../database/entities/app.entity';

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
}
