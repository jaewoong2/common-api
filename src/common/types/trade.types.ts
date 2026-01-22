/**
 * Common Trade Types
 * @description 거래소 독립적인 포지션 및 잔고 인터페이스
 */

export interface TradePosition {
  symbol: string;
  side: "LONG" | "SHORT" | "BOTH"; // BOTH is for one-way mode where side is determined by amount sign
  amount: string; // 절대값 아님, 음수일 수 있음 (거래소마다 다름, 추상화 필요)
  entryPrice: string;
  unrealizedProfit: string;
  leverage: string;
  liquidationPrice?: string;
  marginType?: "isolated" | "cross";
  // Add other common fields as needed
}

export interface TradeBalance {
  asset: string;
  balance: string; // Total Balance (Wallet Balance)
  availableBalance: string; // Available for trade
  crossWalletBalance?: string;
}
