import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { JobStatus } from '../../../common/enums';

export class SuspendReasonDto {
  @ApiProperty({
    example: 'Violation of terms of service',
    description: 'Reason for suspension',
  })
  @IsNotEmpty()
  @IsString()
  reason: string;
}

export class AdjustWalletDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'User unique identifier',
  })
  @IsUUID()
  user_id: string;

  @ApiProperty({
    example: -500,
    description: 'Amount to adjust wallet by (positive for credit, negative for debit)',
  })
  @IsInt()
  @Min(-1_000_000_000)
  delta: number;

  @ApiProperty({
    example: 'Admin adjustment for refund',
    description: 'Reason for wallet adjustment',
  })
  @IsNotEmpty()
  @IsString()
  reason: string;

  @ApiProperty({
    example: 'admin_action',
    description: 'Reference type for tracking',
  })
  @IsNotEmpty()
  @IsString()
  ref_type: string;

  @ApiProperty({
    example: 'admin_adj_123',
    description: 'Reference ID for tracking',
  })
  @IsNotEmpty()
  @IsString()
  ref_id: string;
}

export class RetryJobDto {
  @ApiProperty({
    example: '770e8400-e29b-41d4-a716-446655440002',
    description: 'Job unique identifier to retry',
  })
  @IsUUID()
  jobId: string;
}

export class ListJobsQueryDto {
  @ApiProperty({
    example: 'PENDING',
    description: 'Filter jobs by status',
    enum: ['PENDING', 'RETRYING', 'FAILED', 'DEAD', 'SUCCEEDED'],
    required: false,
  })
  @IsOptional()
  @IsIn(['PENDING', 'RETRYING', 'FAILED', 'DEAD', 'SUCCEEDED'])
  status?: JobStatus;

  @ApiProperty({
    example: 20,
    description: 'Number of jobs to retrieve (minimum 1)',
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiProperty({
    example: 'eyJpZCI6IDE0fQ==',
    description: 'Cursor for pagination',
    required: false,
  })
  @IsOptional()
  @IsString()
  cursor?: string;
}
