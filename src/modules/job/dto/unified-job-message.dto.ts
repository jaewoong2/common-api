import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsString,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsEnum,
  IsBoolean,
  ValidateNested,
} from "class-validator";
import { ExecutionType } from "@common/enums";
import { InvocationType } from "@aws-sdk/client-lambda";

/**
 * Job Metadata DTO
 * @description Tracking and audit metadata
 */
export class JobMetadataDto {
  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440000",
    required: false,
    description: "Job UUID",
  })
  @IsOptional()
  @IsString()
  jobId?: string;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440000",
    required: false,
    description: "App UUID for multi-tenancy",
  })
  @IsOptional()
  @IsString()
  appId?: string;

  @ApiProperty({
    example: "payment-callback-order-123",
    description: "Idempotency key for duplicate prevention",
    required: false,
  })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @ApiProperty({
    example: "rest-api",
    description: "SQS FIFO MessageGroupId (same as execution.type)",
  })
  @IsString()
  @IsNotEmpty()
  messageGroupId: string;

  @ApiProperty({
    example: "2025-01-01T00:00:00.000Z",
    description: "Message creation timestamp",
  })
  @IsString()
  createdAt: string;

  @ApiProperty({
    example: 0,
    required: false,
    description: "Current retry count",
  })
  @IsOptional()
  retryCount?: number;
}

/**
 * Lambda Proxy Message DTO
 * @description AWS Lambda proxy event structure for all execution types
 */
export class LambdaProxyMessageDto {
  @ApiProperty({
    example: '{"key": "value"}',
    description: "Request body as JSON string",
    nullable: true,
  })
  @IsOptional()
  @IsString()
  body: string | null;

  @ApiProperty({ example: "/{proxy+}" })
  @IsString()
  resource: string;

  @ApiProperty({ example: "/v1/jobs/callback" })
  @IsString()
  path: string;

  @ApiProperty({ example: "POST", enum: ["GET", "POST", "PUT", "DELETE"] })
  @IsEnum(["GET", "POST", "PUT", "DELETE"])
  httpMethod: string;

  @ApiProperty({ example: false })
  @IsBoolean()
  isBase64Encoded: boolean;

  @ApiProperty({
    example: { proxy: "v1/jobs/callback" },
    type: "object",
  })
  @IsObject()
  pathParameters: Record<string, string>;

  @ApiProperty({
    example: { key: "value" },
    type: "object",
    required: false,
  })
  @IsOptional()
  @IsObject()
  queryStringParameters?: Record<string, string>;

  @ApiProperty({
    example: {
      Authorization: "Bearer token",
      "Content-Type": "application/json",
    },
    type: "object",
  })
  @IsObject()
  headers: Record<string, string>;

  @ApiProperty({
    example: {
      path: "/v1/jobs/callback",
      resourcePath: "/{proxy+}",
      httpMethod: "POST",
    },
    type: "object",
  })
  @IsObject()
  requestContext: {
    path: string;
    resourcePath: string;
    httpMethod: string;
  };
}

/**
 * Execution Configuration DTO
 * @description Type-specific execution parameters
 */
export class ExecutionConfigDto {
  @ApiProperty({
    example: "lambda-invoke",
    enum: ExecutionType,
    description: "Execution type",
  })
  @IsEnum(ExecutionType)
  type: ExecutionType;

  // lambda-invoke specific
  @ApiProperty({
    example: "my-function-name",
    required: false,
    description: "Lambda function name (for lambda-invoke)",
  })
  @IsOptional()
  @IsString()
  functionName?: string;

  @ApiProperty({
    example: InvocationType.Event,
    required: false,
    description: "Invocation type: Event (async) or RequestResponse (sync)",
    enum: InvocationType,
  })
  @IsOptional()
  @IsEnum(InvocationType)
  invocationType?: InvocationType;

  // lambda-url specific
  @ApiProperty({
    example: "https://abc123.lambda-url.ap-northeast-2.on.aws/",
    required: false,
    description: "Lambda Function URL (for lambda-url)",
  })
  @IsOptional()
  @IsString()
  functionUrl?: string;

  // rest-api specific
  @ApiProperty({
    example: "https://api.example.com",
    required: false,
    description: "Base URL for REST API (for rest-api)",
  })
  @IsOptional()
  @IsString()
  baseUrl?: string;

  // schedule specific
  @ApiProperty({
    example: "2025-01-01T12:00:00.000Z",
    required: false,
    description: "ISO 8601 timestamp for scheduled execution",
  })
  @IsOptional()
  @IsString()
  scheduledAt?: string;

  @ApiProperty({
    example: "at(2025-01-01T12:00:00)",
    required: false,
    description: "EventBridge schedule expression",
  })
  @IsOptional()
  @IsString()
  scheduleExpression?: string;

  @ApiProperty({
    description: "Target job message to execute when schedule triggers",
    type: "object",
    required: false,
    example: {
      lambdaProxyMessage: { /* Lambda proxy event */ },
      execution: { type: "rest-api" },
      metadata: { messageGroupId: "scheduled-jobs" }
    }
  })
  @IsOptional()
  @IsObject()
  targetJob?: Record<string, any>;
}

/**
 * Unified Job Message DTO
 * @description Complete message format for all execution types (SQS, DB, EventBridge)
 */
export class UnifiedJobMessageDto {
  @ApiProperty({
    type: LambdaProxyMessageDto,
    description: "Lambda proxy event structure",
  })
  @ValidateNested()
  @Type(() => LambdaProxyMessageDto)
  lambdaProxyMessage: LambdaProxyMessageDto;

  @ApiProperty({
    type: ExecutionConfigDto,
    description: "Execution configuration",
  })
  @ValidateNested()
  @Type(() => ExecutionConfigDto)
  execution: ExecutionConfigDto;

  @ApiProperty({
    type: JobMetadataDto,
    description: "Job metadata",
  })
  @ValidateNested()
  @Type(() => JobMetadataDto)
  metadata: JobMetadataDto;
}
