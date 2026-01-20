import {
  Entity,
  Column,
  Index,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from "typeorm";
import { TradeStatus } from "../../common/enums";
import { JsonObject } from "@common/types/json-value.type";

/**
 * Trade Log Entity
 * @description 거래 실행 결과 (성공/실패한 주문 상세 기록)
 * @schema webhook
 */
@Entity({ name: "trade_logs", schema: "webhook" })
@Index(["userId", "createdAt"])
@Index(["signalId"])
@Index(["ticker"])
@Index(["status"])
@Index(["provider", "market"])
export class TradeLogEntity {
  @PrimaryGeneratedColumn("increment", { type: "bigint" })
  id: string;

  @Column({ type: "uuid", name: "user_id" })
  userId: string;

  @Column({ name: "signal_id", type: "varchar", length: 100 })
  signalId: string;

  @Column({ type: "varchar", length: 50 })
  provider: string;

  @Column({ type: "varchar", length: 50 })
  exchange: string;

  @Column({ type: "varchar", length: 20 })
  market: string;

  @Column({ type: "varchar", length: 50 })
  ticker: string;

  @Column({ type: "varchar", length: 20 })
  action: string;

  @Column({
    type: "enum",
    enum: TradeStatus,
  })
  status: TradeStatus;

  /**
   * Entry order details (order_id, symbol, side, quantity, price)
   */
  @Column({ name: "entry_json", type: "jsonb", nullable: true })
  entryJson: JsonObject | null;

  /**
   * Exit order details (tp_order_id, sl_order_id)
   */
  @Column({ name: "exit_json", type: "jsonb", nullable: true })
  exitJson: JsonObject | null;

  /**
   * Error details if failed
   */
  @Column({ name: "error_json", type: "jsonb", nullable: true })
  errorJson: JsonObject | null;

  /**
   * Original webhook request payload
   */
  @Column({ name: "request_json", type: "jsonb" })
  requestJson: JsonObject;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;
}
