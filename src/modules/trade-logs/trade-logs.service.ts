import { Injectable, NotFoundException } from "@nestjs/common";
import { TradeLogRepository, TradeLogQueryOptions } from "./repositories";
import { TradeLogDto, TradeLogQueryDto } from "./dto";

/**
 * Trade Log Service
 * @description 거래 이력 조회 서비스
 */
@Injectable()
export class TradeLogService {
  constructor(private readonly repository: TradeLogRepository) {}

  /**
   * 거래 이력 목록 조회 (필터 + 페이징)
   */
  async getLogs(
    userId: string,
    query: TradeLogQueryDto,
  ): Promise<{
    items: TradeLogDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const options: TradeLogQueryOptions = {
      userId,
      page: query.page,
      limit: query.limit,
      status: query.status,
      ticker: query.ticker,
      market: query.market,
      provider: query.provider,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
    };

    const { items, total } = await this.repository.findByFilter(options);

    return {
      items: items.map((item) => TradeLogDto.fromEntity(item, false)),
      total,
      page: query.page || 1,
      limit: query.limit || 20,
    };
  }

  /**
   * 거래 이력 상세 조회
   */
  async getLogById(userId: string, logId: string): Promise<TradeLogDto> {
    const entity = await this.repository.findByIdAndUserId(logId, userId);
    if (!entity) {
      throw new NotFoundException(`Trade log ${logId} not found`);
    }
    return TradeLogDto.fromEntity(entity, true);
  }
}
