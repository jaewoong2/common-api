import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, EntityManager, Between, FindOptionsWhere } from "typeorm";
import { TradeLogEntity } from "../../../database/entities";
import { TradeStatus } from "../../../common/enums";

/**
 * Trade Log Query Options
 */
export interface TradeLogQueryOptions {
  userId: string;
  page?: number;
  limit?: number;
  status?: TradeStatus;
  ticker?: string;
  market?: string;
  provider?: string;
  from?: Date;
  to?: Date;
}

/**
 * Trade Log Repository
 * @description 거래 이력 데이터 액세스
 */
@Injectable()
export class TradeLogRepository {
  constructor(
    @InjectRepository(TradeLogEntity)
    private readonly repository: Repository<TradeLogEntity>,
  ) {}

  /**
   * 거래 이력 조회 (페이징 + 필터)
   */
  async findByFilter(
    options: TradeLogQueryOptions,
    manager?: EntityManager,
  ): Promise<{ items: TradeLogEntity[]; total: number }> {
    const repo = manager?.getRepository(TradeLogEntity) ?? this.repository;
    const {
      userId,
      page = 1,
      limit = 20,
      status,
      ticker,
      market,
      provider,
      from,
      to,
    } = options;

    const where: FindOptionsWhere<TradeLogEntity> = { userId };

    if (status) where.status = status;
    if (ticker) where.ticker = ticker;
    if (market) where.market = market;
    if (provider) where.provider = provider;

    const queryBuilder = repo
      .createQueryBuilder("tl")
      .where("tl.userId = :userId", { userId });

    if (status) queryBuilder.andWhere("tl.status = :status", { status });
    if (ticker) queryBuilder.andWhere("tl.ticker = :ticker", { ticker });
    if (market) queryBuilder.andWhere("tl.market = :market", { market });
    if (provider)
      queryBuilder.andWhere("tl.provider = :provider", { provider });
    if (from) queryBuilder.andWhere("tl.createdAt >= :from", { from });
    if (to) queryBuilder.andWhere("tl.createdAt <= :to", { to });

    const [items, total] = await queryBuilder
      .orderBy("tl.createdAt", "DESC")
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { items, total };
  }

  /**
   * ID로 상세 조회
   */
  async findById(
    id: string,
    manager?: EntityManager,
  ): Promise<TradeLogEntity | null> {
    const repo = manager?.getRepository(TradeLogEntity) ?? this.repository;
    return repo.findOne({ where: { id } });
  }

  /**
   * 사용자 ID + log ID로 조회 (소유권 확인)
   */
  async findByIdAndUserId(
    id: string,
    userId: string,
    manager?: EntityManager,
  ): Promise<TradeLogEntity | null> {
    const repo = manager?.getRepository(TradeLogEntity) ?? this.repository;
    return repo.findOne({ where: { id, userId } });
  }

  /**
   * 거래 이력 생성
   */
  async create(
    data: Partial<TradeLogEntity>,
    manager?: EntityManager,
  ): Promise<TradeLogEntity> {
    const repo = manager?.getRepository(TradeLogEntity) ?? this.repository;
    const entity = repo.create(data);
    return repo.save(entity);
  }
}
