import { Entity, Column, Index } from "typeorm";
import { BaseEntity } from "../../core/database/base.entity";

/**
 * Exchange Key Entity
 * @description 거래소 API 키 (AWS KMS 암호화 저장)
 * @schema webhook
 */
@Entity({ name: "exchange_keys", schema: "webhook" })
@Index(["userId", "exchange", "label"], { unique: true })
@Index(["userId"])
@Index(["userId", "exchange"])
export class ExchangeKeyEntity extends BaseEntity {
  @Column({ type: "uuid", name: "user_id" })
  userId: string;

  @Column({ type: "varchar", length: 50 })
  exchange: string;

  @Column({ type: "varchar", length: 100 })
  label: string;

  /**
   * KMS encrypted access key
   */
  @Column({ name: "access_key_enc", type: "text" })
  accessKeyEnc: string;

  /**
   * KMS encrypted secret key
   */
  @Column({ name: "secret_key_enc", type: "text" })
  secretKeyEnc: string;

  /**
   * KMS Data Key ID used for encryption
   */
  @Column({ name: "kms_data_key_id", type: "text" })
  kmsDataKeyId: string;
}
