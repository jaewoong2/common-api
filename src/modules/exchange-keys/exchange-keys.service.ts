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

  /**
   * API 키 검증 (거래소 API 호출로 유효성 확인)
   * @param userId - 사용자 ID
   * @param keyId - 키 ID
   * @returns 검증 결과
   */
  async verifyKey(
    userId: string,
    keyId: string,
  ): Promise<{
    keyId: string;
    valid: boolean;
    permissions: {
      spotTrading?: boolean;
      futuresTrading?: boolean;
      marginTrading?: boolean;
      withdraw?: boolean;
    } | null;
    verifiedAt: string;
    errorMessage?: string;
  }> {
    const entity = await this.repository.findByIdAndUserId(keyId, userId);
    if (!entity) {
      throw new NotFoundException(`Key ${keyId} not found`);
    }

    try {
      // Decrypt credentials
      const accessKey = await this.kmsService.decrypt(
        entity.accessKeyEnc,
        entity.kmsDataKeyId,
      );
      const secretKey = await this.kmsService.decrypt(
        entity.secretKeyEnc,
        entity.kmsDataKeyId,
      );

      const credentials = { accessKey, secretKey };

      // Dynamic import to avoid circular dependency
      const { BinanceApiClient } =
        await import("../webhook/adapters/binance/binance-api.client");
      const { ConfigService } = await import("@nestjs/config");

      // Create a temporary client for verification
      // Note: In production, inject BinanceApiClient properly
      const tempClient = new BinanceApiClient(new ConfigService());

      // Try to fetch balance to verify credentials work
      const balances = await tempClient.getBalance(credentials, "futures_um");

      // If we got here, the key is valid
      this.logger.log(`API key verified successfully: keyId=${keyId}`);

      return {
        keyId,
        valid: true,
        permissions: {
          futuresTrading: true, // Verified by successful balance call
          spotTrading: undefined, // Would need a separate check
          marginTrading: undefined,
          withdraw: false, // Assumed false for safety
        },
        verifiedAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.warn(
        `API key verification failed: keyId=${keyId}`,
        error.message,
      );

      return {
        keyId,
        valid: false,
        permissions: null,
        verifiedAt: new Date().toISOString(),
        errorMessage: error.message || "API key validation failed",
      };
    }
  }
}
