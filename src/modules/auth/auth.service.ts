import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as crypto from "crypto";
import { AppRequest } from "@common/interfaces/app-request.interface";
import { JsonObject } from "@common/types/json-value.type";
import {
  RequestMagicLinkDto,
  VerifyMagicLinkDto,
  RefreshTokenDto,
  LogoutDto,
  UpdateProfileDto,
} from "./dto/auth.dto";
import { UserRepository } from "../user/repositories/user.repository";
import { RefreshTokenRepository } from "./repositories/refresh-token.repository";
import { MagicLinkTokenRepository } from "./repositories/magic-link-token.repository";
import { OAuthProviderRepository } from "./repositories/oauth-provider.repository";
import { EmailService } from "../../infra/email/email.service";
import { UserEntity } from "../../database/entities/user.entity";
import { AuthenticatedUser } from "./interfaces/auth-user.interface";
import {
  OAuthProfile,
  extractOAuthUserId,
} from "./interfaces/oauth-profile.interface";
import {
  isKakaoProfile,
  extractKakaoEmail,
  extractKakaoNickname,
  extractKakaoProfileImage,
  buildKakaoUserProfile,
} from "./interfaces/kakao-profile.interface";
import {
  isGoogleProfile,
  extractGoogleEmail,
  extractGoogleDisplayName,
  extractGooglePhoto,
  buildGoogleUserProfile,
} from "./interfaces/google-profile.interface";
import { DEFAULT_APP_ID } from "./constants/auth.constants";
import { OAuthEmailRequiredException } from "./exceptions/oauth.exceptions";
import { config } from "process";

