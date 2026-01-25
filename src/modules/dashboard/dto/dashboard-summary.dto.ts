import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";

/**
 * Dashboard Summary DTO
 * @description 대시보드 요약 응답 DTO
 */
export class DashboardSummaryDto {
  @ApiProperty({ example: 150, description: "총 Webhook 실행 수" })
  @Expose()
  totalTrades: number;

  @ApiProperty({ example: 120, description: "성공 실행 수" })
  @Expose()
  successTrades: number;

  @ApiProperty({ example: 30, description: "실패 실행 수" })
  @Expose()
  failedTrades: number;

  @ApiProperty({
    example: 80,
    description: "Webhook 성공률 (%) - 실제 거래 수익률이 아님",
  })
  @Expose()
  webhookSuccessRate: number;

  @ApiProperty({ example: 12, description: "오늘(24시간) 거래 수" })
  @Expose()
  todayTrades: number;

  @ApiProperty({
    example: { open_long: 50, close_long: 40, open_short: 30, close_short: 20 },
    description: "액션별 거래 수",
  })
  @Expose()
  tradesByAction: Record<string, number>;

  @ApiProperty({
    example: ["BTCUSDT", "ETHUSDT"],
    description: "최근 7일 활성 티커 목록 (최대 10개)",
  })
  @Expose()
  activeTickers: string[];
}
