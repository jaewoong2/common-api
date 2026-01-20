import {
  Entity,
  Column,
  Index,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { WebhookStatus } from "../../common/enums";
import { JsonObject } from "@common/types/json-value.type";

/**
 * Webhook Request Entity
 * @description Webhook 수신 이력 (모든 요청 기록)
 * @schema webhook
 */
@Entity({ name: "webhook_requests", schema: "webhook" })
@Index(["userId", "signalId"], { unique: true })
@Index(["userId"])
@Index(["signalId"])
@Index(["status"])
@Index(["createdAt"])
@Index(["userId", "createdAt"])
export class WebhookRequestEntity {
  @PrimaryGeneratedColumn("increment", { type: "bigint" })
  id: string;

  @Column({ type: "uuid", name: "user_id" })
  userId: string;

  @Column({ name: "signal_id", type: "varchar", length: 100 })
  signalId: string;

  @Column({ type: "varchar", length: 50 })
  provider: string;

  @Column({
    type: "enum",
    enum: WebhookStatus,
    default: WebhookStatus.RECEIVED,
  })
  status: WebhookStatus;

  @Column({ name: "job_id", type: "uuid", nullable: true })
  jobId: string | null;

  @Column({ name: "trace_id", type: "varchar", length: 100, nullable: true })
  traceId: string | null;

  @Column({ name: "request_json", type: "jsonb" })
  requestJson: JsonObject;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
