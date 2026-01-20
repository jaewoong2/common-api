import { ApiProperty } from "@nestjs/swagger";
import { Exclude, Expose } from "class-transformer";
import { ExchangeKeyEntity } from "../../../database/entities";

/**
 * Exchange Key DTO
 * @description 거래소 API 키 응답 (Secret 마스킹)
 */
export class ExchangeKeyDto {
  @ApiProperty({ example: "uuid-123" })
  @Expose()
  keyId: string;

  @ApiProperty({ example: "binance" })
  @Expose()
  exchange: string;

  @ApiProperty({ example: "main" })
  @Expose()
  label: string;

  @ApiProperty({ example: "AK***1234" })
  @Expose()
  accessKeyMasked: string;

  @ApiProperty({ example: "2026-01-20T10:00:00.000Z" })
  @Expose()
  createdAt: string;

  @Exclude()
  accessKeyEnc: string;

  @Exclude()
  secretKeyEnc: string;

  @Exclude()
  kmsDataKeyId: string;

  /**
   * Entity → DTO 변환 (마스킹 적용)
   */
  static fromEntity(
    entity: ExchangeKeyEntity,
    decryptedAccessKey?: string,
  ): ExchangeKeyDto {
    const dto = new ExchangeKeyDto();
    dto.keyId = entity.id;
    dto.exchange = entity.exchange;
    dto.label = entity.label;
    dto.createdAt = entity.createdAt.toISOString();

    // Access Key 마스킹: 앞 2자리 + *** + 뒤 4자리
    if (decryptedAccessKey) {
      const len = decryptedAccessKey.length;
      if (len > 6) {
        dto.accessKeyMasked = `${decryptedAccessKey.slice(0, 2)}***${decryptedAccessKey.slice(-4)}`;
      } else {
        dto.accessKeyMasked = "***";
      }
    } else {
      dto.accessKeyMasked = "***";
    }

    return dto;
  }
}
