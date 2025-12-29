import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { OrderRepository } from '../repositories/order.repository';
import { ProductRepository } from '../repositories/product.repository';
import { PointService } from '../../point/point.service';
import { OrderStatus, WalletReason } from '../../../common/enums';
import { OrderEntity } from '../../../database/entities/order.entity';
import { CreateOrderDto, RefundOrderDto } from '../dto/order.dto';

/**
 * Order Service
 * @description Handles order creation and refunds with atomic wallet operations
 */
@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly productRepository: ProductRepository,
    private readonly pointService: PointService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Create order (controller method)
   * @param dto - Create order DTO
   * @returns Created order entity
   */
  async createOrder(
    appId: string,
    dto: CreateOrderDto,
  ): Promise<OrderEntity> {
    const idempotencyKey = dto.idempotency_key;
    return this._createOrder(
      appId,
      dto.user_id,
      dto.price_id,
      dto.quantity,
      dto.ref_type,
      dto.ref_id,
      idempotencyKey,
    );
  }

  /**
   * Refund order (controller method)
   * @param orderId - Order ID
   * @param dto - Refund order DTO
   * @returns Updated order entity
   */
  async refundOrder(orderId: string, dto: RefundOrderDto): Promise<OrderEntity> {
    return this._refundOrder(
      orderId,
      undefined,
      dto.ref_type,
      dto.ref_id,
      dto.idempotency_key,
    );
  }

  /**
   * Internal: Create order - Debit wallet and create order in single transaction
   * @private
   */
  private async _createOrder(
    appId: string,
    userId: string,
    productId: string,
    quantity: number,
    refType: string,
    refId: string,
    idempotencyKey?: string,
  ): Promise<OrderEntity> {
    this.logger.log(
      `Creating order for user ${userId}, product ${productId}, qty ${quantity}`,
    );

    // Validate quantity
    if (quantity <= 0) {
      throw new BadRequestException('Quantity must be positive');
    }

    // Get product
    const product = await this.productRepository.findById(productId);

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (!product.isActive) {
      throw new BadRequestException('Product is not active');
    }

    // Verify product belongs to app
    if (product.appId !== appId) {
      throw new NotFoundException('Product not found');
    }

    // Calculate total amount
    const pricePerUnit = BigInt(product.defaultPrice);
    const totalAmount = pricePerUnit * BigInt(quantity);

    // Execute order creation in transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const manager = queryRunner.manager;

      // Step 1: Create order with PENDING status
      const order = await this.orderRepository.create(
        {
          appId,
          userId,
          productId,
          quantity,
          totalAmount: totalAmount.toString(),
          status: OrderStatus.PENDING,
          refType,
          refId,
        },
        manager,
      );

      this.logger.log(`Created order ${order.id} with PENDING status`);

      // Step 2: Debit wallet (will throw if insufficient balance)
      // Note: This debit happens in the same transaction
      const debitIdempotencyKey = idempotencyKey
        ? `order:${order.id}:debit`
        : undefined;

      await this.pointService.debitWallet(
        appId,
        userId,
        totalAmount.toString(),
        WalletReason.BUY_ITEM,
        'order',
        order.id,
        debitIdempotencyKey,
      );

      this.logger.log(`Debited ${totalAmount} points for order ${order.id}`);

      // Step 3: Update order status to PAID
      await this.orderRepository.updateStatus(order.id, OrderStatus.PAID, manager);

      await queryRunner.commitTransaction();

      this.logger.log(`Order ${order.id} completed successfully`);

      // Return order with relations
      return this.orderRepository.findById(order.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Error creating order: ${error.message}`,
        error.stack,
      );
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Internal: Refund order - Credit wallet and update order status in single transaction
   * @private
   */
  private async _refundOrder(
    orderId: string,
    refundAmount?: string,
    refType?: string,
    refId?: string,
    idempotencyKey?: string,
  ): Promise<OrderEntity> {
    this.logger.log(`Refunding order ${orderId}`);

    // Get order
    const order = await this.orderRepository.findById(orderId);

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Validate order status
    if (order.status !== OrderStatus.PAID) {
      throw new BadRequestException(
        `Cannot refund order with status ${order.status}. Order must be PAID.`,
      );
    }

    // Determine refund amount (default to full refund)
    const refundAmountBigInt = refundAmount
      ? BigInt(refundAmount)
      : BigInt(order.totalAmount);

    const totalAmountBigInt = BigInt(order.totalAmount);

    // Validate refund amount
    if (refundAmountBigInt <= 0) {
      throw new BadRequestException('Refund amount must be positive');
    }

    if (refundAmountBigInt > totalAmountBigInt) {
      throw new BadRequestException(
        'Refund amount cannot exceed order total amount',
      );
    }

    // Execute refund in transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const manager = queryRunner.manager;

      // Step 1: Credit wallet
      const creditIdempotencyKey = idempotencyKey
        ? `order:${orderId}:refund`
        : undefined;

      await this.pointService.creditWallet(
        order.appId,
        order.userId,
        refundAmountBigInt.toString(),
        WalletReason.REFUND,
        refType || 'order_refund',
        refId || orderId,
        undefined, // No expiration for refunded points
        creditIdempotencyKey,
      );

      this.logger.log(
        `Credited ${refundAmountBigInt} points for order ${orderId} refund`,
      );

      // Step 2: Update order status to REFUNDED
      await this.orderRepository.updateStatus(
        orderId,
        OrderStatus.REFUNDED,
        manager,
      );

      await queryRunner.commitTransaction();

      this.logger.log(`Order ${orderId} refunded successfully`);

      // Return updated order
      return this.orderRepository.findById(orderId);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Error refunding order: ${error.message}`,
        error.stack,
      );
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get order by ID
   * @param orderId - Order ID
   * @returns Order entity
   */
  async getOrder(orderId: string): Promise<OrderEntity> {
    const order = await this.orderRepository.findById(orderId);

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  /**
   * Get user's orders
   * @param userId - User ID
   * @param limit - Number of orders to return
   * @param offset - Number of orders to skip
   * @param status - Optional filter by status
   * @returns Orders and total count
   */
  async getUserOrders(
    userId: string,
    limit: number = 20,
    offset: number = 0,
    status?: OrderStatus,
  ): Promise<{
    orders: OrderEntity[];
    total: number;
  }> {
    return this.orderRepository.getUserOrders(userId, {
      limit,
      offset,
      status,
    });
  }
}
