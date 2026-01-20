import { ApiProperty } from "@nestjs/swagger";
import { WebhookStatus } from "../../../common/enums";
import { WebhookRequestEntity } from "../../../database/entities";
import { JsonObject } from "@common/types/json-value.type";

/**
 * Webhook Request DTO
 * @description Webhook 요청 이력 DTO
 */
export class WebhookRequestDto {
  @ApiProperty({ example: "1" })
  id: string;

  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  userId: string;

  @ApiProperty({ example: "1737360000000" })
  signalId: string;

  @ApiProperty({ example: "binance" })
  provider: string;

  @ApiProperty({ enum: WebhookStatus, example: WebhookStatus.QUEUED })
  status: WebhookStatus;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440000",
    nullable: true,
  })
  jobId: string | null;

  @ApiProperty({ example: "trace-123", nullable: true })
  traceId: string | null;

  @ApiProperty({ type: "object" })
  requestJson: JsonObject;

  @ApiProperty({ example: "2026-01-20T10:00:00.000Z" })
  createdAt: Date;

  @ApiProperty({ example: "2026-01-20T10:00:00.000Z" })
  updatedAt: Date;

  /**
   * Entity → DTO 변환
   */
  static fromEntity(entity: WebhookRequestEntity): WebhookRequestDto {
    const dto = new WebhookRequestDto();
    dto.id = entity.id;
    dto.userId = entity.userId;
    dto.signalId = entity.signalId;
    dto.provider = entity.provider;
    dto.status = entity.status;
    dto.jobId = entity.jobId;
    dto.traceId = entity.traceId;
    dto.requestJson = entity.requestJson;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}

/**
 * Entry Order DTO
 * @description 진입 주문 결과
 */
export class EntryOrderDto {
  @ApiProperty({ example: "12345678" })
  orderId: string;

  @ApiProperty({ example: "BTCUSDT" })
  symbol: string;

  @ApiProperty({ example: "BUY" })
  side: string;

  @ApiProperty({ example: "0.001" })
  quantity: string;

  @ApiProperty({ example: "50000.00" })
  price: string;

  @ApiProperty({ example: "WH_U1_SIG123_ENTRY" })
  clientOrderId: string;
}

/**
 * Exit Orders DTO
 * @description TP/SL 주문 결과
 */
export class ExitOrdersDto {
  @ApiProperty({ example: "12345679", nullable: true })
  tpOrderId?: string;

  @ApiProperty({ example: "12345680", nullable: true })
  slOrderId?: string;
}

/**
 * Binance API Error DTO
 * @description Binance API 에러 응답
 */
export class BinanceApiErrorDto {
  @ApiProperty({ example: -2010 })
  code: number;

  @ApiProperty({ example: "Account has insufficient balance" })
  msg: string;
}

/**
 * Execution Error DTO
 * @description 실행 오류 상세
 */
export class ExecutionErrorDto {
  @ApiProperty({ example: "Insufficient balance" })
  message: string;

  @ApiProperty({ example: "-2010", nullable: true })
  code?: string;

  @ApiProperty({ type: "object", nullable: true })
  details?: BinanceApiErrorDto | Record<string, unknown> | null;
}

/**
 * Webhook Execution Result DTO
 * @description Webhook 실행 결과
 */
export class WebhookExecutionResultDto {
  @ApiProperty({
    example: "SUCCESS",
    enum: ["SUCCESS", "FAIL", "PARTIAL_FAIL"],
  })
  status: "SUCCESS" | "FAIL" | "PARTIAL_FAIL";

  @ApiProperty({ type: EntryOrderDto, nullable: true })
  entryJson?: EntryOrderDto;

  @ApiProperty({ type: ExitOrdersDto, nullable: true })
  exitJson?: ExitOrdersDto;

  @ApiProperty({ type: ExecutionErrorDto, nullable: true })
  errorJson?: ExecutionErrorDto;
}
