import {
  Injectable,
  Logger,
  ConflictException,
  InternalServerErrorException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  WebhookRequestRepository,
  ProcessingLockRepository,
} from "../repositories";
import {
  ProviderAdapterRegistry,
  BasePayload,
  ExecutionResult,
} from "../adapters";
import { ExchangeKeyService } from "../../exchange-keys";
import { WebhookStatus, TradeStatus } from "../../../common/enums";
import {
  TradeLogEntity,
  WebhookRequestEntity,
} from "../../../database/entities";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { JsonObject } from "@common/types/json-value.type";

/**
 * Webhook Execute Request DTO
 * @description Lambda로부터 수신하는 실행 요청
 */
export interface ExecuteRequestDto {
  job_id: string;
  user_id: string;
  payload: {
    signal_id: string;
    provider: string;
    auth_token: string;
    request: BasePayload & { exchange?: string; market?: string };
  };
  metadata: {
    trace_id: string;
    retry_count: number;
  };
}

/**
 * Webhook Executor Service
 * @description 실제 거래소 주문 실행 서비스
 */
@Injectable()
export class WebhookExecutorService {
  private readonly logger = new Logger(WebhookExecutorService.name);

  constructor(
    private readonly webhookRequestRepository: WebhookRequestRepository,
    private readonly lockRepository: ProcessingLockRepository,
    private readonly adapterRegistry: ProviderAdapterRegistry,
    private readonly exchangeKeyService: ExchangeKeyService,
    private readonly configService: ConfigService,
    @InjectRepository(TradeLogEntity)
    private readonly tradeLogRepository: Repository<TradeLogEntity>,
  ) {}

  /**
   * Webhook 실행 처리
   * @param request - Lambda로부터 수신한 실행 요청
   */
  async execute(request: ExecuteRequestDto): Promise<{
    status: string;
    entry_json?: unknown;
    exit_json?: unknown;
    error_json?: unknown;
  }> {
    const { user_id: userId, payload, metadata } = request;
    const { signal_id: signalId, provider, request: webhookPayload } = payload;

    this.logger.log(
      `Executing: userId=${userId}, signalId=${signalId}, provider=${provider}`,
    );

    // 1. Lock 획득
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
      // 2. webhook_requests status → PROCESSING
      const webhookRequest =
        await this.webhookRequestRepository.findByUserAndSignal(
          userId,
          signalId,
        );
      if (webhookRequest) {
        await this.webhookRequestRepository.updateStatus(
          webhookRequest.id,
          WebhookStatus.PROCESSING,
        );
      }

      // 3. 거래소 키 조회 및 복호화
      const exchange = webhookPayload.exchange || provider;
      const credentials = await this.exchangeKeyService.getCredentials(
        userId,
        exchange,
      );

      // 4. Provider Adapter 조회
      const adapter = this.adapterRegistry.getAdapter(provider);

      // 5. Payload 검증
      await adapter.validatePayload(webhookPayload);

      // 6. Request 변환
      const providerRequest = await adapter.transformRequest(
        userId,
        signalId,
        webhookPayload,
      );

      // 7. 주문 실행
      const result = await adapter.execute(providerRequest, credentials);

      // 8. Trade Log 저장
      await this.saveTradeLog(
        userId,
        signalId,
        provider,
        webhookPayload,
        result,
      );

      // 9. webhook_requests status 업데이트
      const finalStatus = this.mapTradeStatusToWebhookStatus(result.status);
      if (webhookRequest) {
        await this.webhookRequestRepository.updateStatus(
          webhookRequest.id,
          finalStatus,
        );
      }

      // 10. Lock 해제
      await this.lockRepository.releaseLock(userId, signalId, lockToken);

      this.logger.log(
        `Execution complete: userId=${userId}, signalId=${signalId}, status=${result.status}`,
      );

      return {
        status: result.status,
        entry_json: result.entryJson,
        exit_json: result.exitJson,
        error_json: result.errorJson,
      };
    } catch (error) {
      // Lock 해제
      await this.lockRepository.releaseLock(userId, signalId, lockToken);

      // webhook_requests status → FAIL
      const webhookRequest =
        await this.webhookRequestRepository.findByUserAndSignal(
          userId,
          signalId,
        );
      if (webhookRequest) {
        await this.webhookRequestRepository.updateStatus(
          webhookRequest.id,
          WebhookStatus.FAIL,
        );
      }

      // Error trade log 저장
      await this.saveTradeLog(userId, signalId, provider, webhookPayload, {
        success: false,
        status: "FAIL",
        errorJson: {
          message: error.message,
          details: error.response?.data,
        },
      });

      this.logger.error(`Execution failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Trade Log 저장
   */
  private async saveTradeLog(
    userId: string,
    signalId: string,
    provider: string,
    payload: BasePayload & { exchange?: string; market?: string },
    result: ExecutionResult,
  ): Promise<void> {
    try {
      const tradeLog = this.tradeLogRepository.create({
        userId,
        signalId,
        provider,
        exchange: payload.exchange || provider,
        market: payload.market || "futures_um",
        ticker: payload.ticker,
        action: payload.action,
        status: result.status as TradeStatus,
        entryJson: result.entryJson as JsonObject | null,
        exitJson: result.exitJson as JsonObject | null,
        errorJson: result.errorJson as JsonObject | null,
        requestJson: payload as unknown as JsonObject,
      });
      await this.tradeLogRepository.save(tradeLog);
    } catch (error) {
      this.logger.error(`Failed to save trade log: ${error.message}`);
    }
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
