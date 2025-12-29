import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { JsonObject } from '@common/types/json-value.type';

export class CreateCallbackJobDto {
  @ApiProperty({
    example: 'POST',
    description: 'HTTP method for callback request',
    enum: ['POST', 'PUT', 'PATCH'],
  })
  @IsIn(['POST', 'PUT', 'PATCH'])
  method: string;

  @ApiProperty({
    example: '/webhooks/payment',
    description: 'Callback endpoint path',
  })
  @IsString()
  @IsNotEmpty()
  path: string;

  @ApiProperty({
    example: { order_id: '123', status: 'completed', amount: 1000 },
    description: 'Request body payload',
    type: 'object',
    required: false,
  })
  @IsOptional()
  body?: JsonObject;

  @ApiProperty({
    example: 5000,
    description: 'Timeout in milliseconds for the callback request',
    required: false,
  })
  @IsOptional()
  @IsInt()
  timeout_ms?: number;

  @ApiProperty({
    example: [200, 201, 204],
    description: 'List of expected HTTP status codes for successful callback',
    type: [Number],
    required: false,
  })
  @IsOptional()
  @IsArray()
  expected_statuses?: number[];

  @ApiProperty({
    example: '2025-01-01T12:00:00.000Z',
    description: 'ISO datetime for next retry attempt',
    required: false,
  })
  @IsOptional()
  @IsString()
  next_retry_at?: string;
}

export class RunJobsDto {
  @ApiProperty({
    example: 50,
    description: 'Maximum number of jobs to run (minimum 1)',
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;
}
