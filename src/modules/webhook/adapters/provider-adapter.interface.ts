import { InvocationType } from "@aws-sdk/client-lambda";

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
  side: "BUY" | "SELL";
  quantity: string;
  leverage?: number;
  stopLoss?: number;
  takeProfit?: number;
  clientOrderId: string;
  positionMode?: "ONE_WAY" | "HEDGE";
  reduceOnly?: boolean;
}

/**
 * Base Payload Interface
 * @description Webhook 페이로드 기본 구조
 */
export interface BasePayload {
  ticker: string;
  action: string;
  qty: {
    type: "percent" | "fixed";
    value: number;
  };
  strategy?: {
    stop_loss?: { type: string; value: number };
    take_profit?: { type: string; value: number };
  };
  options: {
    signal_id: string;
    leverage?: number;
    position_mode?: "ONE_WAY" | "HEDGE";
    reduce_only?: boolean;
  };
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
   * @returns Provider 전용 요청 객체
   */
  transformRequest(
    userId: string,
    signalId: string,
    payload: BasePayload,
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
}
