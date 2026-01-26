import { Injectable, Logger, ConflictException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DataSource, EntityManager } from "typeorm";
import {
  WebhookRequestRepository,
  ProcessingLockRepository,
} from "../repositories";
import {
  ProviderAdapterRegistry,
  BasePayload,
  ExecutionResult,
  ProviderAdapter,
} from "../adapters";
import { ExchangeKeyService } from "../../exchange-keys";
import { WebhookStatus, TradeStatus } from "../../../common/enums";
import { TradeLogEntity } from "../../../database/entities";
import { JsonObject } from "@common/types/json-value.type";
import {
  WebhookExecutionResultDto,
  EntryOrderDto,
  ExitOrdersDto,
  ExecutionErrorDto,
  DiscordPayloadDto,
  BinancePayloadDto,
} from "../dto";

/**
 * Webhook Execute Request DTO
 * @description Lambda로부터 수신하는 실행 요청 (lambdaProxyMessage.body 구조)
 * @note 스펙: job_message_architecture.md line 186-188
 */
export interface ExecuteRequestDto {
  user_id: string;
  signal_id: string;
  provider: string;
  request: (BasePayload | DiscordPayloadDto | BinancePayloadDto) & {
    exchange?: string;
    market?: string;
  };
}

/**
 * Webhook Executor Service
 * @description 실제 거래소 주문 실행 서비스
 * @note 모든 DB 작업은 트랜잭션 내에서 수행됨
 */
