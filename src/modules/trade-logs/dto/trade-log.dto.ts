import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import { TradeLogEntity } from "../../../database/entities";

/**
 * Trade Log DTO
 * @description 거래 이력 응답 DTO
 */
export class TradeLogDto {
  @ApiProperty({ example: "1" })
  @Expose()
  logId: string;

  @ApiProperty({ example: "1737360000000" })
  @Expose()
  signalId: string;

  @ApiProperty({ example: "binance" })
  @Expose()
  provider: string;

  @ApiProperty({ example: "binance" })
  @Expose()
  exchange: string;

  @ApiProperty({ example: "futures_um" })
  @Expose()
  market: string;

  @ApiProperty({ example: "BTCUSDT" })
  @Expose()
  ticker: string;

  @ApiProperty({ example: "open_long" })
  @Expose()
  action: string;

  @ApiProperty({ example: "SUCCESS" })
  @Expose()
  status: string;

  @ApiProperty({ example: "2026-01-20T10:00:00.000Z" })
  @Expose()
  createdAt: string;

  // 상세 조회 시에만 포함
  @ApiProperty({ required: false })
  entryJson?: unknown;

  @ApiProperty({ required: false })
  exitJson?: unknown;

  @ApiProperty({ required: false })
  errorJson?: unknown;

  @ApiProperty({ required: false })
  requestJson?: unknown;

  /**
   * Entity → DTO 변환 (목록용)
   */
  static fromEntity(
    entity: TradeLogEntity,
    includeDetails = false,
  ): TradeLogDto {
    const dto = new TradeLogDto();
    dto.logId = entity.id;
    dto.signalId = entity.signalId;
    dto.provider = entity.provider;
    dto.exchange = entity.exchange;
    dto.market = entity.market;
    dto.ticker = entity.ticker;
    dto.action = entity.action;
    dto.status = entity.status;
    dto.createdAt = entity.createdAt.toISOString();

    if (includeDetails) {
      dto.entryJson = entity.entryJson;
      dto.exitJson = entity.exitJson;
      dto.errorJson = entity.errorJson;
      dto.requestJson = entity.requestJson;
    }

    return dto;
  }
}
