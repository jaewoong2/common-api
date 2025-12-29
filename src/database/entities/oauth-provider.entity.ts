import { Entity, Column, ManyToOne, JoinColumn, Index } from "typeorm";
import { BaseEntity } from "../../core/database/base.entity";
import { UserEntity } from "./user.entity";
import { JsonObject } from "@common/types/json-value.type";
import { AppEntity } from "./app.entity";

/**
 * OAuth Provider Entity
 * @description Stores OAuth provider account links for users
 */
@Entity({ name: "oauth_providers", schema: "common" })
@Index(["userId", "provider"], { unique: true })
@Index(["appId", "provider", "providerUserId"], { unique: true })
export class OAuthProviderEntity extends BaseEntity {
  @Column({ name: "app_id", type: "uuid" })
  appId: string;

  @ManyToOne(() => AppEntity)
  @JoinColumn({ name: "app_id" })
  app: AppEntity;

  @Column({ name: "user_id", type: "uuid" })
  userId: string;

  @ManyToOne(() => UserEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: UserEntity;

  @Column({ type: "varchar", length: 50 })
  provider: string; // 'google' | 'kakao'

  @Column({ name: "provider_user_id", type: "varchar", length: 255 })
  providerUserId: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  email: string;

  @Column({ type: "jsonb", nullable: true })
  profile: JsonObject | null; // Provider profile data
}
