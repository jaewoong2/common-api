import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty, MaxLength } from "class-validator";

/**
 * Create Exchange Key DTO
 * @description 거래소 API 키 등록 요청
 */
export class CreateExchangeKeyDto {
  @ApiProperty({
    example: "binance",
    description: "거래소 이름",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  exchange: string;

  @ApiProperty({
    example: "main",
    description: "키 라벨 (식별용)",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  label: string;

  @ApiProperty({
    example: "AK1234567890...",
    description: "거래소 API Access Key",
  })
  @IsString()
  @IsNotEmpty()
  accessKey: string;

  @ApiProperty({
    example: "SK1234567890...",
    description: "거래소 API Secret Key",
  })
  @IsString()
  @IsNotEmpty()
  secretKey: string;
}
