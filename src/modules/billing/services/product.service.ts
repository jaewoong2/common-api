import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ProductRepository } from '../repositories/product.repository';
import { ProductType } from '../../../common/enums';
import { ProductEntity } from '../../../database/entities/product.entity';
import { CreateProductDto, UpdateProductDto } from '../dto/product.dto';
import { JsonObject } from '@common/types/json-value.type';

/**
 * Product Service
 * @description Handles product CRUD operations
 */
@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);

  constructor(private readonly productRepository: ProductRepository) {}

  /**
   * List active products (controller method)
   * @returns Array of active products
   */
  async listProducts(appId: string): Promise<ProductEntity[]> {
    return this._listProducts(appId);
  }

  /**
   * Create product (controller method)
   * @param dto - Create product DTO
   * @returns Created product
   */
  async createProduct(
    appId: string,
    dto: CreateProductDto,
  ): Promise<ProductEntity> {
    const defaultPrice = dto.default_price || '0';
    return this._createProduct(
      appId,
      dto.type as ProductType,
      dto.name,
      defaultPrice,
      dto.metadata,
      dto.is_active,
    );
  }

  /**
   * Internal: List active products for an app
   * @private
   */
  private async _listProducts(appId: string): Promise<ProductEntity[]> {
    this.logger.log(`Listing products for app ${appId}`);

    const products = await this.productRepository.findByApp(appId);

    return products;
  }

  /**
   * Get product by ID
   * @param productId - Product ID
   * @returns Product entity
   */
  async getProduct(productId: string): Promise<ProductEntity> {
    const product = await this.productRepository.findById(productId);

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  /**
   * Internal: Create new product (admin only)
   * @private
   */
  private async _createProduct(
    appId: string,
    type: ProductType,
    name: string,
    defaultPrice: string,
    metadata?: JsonObject,
    isActive: boolean = true,
  ): Promise<ProductEntity> {
    this.logger.log(`Creating product ${name} for app ${appId}`);

    // Validate price
    const priceBigInt = BigInt(defaultPrice);
    if (priceBigInt <= 0) {
      throw new BadRequestException('Price must be positive');
    }

    // Validate name
    if (!name || name.trim().length === 0) {
      throw new BadRequestException('Product name cannot be empty');
    }

    // Create product
    const product = await this.productRepository.create({
      appId,
      type,
      name: name.trim(),
      defaultPrice,
      metadata: metadata || null,
      isActive,
    });

    this.logger.log(`Created product ${product.id}`);

    return product;
  }

  /**
   * Update product (admin only)
   * @param productId - Product ID
   * @param data - Product update data
   * @returns Updated product entity
   */
  async updateProduct(
    productId: string,
    data: {
      name?: string;
      defaultPrice?: string;
      metadata?: JsonObject;
      isActive?: boolean;
    },
  ): Promise<ProductEntity> {
    this.logger.log(`Updating product ${productId}`);

    // Check if product exists
    const product = await this.productRepository.findById(productId);

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Validate price if provided
    if (data.defaultPrice) {
      const priceBigInt = BigInt(data.defaultPrice);
      if (priceBigInt <= 0) {
        throw new BadRequestException('Price must be positive');
      }
    }

    // Validate name if provided
    if (data.name !== undefined) {
      if (!data.name || data.name.trim().length === 0) {
        throw new BadRequestException('Product name cannot be empty');
      }
      data.name = data.name.trim();
    }

    // Update product
    const updatedProduct = await this.productRepository.update(productId, data);

    this.logger.log(`Updated product ${productId}`);

    return updatedProduct;
  }

  /**
   * Deactivate product (soft delete)
   * @param productId - Product ID
   * @returns Updated product entity
   */
  async deactivateProduct(productId: string): Promise<ProductEntity> {
    this.logger.log(`Deactivating product ${productId}`);

    return this.updateProduct(productId, { isActive: false });
  }

  /**
   * Activate product
   * @param productId - Product ID
   * @returns Updated product entity
   */
  async activateProduct(productId: string): Promise<ProductEntity> {
    this.logger.log(`Activating product ${productId}`);

    return this.updateProduct(productId, { isActive: true });
  }
}
