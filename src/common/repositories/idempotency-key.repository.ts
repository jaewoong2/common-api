import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { IdempotencyKeyEntity } from '../../database/entities/idempotency-key.entity';
import { JsonValue } from '@common/types/json-value.type';

/**
 * Idempotency Key Repository
 * @description Handles idempotency key storage for financial operations
 */
@Injectable()
export class IdempotencyKeyRepository {
  constructor(
    @InjectRepository(IdempotencyKeyEntity)
    private readonly repo: Repository<IdempotencyKeyEntity>,
  ) {}

  /**
   * Find idempotency key by app and key
   * @param appId - App UUID
   * @param idempotencyKey - Client-provided idempotency key
   * @param manager - Optional transaction manager
   * @returns Idempotency key entity or null
   */
  async findByKey(
    appId: string,
    idempotencyKey: string,
    manager?: EntityManager,
  ): Promise<IdempotencyKeyEntity | null> {
    const repository = manager
      ? manager.getRepository(IdempotencyKeyEntity)
      : this.repo;
    return repository.findOne({
      where: { appId, idempotencyKey },
    });
  }

  /**
   * Create new idempotency key record
   * @param data - Idempotency key data
   * @param manager - Optional transaction manager
   * @returns Created entity
   */
  async create(
    data: {
      appId: string;
      idempotencyKey: string;
      requestHash: string;
      responseBody: JsonValue;
      httpStatus: number;
    },
    manager?: EntityManager,
  ): Promise<IdempotencyKeyEntity> {
    const repository = manager
      ? manager.getRepository(IdempotencyKeyEntity)
      : this.repo;
    const entity = repository.create(data);
    return repository.save(entity);
  }
}
