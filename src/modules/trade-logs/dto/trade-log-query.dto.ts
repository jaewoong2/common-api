import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString, IsEnum, IsInt, Min, Max } from "class-validator";
import { Type } from "class-transformer";
import { TradeStatus } from "../../../common/enums";

/**
 * Trade Log Query DTO
 * @description 거래 이력 조회 쿼리 파라미터
 */
export class TradeLogQueryDto {
  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ example: 20, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiProperty({ example: "SUCCESS", enum: TradeStatus, required: false })
  @IsOptional()
  @IsEnum(TradeStatus)
  status?: TradeStatus;

  @ApiProperty({ example: "BTCUSDT", required: false })
  @IsOptional()
  @IsString()
  ticker?: string;

  @ApiProperty({ example: "futures_um", required: false })
  @IsOptional()
  @IsString()
  market?: string;

  @ApiProperty({ example: "binance", required: false })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiProperty({ example: "2026-01-01", required: false })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiProperty({ example: "2026-01-31", required: false })
  @IsOptional()
  @IsString()
  to?: string;
}
