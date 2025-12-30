import {
  Entity,
  Column,
  Index,
} from 'typeorm';
import { BaseEntity } from '../../core/database/base.entity';
import { JobType, JobStatus, ExecutionType } from '../../common/enums';
import { JsonObject } from '@common/types/json-value.type';

/**
 * Job Entity (Unified SQS + EventBridge)
 * @description Hybrid job system: SQS for active jobs, DB for failed/retrying jobs
 * @note Supports 4 execution types: lambda-invoke, lambda-url, rest-api, schedule
 */
@Entity({ name: 'jobs', schema: 'common' })
@Index(['status', 'nextRetryAt']) // For DB polling
@Index(['executionType']) // For filtering by execution type
@Index(['scheduleArn']) // For schedule cleanup
@Index(['idempotencyKey']) // For deduplication
export class JobEntity extends BaseEntity {
  /**
   * App ID for multi-tenancy
   */
  @Column({ name: 'app_id', type: 'uuid' })
  appId: string;

  /**
   * Job type (CALLBACK_HTTP, REWARD_GRANT)
   * @deprecated Use executionType instead (kept for backward compatibility)
   */
  @Column({
    type: 'enum',
    enum: JobType,
    nullable: true,
  })
  type: JobType | null;

  /**
   * Execution type (lambda-invoke, lambda-url, rest-api, schedule)
   */
  @Column({
    name: 'execution_type',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  executionType: ExecutionType | null;

  /**
   * Job execution status
   */
  @Column({
    type: 'enum',
    enum: JobStatus,
    default: JobStatus.PENDING,
  })
  status: JobStatus;

  /**
   * Job payload (HTTP method, path, body, headers, expected_statuses, etc.)
   * @deprecated Use lambdaProxyMessage instead (kept for backward compatibility)
   * @note Also stores HMAC signature for reuse
   */
  @Column({ type: 'jsonb', nullable: true })
  payload: JsonObject | null;

  /**
   * Lambda proxy event structure (unified message format)
   * @description Full Lambda proxy event: body, path, method, headers, etc.
   */
  @Column({ name: 'lambda_proxy_message', type: 'jsonb', nullable: true })
  lambdaProxyMessage: JsonObject | null;

  /**
   * Execution configuration (functionName, functionUrl, baseUrl, targetJob, etc.)
   * @description Type-specific execution parameters
   */
  @Column({ name: 'execution_config', type: 'jsonb', nullable: true })
  executionConfig: JsonObject | null;

  /**
   * Current retry count
   */
  @Column({ name: 'retry_count', type: 'integer', default: 0 })
  retryCount: number;

  /**
   * Maximum retries allowed
   */
  @Column({ name: 'max_retries', type: 'integer', default: 10 })
  maxRetries: number;

  /**
   * Next scheduled execution time
   * @note NULL means job is not scheduled for retry
   */
  @Column({ name: 'next_retry_at', type: 'timestamptz', nullable: true })
  nextRetryAt: Date | null;

  /**
   * Last error message (for debugging)
   */
  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError: string | null;

  /**
   * EventBridge Schedule ARN (for cleanup on success/dead)
   * @description Stored when schedule type creates EventBridge Schedule
   */
  @Column({ name: 'schedule_arn', type: 'varchar', length: 255, nullable: true })
  scheduleArn: string | null;

  /**
   * Idempotency key for duplicate prevention
   * @description Used for SQS MessageDeduplicationId and duplicate detection
   */
  @Column({ name: 'idempotency_key', type: 'varchar', length: 255, nullable: true })
  idempotencyKey: string | null;

  /**
   * SQS FIFO MessageGroupId (same as execution_type)
   * @description Used for FIFO queue ordering and routing
   */
  @Column({ name: 'message_group_id', type: 'varchar', length: 100, nullable: true })
  messageGroupId: string | null;
}
