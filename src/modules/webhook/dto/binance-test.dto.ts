import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  Min,
  Max,
} from "class-validator";
import { Type } from "class-transformer";

export class SetLeverageDto {
  @ApiProperty({ example: "binance" })
  @IsString()
  exchange: string;

  @ApiProperty({ example: "BTCUSDT" })
  @IsString()
  symbol: string;

  @ApiProperty({ example: 10, minimum: 1, maximum: 125 })
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(125)
  leverage: number;

  @ApiProperty({
    example: "futures_um",
    enum: ["futures_um", "spot"],
    required: false,
  })
  @IsOptional()
  @IsEnum(["futures_um", "spot"])
  market?: "futures_um" | "spot" = "futures_um";
}

export class PlaceOrderDto {
  @ApiProperty({ example: "binance" })
  @IsString()
  exchange: string;

  @ApiProperty({ example: "BTCUSDT" })
  @IsString()
  symbol: string;

  @ApiProperty({ example: "BUY", enum: ["BUY", "SELL"] })
  @IsEnum(["BUY", "SELL"])
  side: "BUY" | "SELL";

  @ApiProperty({ example: "0.001" })
  @IsString()
  quantity: string;

  @ApiProperty({ example: false, required: false })
  @IsOptional()
  reduceOnly?: boolean;

  @ApiProperty({
    example: "futures_um",
    enum: ["futures_um", "spot"],
    required: false,
  })
  @IsOptional()
  @IsEnum(["futures_um", "spot"])
  market?: "futures_um" | "spot" = "futures_um";
}

export class GetBalanceDto {
  @ApiProperty({ example: "binance" })
  @IsString()
  exchange: string;

  @ApiProperty({
    example: "futures_um",
    enum: ["futures_um", "spot"],
    required: false,
  })
  @IsOptional()
  @IsEnum(["futures_um", "spot"])
  market?: "futures_um" | "spot" = "futures_um";
}
