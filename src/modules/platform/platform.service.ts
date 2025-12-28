import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectEntityManager } from "@nestjs/typeorm";
import { EntityManager } from "typeorm";
import { AppRepository } from "./repositories/app.repository";
import { AppEntity } from "../../database/entities/app.entity";
import { generateHmacSecret } from "../../common/utils/hmac.util";

/**
 * Platform Service
 * @description Manages tenant applications (PLATFORM_SUPER_ADMIN only)
 */
@Injectable()
export class PlatformService {
  constructor(
    private readonly appRepository: AppRepository,
    @InjectEntityManager()
    private readonly entityManager: EntityManager
  ) {}

  /**
   * List all apps
   * @returns All app entities
   */
  async listApps(): Promise<AppEntity[]> {
    return this.appRepository.findAll();
  }

  /**
   * Get app by ID
   * @param appId - App UUID
   * @returns App entity
   */
  async getApp(appId: string): Promise<AppEntity> {
    const app = await this.appRepository.findById(appId);
    if (!app) {
      throw new NotFoundException(`App ${appId} not found`);
    }
    return app;
  }

  /**
   * Create new app
   * @param name - App name
   * @param callbackBaseUrl - Optional callback base URL
   * @param callbackAllowlistPaths - Optional callback allowlist paths
   * @returns Created app entity
   * @example
   * createApp('MyApp', 'https://api.example.com', ['/v1/callbacks/*'])
   */
  async createApp(
    name: string,
    callbackBaseUrl?: string,
    callbackAllowlistPaths?: string[]
  ): Promise<AppEntity> {
    return this.entityManager.transaction(async (manager) => {
      // Generate HMAC secret for callbacks
      let callbackSecretRef: string | null = null;
      if (callbackBaseUrl) {
        callbackSecretRef = generateHmacSecret();
        // For MVP: store directly in callbackSecretRef field
        // Production: store in AWS Secrets Manager and save ARN here
      }

      return this.appRepository.create(
        {
          name,
          callbackBaseUrl: callbackBaseUrl || null,
          callbackAllowlistPaths: callbackAllowlistPaths || null,
          callbackSecretRef,
        },
        manager
      );
    });
  }

  /**
   * Update app configuration
   * @param appId - App UUID
   * @param data - Update data
   * @returns Updated app entity
   */
  async updateApp(
    appId: string,
    data: {
      name?: string;
      callbackBaseUrl?: string | null;
      callbackAllowlistPaths?: string[] | null;
      status?: "ACTIVE" | "SUSPENDED";
      callbackSecretRef?: string | null;
    }
  ): Promise<AppEntity> {
    return this.entityManager.transaction(async (manager) => {
      const app = await this.appRepository.findById(appId, manager);
      if (!app) {
        throw new NotFoundException(`App ${appId} not found`);
      }

      // Regenerate secret if callback URL is being set/changed
      let updateData = { ...data };
      if (
        data.callbackBaseUrl &&
        data.callbackBaseUrl !== app.callbackBaseUrl
      ) {
        updateData.callbackSecretRef = generateHmacSecret();
      }

      return this.appRepository.update(appId, updateData, manager);
    });
  }

  /**
   * Suspend app
   * @param appId - App UUID
   * @returns Updated app entity
   */
  async suspendApp(appId: string): Promise<AppEntity> {
    return this.updateApp(appId, { status: "SUSPENDED" });
  }

  /**
   * Activate app
   * @param appId - App UUID
   * @returns Updated app entity
   */
  async activateApp(appId: string): Promise<AppEntity> {
    return this.updateApp(appId, { status: "ACTIVE" });
  }
}
