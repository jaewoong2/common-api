import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class CreditWalletDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'User unique identifier',
  })
  @IsUUID()
  user_id: string;

  @ApiProperty({
    example: 1000,
    description: 'Amount to credit in cents (minimum 1)',
  })
  @IsInt()
  @Min(1)
  amount: number;

  @ApiProperty({
    example: 'Payment for subscription',
    description: 'Reason for wallet credit',
  })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiProperty({
    example: 'order',
    description: 'Reference type for tracking',
  })
  @IsString()
  @IsNotEmpty()
  ref_type: string;

  @ApiProperty({
    example: 'ord_123456',
    description: 'Reference ID for tracking',
  })
  @IsString()
  @IsNotEmpty()
  ref_id: string;

  @ApiProperty({
    example: '2025-12-31T23:59:59.000Z',
    description: 'Optional expiration date for the credit',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsDateString()
  expires_at?: string | null;

  @ApiProperty({
    example: 'idempotency_key_123',
    description: 'Optional idempotency key to prevent duplicate operations',
    required: false,
  })
  @IsOptional()
  @IsString()
  idempotency_key?: string;
}

export class DebitWalletDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'User unique identifier',
  })
  @IsUUID()
  user_id: string;

  @ApiProperty({
    example: 500,
    description: 'Amount to debit in cents (minimum 1)',
  })
  @IsInt()
  @Min(1)
  amount: number;

  @ApiProperty({
    example: 'Purchase of product',
    description: 'Reason for wallet debit',
  })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiProperty({
    example: 'product',
    description: 'Reference type for tracking',
  })
  @IsString()
  @IsNotEmpty()
  ref_type: string;

  @ApiProperty({
    example: 'prod_789',
    description: 'Reference ID for tracking',
  })
  @IsString()
  @IsNotEmpty()
  ref_id: string;

  @ApiProperty({
    example: 'idempotency_key_456',
    description: 'Optional idempotency key to prevent duplicate operations',
    required: false,
  })
  @IsOptional()
  @IsString()
  idempotency_key?: string;
}

export class WalletBalanceQueryDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'User unique identifier',
  })
  @IsUUID()
  user_id: string;
}

export class WalletLedgerQueryDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'User unique identifier',
  })
  @IsUUID()
  user_id: string;

  @ApiProperty({
    example: 10,
    description: 'Number of ledger entries to retrieve (1-100)',
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
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
