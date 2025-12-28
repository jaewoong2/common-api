import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { AppEntity } from '../../../database/entities/app.entity';

/**
 * App Repository
 * @description Handles database operations for tenant apps
 */
@Injectable()
export class AppRepository {
  constructor(
    @InjectRepository(AppEntity)
    private readonly repo: Repository<AppEntity>,
  ) {}

  /**
   * Find all apps
   * @param manager - Optional transaction manager
   * @returns All app entities
   */
  async findAll(manager?: EntityManager): Promise<AppEntity[]> {
    const repository = manager ? manager.getRepository(AppEntity) : this.repo;
    return repository.find({
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find app by ID
   * @param appId - App UUID
   * @param manager - Optional transaction manager
   * @returns App entity or null
   */
  async findById(
    appId: string,
    manager?: EntityManager,
  ): Promise<AppEntity | null> {
    const repository = manager ? manager.getRepository(AppEntity) : this.repo;
    return repository.findOne({ where: { id: appId } });
  }

  /**
   * Create new app
   * @param data - App creation data
   * @param manager - Optional transaction manager
   * @returns Created app entity
   */
  async create(
    data: {
      name: string;
      callbackBaseUrl?: string | null;
      callbackAllowlistPaths?: string[] | null;
      callbackSecretRef?: string | null;
    },
    manager?: EntityManager,
  ): Promise<AppEntity> {
    const repository = manager ? manager.getRepository(AppEntity) : this.repo;
    const entity = repository.create({
      name: data.name,
      callbackBaseUrl: data.callbackBaseUrl || null,
      callbackAllowlistPaths: data.callbackAllowlistPaths || null,
      callbackSecretRef: data.callbackSecretRef || null,
      status: 'ACTIVE',
    });
    return repository.save(entity);
  }

  /**
   * Update app
   * @param appId - App UUID
   * @param data - Update data
   * @param manager - Optional transaction manager
   * @returns Updated app entity
   */
  async update(
    appId: string,
    data: {
      name?: string;
      callbackBaseUrl?: string | null;
      callbackAllowlistPaths?: string[] | null;
      callbackSecretRef?: string | null;
      status?: 'ACTIVE' | 'SUSPENDED';
    },
    manager?: EntityManager,
  ): Promise<AppEntity> {
    const repository = manager ? manager.getRepository(AppEntity) : this.repo;
    await repository.update(appId, data);
    const updated = await this.findById(appId, manager);
    if (!updated) {
      throw new Error('App not found after update');
    }
    return updated;
  }
}
