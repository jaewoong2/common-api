import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { RefreshTokenEntity } from '../../../database/entities/refresh-token.entity';
import * as crypto from 'crypto';

/**
 * Refresh Token Repository
 * @description Handles refresh token storage and validation
 */
@Injectable()
export class RefreshTokenRepository {
  constructor(
    @InjectRepository(RefreshTokenEntity)
    private readonly repo: Repository<RefreshTokenEntity>,
  ) {}

  /**
   * Create new refresh token
   * @param userId - User ID
   * @param plainToken - Plain refresh token (will be hashed)
   * @param expiresAt - Expiration timestamp
   */
  async create(
    userId: string,
    plainToken: string,
    expiresAt: Date,
  ): Promise<RefreshTokenEntity> {
    const tokenHash = this.hashToken(plainToken);

    const token = this.repo.create({
      userId,
      tokenHash,
      expiresAt,
      revokedAt: null,
    });

    return this.repo.save(token);
  }

  /**
   * Find valid refresh token by plain token
   * @returns Token entity if valid, null otherwise
   */
  async findValidToken(plainToken: string): Promise<RefreshTokenEntity | null> {
    const tokenHash = this.hashToken(plainToken);
    const now = new Date();

    return this.repo.findOne({
      where: {
        tokenHash,
        revokedAt: null, // Not revoked
      },
    });
  }

  /**
   * Revoke refresh token (for logout)
   */
  async revoke(plainToken: string): Promise<void> {
    const tokenHash = this.hashToken(plainToken);

    await this.repo.update(
      { tokenHash },
      { revokedAt: new Date() },
    );
  }

  /**
   * Revoke all user's refresh tokens
   */
  async revokeAllForUser(userId: string): Promise<void> {
    await this.repo.update(
      { userId, revokedAt: null },
      { revokedAt: new Date() },
    );
  }

  /**
   * Delete expired tokens (cleanup job)
   */
  async deleteExpired(): Promise<number> {
    const result = await this.repo.delete({
      expiresAt: LessThan(new Date()),
    });

    return result.affected || 0;
  }

  /**
   * Hash token using SHA-256
   * @private
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
