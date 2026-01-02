import {
  IsString,
  IsOptional,
  IsObject,
  IsEnum,
  IsNumber,
  IsBoolean,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { ExecutionType } from '../../../common/enums';
import { InvocationType } from '@aws-sdk/client-lambda';
import { Type } from 'class-transformer';
import { LambdaProxyMessageDto } from './unified-job-message.dto';

/**
 * Source Queue Message DTO
 * @description Message format from crypto.fifo and ox.fifo
 */
export class SourceMessageDto {
  /** Lambda proxy style payload (preferred when provided) */
  @IsOptional()
  @ValidateNested()
  @Type(() => LambdaProxyMessageDto)
  lambdaProxyMessage?: LambdaProxyMessageDto;

  /**
   * Message body (payload)
   * Accepts both string (Lambda proxy) and object (legacy)
   */
  @IsOptional()
  @ValidateIf((o) => typeof o.body === 'string')
  @IsString()
  @ValidateIf((o) => typeof o.body === 'object' && o.body !== null)
  @IsObject()
  body?: string | Record<string, unknown> | null;

  /** Request path */
  @IsOptional()
  @IsString()
  path?: string;

  /** HTTP method */
  @IsOptional()
  @IsString()
  method?: string;

  /** HTTP method (alternative field name) */
  @IsOptional()
  @IsString()
  httpMethod?: string;

  /** API Gateway resource */
  @IsOptional()
  @IsString()
  resource?: string;

  /** Body encoding flag */
  @IsOptional()
  @IsBoolean()
  isBase64Encoded?: boolean;

  /** Path parameters (for proxy integration) */
  @IsOptional()
  @IsObject()
  pathParameters?: Record<string, string>;

  /** Execution type */
  @IsOptional()
  @IsEnum(ExecutionType)
  executionType?: ExecutionType;

  /** Base URL for REST API */
  @IsOptional()
  @IsString()
  baseUrl?: string;

  /** Lambda function name */
  @IsOptional()
  @IsString()
  functionName?: string;

  /** Lambda function URL */
  @IsOptional()
  @IsString()
  functionUrl?: string;

  /** Lambda invocation type */
  @IsOptional()
  @IsEnum(InvocationType)
  invocationType?: InvocationType;

  /** App ID for multi-tenancy */
  @IsOptional()
  @IsString()
  appId?: string;

  /** Job ID */
  @IsOptional()
  @IsString()
  jobId?: string;

  /** Message group ID for FIFO ordering */
  @IsOptional()
  @IsString()
  messageGroupId?: string;

  /** Idempotency key for duplicate prevention */
  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  /** Retry count */
  @IsOptional()
  @IsNumber()
  retryCount?: number;

  /** Query string parameters */
  @IsOptional()
  @IsObject()
  queryStringParameters?: Record<string, string>;

  /** Request headers */
  @IsOptional()
  @IsObject()
  headers?: Record<string, string>;

  /** Request context (proxy integration metadata) */
  @IsOptional()
  @IsObject()
  requestContext?: {
    path?: string;
    resourcePath?: string;
    httpMethod?: string;
    [key: string]: unknown;
  };

  /** Nested execution config (alternative structure) */
  @IsOptional()
  @IsObject()
  execution?: {
    type?: ExecutionType;
    baseUrl?: string;
    functionName?: string;
    functionUrl?: string;
    invocationType?: InvocationType;
  };

  /** Nested metadata (alternative structure) */
  @IsOptional()
  @IsObject()
  metadata?: {
    appId?: string;
    jobId?: string;
    messageGroupId?: string;
    idempotencyKey?: string;
    retryCount?: number;
  };

  /** Raw body for malformed messages */
  @IsOptional()
  @IsString()
  rawBody?: string;
}
