import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { ExchangeKeyRepository } from "./repositories";
import { KmsService } from "./kms.service";
import { CreateExchangeKeyDto, ExchangeKeyDto } from "./dto";
import { ExchangeKeyEntity } from "../../database/entities";

/**
 * Exchange Credentials Interface
 * @description 복호화된 거래소 인증 정보
 */
export interface ExchangeCredentials {
  accessKey: string;
  secretKey: string;
}

/**
 * Exchange Key Service
 * @description 거래소 API 키 관리 (KMS 암호화 저장)
 */
@Injectable()
export class ExchangeKeyService {
  private readonly logger = new Logger(ExchangeKeyService.name);

  constructor(
    private readonly repository: ExchangeKeyRepository,
    private readonly kmsService: KmsService,
  ) {}

  /**
   * 거래소 키 등록
   * @param userId - 사용자 ID
   * @param dto - 생성 요청 DTO
   * @returns 생성된 키 ID
   */
  async createKey(userId: string, dto: CreateExchangeKeyDto): Promise<string> {
    // 중복 체크
    const existing = await this.repository.findByUserExchangeLabel(
      userId,
      dto.exchange,
      dto.label,
    );
    if (existing) {
      throw new ConflictException(
        `Key with exchange=${dto.exchange} and label=${dto.label} already exists`,
      );
    }

    // 1. Data Key 생성 (하나의 키로 두 필드 모두 암호화)
    const { plaintextKey, encryptedKey } =
      await this.kmsService.generateDataKey();

    // 2. 키들을 암호화
    const accessKeyEnc = this.kmsService.encryptWithKey(
      dto.accessKey,
      plaintextKey,
    );
    const secretKeyEnc = this.kmsService.encryptWithKey(
      dto.secretKey,
      plaintextKey,
    );

    // 저장 (하나의 kmsDataKeyId로 두 필드 복호화 가능)
    const entity = await this.repository.create({
      userId,
      exchange: dto.exchange,
      label: dto.label,
      accessKeyEnc,
      secretKeyEnc,
      kmsDataKeyId: encryptedKey,
    });

    this.logger.log(
      `Exchange key created: userId=${userId}, exchange=${dto.exchange}`,
    );
    return entity.id;
  }

  /**
   * 사용자의 모든 키 조회 (마스킹)
   */
  async getKeys(userId: string): Promise<ExchangeKeyDto[]> {
    const entities = await this.repository.findByUserId(userId);

    const dtos: ExchangeKeyDto[] = [];
    for (const entity of entities) {
      // Access Key만 복호화하여 마스킹 생성
      try {
        const accessKey = await this.kmsService.decrypt(
          entity.accessKeyEnc,
          entity.kmsDataKeyId,
        );
        dtos.push(ExchangeKeyDto.fromEntity(entity, accessKey));
      } catch {
        // 복호화 실패 시 마스킹 없이 반환
        dtos.push(ExchangeKeyDto.fromEntity(entity));
      }
    }

    return dtos;
  }

  /**
   * 키 삭제
   */
  async deleteKey(userId: string, keyId: string): Promise<void> {
    const entity = await this.repository.findByIdAndUserId(keyId, userId);
    if (!entity) {
      throw new NotFoundException(`Key ${keyId} not found`);
    }

    await this.repository.delete(keyId);
    this.logger.log(`Exchange key deleted: keyId=${keyId}, userId=${userId}`);
  }

  /**
   * 거래 실행용 인증 정보 조회 (복호화)
   * @param userId - 사용자 ID
   * @param exchange - 거래소 이름
   * @returns 복호화된 API 키 정보
   */
  async getCredentials(
    userId: string,
    exchange: string,
  ): Promise<ExchangeCredentials> {
    const entity = await this.repository.findFirstByUserExchange(
      userId,
      exchange,
    );
    if (!entity) {
      throw new NotFoundException(
        `No API key found for user=${userId}, exchange=${exchange}`,
      );
    }

    const accessKey = await this.kmsService.decrypt(
      entity.accessKeyEnc,
      entity.kmsDataKeyId,
    );

    const secretKey = await this.kmsService.decrypt(
      entity.secretKeyEnc,
      entity.kmsDataKeyId,
    );

    return { accessKey, secretKey };
  }
}
