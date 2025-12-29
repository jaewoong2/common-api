import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, LessThan } from "typeorm";
import { MagicLinkTokenEntity } from "../../../database/entities/magic-link-token.entity";
import * as crypto from "crypto";

/**
 * Magic Link Token Repository
 * @description Handles magic link tokens, 6-digit verification codes, and OAuth authorization codes
 * @note Unified repository for all temporary authentication tokens
 */
@Injectable()
export class MagicLinkTokenRepository {
  constructor(
    @InjectRepository(MagicLinkTokenEntity)
    private readonly repo: Repository<MagicLinkTokenEntity>
  ) {}

  /**
   * Create new magic link token
   * @param appId - App ID
   * @param email - User email
   * @param plainToken - Plain URL token (will be hashed)
   * @param verificationCode - 6-digit code
   * @param redirectUrl - Redirect URL after verification
   * @param expiresAt - Expiration timestamp (typically 15 minutes)
   */
  async create(data: {
    appId: string;
    email: string;
    verificationCode: string;
    redirectUrl?: string;
    expiresAt: Date;
  }): Promise<MagicLinkTokenEntity> {
    const tokenHash = this.hashToken(data.verificationCode);

    const token = this.repo.create({
      appId: data.appId,
      email: data.email.toLowerCase(),
      tokenHash,
      verificationCode: data.verificationCode,
      redirectUrl: data.redirectUrl || null,
      expiresAt: data.expiresAt,
      isUsed: false,
      usedAt: null,
    });

    return this.repo.save(token);
  }

  /**
   * Find valid token by plain token (for URL-based verification)
   */
  async findByToken(plainToken: string): Promise<MagicLinkTokenEntity | null> {
    const tokenHash = this.hashToken(plainToken);

    return this.repo.findOne({
      where: {
        tokenHash,
        isUsed: false,
      },
      order: {
        createdAt: "DESC",
      },
    });
  }

  /**
   * Find valid token by email and verification code (for manual code entry)
   */
  async findByEmailAndCode(
    appId: string,
    email: string,
    code: string
  ): Promise<MagicLinkTokenEntity | null> {
    const now = new Date();

    return this.repo.findOne({
      where: {
        appId,
        email: email.toLowerCase(),
        verificationCode: code,
        isUsed: false,
      },
      order: {
        createdAt: "DESC", // Get most recent token
      },
    });
  }

  /**
   * Mark token as used
   */
  async markAsUsed(tokenId: string): Promise<void> {
    await this.repo.update(tokenId, {
      isUsed: true,
      usedAt: new Date(),
    });
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
   * Generate random 6-digit verification code
   */
  generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Hash token using SHA-256
   * @private
   */
  private hashToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  /**
   * Create OAuth authorization code
   * @param userId - User ID
   * @param appId - App ID
   * @param redirectUri - Redirect URI for validation
   * @param provider - OAuth provider (google, kakao)
   * @param expiresAt - Expiration timestamp (typically 5 minutes)
   * @returns Plain authorization code (not hashed)
   */
  async createOAuthCode(data: {
    userId: string;
    appId: string;
    redirectUri: string;
    provider: string;
    expiresAt: Date;
  }): Promise<string> {
    // Generate secure random authorization code
    const plainCode = this.generateSecureCode();
    const tokenHash = this.hashToken(plainCode);

    const token = this.repo.create({
      appId: data.appId,
      userId: data.userId,
      email: '', // OAuth uses userId, not email
      tokenHash,
      verificationCode: '', // Not used for OAuth
      redirectUrl: data.redirectUri,
      provider: data.provider,
      expiresAt: data.expiresAt,
      isUsed: false,
      usedAt: null,
    });

    await this.repo.save(token);

    // Return plain code for client
    return plainCode;
  }

  /**
   * Find OAuth code by plain code
   * @param plainCode - Plain authorization code
   * @returns Token entity if found and valid
   */
  async findOAuthCodeByHash(
    plainCode: string
  ): Promise<MagicLinkTokenEntity | null> {
    const tokenHash = this.hashToken(plainCode);

    return this.repo.findOne({
      where: {
        tokenHash,
        isUsed: false,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  /**
   * Generate secure random code for OAuth
   * @returns 32-character alphanumeric code
   */
  private generateSecureCode(): string {
    return crypto.randomBytes(24).toString('base64url'); // URL-safe base64
  }
}