/**
 * Auth Service
 * @description Handles authentication via Magic Link and OAuth (NO passwords)
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  // Token expiry configurations
  private readonly ACCESS_TOKEN_EXPIRY = "15m";
  private readonly REFRESH_TOKEN_EXPIRY_DAYS = 30;
  private readonly MAGIC_LINK_EXPIRY_MINUTES = 15;

  constructor(
    private readonly userRepository: UserRepository,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly magicLinkRepository: MagicLinkTokenRepository,
    private readonly oauthProviderRepository: OAuthProviderRepository,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService
  ) {}

  /**
   * Request magic link (controller method)
   * @param dto - Request magic link DTO
   * @returns Success message with code in development
   */
  async requestMagicLink(
    appId: string,
    dto: RequestMagicLinkDto
  ): Promise<{ message: string; code?: string }> {
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
   * OAuth callback - Generate authorization code or JWT tokens
   * @param provider OAuth provider name
   * @param req Request with user from Passport
   * @returns Authorization code if redirect_uri provided, otherwise JWT tokens
   */
  async oauthCallback(
    provider: string,
    req: AppRequest<UserEntity>
  ): Promise<
    | { code: string; redirect_uri: string }
    | { access_token: string; refresh_token: string; user: UserEntity }
  > {
    const user = req.user;
    const redirectUri = req.redirectUri;

    // Authorization code flow (new)
    if (redirectUri) {
      const code = await this.generateOAuthCode(
        user.id,
        req.appId,
        redirectUri,
        provider
      );

      return { code, redirect_uri: redirectUri };
    }

    // Backward compatibility: return tokens directly
    return this.generateTokens(user);
  }

  /**
   * Generate OAuth authorization code
   * @private
   */
  private async generateOAuthCode(
    userId: string,
    appId: string,
    redirectUri: string,
    provider: string
  ): Promise<string> {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5); // 5 minutes

    return this.magicLinkRepository.createOAuthCode({
      userId,
      appId,
      redirectUri,
      provider,
      expiresAt,
    });
  }

  /**
   * Validate OAuth user - Create or link OAuth account
   * @param provider OAuth provider name (google, kakao)
   * @param profile OAuth profile from provider
   * @param appId Tenant app id derived from OAuth state
   * @returns UserEntity
   */
  async validateOAuthUser(
    provider: string,
    profile: OAuthProfile,
    appId?: string
  ): Promise<UserEntity> {
    const resolvedAppId = this.resolveAppId(appId);
    const providerUserId = extractOAuthUserId(profile);

    this.logger.log(
      `Validating OAuth user from ${provider}: ${providerUserId}`
    );

    const email = this.extractEmailFromProfile(provider, profile);

    const linkedUser = await this.findLinkedOAuthUser(
      resolvedAppId,
      provider,
      providerUserId
    );
    if (linkedUser) {
      return linkedUser;
    }

    const user = await this.findOrCreateOAuthUser(
      resolvedAppId,
      email,
      profile
    );

    await this.linkOAuthProvider(
      resolvedAppId,
      user.id,
      provider,
      providerUserId,
      email,
      profile
    );

    return user;
  }

  private resolveAppId(appId?: string): string {
    return appId ?? DEFAULT_APP_ID;
  }

  /**
   * Extract email from OAuth profile (type-safe)
   * @private
   */
  private extractEmailFromProfile(
    provider: string,
    profile: OAuthProfile
  ): string {
    let email: string | undefined;

    if (isKakaoProfile(profile)) {
      email = extractKakaoEmail(profile);

      // Kakao: Generate fallback email if not provided
      if (!email) {
        const kakaoId = profile._json.id;
        email = `${kakaoId}@kakao.com`;
        this.logger.warn(
          `Kakao email not provided for user ${kakaoId}, using fallback: ${email}`
        );
      }
    } else if (isGoogleProfile(profile)) {
      email = extractGoogleEmail(profile);

      // Google: Email is required
      if (!email) {
        throw new OAuthEmailRequiredException(provider);
      }
    }

    return email;
  }

  private async findLinkedOAuthUser(
    appId: string,
    provider: string,
    providerUserId: string
  ): Promise<UserEntity | null> {
    const existingOAuthLink =
      await this.oauthProviderRepository.findByAppProviderAndUserId(
        appId,
        provider,
        providerUserId
      );

    if (!existingOAuthLink) {
      return null;
    }

    this.logger.log(
      `Found existing OAuth link for ${provider}:${providerUserId}`
    );
    const user = await this.userRepository.findById(existingOAuthLink.userId);

    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    return user;
  }

  private async findOrCreateOAuthUser(
    appId: string,
    email: string,
    profile: OAuthProfile
  ): Promise<UserEntity> {
    const existingUser = await this.userRepository.findByEmail(appId, email);

    if (existingUser) {
      return existingUser;
    }

    this.logger.log(`Creating new user via OAuth: ${email}`);
    return this.userRepository.create({
      appId,
      email,
      profile: this.buildProfileFromOAuth(profile),
    });
  }

  /**
   * Build user profile object from OAuth data (type-safe)
   * @private
   */
  private buildProfileFromOAuth(profile: OAuthProfile): JsonObject {
    if (isKakaoProfile(profile)) {
      const kakaoProfile = buildKakaoUserProfile(profile);
      return {
        displayName: kakaoProfile.displayName,
        photo: kakaoProfile.photo,
        thumbnail: kakaoProfile.thumbnail,
        isDefaultImage: kakaoProfile.isDefaultImage,
        isDefaultNickname: kakaoProfile.isDefaultNickname,
      };
    }

    // Must be Google profile (discriminated union)
    const googleProfile = buildGoogleUserProfile(profile);
    return {
      displayName: googleProfile.displayName,
      photo: googleProfile.photo,
      emailVerified: googleProfile.emailVerified,
      givenName: googleProfile.givenName,
      familyName: googleProfile.familyName,
      locale: googleProfile.locale,
    };
  }

  /**
   * Build provider-specific profile data for storage (type-safe)
   * @private
   */
  private buildProviderProfile(profile: OAuthProfile): JsonObject {
    if (isKakaoProfile(profile)) {
      return {
        id: profile._json.id,
        connected_at: profile._json.connected_at,
        properties: profile._json.properties,
        kakao_account: profile._json.kakao_account,
      };
    }

    // Must be Google profile (discriminated union)
    return {
      sub: profile._json.sub,
      name: profile._json.name,
      given_name: profile._json.given_name,
      family_name: profile._json.family_name,
      picture: profile._json.picture,
      email: profile._json.email,
      email_verified: profile._json.email_verified,
      locale: profile._json.locale,
    };
  }

  private async linkOAuthProvider(
    appId: string,
    userId: string,
    provider: string,
    providerUserId: string,
    email: string,
    profile: OAuthProfile
  ): Promise<void> {
    await this.oauthProviderRepository.create({
      appId,
      userId,
      provider,
      providerUserId,
      email,
      profile: this.buildProviderProfile(profile),
    });
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
  async getMe(user: AuthenticatedUser) {
    return this.getCurrentUser(user.id);
  }

  /**
   * Update current user (controller method)
   * @param user - User from JWT
   * @param dto - Update profile DTO
   * @returns Updated user
   */
  async updateMe(user: AuthenticatedUser, dto: UpdateProfileDto) {
    const profilePayload: JsonObject = { ...dto };
    return this.updateProfile(user.id, profilePayload);
  }

  /**
   * Delete current user (controller method)
   * @param user - User from JWT
   * @returns Success message
   */
  async deleteMe(user: AuthenticatedUser) {
    return this.deleteAccount(user.id);
  }

  /**
   * Internal: Request magic link - Generate token + 6-digit code, send email
   * @private
   */
  private async _requestMagicLink(
    appId: string,
    email: string,
    redirectUrl?: string
  ): Promise<{ message: string; code?: string }> {
    this.logger.log(`Requesting magic link for ${email} in app ${appId}`);

    const verificationCode =
      this.magicLinkRepository.generateVerificationCode();

    const expiresAt = new Date();
    expiresAt.setMinutes(
      expiresAt.getMinutes() + this.MAGIC_LINK_EXPIRY_MINUTES
    );

    await this.magicLinkRepository.create({
      appId,
      email,
      verificationCode,
      redirectUrl,
      expiresAt,
    });

    // Send magic link email via AWS SES
    try {
      await this.emailService.sendMagicLinkEmail(
        email,
        verificationCode,
        redirectUrl
      );
      this.logger.log(`Magic link email sent successfully to ${email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send magic link email to ${email}`,
        error.stack
      );
      // Don't block auth flow - token is already saved in DB
      // User can still verify via code if email fails
    }

    const isDevelopment = process.env.NODE_ENV !== "production";

    return {
      message: "Magic link sent to your email",
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
      throw new UnauthorizedException("Invalid or expired magic link token");
    }

    if (new Date() > magicLinkToken.expiresAt) {
      throw new UnauthorizedException("Magic link has expired");
    }

    await this.magicLinkRepository.markAsUsed(magicLinkToken.id);

    const user = await this.findOrCreateUser(
      magicLinkToken.appId,
      magicLinkToken.email
    );

    return this.generateTokens(user);
  }

  /**
   * Verify magic link by 6-digit code
   */
  async verifyMagicLinkByCode(
    appId: string,
    email: string,
    code: string
  ): Promise<{
    access_token: string;
    refresh_token: string;
    user: UserEntity;
  }> {
    this.logger.log(`Verifying magic link code for ${email} in app ${appId}`);

    const magicLinkToken = await this.magicLinkRepository.findByEmailAndCode(
      appId,
      email,
      code
    );

    if (!magicLinkToken) {
      throw new UnauthorizedException("Invalid or expired verification code");
    }

    if (new Date() > magicLinkToken.expiresAt) {
      throw new UnauthorizedException("Verification code has expired");
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
      throw new UnauthorizedException("Invalid refresh token");
    }

    if (new Date() > tokenEntity.expiresAt) {
      throw new UnauthorizedException("Refresh token has expired");
    }

    const user = await this.userRepository.findById(tokenEntity.userId);

    if (!user) {
      throw new UnauthorizedException("User not found");
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
      message: "Logged out successfully",
    };
  }

  /**
   * Get current user by ID
   */
  async getCurrentUser(userId: string): Promise<UserEntity> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return user;
  }

  /**
   * Update user profile
   */
  async updateProfile(
    userId: string,
    profile: JsonObject
  ): Promise<UserEntity> {
    this.logger.log(`Updating profile for user ${userId}`);

    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new NotFoundException("User not found");
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
      throw new NotFoundException("User not found");
    }

    await this.userRepository.softDelete(userId);
    await this.refreshTokenRepository.revokeAllForUser(userId);

    return {
      message: "Account deleted successfully",
    };
  }

  /**
   * Find or create user by email
   * @private
   */
  private async findOrCreateUser(
    appId: string,
    email: string
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

    const refreshToken = crypto.randomBytes(32).toString("hex");

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.REFRESH_TOKEN_EXPIRY_DAYS);

    await this.refreshTokenRepository.create(user.id, refreshToken, expiresAt);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user,
    };
  }

  /**
   * Unified token verification (Magic Link + OAuth codes)
   * @param code - Token or authorization code
   * @param redirectUri - Required for OAuth flows, validates against stored value
   * @returns JWT tokens and user
   */
  async verifyToken(
    code: string,
    redirectUri?: string
  ): Promise<{
    access_token: string;
    refresh_token: string;
    user: UserEntity;
  }> {
    this.logger.log(`Verifying token/code`);

    // Find token in database
    const tokenEntity =
      await this.magicLinkRepository.findOAuthCodeByHash(code);

    if (!tokenEntity) {
      throw new UnauthorizedException("Invalid or expired token");
    }

    // Check expiration
    if (new Date() > tokenEntity.expiresAt) {
      throw new UnauthorizedException("Token has expired");
    }

    // Check if already used
    if (tokenEntity.isUsed) {
      throw new UnauthorizedException("Token already used");
    }

    // For OAuth flows, validate redirect_uri matches
    if (
      tokenEntity.provider &&
      tokenEntity.provider !== "magic-link" &&
      redirectUri
    ) {
      if (tokenEntity.redirectUrl !== redirectUri) {
        throw new UnauthorizedException("redirect_uri does not match");
      }
    }

    // Mark as used
    await this.magicLinkRepository.markAsUsed(tokenEntity.id);

    // Get user - OAuth uses userId, magic link uses email
    let user: UserEntity;
    if (tokenEntity.userId) {
      // OAuth flow
      user = await this.userRepository.findById(tokenEntity.userId);
      if (!user) {
        throw new NotFoundException("User not found");
      }
    } else {
      // Magic link flow
      user = await this.findOrCreateUser(tokenEntity.appId, tokenEntity.email);
    }

    // Generate and return JWT tokens
    return this.generateTokens(user);
  }
}
