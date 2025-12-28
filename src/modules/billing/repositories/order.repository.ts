import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { OrderEntity } from '../../../database/entities/order.entity';
import { OrderStatus } from '../../../common/enums';

/**
 * Order Repository
 * @description Handles order data access operations
 */
@Injectable()
export class OrderRepository {
  constructor(
    @InjectRepository(OrderEntity)
    private readonly repo: Repository<OrderEntity>,
  ) {}

  /**
   * Find order by ID
   * @param id - Order ID
   * @returns Order entity or null
   */
  async findById(id: string): Promise<OrderEntity | null> {
    return this.repo.findOne({
      where: { id },
      relations: ['product', 'user'],
    });
  }

  /**
   * Create new order
   * @param data - Order creation data
   * @param manager - Optional EntityManager for transaction
   * @returns Created order entity
   */
  async create(
    data: {
      appId: string;
      userId: string;
      productId: string;
      quantity: number;
      totalAmount: string;
      status?: OrderStatus;
      refType: string;
      refId: string;
    },
    manager?: EntityManager,
  ): Promise<OrderEntity> {
    const repository = manager ? manager.getRepository(OrderEntity) : this.repo;

    const order = repository.create(data);
    return repository.save(order);
  }

  /**
   * Update order status
   * @param id - Order ID
   * @param status - New order status
   * @param manager - Optional EntityManager for transaction
   */
  async updateStatus(
    id: string,
    status: OrderStatus,
    manager?: EntityManager,
  ): Promise<void> {
    const repository = manager ? manager.getRepository(OrderEntity) : this.repo;

    await repository.update(id, { status });
  }

  /**
   * Get user's orders with pagination
   * @param userId - User ID
   * @param options - Pagination options
   * @returns Orders and total count
   */
  async getUserOrders(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      status?: OrderStatus;
    } = {},
  ): Promise<{
    orders: OrderEntity[];
    total: number;
  }> {
    const { limit = 20, offset = 0, status } = options;

    const queryBuilder = this.repo
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.product', 'product')
      .where('order.userId = :userId', { userId });

    if (status) {
      queryBuilder.andWhere('order.status = :status', { status });
    }

    queryBuilder
      .orderBy('order.createdAt', 'DESC')
      .skip(offset)
      .take(limit);

    const [orders, total] = await queryBuilder.getManyAndCount();

    return { orders, total };
  }
}
