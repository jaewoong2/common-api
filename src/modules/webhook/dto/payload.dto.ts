import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsNumber,
  IsOptional,
  ValidateNested,
  Min,
  Max,
} from "class-validator";
import { Type } from "class-transformer";
import { WebhookAction, MarketType } from "../../../common/enums";
import {
  OrderType,
  QtyType,
  PositionMode,
  QuoteAsset,
  TpSlType,
} from "../../../common/types";

/**
 * Entry DTO
 * @description 진입 주문 타입 (market 또는 limit)
 */
export class EntryDto {
  @ApiProperty({ example: "market", enum: ["market", "limit"] })
  @IsString()
  @IsEnum(["market", "limit"])
  type: OrderType;

  @ApiProperty({
    example: 50000,
    required: false,
    description:
      "Limit 주문 시 가격. Number 또는 TradingView placeholder (e.g., '{{close}}')",
    oneOf: [{ type: "number" }, { type: "string" }],
  })
  @IsOptional()
  price?: number | string;
}

/**
 * Quantity DTO
 * @description 수량 지정 (percent 또는 fixed)
 */
export class QtyDto {
  @ApiProperty({ example: "percent", enum: ["percent", "fixed"] })
  @IsString()
  @IsEnum(["percent", "fixed"])
  type: QtyType;

  @ApiProperty({ example: 50, description: "percent: 1-100, fixed: 수량" })
  @IsNumber()
  @Min(0)
  value: number;
}

/**
 * TpSl DTO
 * @description TP/SL 설정
 */
export class TpSlDto {
  @ApiProperty({ example: "percent", enum: ["percent", "price"] })
  @IsString()
  @IsEnum(["percent", "price"])
  type: TpSlType;

  @ApiProperty({ example: 5 })
  @IsNumber()
  value: number;

  @ApiProperty({ example: 100, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  qty_percent?: number;
}

/**
 * Strategy DTO
 * @description TP/SL 전략
 */
export class StrategyDto {
  @ApiProperty({ type: TpSlDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => TpSlDto)
  stop_loss?: TpSlDto;

  @ApiProperty({ type: TpSlDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => TpSlDto)
  take_profit?: TpSlDto;
}

/**
 * Options DTO
 * @description 거래 옵션
 */
export class OptionsDto {
  @ApiProperty({ example: 10, required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(125)
  leverage?: number;

  @ApiProperty({
    example: "ONE_WAY",
    enum: ["ONE_WAY", "HEDGE"],
    required: false,
  })
  @IsOptional()
  @IsString()
  position_mode?: PositionMode;

  @ApiProperty({ example: false, required: false })
  @IsOptional()
  reduce_only?: boolean;

  @ApiProperty({
    example: "1737360000000",
    description: "TradingView {{timenow}}",
  })
  @IsString()
  @IsNotEmpty()
  signal_id: string;
}

/**
 * Base Payload DTO
 * @description 모든 provider 공통 페이로드
 */
export class BasePayloadDto {
  @ApiProperty({ example: "BTCUSDT" })
  @IsString()
  @IsNotEmpty()
  ticker: string;

  @ApiProperty({ example: "open_long", enum: WebhookAction })
  @IsEnum(WebhookAction)
  action: WebhookAction;

  @ApiProperty({
    type: EntryDto,
    required: false,
    description: "진입 주문 타입 (기본값: market)",
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => EntryDto)
  entry?: EntryDto;

  @ApiProperty({ type: QtyDto })
  @ValidateNested()
  @Type(() => QtyDto)
  qty: QtyDto;

  @ApiProperty({ type: StrategyDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => StrategyDto)
  strategy?: StrategyDto;

  @ApiProperty({ type: OptionsDto })
  @ValidateNested()
  @Type(() => OptionsDto)
  options: OptionsDto;

  @ApiProperty({
    example: "USDT",
    enum: ["USDT", "USDC"],
    required: false,
    description: "Quote asset for balance calculation (default: USDT)",
  })
  @IsOptional()
  @IsEnum(["USDT", "USDC"])
  quote_asset?: QuoteAsset;
}

/**
 * Binance Payload DTO
 * @description Binance 전용 확장 페이로드
 */
export class BinancePayloadDto extends BasePayloadDto {
  @ApiProperty({ example: "binance" })
  @IsString()
  @IsNotEmpty()
  exchange: string;

  @ApiProperty({ example: "futures_um", enum: MarketType })
  @IsEnum(MarketType)
  market: MarketType;
}
