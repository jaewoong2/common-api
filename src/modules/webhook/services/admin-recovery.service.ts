import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { WebhookRequestRepository } from "../repositories";
import { JobService } from "../../job/job.service";
import { WebhookStatus, ExecutionType } from "../../../common/enums";
import { InvocationType } from "@aws-sdk/client-lambda";

/**
 * Admin Recovery Service
 * @description RECEIVED 상태 복구 및 DLQ 재처리
 */
@Injectable()
export class AdminRecoveryService {
  private readonly logger = new Logger(AdminRecoveryService.name);
  private readonly webhookSqsQueueUrl: string;
  private readonly targetLambdaName: string;
  private readonly adminJwtToken: string;
  private readonly DEFAULT_WEBHOOK_APP_ID: string;

  constructor(
    private readonly webhookRequestRepository: WebhookRequestRepository,
    private readonly jobService: JobService,
    private readonly configService: ConfigService,
  ) {
    this.webhookSqsQueueUrl =
      this.configService.get<string>("webhook.sqsQueueUrl") || "";
    this.targetLambdaName =
      this.configService.get<string>("webhook.targetLambdaName") ||
      "binance-api-lambda";
    this.adminJwtToken =
      this.configService.get<string>("webhook.adminJwtToken") || "";
    this.DEFAULT_WEBHOOK_APP_ID =
      this.configService.get<string>("webhook.defaultAppId") ||
      "eb3fcbb2-7bb3-4ac7-aa38-1cb4bf00e405";
  }

  /**
   * RECEIVED 상태로 남아있는 요청들을 재큐잉
   * @param maxItems - 최대 처리 개수
   * @param olderThanSeconds - 지정 초 이상 경과한 것만 처리
   * @returns 재큐잉된 개수
   */
  async reEnqueueStaleRequests(
    maxItems: number = 100,
    olderThanSeconds: number = 60,
  ): Promise<{ requeued: number; failed: number }> {
    // 1. RECEIVED 상태인 오래된 요청 조회
    const staleRequests = await this.webhookRequestRepository.findStaleReceived(
      olderThanSeconds,
      maxItems,
    );

    if (staleRequests.length === 0) {
      this.logger.log("No stale requests found");
      return { requeued: 0, failed: 0 };
    }

    this.logger.log(
      `Found ${staleRequests.length} stale requests to re-enqueue`,
    );

    let requeued = 0;
    let failed = 0;

    for (const request of staleRequests) {
      try {
        // 2. Job message 재생성 및 발행
        const jobMessage = {
          lambdaProxyMessage: {
            body: JSON.stringify({
              user_id: request.userId,
              signal_id: request.signalId,
              provider: request.provider,
              request: request.requestJson,
            }),
            resource: "/{proxy+}",
            path: "/webhook/execute",
            httpMethod: "POST",
            isBase64Encoded: false,
            pathParameters: { proxy: "webhook/execute" },
            headers: {
              "Content-Type": "application/json",
              "X-User-Id": request.userId,
              "X-Signal-Id": request.signalId,
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
            jobId: request.jobId || request.id,
            appId: this.DEFAULT_WEBHOOK_APP_ID,
            idempotencyKey: request.signalId,
            messageGroupId: request.userId,
            createdAt: new Date().toISOString(),
            retryCount: 1, // Recovery이므로 1
          },
        };

        await this.jobService.sendToSqs(jobMessage, this.webhookSqsQueueUrl);

        // 3. 상태 업데이트: QUEUED
        await this.webhookRequestRepository.updateStatus(
          request.id,
          WebhookStatus.QUEUED,
        );

        requeued++;
      } catch (error) {
        this.logger.error(
          `Failed to re-enqueue request ${request.id}: ${error.message}`,
        );
        failed++;
      }
    }

    this.logger.log(
      `Re-enqueue complete: requeued=${requeued}, failed=${failed}`,
    );
    return { requeued, failed };
  }
}
