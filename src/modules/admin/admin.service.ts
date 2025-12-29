import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { UserRepository } from '../user/repositories/user.repository';
import { PointService } from '../point/point.service';
import { JobService } from '../job/job.service';
import { JobRepository } from '../job/repositories/job.repository';
import { UserStatus, WalletReason, JobStatus, JobType } from '../../common/enums';
import { JobEntity } from '../../database/entities/job.entity';

/**
 * Admin Service
 * @description Handles admin operations (user management, wallet adjustments, job management)
 */
@Injectable()
export class AdminService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly pointService: PointService,
    private readonly jobService: JobService,
    private readonly jobRepository: JobRepository,
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
  ) {}

  /**
   * Suspend user account
   * @param userId - User UUID
   * @returns Updated user entity
   */
  async suspendUser(userId: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new BadRequestException('User is already suspended');
    }

    await this.userRepository.updateStatus(userId, UserStatus.SUSPENDED);
  }

  /**
   * Unsuspend user account
   * @param userId - User UUID
   * @returns Updated user entity
   */
  async unsuspendUser(userId: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    if (user.status !== UserStatus.SUSPENDED) {
      throw new BadRequestException('User is not suspended');
    }

    await this.userRepository.updateStatus(userId, UserStatus.ACTIVE);
  }

  /**
   * Admin wallet adjustment (credit or debit)
   * @param appId - App UUID
   * @param userId - User UUID
   * @param amount - Amount to adjust (positive for credit, negative for debit)
   * @param reason - Reason for adjustment
   * @param idempotencyKey - Idempotency key
   * @returns Ledger entries
   */
  async adjustWallet(
    appId: string,
    userId: string,
    amount: string,
    reason: string,
    idempotencyKey: string,
  ): Promise<any> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    const amountBigInt = BigInt(amount);
    if (amountBigInt === BigInt(0)) {
      throw new BadRequestException('Amount cannot be zero');
    }

    // Determine direction
    const isCredit = amountBigInt > 0;
    const absoluteAmount = isCredit ? amount : (-amountBigInt).toString();

    if (isCredit) {
      // Credit wallet
      return this.pointService.creditWallet(
        appId,
        userId,
        absoluteAmount,
        WalletReason.ADMIN_ADJUST,
        'admin_adjustment',
        `admin_adj_${idempotencyKey}`,
        undefined,
        idempotencyKey,
      );
    } else {
      // Debit wallet
      return this.pointService.debitWallet(
        appId,
        userId,
        absoluteAmount,
        WalletReason.ADMIN_ADJUST,
        'admin_adjustment',
        `admin_adj_${idempotencyKey}`,
        idempotencyKey,
      );
    }
  }

  /**
   * List jobs with filters
   * @param appId - App UUID
   * @param filters - Query filters
   * @returns Jobs and total count
   */
  async listJobs(
    appId: string,
    filters: {
      status?: JobStatus;
      type?: JobType;
      limit?: number;
      offset?: number;
    },
  ): Promise<{
    jobs: JobEntity[];
    total: number;
  }> {
    return this.jobRepository.findWithFilters(appId, filters);
  }

  /**
   * Retry failed job
   * @param jobId - Job UUID
   * @returns Updated job entity
   */
  async retryJob(jobId: string): Promise<JobEntity> {
    return this.jobService.retryJob(jobId);
  }

  /**
   * Mark job as dead letter
   * @param jobId - Job UUID
   * @returns Updated job entity
   */
  async deadletterJob(jobId: string): Promise<JobEntity> {
    return this.jobService.deadletterJob(jobId);
  }

  /**
   * Get job details
   * @param jobId - Job UUID
   * @returns Job entity
   */
  async getJob(jobId: string): Promise<JobEntity> {
    return this.jobService.getJob(jobId);
  }
}
