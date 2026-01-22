import { ApiProperty } from "@nestjs/swagger";

/**
 * Select Option Item
 * @description 프론트엔드 Select 컴포넌트용 옵션
 */
export class SelectOptionDto {
  @ApiProperty({ example: "binance" })
  value: string;

  @ApiProperty({ example: "Binance" })
  label: string;
}

/**
 * Number Range DTO
 * @description Min/Max/Default 범위 설정
 */
export class NumberRangeDto {
  @ApiProperty({ example: 1 })
  min: number;

  @ApiProperty({ example: 125 })
  max: number;

  @ApiProperty({ example: 10 })
  default: number;
}

/**
 * Defaults DTO
 * @description 기본값 설정
 */
export class DefaultsDto {
  @ApiProperty({ type: NumberRangeDto })
  leverage: NumberRangeDto;

  @ApiProperty({ type: NumberRangeDto })
  qtyPercent: NumberRangeDto;

  @ApiProperty({ type: NumberRangeDto })
  stopLossPercent: NumberRangeDto;

  @ApiProperty({ type: NumberRangeDto })
  takeProfitPercent: NumberRangeDto;
}

/**
 * Webhook Builder Options DTO
 * @description 프론트엔드 Select 옵션 응답
 */
export class WebhookBuilderOptionsDto {
  @ApiProperty({ type: [SelectOptionDto] })
  exchanges: SelectOptionDto[];

  @ApiProperty({ type: [SelectOptionDto] })
  markets: SelectOptionDto[];

  @ApiProperty({ type: [SelectOptionDto] })
  actions: SelectOptionDto[];

  @ApiProperty({ type: [SelectOptionDto] })
  qtyTypes: SelectOptionDto[];

  @ApiProperty({ type: [SelectOptionDto] })
  entryTypes: SelectOptionDto[];

  @ApiProperty({ type: [SelectOptionDto] })
  tpSlTypes: SelectOptionDto[];

  @ApiProperty({ type: [SelectOptionDto] })
  positionModes: SelectOptionDto[];

  @ApiProperty({ type: [SelectOptionDto] })
  quoteAssets: SelectOptionDto[];

  @ApiProperty({ type: DefaultsDto })
  defaults: DefaultsDto;
}
