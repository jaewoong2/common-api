import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager, LessThanOrEqual, In } from 'typeorm';
import { JobEntity } from '../../../database/entities/job.entity';
import { JobType, JobStatus, ExecutionType } from '../../../common/enums';
import { JsonObject } from '@common/types/json-value.type';

/**
 * Job Repository
 * @description Handles job queue operations with pessimistic locking
 */
@Injectable()
export class JobRepository {
  constructor(
    @InjectRepository(JobEntity)
    private readonly repo: Repository<JobEntity>,
  ) {}

  /**
   * Find job by ID
   * @param jobId - Job UUID
   * @param manager - Optional transaction manager
   * @returns Job entity or null
   */
  async findById(
    jobId: string,
    manager?: EntityManager,
  ): Promise<JobEntity | null> {
    const repository = manager ? manager.getRepository(JobEntity) : this.repo;
    return repository.findOne({ where: { id: jobId } });
  }

  /**
   * Create new job (supports both legacy and unified job system)
   * @param data - Job creation data
   * @param manager - Optional transaction manager
   * @returns Created job entity
   */
  async create(
    data: {
      appId: string;
      // Legacy fields (deprecated)
      type?: JobType | null;
      payload?: JsonObject | null;
      // New unified job system fields
      executionType?: ExecutionType | null;
      lambdaProxyMessage?: JsonObject | null;
      executionConfig?: JsonObject | null;
      messageGroupId?: string | null;
      idempotencyKey?: string | null;
      scheduleArn?: string | null;
      // Common fields
      status?: JobStatus;
      retryCount?: number;
      maxRetries?: number;
      nextRetryAt?: Date | null;
      lastError?: string | null;
    },
    manager?: EntityManager,
  ): Promise<JobEntity> {
    const repository = manager ? manager.getRepository(JobEntity) : this.repo;
    const entity = repository.create({
      appId: data.appId,
      // Legacy fields
      type: data.type ?? null,
      payload: data.payload ?? null,
      // New fields
      executionType: data.executionType ?? null,
      lambdaProxyMessage: data.lambdaProxyMessage ?? null,
      executionConfig: data.executionConfig ?? null,
      messageGroupId: data.messageGroupId ?? null,
      idempotencyKey: data.idempotencyKey ?? null,
      scheduleArn: data.scheduleArn ?? null,
      // Common fields
      status: data.status ?? JobStatus.PENDING,
      retryCount: data.retryCount ?? 0,
      maxRetries: data.maxRetries ?? 10,
      nextRetryAt: data.nextRetryAt ?? new Date(),
      lastError: data.lastError ?? null,
    });
    return repository.save(entity);
  }

  /**
   * Get due jobs with pessimistic locking (SELECT FOR UPDATE SKIP LOCKED)
   * @param limit - Maximum number of jobs to fetch
   * @param manager - Optional transaction manager
   * @returns Array of locked job entities
   */
  async getDueJobsForUpdate(
    limit: number,
    manager?: EntityManager,
  ): Promise<JobEntity[]> {
    const repository = manager ? manager.getRepository(JobEntity) : this.repo;

    return repository
      .createQueryBuilder('job')
      .where('job.status IN (:...statuses)', {
        statuses: [JobStatus.PENDING, JobStatus.RETRYING]
      })
      .andWhere('job.nextRetryAt <= :now', { now: new Date() })
      .orderBy('job.nextRetryAt', 'ASC')
      .limit(limit)
      .setLock('pessimistic_write_or_fail')
      .setOnLocked('skip_locked')
      .getMany();
  }

  /**
   * Update job status and retry info
   * @param jobId - Job UUID
   * @param data - Update data
   * @param manager - Optional transaction manager
   */
  async update(
    jobId: string,
    data: {
      status?: JobStatus;
      retryCount?: number;
      nextRetryAt?: Date | null;
      lastError?: string | null;
      scheduleArn?: string | null;
      executionConfig?: JsonObject | null;
    },
    manager?: EntityManager,
  ): Promise<void> {
    const repository = manager ? manager.getRepository(JobEntity) : this.repo;
    await repository.update(jobId, data);
  }

  /**
   * Find jobs with filters (for admin)
   * @param appId - App UUID
   * @param filters - Query filters
   * @param manager - Optional transaction manager
   * @returns Job entities
   */
  async findWithFilters(
    appId: string,
    filters: {
      status?: JobStatus;
      type?: JobType;
      limit?: number;
      offset?: number;
    },
    manager?: EntityManager,
  ): Promise<{ jobs: JobEntity[]; total: number }> {
    const repository = manager ? manager.getRepository(JobEntity) : this.repo;
    
    const queryBuilder = repository
      .createQueryBuilder('job')
      .where('job.appId = :appId', { appId });

    if (filters.status) {
      queryBuilder.andWhere('job.status = :status', { status: filters.status });
    }

    if (filters.type) {
      queryBuilder.andWhere('job.type = :type', { type: filters.type });
    }

    queryBuilder.orderBy('job.createdAt', 'DESC');

    if (filters.limit) {
      queryBuilder.limit(filters.limit);
    }

    if (filters.offset) {
      queryBuilder.offset(filters.offset);
    }

    const [jobs, total] = await queryBuilder.getManyAndCount();
    return { jobs, total };
  }
}
