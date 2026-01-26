import {
  Injectable,
  Logger,
  UnauthorizedException,
  BadRequestException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InvocationType } from "@aws-sdk/client-lambda";
import { UserRepository } from "../../user/repositories/user.repository";
import { WebhookRequestRepository } from "../repositories";
import { JobService } from "../../job/job.service";
import { UnifiedJobMessageDto } from "../../job/dto/unified-job-message.dto";
import { BinancePayloadDto, DiscordPayloadDto } from "../dto";
import { WebhookStatus } from "../../../common/enums";
import { ExecutionType } from "../../../common/enums";
import { randomUUID } from "crypto";
import { JsonObject } from "@common/types/json-value.type";

/**
 * Webhook Receiver Service
 * @description TradingView webhook 수신 및 SQS 발행
 */
@Injectable()
export class WebhookReceiverService {
  private readonly logger = new Logger(WebhookReceiverService.name);
  private readonly DEFAULT_WEBHOOK_APP_ID: string;
  private readonly webhookSqsQueueUrl: string;
  private readonly targetLambdaName: string;
  private readonly adminJwtToken: string;

  constructor(
    private readonly userRepository: UserRepository,
    private readonly webhookRequestRepository: WebhookRequestRepository,
    private readonly jobService: JobService,
    private readonly configService: ConfigService,
  ) {
    // Config 로드 및 검증
    this.DEFAULT_WEBHOOK_APP_ID = this.configService.get<string>(
      "webhook.defaultAppId",
    );

    this.webhookSqsQueueUrl = this.configService.get<string>(
      "webhook.sqsQueueUrl",
    );

    this.targetLambdaName = this.configService.get<string>(
      "webhook.targetLambdaName",
    );

    this.adminJwtToken = this.configService.get<string>(
      "webhook.adminJwtToken",
    );

    // 필수 설정 검증
    this.validateConfig();
  }

  /**
   * 필수 Config 검증
   * @throws Error if required config is missing
   */
  private validateConfig(): void {
    const missingConfigs: string[] = [];

    if (!this.webhookSqsQueueUrl) {
      missingConfigs.push("WEBHOOK_SQS_QUEUE_URL (webhook.sqsQueueUrl)");
    }

    if (!this.targetLambdaName) {
      missingConfigs.push(
        "WEBHOOK_TARGET_LAMBDA_NAME (webhook.targetLambdaName)",
      );
    }

    if (!this.adminJwtToken) {
      missingConfigs.push("WEBHOOK_ADMIN_JWT_TOKEN (webhook.adminJwtToken)");
    }

    if (missingConfigs.length > 0) {
      this.logger.warn(
        `Missing recommended webhook config: ${missingConfigs.join(", ")}. Using defaults where available.`,
      );
    }
  }

  /**
   * Webhook 수신 처리
   * @param provider - provider (from path param)
   * @param authToken - auth_token (from path param)
   * @param payload - webhook payload
   * @returns { status, job_id?, trace_id? }
   */
  async handleWebhook(
    provider: string,
    authToken: string,
    payload: BinancePayloadDto | DiscordPayloadDto,
  ): Promise<{
    status: "queued" | "already_processed";
    job_id?: string;
    trace_id?: string;
  }> {
    // 1. auth_token으로 사용자 조회
    const user = await this.userRepository.findByAuthToken(authToken);
    if (!user) {
      throw new UnauthorizedException("Invalid auth token");
    }

    // 2. provider 검증 (payload.exchange가 존재하는 경우에만)
    if (payload.exchange && payload.exchange !== provider) {
      throw new BadRequestException(
        `Provider mismatch: path=${provider}, payload=${payload.exchange}`,
      );
    }

    // signal_id가 없는 경우 (Discord 등) UUID 생성
    const signalId = payload.options?.signal_id || randomUUID();
    const userId = user.id;

    // 3. 중복 체크 (signal_id)
    const existing = await this.webhookRequestRepository.findByUserAndSignal(
      userId,
      signalId,
    );
    if (existing) {
      this.logger.log(
        `Already processed: userId=${userId}, signalId=${signalId}`,
      );
      return { status: "already_processed" };
    }

    // 4. DB에 RECEIVED 상태로 INSERT
    const jobId = randomUUID();
    const webhookRequest = await this.webhookRequestRepository.create({
      userId,
      signalId,
      provider,
      status: WebhookStatus.RECEIVED,
      jobId,
      requestJson: payload as unknown as JsonObject,
    });

    try {
      // 5. UnifiedJobMessage 생성 및 SQS 발행
      const jobMessage = this.buildJobMessage(
        userId,
        provider,
        signalId,
        payload,
        jobId,
      );

      console.log("jobMessage", jobMessage);

      await this.jobService.sendToSqs(
        jobMessage,
        this.webhookSqsQueueUrl || undefined,
      );

      // 6. 상태 업데이트: QUEUED
      await this.webhookRequestRepository.updateStatus(
        webhookRequest.id,
        WebhookStatus.QUEUED,
        { traceId: jobId },
      );

      this.logger.log(
        `Webhook queued: userId=${userId}, signalId=${signalId}, jobId=${jobId}`,
      );
      return { status: "queued", job_id: jobId, trace_id: jobId };
    } catch (error) {
      this.logger.error(
        `Failed to enqueue webhook: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * UnifiedJobMessage 생성
   */
  private buildJobMessage(
    userId: string,
    provider: string,
    signalId: string,
    payload: BinancePayloadDto | DiscordPayloadDto,
    jobId: string,
  ): UnifiedJobMessageDto {
    const bodyPayload = {
      user_id: userId,
      signal_id: signalId,
      provider,
      request: payload,
    };

    return {
      lambdaProxyMessage: {
        body: JSON.stringify(bodyPayload),
        resource: "/{proxy+}",
        path: "/webhook/execute",
        httpMethod: "POST",
        isBase64Encoded: false,
        pathParameters: { proxy: "webhook/execute" },
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": userId.toString(),
          "X-Signal-Id": signalId,
          Authorization: `Bearer ${this.adminJwtToken}`,
        },
        requestContext: {
          path: "/webhook/execute",
          resourcePath: "/{proxy+}",
          httpMethod: "POST",
        },
      },
      execution: {
        type: ExecutionType.LAMBDA_INVOKE,
        functionName: this.targetLambdaName,
        invocationType: InvocationType.RequestResponse,
      },
      metadata: {
        jobId,
        appId: this.DEFAULT_WEBHOOK_APP_ID,
        idempotencyKey: signalId,
        messageGroupId: userId.toString(),
        createdAt: new Date().toISOString(),
        retryCount: 0,
      },
    };
  }
}
