import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, EntityManager, LessThan } from "typeorm";
import { ProcessingLockEntity } from "../../../database/entities";
import { randomUUID } from "crypto";

/**
 * Processing Lock Repository
 * @description 동시 처리 방지 락 관리
 */
@Injectable()
export class ProcessingLockRepository {
  private readonly logger = new Logger(ProcessingLockRepository.name);
  private readonly lockTtlSeconds: number;

  constructor(
    @InjectRepository(ProcessingLockEntity)
    private readonly repository: Repository<ProcessingLockEntity>,
    private readonly configService: ConfigService,
  ) {
    // TTL 기본값 180초 (3분), 설정으로 오버라이드 가능
    this.lockTtlSeconds = this.configService.get<number>(
      "webhook.lockTtlSeconds",
      180,
    );
  }

  /**
   * Lock 획득 시도
   * @returns lockToken if acquired, null if conflict (another worker processing)
   */
  async acquireLock(
    userId: string,
    signalId: string,
    manager?: EntityManager,
  ): Promise<string | null> {
    const repo =
      manager?.getRepository(ProcessingLockEntity) ?? this.repository;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.lockTtlSeconds * 1000);
    const lockToken = randomUUID();

    try {
      // 1. 기존 lock 확인
      const existing = await repo.findOne({
        where: { userId, signalId },
      });

      if (existing) {
        // 2. 만료된 lock이면 override
        if (existing.expiresAt < now) {
          this.logger.log(
            `Overriding expired lock: userId=${userId}, signalId=${signalId}`,
          );
          await repo.update({ userId, signalId }, { lockToken, expiresAt });
          return lockToken;
        }

        // 3. 유효한 lock이 존재하면 conflict
        this.logger.warn(
          `Lock conflict: userId=${userId}, signalId=${signalId}`,
        );
        return null;
      }

      // 4. 새 lock 생성
      const lock = repo.create({
        userId,
        signalId,
        lockToken,
        expiresAt,
      });
      await repo.save(lock);
      this.logger.log(`Lock acquired: userId=${userId}, signalId=${signalId}`);
      return lockToken;
    } catch (error) {
      // Unique constraint violation = another worker got it first
      if (error.code === "23505") {
        this.logger.warn(
          `Lock conflict (race): userId=${userId}, signalId=${signalId}`,
        );
        return null;
      }
      throw error;
    }
  }

  /**
   * Lock 해제
   * @param lockToken - 획득 시 받은 토큰 (본인 소유 검증)
   */
  async releaseLock(
    userId: string,
    signalId: string,
    lockToken: string,
    manager?: EntityManager,
  ): Promise<boolean> {
    const repo =
      manager?.getRepository(ProcessingLockEntity) ?? this.repository;

    const result = await repo.delete({
      userId,
      signalId,
      lockToken,
    });

    const released = (result.affected ?? 0) > 0;
    if (released) {
      this.logger.log(`Lock released: userId=${userId}, signalId=${signalId}`);
    }
    return released;
  }

  /**
   * 만료된 lock 정리 (Scheduled job용)
   */
  async cleanupExpiredLocks(manager?: EntityManager): Promise<number> {
    const repo =
      manager?.getRepository(ProcessingLockEntity) ?? this.repository;
    const result = await repo.delete({
      expiresAt: LessThan(new Date()),
    });
    const count = result.affected ?? 0;
    if (count > 0) {
      this.logger.log(`Cleaned up ${count} expired locks`);
    }
    return count;
  }
}
