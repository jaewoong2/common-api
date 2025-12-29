import {
  Entity,
  Column,
  Index,
} from 'typeorm';
import { BaseEntity } from '../../core/database/base.entity';

/**
 * Magic Link Token Entity
 * @description Stores magic link tokens, verification codes, and OAuth authorization codes
 * @note Supports:
 * - Magic link URL tokens (passwordless authentication)
 * - 6-digit verification codes
 * - OAuth authorization codes (Google, Kakao, etc.)
 */
@Entity({ name: 'magic_link_tokens', schema: 'common' })
@Index(['tokenHash'], { unique: true })
@Index(['email', 'appId'])
@Index(['expiresAt'])
@Index(['provider'])
@Index(['userId'])
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

  /**
   * Provider type
   * @note Distinguishes between different token types:
   * - 'magic-link': Email-based passwordless authentication
   * - 'google': Google OAuth authorization code
   * - 'kakao': Kakao OAuth authorization code
   */
  @Column({ type: 'varchar', length: 50, nullable: true, default: 'magic-link' })
  provider: string | null;

  /**
   * User ID (for OAuth flows)
   * @note Magic link flows use email for user identification
   * OAuth flows use userId after user is found/created
   */
  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;
}
