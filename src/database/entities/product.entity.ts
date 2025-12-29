import {
  Entity,
  Column,
  Index,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '../../core/database/base.entity';
import { ProductType } from '../../common/enums';
import { JsonObject } from '@common/types/json-value.type';
import { OrderEntity } from './order.entity';

/**
 * Product Entity
 * @description Represents purchasable items/services
 * @note For MVP, includes default_price; separate price management can be added later
 */
@Entity({ name: 'products', schema: 'common' })
@Index(['appId', 'isActive'])
@Index(['type'])
export class ProductEntity extends BaseEntity {
  /**
   * App ID for multi-tenancy
   */
  @Column({ name: 'app_id', type: 'uuid' })
  appId: string;

  /**
   * Product type (DIGITAL, SUBSCRIPTION, PHYSICAL)
   */
  @Column({
    type: 'enum',
    enum: ProductType,
  })
  type: ProductType;

  /**
   * Product name
   */
  @Column({ type: 'varchar', length: 255 })
  name: string;

  /**
   * Default price in points
   * @note For MVP; separate price table can be added later
   */
  @Column({ name: 'default_price', type: 'bigint' })
  defaultPrice: string;

  /**
   * Additional product metadata (description, images, features, etc.)
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: JsonObject | null;

  /**
   * Whether product is available for purchase
   */
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  // Relations
  @OneToMany(() => OrderEntity, (order) => order.product)
  orders: OrderEntity[];
}
