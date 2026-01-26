import { ApiProperty } from "@nestjs/swagger";
import {
  IsOptional,
  IsString,
  IsNumber,
  ValidateNested,
  IsEnum,
  IsObject,
} from "class-validator";
import { Type } from "class-transformer";
import { WebhookAction } from "../../../common/enums";
import { EntryDto, QtyDto, StrategyDto, OptionsDto } from "./payload.dto";

/**
 * Discord Embed Field
 */
export class DiscordEmbedFieldDto {
  @ApiProperty({ example: "💵 Price" })
  @IsString()
  name: string;

  @ApiProperty({ example: "$50000" })
  @IsString()
  value: string;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  inline?: boolean;
}

/**
 * Discord Embed Footer
 */
export class DiscordEmbedFooterDto {
  @ApiProperty({ example: "Signal ID: 12345" })
  @IsString()
  text: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  icon_url?: string;
}

/**
 * Discord Embed Object
 */
export class DiscordEmbedDto {
  @ApiProperty({ example: "🚀 LONG Entry: BTCUSDT", required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ example: "📈 롱 포지션 진입", required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 65280, required: false })
  @IsOptional()
  @IsNumber()
  color?: number;

  @ApiProperty({ type: [DiscordEmbedFieldDto], required: false })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => DiscordEmbedFieldDto)
  fields?: DiscordEmbedFieldDto[];

  @ApiProperty({ type: DiscordEmbedFooterDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => DiscordEmbedFooterDto)
  footer?: DiscordEmbedFooterDto;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  timestamp?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  url?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  image?: { url: string };

  @ApiProperty({ required: false })
  @IsOptional()
  thumbnail?: { url: string };
}

/**
 * Discord Payload DTO
 * @description Supports both trading payload format and direct embed format
 */
export class DiscordPayloadDto {
  // ============================================
  // Mode Selection
  // ============================================
  @ApiProperty({
    example: "trading",
    enum: ["embed", "trading"],
    required: false,
    description:
      "Message type: 'embed' for direct embed, 'trading' for auto-generated (default)",
  })
  @IsOptional()
  @IsEnum(["embed", "trading"])
  message_type?: "embed" | "trading";

  // ============================================
  // Direct Embed Mode Fields
  // ============================================
  @ApiProperty({ type: DiscordEmbedDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => DiscordEmbedDto)
  embed?: DiscordEmbedDto;

  @ApiProperty({ example: "Hello Discord!", required: false })
  @IsOptional()
  @IsString()
  content?: string;

  // ============================================
  // Trading Mode Fields (existing)
  // ============================================
  @ApiProperty({ example: "BTCUSDT", required: false })
  @IsOptional()
  @IsString()
  ticker?: string;

  @ApiProperty({ example: "open_long", enum: WebhookAction, required: false })
  @IsOptional()
  @IsEnum(WebhookAction)
  action?: WebhookAction;

  @ApiProperty({ type: EntryDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => EntryDto)
  entry?: EntryDto;

  @ApiProperty({ type: QtyDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => QtyDto)
  qty?: QtyDto;

  @ApiProperty({ type: StrategyDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => StrategyDto)
  strategy?: StrategyDto;

  @ApiProperty({ type: OptionsDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => OptionsDto)
  options?: OptionsDto;

  // Allow other properties for flexibility
  [key: string]: any;
}
