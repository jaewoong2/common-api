import {
  Entity,
  Column,
  Index,
  PrimaryColumn,
  CreateDateColumn,
} from "typeorm";

/**
 * Processing Lock Entity
 * @description 동시 처리 방지 락 (TTL 기반)
 * @schema webhook
 * @note Composite PK: (userId, signalId)
 * @note TTL: expires_at = now() + 3분
 */
@Entity({ name: "processing_locks", schema: "webhook" })
@Index(["expiresAt"])
export class ProcessingLockEntity {
  @PrimaryColumn({ type: "uuid", name: "user_id" })
  userId: string;

  @PrimaryColumn({ name: "signal_id", type: "varchar", length: 100 })
  signalId: string;

  @Column({
    name: "lock_token",
    type: "uuid",
    default: () => "gen_random_uuid()",
  })
  lockToken: string;

  /**
   * Lock expiration time (TTL: now() + 3분)
   */
  @Column({ name: "expires_at", type: "timestamptz" })
  expiresAt: Date;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;
}
