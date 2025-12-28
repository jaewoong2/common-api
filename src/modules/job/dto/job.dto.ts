import { IsArray, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateCallbackJobDto {
  @IsIn(['POST', 'PUT', 'PATCH'])
  method: string;

  @IsString()
  @IsNotEmpty()
  path: string;

  @IsOptional()
  body?: Record<string, any>;

  @IsOptional()
  @IsInt()
  timeout_ms?: number;

  @IsOptional()
  @IsArray()
  expected_statuses?: number[];

  @IsOptional()
  @IsString()
  next_retry_at?: string;
}

export class RunJobsDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;
}
