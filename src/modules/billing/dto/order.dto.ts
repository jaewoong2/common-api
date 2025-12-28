import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateOrderDto {
  @IsUUID()
  user_id: string;

  @IsUUID()
  price_id: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsString()
  @IsNotEmpty()
  ref_type: string;

  @IsString()
  @IsNotEmpty()
  ref_id: string;

  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class RefundOrderDto {
  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsString()
  @IsNotEmpty()
  ref_type: string;

  @IsString()
  @IsNotEmpty()
  ref_id: string;

  @IsOptional()
  @IsString()
  idempotency_key?: string;
}
