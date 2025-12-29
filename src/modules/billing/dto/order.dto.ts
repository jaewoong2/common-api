import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateOrderDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'User unique identifier',
  })
  @IsUUID()
  user_id: string;

  @ApiProperty({
    example: '660e8400-e29b-41d4-a716-446655440001',
    description: 'Price unique identifier',
  })
  @IsUUID()
  price_id: string;

  @ApiProperty({
    example: 2,
    description: 'Quantity of items to order (minimum 1)',
  })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty({
    example: 'subscription',
    description: 'Reference type for tracking',
  })
  @IsString()
  @IsNotEmpty()
  ref_type: string;

  @ApiProperty({
    example: 'sub_123456',
    description: 'Reference ID for tracking',
  })
  @IsString()
  @IsNotEmpty()
  ref_id: string;

  @ApiProperty({
    example: 'Monthly subscription purchase',
    description: 'Reason for creating the order',
  })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiProperty({
    example: 'idempotency_key_order_789',
    description: 'Optional idempotency key to prevent duplicate operations',
    required: false,
  })
  @IsOptional()
  @IsString()
  idempotency_key?: string;
}

export class RefundOrderDto {
  @ApiProperty({
    example: 'Customer requested refund',
    description: 'Reason for refund',
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
    example: 'idempotency_key_refund_999',
    description: 'Optional idempotency key to prevent duplicate operations',
    required: false,
  })
  @IsOptional()
  @IsString()
  idempotency_key?: string;
}
