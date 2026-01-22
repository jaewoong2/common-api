import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsNumber,
  IsOptional,
  IsBoolean,
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
 * Entry Input DTO
 */
export class EntryInputDto {
  @ApiProperty({ example: "limit", enum: ["market", "limit"] })
  @IsString()
  @IsEnum(["market", "limit"])
  type: OrderType;

  @ApiProperty({
    example: "50000",
    required: false,
    description:
      "Required if type is limit. Accepts number or TradingView placeholder (e.g. '{{close}}')",
    oneOf: [{ type: "number" }, { type: "string" }],
  })
  @IsOptional()
  price?: number | string;
}

/**
 * Qty Input DTO
 */
export class QtyInputDto {
  @ApiProperty({ example: "percent", enum: ["percent", "fixed"] })
  @IsString()
  @IsEnum(["percent", "fixed"])
  type: QtyType;

  @ApiProperty({
    example: 50,
    description:
      "Accepts number or TradingView placeholder (e.g. '{{strategy.order.contracts}}')",
    oneOf: [{ type: "number" }, { type: "string" }],
  })
  @IsOptional()
  value: number | string;
}

/**
 * TP/SL Input DTO
 */
export class TpSlInputDto {
  @ApiProperty({ example: "percent", enum: ["percent", "price"] })
  @IsString()
  @IsEnum(["percent", "price"])
  type: TpSlType;

  @ApiProperty({
    example: 5,
    description: "Accepts number or TradingView placeholder (e.g. '{{close}}')",
    oneOf: [{ type: "number" }, { type: "string" }],
  })
  @IsOptional()
  value: number | string;

  @ApiProperty({
    example: 100,
    required: false,
    description: "Partial close percentage (default 100)",
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  qty_percent?: number;
}

/**
 * Strategy Input DTO
 */
export class StrategyInputDto {
  @ApiProperty({ type: TpSlInputDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => TpSlInputDto)
  stop_loss?: TpSlInputDto;

  @ApiProperty({ type: [TpSlInputDto], required: false, isArray: true })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => TpSlInputDto)
  take_profit?: TpSlInputDto[];
}

/**
 * Options Input DTO
 */
export class OptionsInputDto {
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
  @IsBoolean()
  reduce_only?: boolean;
}

/**
 * Generate Message Request DTO
 * @description TradingView 메시지 생성 요청
 */
export class GenerateMessageRequestDto {
  @ApiProperty({ example: "binance" })
  @IsString()
  @IsNotEmpty()
  exchange: string;

  @ApiProperty({ example: "futures_um", enum: MarketType })
  @IsEnum(MarketType)
  market: MarketType;

  @ApiProperty({ example: "BTCUSDT" })
  @IsString()
  @IsNotEmpty()
  ticker: string;

  @ApiProperty({ example: "open_long", enum: WebhookAction })
  @IsEnum(WebhookAction)
  action: WebhookAction;

  @ApiProperty({ type: EntryInputDto })
  @ValidateNested()
  @Type(() => EntryInputDto)
  entry: EntryInputDto;

  @ApiProperty({ type: QtyInputDto })
  @ValidateNested()
  @Type(() => QtyInputDto)
  qty: QtyInputDto;

  @ApiProperty({ type: StrategyInputDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => StrategyInputDto)
  strategy?: StrategyInputDto;

  @ApiProperty({ type: OptionsInputDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => OptionsInputDto)
  options?: OptionsInputDto;

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
 * Generated Message DTO
 * @description 생성된 TradingView 메시지
 */
export class GeneratedMessageDto {
  @ApiProperty({
    example: '{"exchange":"binance","market":"futures_um",...}',
    description: "복사용 JSON 문자열",
  })
  message: string;

  @ApiProperty({
    description: "프론트엔드 미리보기용 객체",
    type: "object",
  })
  formatted: Record<string, unknown>;
}
