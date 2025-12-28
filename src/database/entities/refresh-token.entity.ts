import {
  Entity,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../core/database/base.entity';
import { UserEntity } from './user.entity';

/**
 * Refresh Token Entity
 * @description Stores hashed refresh tokens for user sessions
 * @note Tokens are hashed before storage for security
 */
@Entity({ name: 'refresh_tokens', schema: 'common' })
@Index(['tokenHash'], { unique: true })
@Index(['userId'])
@Index(['expiresAt'])
export class RefreshTokenEntity extends BaseEntity {
  /**
   * User who owns this refresh token
   */
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => UserEntity, (user) => user.refreshTokens)
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  /**
   * Hashed refresh token (SHA-256)
   * @note Never store plain tokens in database
   */
  @Column({ name: 'token_hash', type: 'varchar', length: 255 })
  tokenHash: string;

  /**
   * Token expiration timestamp
   */
  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  /**
   * Revocation timestamp (for logout)
   * @note NULL means token is still valid
   */
  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt: Date | null;
}
