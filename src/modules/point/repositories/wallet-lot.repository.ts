import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager, MoreThan } from 'typeorm';
import { WalletLotEntity } from '../../../database/entities/wallet-lot.entity';

/**
 * Wallet Lot Repository
 * @description Handles point lot operations with FIFO logic
 */
@Injectable()
export class WalletLotRepository {
  constructor(
    @InjectRepository(WalletLotEntity)
    private readonly repo: Repository<WalletLotEntity>,
  ) {}

  /**
   * Create new wallet lot (for credit operations)
   */
  async create(
    data: {
      appId: string;
      userId: string;
      initialAmount: string;
      expiresAt?: Date;
    },
    manager?: EntityManager,
  ): Promise<WalletLotEntity> {
    const repository = manager ? manager.getRepository(WalletLotEntity) : this.repo;

    const lot = repository.create({
      appId: data.appId,
      userId: data.userId,
      initialAmount: data.initialAmount,
      remainingAmount: data.initialAmount,
      expiresAt: data.expiresAt || null, // NULL = no expiration
    });

    return repository.save(lot);
  }

  /**
   * Get user's available lots for FIFO deduction
   * @param userId - User ID
   * @param manager - Optional transaction manager for locking
   * @returns Lots ordered by created_at ASC (oldest first)
   */
  async getAvailableLotsForDebit(
    userId: string,
    manager?: EntityManager,
  ): Promise<WalletLotEntity[]> {
    const repository = manager ? manager.getRepository(WalletLotEntity) : this.repo;

    const queryBuilder = repository
      .createQueryBuilder('lot')
      .where('lot.userId = :userId', { userId })
      .andWhere('lot.remainingAmount > :zero', { zero: '0' })
      .orderBy('lot.createdAt', 'ASC'); // FIFO: oldest first

    // Add pessimistic write lock if using transaction
    if (manager) {
      queryBuilder.setLock('pessimistic_write');
    }

    return queryBuilder.getMany();
  }

  /**
   * Update lot remaining amount (for debit operations)
   */
  async updateRemainingAmount(
    lotId: string,
    newAmount: string,
    manager?: EntityManager,
  ): Promise<void> {
    const repository = manager ? manager.getRepository(WalletLotEntity) : this.repo;

    await repository.update(lotId, {
      remainingAmount: newAmount,
    });
  }

  /**
   * Get total user balance (sum of all remaining amounts)
   */
  async getUserBalance(userId: string): Promise<string> {
    const result = await this.repo
      .createQueryBuilder('lot')
      .select('SUM(lot.remainingAmount)', 'total')
      .where('lot.userId = :userId', { userId })
      .andWhere('lot.remainingAmount > :zero', { zero: '0' })
      .getRawOne();

    return result?.total || '0';
  }

  /**
   * Get user's lots with remaining balance (for balance details)
   */
  async getUserLots(userId: string): Promise<WalletLotEntity[]> {
    return this.repo.find({
      where: {
        userId,
        remainingAmount: MoreThan('0'),
      },
      order: {
        createdAt: 'ASC',
      },
    });
  }

  /**
   * Find lot by ID
   */
  async findById(lotId: string): Promise<WalletLotEntity | null> {
    return this.repo.findOne({ where: { id: lotId } });
  }
}
