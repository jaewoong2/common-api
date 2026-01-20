/**
 * Binance API Error Codes Enum
 * @description Binance Futures API 에러 코드 (주요 항목)
 * @see https://binance-docs.github.io/apidocs/futures/en/#error-codes
 */
export enum BinanceErrorCode {
  // General errors
  UNKNOWN = -1000,
  DISCONNECTED = -1001,
  UNAUTHORIZED = -1002,
  TOO_MANY_REQUESTS = -1003,
  IP_BANNED = -1005,
  INVALID_MESSAGE = -1013,
  INVALID_TIMESTAMP = -1021,
  INVALID_SIGNATURE = -1022,

  // Trading errors
  INSUFFICIENT_BALANCE = -2010,
  MARKET_CLOSED = -2011,
  INVALID_QUANTITY = -1111,
  INVALID_PRICE = -1112,
  POSITION_NOT_EXIST = -2015,
  MARGIN_NOT_SUFFICIENT = -2019,
  REDUCE_ONLY_REJECT = -2022,

  // Order errors
  ORDER_DOES_NOT_EXIST = -2013,
  ORDER_EXCEED_LIMIT = -2027,
  ORDER_WOULD_TRIGGER_IMMEDIATELY = -2021,
}

/**
 * Get error message from Binance error code
 */
export function getBinanceErrorMessage(code: number): string {
  const messages: Record<number, string> = {
    [-1000]: "Unknown error occurred",
    [-1001]: "Disconnected from server",
    [-1002]: "Unauthorized request",
    [-1003]: "Too many requests, rate limited",
    [-1005]: "IP has been auto-banned",
    [-1013]: "Invalid message",
    [-1021]: "Timestamp outside of recvWindow",
    [-1022]: "Signature is not valid",
    [-2010]: "Insufficient balance",
    [-2011]: "Market is closed",
    [-1111]: "Invalid quantity",
    [-1112]: "Invalid price",
    [-2015]: "Position does not exist",
    [-2019]: "Margin is not sufficient",
    [-2022]: "Reduce-only order rejected",
    [-2013]: "Order does not exist",
    [-2027]: "Order exceeds allowed limit",
    [-2021]: "Order would trigger immediately",
  };

  return messages[code] || `Unknown error (code: ${code})`;
}
