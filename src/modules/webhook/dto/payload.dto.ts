import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsNumber,
  IsOptional,
  IsObject,
  ValidateNested,
  Min,
  Max,
} from "class-validator";
import { Type } from "class-transformer";
import { WebhookAction, MarketType } from "../../../common/enums";

/**
 * Quantity DTO
 * @description 수량 지정 (percent 또는 fixed)
 */
export class QtyDto {
  @ApiProperty({ example: "percent", enum: ["percent", "fixed"] })
  @IsString()
  @IsEnum(["percent", "fixed"])
  type: "percent" | "fixed";

  @ApiProperty({ example: 50, description: "percent: 1-100, fixed: 수량" })
  @IsNumber()
  @Min(0)
  value: number;
}

/**
 * Strategy DTO
 * @description TP/SL 전략
 */
export class StrategyDto {
  @ApiProperty({ description: "Stop Loss 설정", required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => QtyDto)
  stop_loss?: QtyDto;

  @ApiProperty({ description: "Take Profit 설정", required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => QtyDto)
  take_profit?: QtyDto;
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
  position_mode?: "ONE_WAY" | "HEDGE";

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