@Injectable()
export class WebhookExecutorService {
  private readonly logger = new Logger(WebhookExecutorService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly webhookRequestRepository: WebhookRequestRepository,
    private readonly lockRepository: ProcessingLockRepository,
    private readonly adapterRegistry: ProviderAdapterRegistry,
    private readonly exchangeKeyService: ExchangeKeyService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Webhook 실행 처리 (트랜잭션 래핑)
   * @param request - Lambda로부터 수신한 실행 요청
   * @returns 타입 안전한 실행 결과
   */
  async execute(
    request: ExecuteRequestDto,
  ): Promise<WebhookExecutionResultDto> {
    const {
      user_id: userId,
      signal_id: signalId,
      provider,
      request: webhookPayload,
    } = request;

    this.logger.log(
      `Executing: userId=${userId}, signalId=${signalId}, provider=${provider}`,
    );

    // 1. Lock 획득 (트랜잭션 외부)
    const lockToken = await this.lockRepository.acquireLock(userId, signalId);
    if (!lockToken) {
      throw new ConflictException({
        ok: false,
        error: {
          code: "LOCK_CONFLICT",
          message: "Another worker is processing this signal",
        },
      });
    }

    try {
      // 트랜잭션 내에서 모든 DB 작업 수행
      const result = await this.dataSource.transaction(async (manager) => {
        return this.executeWithTransaction(
          manager,
          userId,
          signalId,
          provider,
          webhookPayload,
        );
      });

      // Lock 해제 (트랜잭션 외부)
      await this.lockRepository.releaseLock(userId, signalId, lockToken);

      this.logger.log(
        `Execution complete: userId=${userId}, signalId=${signalId}, status=${result.status}`,
      );

      return result;
    } catch (error) {
      // Lock 해제 (에러 시)
      await this.lockRepository.releaseLock(userId, signalId, lockToken);

      // 에러 상태 저장
      await this.handleExecutionError(
        userId,
        signalId,
        provider,
        webhookPayload,
        error,
      );

      this.logger.error(`Execution failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 트랜잭션 내 실행 처리
   */
  private async executeWithTransaction(
    manager: EntityManager,
    userId: string,
    signalId: string,
    provider: string,
    webhookPayload: (BasePayload | DiscordPayloadDto | BinancePayloadDto) & {
      exchange?: string;
      market?: string;
    },
  ): Promise<WebhookExecutionResultDto> {
    // 1. webhook_requests status → PROCESSING
    const webhookRequest =
      await this.webhookRequestRepository.findByUserAndSignal(
        userId,
        signalId,
        manager,
      );
    if (webhookRequest) {
      await this.webhookRequestRepository.updateStatus(
        webhookRequest.id,
        WebhookStatus.PROCESSING,
        undefined,
        manager,
      );
    }

    // 2. 거래소 키 조회 및 복호화
    const exchange = webhookPayload.exchange || provider;
    const credentials = await this.exchangeKeyService.getCredentials(
      userId,
      exchange,
    );

    // 3. Provider Adapter 조회
    const adapter = this.adapterRegistry.getAdapter(
      provider,
    ) as ProviderAdapter<any>;

    // 4. Payload 검증 (Binance-specific validation만)
    await adapter.validatePayload(webhookPayload);

    // 5. Request 변환 (잔고 기반 수량 계산 포함)
    const providerRequest = await adapter.transformRequest(
      userId,
      signalId,
      webhookPayload,
      credentials,
    );

    // 6. 주문 실행
    const result = await adapter.execute(providerRequest, credentials);

    // 7. Trade Log 저장 (트랜잭션 내)
    await this.saveTradeLog(
      manager,
      userId,
      signalId,
      provider,
      webhookPayload,
      result,
    );

    // 8. webhook_requests status 업데이트 (트랜잭션 내)
    const finalStatus = this.mapTradeStatusToWebhookStatus(result.status);
    if (webhookRequest) {
      await this.webhookRequestRepository.updateStatus(
        webhookRequest.id,
        finalStatus,
        undefined,
        manager,
      );
    }

    return this.buildExecutionResult(result);
  }

  /**
   * 실행 에러 처리
   */
  private async handleExecutionError(
    userId: string,
    signalId: string,
    provider: string,
    webhookPayload: (BasePayload | DiscordPayloadDto | BinancePayloadDto) & {
      exchange?: string;
      market?: string;
    },
    error: Error & { response?: { data?: unknown } },
  ): Promise<void> {
    try {
      await this.dataSource.transaction(async (manager) => {
        // webhook_requests status → FAIL
        const webhookRequest =
          await this.webhookRequestRepository.findByUserAndSignal(
            userId,
            signalId,
            manager,
          );
        if (webhookRequest) {
          await this.webhookRequestRepository.updateStatus(
            webhookRequest.id,
            WebhookStatus.FAIL,
            undefined,
            manager,
          );
        }

        // Error trade log 저장
        await this.saveTradeLog(
          manager,
          userId,
          signalId,
          provider,
          webhookPayload,
          {
            success: false,
            status: "FAIL",
            errorJson: {
              message: error.message,
              details: error.response?.data as
                | Record<string, unknown>
                | undefined,
            },
          },
        );
      });
    } catch (txError) {
      this.logger.error(`Failed to save error state: ${txError.message}`);
    }
  }

  /**
   * Trade Log 저장
   */
  private async saveTradeLog(
    manager: EntityManager,
    userId: string,
    signalId: string,
    provider: string,
    payload: (BasePayload | DiscordPayloadDto | BinancePayloadDto) & {
      exchange?: string;
      market?: string;
    },
    result: ExecutionResult,
  ): Promise<void> {
    const tradeLogRepo = manager.getRepository(TradeLogEntity);
    const tradeLog = tradeLogRepo.create({
      userId,
      signalId,
      provider,
      exchange: payload.exchange || provider,
      market: payload.market || "",
      ticker: payload.ticker || "",
      action: payload.action || "",
      status: result.status as TradeStatus,
      entryJson: result.entryJson as JsonObject | null,
      exitJson: result.exitJson as JsonObject | null,
      errorJson: result.errorJson as JsonObject | null,
      requestJson: payload as unknown as JsonObject,
    });
    await tradeLogRepo.save(tradeLog);
  }

  /**
   * ExecutionResult → WebhookExecutionResultDto 변환
   */
  private buildExecutionResult(
    result: ExecutionResult,
  ): WebhookExecutionResultDto {
    const dto = new WebhookExecutionResultDto();
    dto.status = result.status;

    if (result.entryJson) {
      const entry = new EntryOrderDto();
      entry.orderId = result.entryJson.orderId;
      entry.symbol = result.entryJson.symbol;
      entry.side = result.entryJson.side;
      entry.quantity = result.entryJson.quantity;
      entry.price = result.entryJson.price;
      entry.clientOrderId = result.entryJson.clientOrderId;
      dto.entryJson = entry;
    }

    if (result.exitJson) {
      const exit = new ExitOrdersDto();
      exit.tpOrderId = result.exitJson.tpOrderId;
      exit.slOrderId = result.exitJson.slOrderId;
      dto.exitJson = exit;
    }

    if (result.errorJson) {
      const error = new ExecutionErrorDto();
      error.message = result.errorJson.message;
      error.code = result.errorJson.code;
      error.details = result.errorJson.details || null;
      dto.errorJson = error;
    }

    return dto;
  }

  /**
   * TradeStatus → WebhookStatus 매핑
   */
  private mapTradeStatusToWebhookStatus(tradeStatus: string): WebhookStatus {
    switch (tradeStatus) {
      case "SUCCESS":
        return WebhookStatus.DONE;
      case "PARTIAL_FAIL":
        return WebhookStatus.PARTIAL_FAIL;
      case "FAIL":
      default:
        return WebhookStatus.FAIL;
    }
  }
}
