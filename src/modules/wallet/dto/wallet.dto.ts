import { IsArray, IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class CreditWalletDto {
  @IsUUID()
  user_id: string;

  @IsInt()
  @Min(1)
  amount: number;

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
  @IsDateString()
  expires_at?: string | null;
}

export class DebitWalletDto {
  @IsUUID()
  user_id: string;

  @IsInt()
  @Min(1)
  amount: number;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsString()
  @IsNotEmpty()
  ref_type: string;

  @IsString()
  @IsNotEmpty()
  ref_id: string;
}

export class WalletBalanceQueryDto {
  @IsUUID()
  user_id: string;
}

export class WalletLedgerQueryDto {
  @IsUUID()
  user_id: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsString()
  cursor?: string;
}
