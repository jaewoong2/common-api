import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OAuthProviderEntity } from '../../../database/entities/oauth-provider.entity';
import { JsonObject } from '@common/types/json-value.type';

/**
 * OAuth Provider Repository
 * @description Handles OAuth provider data access operations
 */
@Injectable()
export class OAuthProviderRepository {
  constructor(
    @InjectRepository(OAuthProviderEntity)
    private readonly repo: Repository<OAuthProviderEntity>,
  ) {}

  /**
   * Find OAuth provider link by provider and provider user ID
   * @param provider OAuth provider name (google, kakao)
   * @param providerUserId Provider's user ID
   * @returns OAuthProviderEntity or null
   */
  async findByProviderAndUserId(
    provider: string,
    providerUserId: string,
  ): Promise<OAuthProviderEntity | null> {
    return this.repo.findOne({
      where: {
        provider,
        providerUserId,
      },
    });
  }

  /**
   * Find OAuth provider link by app + provider + provider user ID
   * @param appId App (tenant) ID
   * @param provider OAuth provider name (google, kakao)
   * @param providerUserId Provider's user ID
   * @returns OAuthProviderEntity or null
   */
  async findByAppProviderAndUserId(
    appId: string,
    provider: string,
    providerUserId: string,
  ): Promise<OAuthProviderEntity | null> {
    return this.repo.findOne({
      where: {
        appId,
        provider,
        providerUserId,
      },
    });
  }

  /**
   * Find all OAuth providers for a user
   * @param userId User UUID
   * @returns Array of OAuthProviderEntity
   */
  async findByUserId(userId: string): Promise<OAuthProviderEntity[]> {
    return this.repo.find({
      where: { userId },
    });
  }

  /**
   * Create OAuth provider link
   * @param data OAuth provider data
   * @returns OAuthProviderEntity
   */
  async create(data: {
    appId: string;
    userId: string;
    provider: string;
    providerUserId: string;
    email: string;
    profile: JsonObject;
  }): Promise<OAuthProviderEntity> {
    const oauthProvider = this.repo.create(data);
    return this.repo.save(oauthProvider);
  }

  /**
   * Update OAuth provider profile
   * @param id OAuth provider UUID
   * @param profile Provider profile data
   */
  async updateProfile(
    id: string,
    profile: JsonObject,
  ): Promise<void> {
    await this.repo.update(id, { profile });
  }
}
