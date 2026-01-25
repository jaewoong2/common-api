import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, MoreThanOrEqual } from "typeorm";
import { TradeLogEntity } from "../../database/entities";
import { TradeStatus } from "../../common/enums";

export interface DashboardSummaryResult {
  /** 총 Webhook 실행 수 */
  totalTrades: number;
  /** 성공 실행 수 */
  successTrades: number;
  /** 실패 실행 수 */
  failedTrades: number;
  /** Webhook 성공률 (%) - 실제 거래 수익률이 아님 */
  webhookSuccessRate: number;
  /** 오늘(24시간) 거래 수 */
  todayTrades: number;
  /** 액션별 거래 수 */
  tradesByAction: Record<string, number>;
  /** 최근 7일 활성 티커 (최대 10개) */
  activeTickers: string[];
}

/**
 * Dashboard Service
 * @description 대시보드 통계 및 요약 데이터 서비스
 */
@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    @InjectRepository(TradeLogEntity)
    private readonly tradeLogRepository: Repository<TradeLogEntity>,
  ) {}

  /**
   * 대시보드 요약 조회
   * @param userId 사용자 ID
   */
  async getSummary(userId: string): Promise<DashboardSummaryResult> {
    // 1. Total trades count
    const totalTrades = await this.tradeLogRepository.count({
      where: { userId },
    });

    // 2. Success trades count
    const successTrades = await this.tradeLogRepository.count({
      where: { userId, status: TradeStatus.SUCCESS },
    });

    // 3. Failed trades count
    const failedTrades = await this.tradeLogRepository.count({
      where: { userId, status: TradeStatus.FAIL },
    });

    // 4. Webhook success rate (NOT trading win rate)
    const webhookSuccessRate =
      totalTrades > 0 ? Math.round((successTrades / totalTrades) * 100) : 0;

    // 5. Today trades (last 24 hours)
    const yesterday = new Date();
    yesterday.setHours(yesterday.getHours() - 24);
    const todayTrades = await this.tradeLogRepository.count({
      where: { userId, createdAt: MoreThanOrEqual(yesterday) },
    });

    // 6. Trades by action (breakdown)
    const actionCounts = await this.tradeLogRepository
      .createQueryBuilder("tl")
      .select("tl.action", "action")
      .addSelect("COUNT(*)", "count")
      .where("tl.user_id = :userId", { userId })
      .groupBy("tl.action")
      .getRawMany();

    const tradesByAction: Record<string, number> = {};
    for (const row of actionCounts) {
      tradesByAction[row.action] = parseInt(row.count, 10);
    }

    // 7. Active tickers (distinct tickers with recent activity)
    const activeTickers = await this.tradeLogRepository
      .createQueryBuilder("tl")
      .select("DISTINCT tl.ticker", "ticker")
      .where("tl.user_id = :userId", { userId })
      .andWhere("tl.created_at >= NOW() - INTERVAL '7 days'")
      .limit(10)
      .getRawMany();

    return {
      totalTrades,
      successTrades,
      failedTrades,
      webhookSuccessRate,
      todayTrades,
      tradesByAction,
      activeTickers: activeTickers.map((t) => t.ticker),
    };
  }
}
