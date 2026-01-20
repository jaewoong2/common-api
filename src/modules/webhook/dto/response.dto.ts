import { ApiProperty } from "@nestjs/swagger";

/**
 * Webhook Response DTO
 * @description Webhook 응답 포맷
 */
export class WebhookResponseDto {
  @ApiProperty({ example: true })
  ok: boolean;

  @ApiProperty({
    example: {
      status: "queued",
      job_id: "550e8400-e29b-41d4-a716-446655440000",
      trace_id: "sqs_message_id",
    },
  })
  data: {
    status: "queued" | "already_processed";
    job_id?: string;
    trace_id?: string;
  };
}

/**
 * Webhook Error Response DTO
 */
export class WebhookErrorDto {
  @ApiProperty({ example: false })
  ok: boolean;

  @ApiProperty({
    example: {
      code: "VALIDATION_ERROR",
      message: "invalid schema",
    },
  })
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}
