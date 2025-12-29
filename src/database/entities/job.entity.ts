import {
  Entity,
  Column,
  Index,
} from 'typeorm';
import { BaseEntity } from '../../core/database/base.entity';
import { JobType, JobStatus } from '../../common/enums';
import { JsonObject } from '@common/types/json-value.type';

/**
 * Job Entity
 * @description Represents asynchronous jobs with retry logic
 * @note Stores HMAC signature for callback reuse
 */
@Entity({ name: 'jobs', schema: 'common' })
@Index(['appId', 'status', 'nextRetryAt']) // For job runner queries
@Index(['type'])
@Index(['status'])
export class JobEntity extends BaseEntity {
  /**
   * App ID for multi-tenancy
   */
  @Column({ name: 'app_id', type: 'uuid' })
  appId: string;

  /**
   * Job type (CALLBACK_HTTP, REWARD_GRANT)
   */
  @Column({
    type: 'enum',
    enum: JobType,
  })
  type: JobType;

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
   * @note Also stores HMAC signature for reuse
   */
  @Column({ type: 'jsonb' })
  payload: JsonObject;

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
}
