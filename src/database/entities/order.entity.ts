import {
  Entity,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../core/database/base.entity';
import { OrderStatus } from '../../common/enums';
import { UserEntity } from './user.entity';
import { ProductEntity } from './product.entity';

/**
 * Order Entity
 * @description Represents a purchase transaction using points
 * @note Orders are paid with wallet debit in same transaction
 */
@Entity({ name: 'orders', schema: 'common' })
@Index(['appId', 'userId'])
@Index(['status'])
@Index(['createdAt'])
export class OrderEntity extends BaseEntity {
  /**
   * App ID for multi-tenancy
   */
  @Column({ name: 'app_id', type: 'uuid' })
  appId: string;

  /**
   * User who placed this order
   */
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => UserEntity, (user) => user.orders)
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  /**
   * Product being purchased
   */
  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @ManyToOne(() => ProductEntity, (product) => product.orders)
  @JoinColumn({ name: 'product_id' })
  product: ProductEntity;

  /**
   * Quantity of product
   */
  @Column({ type: 'integer', default: 1 })
  quantity: number;

  /**
   * Total amount charged (quantity * price at time of purchase)
   */
  @Column({ name: 'total_amount', type: 'bigint' })
  totalAmount: string;

  /**
   * Order status (PENDING, PAID, REFUNDED)
   */
  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status: OrderStatus;

  /**
   * Reference type for traceability
   */
  @Column({ name: 'ref_type', type: 'varchar', length: 100 })
  refType: string;

  /**
   * Reference ID for traceability
   */
  @Column({ name: 'ref_id', type: 'varchar', length: 255 })
  refId: string;
}
