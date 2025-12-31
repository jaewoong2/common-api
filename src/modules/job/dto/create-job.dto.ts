import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";
import { UnifiedJobMessageDto } from "./unified-job-message.dto";

/**
 * Job Creation Mode
 * @description Determines where the job is stored/sent
 */
export enum JobCreationMode {
  /** Save to database only (DB polling will process) */
  DB = "db",

  /** Send to SQS only (immediate processing) */
  SQS = "sqs",

  /** Save to DB and send to SQS (hybrid for safety) */
  BOTH = "both",
}

/**
 * Create Unified Job DTO
 * @description Request body for creating a new unified job
 */
export class CreateUnifiedJobDto {
  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440000",
    description: "App UUID for multi-tenancy",
  })
  @IsString()
  @IsOptional()
  appId?: string;

  @ApiProperty({
    type: UnifiedJobMessageDto,
    description:
      "Unified job message (LambdaProxyMessage + Execution + Metadata)",
  })
  @ValidateNested()
  @Type(() => UnifiedJobMessageDto)
  message: UnifiedJobMessageDto;

  @ApiProperty({
    example: "both",
    enum: JobCreationMode,
    description:
      "Job creation mode: db (DB only), sqs (SQS only), both (DB + SQS)",
    default: JobCreationMode.BOTH,
    required: false,
  })
  @IsOptional()
  @IsEnum(JobCreationMode)
  mode?: JobCreationMode;
}
