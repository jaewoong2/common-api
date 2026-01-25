import {
  OrderType,
  QtyType,
  PositionMode,
  QuoteAsset,
  OrderSide,
  TpSlType,
  TradePosition,
  TradeBalance,
} from "../../../common/types";

/**
 * Exchange Credentials Interface
 * @description 복호화된 거래소 API 인증 정보
 */
export interface ExchangeCredentials {
  accessKey: string;
  secretKey: string;
}

/**
 * Execution Result Interface
 * @description Provider 주문 실행 결과
 */
export interface ExecutionResult {
  success: boolean;
  status: "SUCCESS" | "FAIL" | "PARTIAL_FAIL";
  entryJson?: {
    orderId: string;
    symbol: string;
    side: string;
    quantity: string;
    price: string;
    clientOrderId: string;
  };
  exitJson?: {
    tpOrderId?: string;
    slOrderId?: string;
  };
  errorJson?: {
    message: string;
    code?: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Provider Request Interface
 * @description Provider별 주문 요청 구조
 */
export interface ProviderRequest {
  userId: string;
  signalId: string;
  symbol: string;
  side: OrderSide;
  orderType: OrderType; // market 또는 limit
  quantity: string;
  price?: string; // limit 주문 시 필수
  leverage?: number;
  stopLoss?: number;
  takeProfit?: number;
  clientOrderId: string;
  positionMode?: PositionMode;
  reduceOnly?: boolean;
  metadata?: Record<string, any>;
}

/**
 * Base Payload Interface
 * @description Webhook 페이로드 기본 구조
 */
export interface BasePayload {
  ticker: string;
  action: string;
  entry?: {
    type: OrderType;
    price?: number | string;
  };
  qty: {
    type: QtyType;
    value: number;
  };
  strategy?: {
    stop_loss?: { type: TpSlType; value: number; qty_percent?: number };
    take_profit?: { type: TpSlType; value: number; qty_percent?: number };
  };
  options: {
    signal_id: string;
    leverage?: number;
    position_mode?: PositionMode;
    reduce_only?: boolean;
  };
  quote_asset?: QuoteAsset;
}

/**
 * Provider Adapter Interface
 * @description 거래소/증권사별 주문 실행 어댑터 인터페이스
 */
export interface ProviderAdapter {
  /**
   * Provider 식별자
   */
  readonly provider: string;

  /**
   * Provider별 Payload 검증
   * @param payload - 원본 페이로드
   * @throws ValidationError if invalid
   */
  validatePayload(payload: BasePayload): Promise<void>;

  /**
   * Payload → Provider API Request 변환
   * @param userId - 사용자 ID
   * @param signalId - 시그널 ID
   * @param payload - 원본 페이로드
   * @param credentials - 거래소 인증 정보 (잔고 조회용)
   * @returns Provider 전용 요청 객체
   */
  transformRequest(
    userId: string,
    signalId: string,
    payload: BasePayload,
    credentials: ExchangeCredentials,
  ): Promise<ProviderRequest>;

  /**
   * 주문 실행
   * @param request - 변환된 요청
   * @param credentials - 거래소 인증 정보
   * @returns 실행 결과
   */
  execute(
    request: ProviderRequest,
    credentials: ExchangeCredentials,
  ): Promise<ExecutionResult>;

  /**
   * Get Current Positions
   */
  getPositions(
    credentials: ExchangeCredentials,
    symbol?: string,
    options?: Record<string, any>,
  ): Promise<TradePosition[]>;

  /**
   * Get Account Balances
   */
  getBalances(
    credentials: ExchangeCredentials,
    assets?: string[],
    options?: Record<string, any>,
  ): Promise<TradeBalance[]>;
}
