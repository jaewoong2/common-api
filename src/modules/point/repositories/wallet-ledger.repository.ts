import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { WalletLedgerEntity } from '../../../database/entities/wallet-ledger.entity';
import { WalletDirection, WalletReason } from '../../../common/enums';

/**
 * Wallet Ledger Repository
 * @description Handles append-only transaction log operations
 */
@Injectable()
export class WalletLedgerRepository {
  constructor(
    @InjectRepository(WalletLedgerEntity)
    private readonly repo: Repository<WalletLedgerEntity>,
  ) {}

  /**
   * Create ledger entry (append-only)
   */
  async create(
    data: {
      appId: string;
      userId: string;
      lotId: string | null;
      direction: WalletDirection;
      amount: string;
      reason: WalletReason;
      refType: string;
      refId: string;
      balanceSnapshot: string;
    },
    manager?: EntityManager,
  ): Promise<WalletLedgerEntity> {
    const repository = manager ? manager.getRepository(WalletLedgerEntity) : this.repo;

    const entry = repository.create(data);
    return repository.save(entry);
  }

  /**
   * Get user's transaction history with pagination
   */
  async getUserLedger(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      direction?: WalletDirection;
    } = {},
  ): Promise<{
    entries: WalletLedgerEntity[];
    total: number;
  }> {
    const { limit = 20, offset = 0, direction } = options;

    const queryBuilder = this.repo
      .createQueryBuilder('ledger')
      .where('ledger.userId = :userId', { userId });

    if (direction) {
      queryBuilder.andWhere('ledger.direction = :direction', { direction });
    }

    queryBuilder
      .orderBy('ledger.createdAt', 'DESC')
      .skip(offset)
      .take(limit);

    const [entries, total] = await queryBuilder.getManyAndCount();

    return { entries, total };
  }

  /**
   * Get ledger entries by reference (for traceability)
   */
  async getByReference(refType: string, refId: string): Promise<WalletLedgerEntity[]> {
    return this.repo.find({
      where: {
        refType,
        refId,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  /**
   * Get ledger entries for a specific lot
   */
  async getByLot(lotId: string): Promise<WalletLedgerEntity[]> {
    return this.repo.find({
      where: {
        lotId,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  /**
   * Get user's last balance snapshot
   */
  async getLastBalanceSnapshot(userId: string): Promise<string | null> {
    const entry = await this.repo.findOne({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    return entry?.balanceSnapshot || null;
  }
}
