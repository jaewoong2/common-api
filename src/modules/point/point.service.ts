import {
  Injectable,
  Logger,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { WalletLotRepository } from './repositories/wallet-lot.repository';
import { WalletLedgerRepository } from './repositories/wallet-ledger.repository';
import { IdempotencyKeyRepository } from '../../common/repositories/idempotency-key.repository';
import { WalletDirection, WalletReason } from '../../common/enums';
import { WalletLedgerEntity } from '../../database/entities/wallet-ledger.entity';
import * as crypto from 'crypto';

/**
 * Point/Wallet Service
 * @description Handles wallet operations with FIFO lot-based point system
 */
@Injectable()
export class PointService {
  private readonly logger = new Logger(PointService.name);

  constructor(
    private readonly walletLotRepository: WalletLotRepository,
    private readonly walletLedgerRepository: WalletLedgerRepository,
    private readonly idempotencyKeyRepository: IdempotencyKeyRepository,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Credit wallet - Add points (create lot + ledger entry)
   * @param appId - App identifier
   * @param userId - User ID
   * @param amount - Amount to credit
   * @param reason - Reason for credit
   * @param refType - Reference type
   * @param refId - Reference ID
   * @param expiresAt - Optional expiration date
   * @param idempotencyKey - Optional idempotency key
   * @returns Created ledger entry
   */
  async creditWallet(
    appId: string,
    userId: string,
    amount: string,
    reason: WalletReason,
    refType: string,
    refId: string,
    expiresAt?: Date,
    idempotencyKey?: string,
  ): Promise<WalletLedgerEntity> {
    this.logger.log(`Crediting ${amount} points to user ${userId}`);

    // Validate amount
    const amountBigInt = BigInt(amount);
    if (amountBigInt <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    // Check idempotency if key provided
    if (idempotencyKey) {
      const existing = await this.checkIdempotency(appId, idempotencyKey, {
        amount,
        userId,
        reason,
        refType,
        refId,
      });

      if (existing) {
        this.logger.log(`Idempotency key ${idempotencyKey} already processed`);
        // Return the first ledger entry from the cached response
        return existing.responseBody as WalletLedgerEntity;
      }
    }

    // Execute credit in transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const manager = queryRunner.manager;

      // Get current balance
      const currentBalance = BigInt(
        await this.walletLotRepository.getUserBalance(userId),
      );

      // Create new lot
      const lot = await this.walletLotRepository.create(
        {
          appId,
          userId,
          initialAmount: amount,
          expiresAt: expiresAt || undefined,
        },
        manager,
      );

      // Calculate new balance
      const newBalance = currentBalance + amountBigInt;

      // Create ledger entry
      const ledgerEntry = await this.walletLedgerRepository.create(
        {
          appId,
          userId,
          lotId: lot.id,
          direction: WalletDirection.CREDIT,
          amount,
          reason,
          refType,
          refId,
          balanceSnapshot: newBalance.toString(),
        },
        manager,
      );

      // Save idempotency key if provided
      if (idempotencyKey) {
        await this.saveIdempotency(
          appId,
          idempotencyKey,
          { amount, userId, reason, refType, refId },
          ledgerEntry,
          200,
          manager,
        );
      }

      await queryRunner.commitTransaction();

      this.logger.log(
        `Credited ${amount} points to user ${userId}. New balance: ${newBalance}`,
      );

      return ledgerEntry;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Error crediting wallet: ${error.message}`, error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Debit wallet - Deduct points using FIFO from lots
   * @param appId - App identifier
   * @param userId - User ID
   * @param amount - Amount to debit
   * @param reason - Reason for debit
   * @param refType - Reference type
   * @param refId - Reference ID
   * @param idempotencyKey - Optional idempotency key
   * @returns Array of ledger entries (one per lot consumed)
   */
  async debitWallet(
    appId: string,
    userId: string,
    amount: string,
    reason: WalletReason,
    refType: string,
    refId: string,
    idempotencyKey?: string,
  ): Promise<WalletLedgerEntity[]> {
    this.logger.log(`Debiting ${amount} points from user ${userId}`);

    // Validate amount
    const amountBigInt = BigInt(amount);
    if (amountBigInt <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    // Check idempotency if key provided
    if (idempotencyKey) {
      const existing = await this.checkIdempotency(appId, idempotencyKey, {
        amount,
        userId,
        reason,
        refType,
        refId,
      });

      if (existing) {
        this.logger.log(`Idempotency key ${idempotencyKey} already processed`);
        // Return cached ledger entries
        return existing.responseBody as WalletLedgerEntity[];
      }
    }

    // Execute debit in transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const manager = queryRunner.manager;

      // Get current balance
      const currentBalance = BigInt(
        await this.walletLotRepository.getUserBalance(userId),
      );

      // Check sufficient balance
      if (currentBalance < amountBigInt) {
        throw new BadRequestException(
          `Insufficient balance. Required: ${amount}, Available: ${currentBalance}`,
        );
      }

      // Get available lots with FOR UPDATE lock (FIFO: oldest first)
      const lots = await this.walletLotRepository.getAvailableLotsForDebit(
        userId,
        manager,
      );

      let remaining = amountBigInt;
      const ledgerEntries: WalletLedgerEntity[] = [];
      let runningBalance = currentBalance;

      // FIFO consumption: consume oldest lots first
      for (const lot of lots) {
        if (remaining === BigInt(0)) break;

        const lotRemaining = BigInt(lot.remainingAmount);
        const debitFromThisLot = remaining < lotRemaining ? remaining : lotRemaining;
        const newLotRemaining = lotRemaining - debitFromThisLot;

        // Update lot remaining amount
        await this.walletLotRepository.updateRemainingAmount(
          lot.id,
          newLotRemaining.toString(),
          manager,
        );

        // Update running balance
        runningBalance -= debitFromThisLot;

        // Create ledger entry for this lot
        const ledgerEntry = await this.walletLedgerRepository.create(
          {
            appId,
            userId,
            lotId: lot.id,
            direction: WalletDirection.DEBIT,
            amount: debitFromThisLot.toString(),
            reason,
            refType,
            refId,
            balanceSnapshot: runningBalance.toString(),
          },
          manager,
        );

        ledgerEntries.push(ledgerEntry);
        remaining -= debitFromThisLot;
      }

      // Final check: ensure all amount was debited
      if (remaining > BigInt(0)) {
        throw new BadRequestException(
          `Failed to debit full amount. Remaining: ${remaining}`,
        );
      }

      // Save idempotency key if provided
      if (idempotencyKey) {
        await this.saveIdempotency(
          appId,
          idempotencyKey,
          { amount, userId, reason, refType, refId },
          ledgerEntries,
          200,
          manager,
        );
      }

      await queryRunner.commitTransaction();

      this.logger.log(
        `Debited ${amount} points from user ${userId}. New balance: ${runningBalance}`,
      );

      return ledgerEntries;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Error debiting wallet: ${error.message}`, error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get user balance (sum of remaining lots)
   * @param userId - User ID
   * @returns Current balance
   */
  async getBalance(userId: string): Promise<{
    balance: string;
    balanceNumber: number;
  }> {
    const balance = await this.walletLotRepository.getUserBalance(userId);

    return {
      balance,
      balanceNumber: Number(balance),
    };
  }

  /**
   * Get user ledger (transaction history)
   * @param userId - User ID
   * @param limit - Number of entries to return
   * @param offset - Number of entries to skip
   * @returns Ledger entries and total count
   */
  async getLedger(
    userId: string,
    limit: number = 20,
    offset: number = 0,
  ): Promise<{
    entries: WalletLedgerEntity[];
    total: number;
  }> {
    return this.walletLedgerRepository.getUserLedger(userId, {
      limit,
      offset,
    });
  }

  /**
   * Check idempotency key
   * @private
   * @param appId - App identifier
   * @param idempotencyKey - Idempotency key
   * @param requestData - Request data for hash
   * @returns Existing idempotency entity if found
   */
  private async checkIdempotency(
    appId: string,
    idempotencyKey: string,
    requestData: any,
  ) {
    const existing = await this.idempotencyKeyRepository.findByKey(
      appId,
      idempotencyKey,
    );

    if (!existing) {
      return null;
    }

    // Verify request hash matches
    const requestHash = this.hashRequest(requestData);
    if (existing.requestHash !== requestHash) {
      throw new ConflictException(
        'Idempotency key reused with different request body',
      );
    }

    return existing;
  }

  /**
   * Save idempotency key
   * @private
   * @param appId - App identifier
   * @param idempotencyKey - Idempotency key
   * @param requestData - Request data for hash
   * @param responseBody - Response body to cache
   * @param httpStatus - HTTP status code
   * @param manager - Transaction manager
   */
  private async saveIdempotency(
    appId: string,
    idempotencyKey: string,
    requestData: any,
    responseBody: any,
    httpStatus: number,
    manager?: EntityManager,
  ) {
    const requestHash = this.hashRequest(requestData);

    await this.idempotencyKeyRepository.create(
      {
        appId,
        idempotencyKey,
        requestHash,
        responseBody,
        httpStatus,
      },
      manager,
    );
  }

  /**
   * Hash request data for idempotency check
   * @private
   * @param data - Request data
   * @returns SHA-256 hash
   */
  private hashRequest(data: any): string {
    const canonical = JSON.stringify(data);
    return crypto.createHash('sha256').update(canonical).digest('hex');
  }
}
