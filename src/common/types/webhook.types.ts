/**
 * Webhook Shared Types
 * @description Single Source of Truth - 모든 webhook 관련 모듈에서 공유하는 타입 정의
 * @note 이 파일 수정 시 TypeScript가 모든 관련 파일에 에러를 표시함
 */

// ===== Primitive Types =====

/** 수량 타입 */
export type QtyType = "percent" | "fixed";

/** 주문 타입 */
export type OrderType = "market" | "limit";

/** 포지션 모드 */
export type PositionMode = "ONE_WAY" | "HEDGE";

/** Quote Asset */
export type QuoteAsset = "USDT" | "USDC";

/** TP/SL 타입 */
export type TpSlType = "percent" | "price";

/** Order Side */
export type OrderSide = "BUY" | "SELL";

// ===== Shared Interfaces =====

/**
 * Entry Order Configuration
 * @description 진입 주문 설정 (market 또는 limit)
 */
export interface EntryConfig {
  type: OrderType;
  price?: number | string; // limit일 때 필수, TradingView placeholder 지원 (e.g., "{{close}}")
}

/**
 * Quantity Configuration
 * @description 수량 설정 (percent 또는 fixed)
 */
export interface QtyConfig {
  type: QtyType;
  value: number | string; // TradingView placeholder 지원
}

/**
 * TP/SL Configuration
 * @description Take Profit / Stop Loss 설정
 */
export interface TpSlConfig {
  type: TpSlType;
  value: number | string;
  qty_percent?: number; // 부분 청산 비율 (default: 100)
}

/**
 * Strategy Configuration
 * @description TP/SL 전략 설정
 */
export interface StrategyConfig {
  stop_loss?: TpSlConfig;
  take_profit?: TpSlConfig | TpSlConfig[]; // 단일 또는 다단계 TP
}

/**
 * Options Configuration
 * @description 거래 옵션 설정
 */
export interface OptionsConfig {
  signal_id: string;
  leverage?: number;
  position_mode?: PositionMode;
  reduce_only?: boolean;
}

/**
 * Base Webhook Payload Interface
 * @description 모든 provider 공통 페이로드 인터페이스
 */
export interface WebhookPayload {
  ticker: string;
  action: string;
  entry?: EntryConfig; // Optional, default: { type: "market" }
  qty: QtyConfig;
  strategy?: StrategyConfig;
  options: OptionsConfig;
  quote_asset?: QuoteAsset;
}

// ===== Default Values =====

export const DEFAULT_ENTRY: EntryConfig = {
  type: "market",
};

export const DEFAULT_QUOTE_ASSET: QuoteAsset = "USDT";
