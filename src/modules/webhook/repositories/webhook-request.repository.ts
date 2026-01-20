import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, EntityManager } from "typeorm";
import { WebhookRequestEntity } from "../../../database/entities";
import { WebhookStatus } from "../../../common/enums";
import { WebhookRequestDto } from "../dto";

/**
 * Webhook Request Repository
 * @description Webhook 수신 이력 데이터 액세스
 * @note Repository는 반드시 DTO를 반환해야 함 (Entity 반환 금지)
 */
@Injectable()
export class WebhookRequestRepository {
  constructor(
    @InjectRepository(WebhookRequestEntity)
    private readonly repository: Repository<WebhookRequestEntity>,
  ) {}

  /**
   * 새 webhook 요청 생성
   * @returns 생성된 요청의 DTO
   */
  async create(
    data: Partial<WebhookRequestEntity>,
    manager?: EntityManager,
  ): Promise<WebhookRequestDto> {
    const repo =
      manager?.getRepository(WebhookRequestEntity) ?? this.repository;
    const entity = repo.create(data);
    const saved = await repo.save(entity);
    return WebhookRequestDto.fromEntity(saved);
  }

  /**
   * user_id + signal_id로 조회 (중복 체크용)
   * @returns DTO 또는 null
   */
  async findByUserAndSignal(
    userId: string,
    signalId: string,
    manager?: EntityManager,
  ): Promise<WebhookRequestDto | null> {
    const repo =
      manager?.getRepository(WebhookRequestEntity) ?? this.repository;
    const entity = await repo.findOne({
      where: { userId, signalId },
    });
    return entity ? WebhookRequestDto.fromEntity(entity) : null;
  }

  /**
   * 상태 업데이트
   */
  async updateStatus(
    id: string,
    status: WebhookStatus,
    updates?: Partial<WebhookRequestEntity>,
    manager?: EntityManager,
  ): Promise<void> {
    const repo =
      manager?.getRepository(WebhookRequestEntity) ?? this.repository;
    await repo.update(id, { status, ...updates });
  }

  /**
   * job_id로 조회
   * @returns DTO 또는 null
   */
  async findByJobId(
    jobId: string,
    manager?: EntityManager,
  ): Promise<WebhookRequestDto | null> {
    const repo =
      manager?.getRepository(WebhookRequestEntity) ?? this.repository;
    const entity = await repo.findOne({
      where: { jobId },
    });
    return entity ? WebhookRequestDto.fromEntity(entity) : null;
  }

  /**
   * RECEIVED 상태인 오래된 요청 조회 (Recovery용)
   * @param olderThanSeconds - 지정 초 이상 경과한 것만 조회
   * @param limit - 최대 개수
   * @returns DTO 배열
   */
  async findStaleReceived(
    olderThanSeconds: number,
    limit: number,
    manager?: EntityManager,
  ): Promise<WebhookRequestDto[]> {
    const repo =
      manager?.getRepository(WebhookRequestEntity) ?? this.repository;
    const cutoff = new Date(Date.now() - olderThanSeconds * 1000);

    const entities = await repo
      .createQueryBuilder("wr")
      .where("wr.status = :status", { status: WebhookStatus.RECEIVED })
      .andWhere("wr.createdAt < :cutoff", { cutoff })
      .orderBy("wr.createdAt", "ASC")
      .take(limit)
      .getMany();

    return entities.map(WebhookRequestDto.fromEntity);
  }

  /**
   * 사용자별 요청 이력 조회 (페이징)
   * @returns DTO 배열과 총 개수
   */
  async findByUserId(
    userId: string,
    page: number = 1,
    limit: number = 20,
    manager?: EntityManager,
  ): Promise<{ items: WebhookRequestDto[]; total: number }> {
    const repo =
      manager?.getRepository(WebhookRequestEntity) ?? this.repository;
    const [entities, total] = await repo.findAndCount({
      where: { userId },
      order: { createdAt: "DESC" },
      skip: (page - 1) * limit,
      take: limit,
    });
    return {
      items: entities.map(WebhookRequestDto.fromEntity),
      total,
    };
  }
}
