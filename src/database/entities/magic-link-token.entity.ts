import {
  Entity,
  Column,
  Index,
} from 'typeorm';
import { BaseEntity } from '../../core/database/base.entity';

/**
 * Magic Link Token Entity
 * @description Stores magic link tokens and verification codes for passwordless authentication
 * @note Supports both URL token and 6-digit code verification
 */
@Entity({ name: 'magic_link_tokens', schema: 'common' })
@Index(['tokenHash'], { unique: true })
@Index(['email', 'appId'])
@Index(['expiresAt'])
export class MagicLinkTokenEntity extends BaseEntity {
  /**
   * App ID for multi-tenancy
   */
  @Column({ name: 'app_id', type: 'uuid' })
  appId: string;

  /**
   * Email address this token was sent to
   */
  @Column({ type: 'varchar', length: 255 })
  email: string;

  /**
   * Hashed magic link token (SHA-256)
   * @note Used for URL-based verification
   */
  @Column({ name: 'token_hash', type: 'varchar', length: 255 })
  tokenHash: string;

  /**
   * 6-digit verification code (plain text)
   * @note Used for manual code entry by user
   */
  @Column({ name: 'verification_code', type: 'varchar', length: 6 })
  verificationCode: string;

  /**
   * Redirect URL after successful verification
   */
  @Column({ name: 'redirect_url', type: 'text', nullable: true })
  redirectUrl: string | null;

  /**
   * Token expiration timestamp
   */
  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  /**
   * Whether this token has been used
   */
  @Column({ name: 'is_used', type: 'boolean', default: false })
  isUsed: boolean;

  /**
   * Timestamp when token was used
   */
  @Column({ name: 'used_at', type: 'timestamptz', nullable: true })
  usedAt: Date | null;
}
