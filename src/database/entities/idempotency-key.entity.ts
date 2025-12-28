import {
  Entity,
  Column,
  Index,
} from 'typeorm';
import { BaseEntity } from '../../core/database/base.entity';

/**
 * Idempotency Key Entity
 * @description Stores idempotency keys for financial operations
 * @note Permanent storage (no auto-deletion) for audit trail
 */
@Entity({ name: 'idempotency_keys', schema: 'common' })
@Index(['appId', 'idempotencyKey'], { unique: true })
@Index(['createdAt'])
export class IdempotencyKeyEntity extends BaseEntity {
  /**
   * App ID for multi-tenancy
   */
  @Column({ name: 'app_id', type: 'uuid' })
  appId: string;

  /**
   * Client-provided idempotency key
   */
  @Column({ name: 'idempotency_key', type: 'varchar', length: 255 })
  idempotencyKey: string;

  /**
   * SHA-256 hash of canonical request body
   * @note Used to detect duplicate requests with different bodies
   */
  @Column({ name: 'request_hash', type: 'varchar', length: 255 })
  requestHash: string;

  /**
   * Cached response body (for returning same response)
   */
  @Column({ name: 'response_body', type: 'jsonb' })
  responseBody: Record<string, any>;

  /**
   * HTTP status code of original response
   */
  @Column({ name: 'http_status', type: 'integer' })
  httpStatus: number;
}
