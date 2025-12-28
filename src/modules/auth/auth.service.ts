import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
  NotImplementedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import {
  RequestMagicLinkDto,
  VerifyMagicLinkDto,
  RefreshTokenDto,
  LogoutDto,
  UpdateProfileDto,
} from './dto/auth.dto';
import { UserRepository } from './repositories/user.repository';
import { RefreshTokenRepository } from './repositories/refresh-token.repository';
import { MagicLinkTokenRepository } from './repositories/magic-link-token.repository';
import { UserEntity } from '../../database/entities/user.entity';

/**
 * Auth Service
 * @description Handles authentication via Magic Link and OAuth (NO passwords)
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  // Token expiry configurations
  private readonly ACCESS_TOKEN_EXPIRY = '15m';
  private readonly REFRESH_TOKEN_EXPIRY_DAYS = 30;
  private readonly MAGIC_LINK_EXPIRY_MINUTES = 15;

  constructor(
    private readonly userRepository: UserRepository,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly magicLinkRepository: MagicLinkTokenRepository,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Request magic link (controller method)
   * @param dto - Request magic link DTO
   * @returns Success message with code in development
   */
  async requestMagicLink(
    dto: RequestMagicLinkDto,
  ): Promise<{ message: string; code?: string }> {
    const appId = (dto as any).appId || 'default';
    return this._requestMagicLink(appId, dto.email, dto.redirect_url);
  }

  /**
   * Verify magic link (controller method)
   * @param dto - Verify magic link DTO
   * @returns JWT tokens and user
   */
  async verifyMagicLink(dto: VerifyMagicLinkDto) {
    return this.verifyMagicLinkByToken(dto.token);
  }

  /**
   * OAuth start (placeholder - not implemented yet)
   */
  async oauthStart(provider: string, req: any) {
    throw new NotImplementedException(
      `OAuth for ${provider} not implemented yet`,
    );
  }

  /**
   * OAuth callback (placeholder - not implemented yet)
   */
  async oauthCallback(provider: string, req: any) {
    throw new NotImplementedException(
      `OAuth callback for ${provider} not implemented yet`,
    );
  }

  /**
   * Refresh token (controller method)
   * @param dto - Refresh token DTO
   * @returns New access token
   */
  async refresh(dto: RefreshTokenDto) {
    return this.refreshAccessToken(dto.refresh_token);
  }

  /**
   * Logout (controller method)
   * @param dto - Logout DTO
   * @returns Success message
   */
  async logout(dto: LogoutDto) {
    return this._logout(dto.refresh_token);
  }

  /**
   * Get current user (controller method)
   * @param user - User from JWT
   * @returns User entity
   */
  async getMe(user: any) {
    return this.getCurrentUser(user.id);
  }

  /**
   * Update current user (controller method)
   * @param user - User from JWT
   * @param dto - Update profile DTO
   * @returns Updated user
   */
  async updateMe(user: any, dto: UpdateProfileDto) {
    return this.updateProfile(user.id, dto);
  }

  /**
   * Delete current user (controller method)
   * @param user - User from JWT
   * @returns Success message
   */
  async deleteMe(user: any) {
    return this.deleteAccount(user.id);
  }

  /**
   * Internal: Request magic link - Generate token + 6-digit code, send email
   * @private
   */
  private async _requestMagicLink(
    appId: string,
    email: string,
    redirectUrl?: string,
  ): Promise<{ message: string; code?: string }> {
    this.logger.log(`Requesting magic link for ${email} in app ${appId}`);

    const plainToken = crypto.randomBytes(32).toString('hex');
    const verificationCode =
      this.magicLinkRepository.generateVerificationCode();

    const expiresAt = new Date();
    expiresAt.setMinutes(
      expiresAt.getMinutes() + this.MAGIC_LINK_EXPIRY_MINUTES,
    );

    await this.magicLinkRepository.create({
      appId,
      email,
      plainToken,
      verificationCode,
      redirectUrl,
      expiresAt,
    });

    const magicLink = `${redirectUrl}?token=${plainToken}`;
    this.logger.log(`[EMAIL PLACEHOLDER] Magic link for ${email}:`);
    this.logger.log(`Link: ${magicLink}`);
    this.logger.log(`Code: ${verificationCode}`);

    const isDevelopment = process.env.NODE_ENV !== 'production';

    return {
      message: 'Magic link sent to your email',
      ...(isDevelopment && { code: verificationCode }),
    };
  }

  /**
   * Verify magic link by URL token
   */
  async verifyMagicLinkByToken(token: string): Promise<{
    access_token: string;
    refresh_token: string;
    user: UserEntity;
  }> {
    this.logger.log(`Verifying magic link token`);

    const magicLinkToken = await this.magicLinkRepository.findByToken(token);

    if (!magicLinkToken) {
      throw new UnauthorizedException('Invalid or expired magic link token');
    }

    if (new Date() > magicLinkToken.expiresAt) {
      throw new UnauthorizedException('Magic link has expired');
    }

    await this.magicLinkRepository.markAsUsed(magicLinkToken.id);

    const user = await this.findOrCreateUser(
      magicLinkToken.appId,
      magicLinkToken.email,
    );

    return this.generateTokens(user);
  }

  /**
   * Verify magic link by 6-digit code
   */
  async verifyMagicLinkByCode(
    appId: string,
    email: string,
    code: string,
  ): Promise<{
    access_token: string;
    refresh_token: string;
    user: UserEntity;
  }> {
    this.logger.log(`Verifying magic link code for ${email} in app ${appId}`);

    const magicLinkToken = await this.magicLinkRepository.findByEmailAndCode(
      appId,
      email,
      code,
    );

    if (!magicLinkToken) {
      throw new UnauthorizedException('Invalid or expired verification code');
    }

    if (new Date() > magicLinkToken.expiresAt) {
      throw new UnauthorizedException('Verification code has expired');
    }

    await this.magicLinkRepository.markAsUsed(magicLinkToken.id);

    const user = await this.findOrCreateUser(appId, email);

    return this.generateTokens(user);
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken: string): Promise<{
    access_token: string;
  }> {
    this.logger.log(`Refreshing access token`);

    const tokenEntity =
      await this.refreshTokenRepository.findValidToken(refreshToken);

    if (!tokenEntity) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (new Date() > tokenEntity.expiresAt) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    const user = await this.userRepository.findById(tokenEntity.userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      appId: user.appId,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.ACCESS_TOKEN_EXPIRY,
    });

    return {
      access_token: accessToken,
    };
  }

  /**
   * Internal: Logout
   * @private
   */
  private async _logout(refreshToken: string): Promise<{ message: string }> {
    this.logger.log(`Logging out user`);

    await this.refreshTokenRepository.revoke(refreshToken);

    return {
      message: 'Logged out successfully',
    };
  }

  /**
   * Get current user by ID
   */
  async getCurrentUser(userId: string): Promise<UserEntity> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Update user profile
   */
  async updateProfile(
    userId: string,
    profile: Record<string, any>,
  ): Promise<UserEntity> {
    this.logger.log(`Updating profile for user ${userId}`);

    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.userRepository.updateProfile(userId, profile);
  }

  /**
   * Soft delete user account
   */
  async deleteAccount(userId: string): Promise<{ message: string }> {
    this.logger.log(`Deleting account for user ${userId}`);

    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.userRepository.softDelete(userId);
    await this.refreshTokenRepository.revokeAllForUser(userId);

    return {
      message: 'Account deleted successfully',
    };
  }

  /**
   * Find or create user by email
   * @private
   */
  private async findOrCreateUser(
    appId: string,
    email: string,
  ): Promise<UserEntity> {
    let user = await this.userRepository.findByEmail(appId, email);

    if (!user) {
      this.logger.log(`Creating new user for ${email} in app ${appId}`);
      user = await this.userRepository.create({
        appId,
        email,
      });
    }

    return user;
  }

  /**
   * Generate JWT tokens
   * @private
   */
  private async generateTokens(user: UserEntity): Promise<{
    access_token: string;
    refresh_token: string;
    user: UserEntity;
  }> {
    const payload = {
      sub: user.id,
      email: user.email,
      appId: user.appId,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.ACCESS_TOKEN_EXPIRY,
    });

    const refreshToken = crypto.randomBytes(32).toString('hex');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.REFRESH_TOKEN_EXPIRY_DAYS);

    await this.refreshTokenRepository.create(user.id, refreshToken, expiresAt);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user,
    };
  }
}
