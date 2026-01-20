import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, EntityManager } from "typeorm";
import { WebhookRequestEntity } from "../../../database/entities";
import { WebhookStatus } from "../../../common/enums";

/**
 * Webhook Request Repository
 * @description Webhook 수신 이력 데이터 액세스
 */
@Injectable()
export class WebhookRequestRepository {
  constructor(
    @InjectRepository(WebhookRequestEntity)
    private readonly repository: Repository<WebhookRequestEntity>,
  ) {}

  /**
   * 새 webhook 요청 생성
   */
  async create(
    data: Partial<WebhookRequestEntity>,
    manager?: EntityManager,
  ): Promise<WebhookRequestEntity> {
    const repo =
      manager?.getRepository(WebhookRequestEntity) ?? this.repository;
    const entity = repo.create(data);
    return repo.save(entity);
  }

  /**
   * user_id + signal_id로 조회 (중복 체크용)
   */
  async findByUserAndSignal(
    userId: string,
    signalId: string,
    manager?: EntityManager,
  ): Promise<WebhookRequestEntity | null> {
    const repo =
      manager?.getRepository(WebhookRequestEntity) ?? this.repository;
    return repo.findOne({
      where: { userId, signalId },
    });
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
   */
  async findByJobId(
    jobId: string,
    manager?: EntityManager,
  ): Promise<WebhookRequestEntity | null> {
    const repo =
      manager?.getRepository(WebhookRequestEntity) ?? this.repository;
    return repo.findOne({
      where: { jobId },
    });
  }

  /**
   * RECEIVED 상태인 오래된 요청 조회 (Recovery용)
   * @param olderThanSeconds - 지정 초 이상 경과한 것만 조회
   * @param limit - 최대 개수
   */
  async findStaleReceived(
    olderThanSeconds: number,
    limit: number,
    manager?: EntityManager,
  ): Promise<WebhookRequestEntity[]> {
    const repo =
      manager?.getRepository(WebhookRequestEntity) ?? this.repository;
    const cutoff = new Date(Date.now() - olderThanSeconds * 1000);

    return repo
      .createQueryBuilder("wr")
      .where("wr.status = :status", { status: WebhookStatus.RECEIVED })
      .andWhere("wr.createdAt < :cutoff", { cutoff })
      .orderBy("wr.createdAt", "ASC")
      .take(limit)
      .getMany();
  }

  /**
   * 사용자별 요청 이력 조회 (페이징)
   */
  async findByUserId(
    userId: string,
    page: number = 1,
    limit: number = 20,
    manager?: EntityManager,
  ): Promise<{ items: WebhookRequestEntity[]; total: number }> {
    const repo =
      manager?.getRepository(WebhookRequestEntity) ?? this.repository;
    const [items, total] = await repo.findAndCount({
      where: { userId },
      order: { createdAt: "DESC" },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total };
  }
}
