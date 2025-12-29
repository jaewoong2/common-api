import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { ProductEntity } from '../../../database/entities/product.entity';
import { ProductType } from '../../../common/enums';
import { JsonObject } from '@common/types/json-value.type';

/**
 * Product Repository
 * @description Handles product data access operations
 */
@Injectable()
export class ProductRepository {
  constructor(
    @InjectRepository(ProductEntity)
    private readonly repo: Repository<ProductEntity>,
  ) {}

  /**
   * Find product by ID
   * @param id - Product ID
   * @returns Product entity or null
   */
  async findById(id: string): Promise<ProductEntity | null> {
    return this.repo.findOne({ where: { id } });
  }

  /**
   * Find active products by app ID
   * @param appId - App identifier
   * @returns Array of active products
   */
  async findByApp(appId: string): Promise<ProductEntity[]> {
    return this.repo.find({
      where: {
        appId,
        isActive: true,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  /**
   * Create new product
   * @param data - Product creation data
   * @param manager - Optional EntityManager for transaction
   * @returns Created product entity
   */
  async create(
    data: {
      appId: string;
      type: ProductType;
      name: string;
      defaultPrice: string;
      metadata?: JsonObject | null;
      isActive?: boolean;
    },
    manager?: EntityManager,
  ): Promise<ProductEntity> {
    const repository = manager ? manager.getRepository(ProductEntity) : this.repo;

    const product = repository.create(data);
    return repository.save(product);
  }

  /**
   * Update product
   * @param id - Product ID
   * @param data - Product update data
   * @param manager - Optional EntityManager for transaction
   * @returns Updated product entity
   */
  async update(
    id: string,
    data: {
      name?: string;
      defaultPrice?: string;
      metadata?: JsonObject | null;
      isActive?: boolean;
    },
    manager?: EntityManager,
  ): Promise<ProductEntity> {
    const repository = manager ? manager.getRepository(ProductEntity) : this.repo;

    await repository.update(id, data);
    return this.findById(id);
  }
}
