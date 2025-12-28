import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class SuspendReasonDto {
  @IsNotEmpty()
  @IsString()
  reason: string;
}

export class AdjustWalletDto {
  @IsUUID()
  user_id: string;

  @IsInt()
  @Min(-1_000_000_000)
  delta: number;

  @IsNotEmpty()
  @IsString()
  reason: string;

  @IsNotEmpty()
  @IsString()
  ref_type: string;

  @IsNotEmpty()
  @IsString()
  ref_id: string;
}

export class RetryJobDto {
  @IsUUID()
  jobId: string;
}

export class ListJobsQueryDto {
  @IsOptional()
  @IsIn(['PENDING', 'RETRYING', 'FAILED', 'DEAD', 'SUCCEEDED'])
  status?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsString()
  cursor?: string;
}
