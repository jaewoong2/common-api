import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, EntityManager } from "typeorm";
import { ExchangeKeyEntity } from "../../../database/entities";

/**
 * Exchange Key Repository
 * @description 거래소 API 키 데이터 액세스
 */
@Injectable()
export class ExchangeKeyRepository {
  constructor(
    @InjectRepository(ExchangeKeyEntity)
    private readonly repository: Repository<ExchangeKeyEntity>,
  ) {}

  /**
   * 새 거래소 키 생성
   */
  async create(
    data: Partial<ExchangeKeyEntity>,
    manager?: EntityManager,
  ): Promise<ExchangeKeyEntity> {
    const repo = manager?.getRepository(ExchangeKeyEntity) ?? this.repository;
    const entity = repo.create(data);
    return repo.save(entity);
  }

  /**
   * ID로 조회
   */
  async findById(
    id: string,
    manager?: EntityManager,
  ): Promise<ExchangeKeyEntity | null> {
    const repo = manager?.getRepository(ExchangeKeyEntity) ?? this.repository;
    return repo.findOne({ where: { id } });
  }

  /**
   * 사용자의 모든 키 조회
   */
  async findByUserId(
    userId: string,
    manager?: EntityManager,
  ): Promise<ExchangeKeyEntity[]> {
    const repo = manager?.getRepository(ExchangeKeyEntity) ?? this.repository;
    return repo.find({
      where: { userId },
      order: { createdAt: "DESC" },
    });
  }

  /**
   * 사용자 + 거래소 + 라벨로 조회
   */
  async findByUserExchangeLabel(
    userId: string,
    exchange: string,
    label: string,
    manager?: EntityManager,
  ): Promise<ExchangeKeyEntity | null> {
    const repo = manager?.getRepository(ExchangeKeyEntity) ?? this.repository;
    return repo.findOne({
      where: { userId, exchange, label },
    });
  }

  /**
   * 사용자 + 거래소로 첫 번째 키 조회 (거래 실행용)
   */
  async findFirstByUserExchange(
    userId: string,
    exchange: string,
    manager?: EntityManager,
  ): Promise<ExchangeKeyEntity | null> {
    const repo = manager?.getRepository(ExchangeKeyEntity) ?? this.repository;
    return repo.findOne({
      where: { userId, exchange },
      order: { createdAt: "ASC" },
    });
  }

  /**
   * 키 삭제
   */
  async delete(id: string, manager?: EntityManager): Promise<boolean> {
    const repo = manager?.getRepository(ExchangeKeyEntity) ?? this.repository;
    const result = await repo.delete(id);
    return (result.affected ?? 0) > 0;
  }

  /**
   * 사용자 ID + 키 ID로 소유권 확인 후 조회
   */
  async findByIdAndUserId(
    id: string,
    userId: string,
    manager?: EntityManager,
  ): Promise<ExchangeKeyEntity | null> {
    const repo = manager?.getRepository(ExchangeKeyEntity) ?? this.repository;
    return repo.findOne({
      where: { id, userId },
    });
  }
}
