import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosInstance } from "axios";
import * as crypto from "crypto";

export interface ExchangeCredentials {
  accessKey: string;
  secretKey: string;
}

export interface BalanceInfo {
  asset: string;
  balance: string;
  availableBalance?: string; // futures only
  crossWalletBalance?: string; // futures only
}

/**
 * Position Risk Info (Futures Only)
 * @description GET /fapi/v3/positionRisk 응답 구조
 */
export interface PositionInfo {
  symbol: string;
  positionAmt: string; // 양수=LONG, 음수=SHORT, 0=포지션 없음
  entryPrice: string;
  breakEvenPrice: string;
  markPrice: string;
  unRealizedProfit: string;
  liquidationPrice: string;
  leverage: string;
  maxNotionalValue: string;
  marginType: "isolated" | "cross";
  isolatedMargin: string;
  isAutoAddMargin: string;
  positionSide: "BOTH" | "LONG" | "SHORT";
  notional: string;
  isolatedWallet: string;
  updateTime: number;
}

/**
 * Exchange Information
 * @description GET /fapi/v1/exchangeInfo 응답 구조 (필요한 필드만)
 */
export interface ExchangeInfo {
  symbol: string;
  pricePrecision: number;
  quantityPrecision: number;
  filters: {
    filterType: "PRICE_FILTER" | "LOT_SIZE" | "MIN_NOTIONAL" | string;
    tickSize?: string; // PRICE_FILTER
    stepSize?: string; // LOT_SIZE
    minQty?: string; // LOT_SIZE
    minNotional?: string; // MIN_NOTIONAL
  }[];
}

/**
 * Binance API Client
 * @description Binance Futures REST API 호출 클라이언트
 */
@Injectable()
export class BinanceApiClient {
  private readonly logger = new Logger(BinanceApiClient.name);
  private readonly futuresBaseUrl: string;
  private readonly spotBaseUrl: string;

  constructor(private readonly configService: ConfigService) {
    // Testnet or Mainnet
    this.futuresBaseUrl = "https://fapi.binance.com"; // Production
    this.spotBaseUrl = "https://api.binance.com";
  }

  private getBaseUrl(market: "futures_um" | "spot"): string {
    return market === "spot" ? this.spotBaseUrl : this.futuresBaseUrl;
  }

  /**
   * Create axios instance with credentials
   */
  private createClient(
    credentials: ExchangeCredentials,
    market: "futures_um" | "spot",
  ): AxiosInstance {
    return axios.create({
      baseURL: this.getBaseUrl(market),
      headers: {
        "X-MBX-APIKEY": credentials.accessKey,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      timeout: 10000,
    });
  }

  /**
   * Generate HMAC SHA256 signature
   */
  private sign(
    params: Record<string, string | number>,
    secretKey: string,
  ): string {
    const queryString = new URLSearchParams(
      Object.entries(params).map(([k, v]) => [k, String(v)]),
    ).toString();
    return crypto
      .createHmac("sha256", secretKey)
      .update(queryString)
      .digest("hex");
  }

  /**
   * Build signed request params
   */
  private buildSignedParams(
    params: Record<string, string | number>,
    secretKey: string,
  ): string {
    const timestamp = Date.now();
    const paramsWithTs = { ...params, timestamp };
    const signature = this.sign(paramsWithTs, secretKey);
    return new URLSearchParams(
      Object.entries({ ...paramsWithTs, signature }).map(([k, v]) => [
        k,
        String(v),
      ]),
    ).toString();
  }

  /**
   * Get Exchange Info (Public)
   * @description 심볼의 정밀도(precision) 및 필터 정보를 조회
   */
  async getExchangeInfo(
    symbol: string,
    market: "futures_um" | "spot" = "futures_um",
  ): Promise<ExchangeInfo | null> {
    try {
      const endpoint =
        market === "spot" ? "/api/v3/exchangeInfo" : "/fapi/v1/exchangeInfo";
      const baseUrl = this.getBaseUrl(market);
      // Public API 호출이므로 별도 client 생성 없이 axios 사용
      const response = await axios.get(`${baseUrl}${endpoint}`, {
        params: { symbol },
        timeout: 5000,
      });

      // Binance returns { symbols: [...] }
      if (
        response.data &&
        response.data.symbols &&
        response.data.symbols.length > 0
      ) {
        return response.data.symbols[0] as ExchangeInfo;
      }

      return null;
    } catch (error) {
      this.logger.warn(
        `Failed to get exchange info for ${symbol}: ${error.message}`,
      );
      return null; // 실패 시 null 반환 (기본 정밀도 사용)
    }
  }

  /**
   * Get account balance
   */
  async getBalance(
    credentials: ExchangeCredentials,
    market: "futures_um" | "spot" = "futures_um",
  ): Promise<BalanceInfo[]> {
    const client = this.createClient(credentials, market);
    const params = this.buildSignedParams({}, credentials.secretKey);

    try {
      // Endpoint differs slightly between Spot and Futures
      // Futures: /fapi/v2/balance (V2 is standard for User Data)
      // Spot: /api/v3/account (Returns balances inside 'balances' array)

      if (market === "spot") {
        const response = await client.get(`/api/v3/account?${params}`);
        // Transform Spot response to match Futures format for consistent consumption
        // Spot response: { balances: [ { asset: 'BTC', free: '0.1', locked: '0.0' } ] }
        interface SpotBalance {
          asset: string;
          free: string;
          locked: string;
        }
        return response.data.balances.map((b: SpotBalance) => ({
          asset: b.asset,
          balance: (parseFloat(b.free) + parseFloat(b.locked)).toString(),
          availableBalance: b.free,
          crossWalletBalance: (
            parseFloat(b.free) + parseFloat(b.locked)
          ).toString(),
        }));
      } else {
        const response = await client.get(`/fapi/v2/balance?${params}`);
        return response.data;
      }
    } catch (error) {
      this.logger.error(`Get balance failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get position risk/information for a symbol (Futures Only)
   * @description Close 액션 실행 전 현재 포지션 조회용
   * @returns PositionInfo[]
   */
  async getPositionRisk(
    credentials: ExchangeCredentials,
    symbol?: string,
  ): Promise<PositionInfo[]> {
    const client = this.createClient(credentials, "futures_um");
    const params: Record<string, string | number> = {};
    if (symbol) params.symbol = symbol;

    const signedParams = this.buildSignedParams(params, credentials.secretKey);

    try {
      // V3 endpoint
      const response = await client.get(
        `/fapi/v3/positionRisk?${signedParams}`,
      );

      if (!response.data || response.data.length === 0) {
        return [];
      }

      // If symbol is provided, filter for relevant position (ONE_WAY or BOTH) similar to before
      // But for general purpose, returning the array is better.
      // The caller should filter.
      return response.data as PositionInfo[];
    } catch (error) {
      this.logger.error(`Get position risk failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Set leverage for symbol (Futures Only)
   */
  async setLeverage(
    credentials: ExchangeCredentials,
    symbol: string,
    leverage: number,
    market: "futures_um" = "futures_um", // Spot has no leverage setting in this context usually
  ): Promise<void> {
    if (market !== "futures_um") {
      this.logger.warn(`Set leverage not supported for market: ${market}`);
      return;
    }

    const client = this.createClient(credentials, market);
    const params = this.buildSignedParams(
      { symbol, leverage },
      credentials.secretKey,
    );

    try {
      await client.post("/fapi/v1/leverage", params);
    } catch (error) {
      // Ignore if leverage already set (code -4028)
      if (error.response?.data?.code !== -4028) {
        this.logger.error(`Set leverage failed: ${error.message}`);
      }
    }
  }

  /**
   * Place order (MARKET or LIMIT)
   * @description Market 또는 Limit 주문 실행
   */
  async placeOrder(
    credentials: ExchangeCredentials,
    params: {
      symbol: string;
      side: "BUY" | "SELL";
      orderType: "market" | "limit";
      quantity: string;
      price?: string; // limit 주문 시 필수
      clientOrderId: string;
      reduceOnly?: boolean;
    },
    market: "futures_um" | "spot" = "futures_um",
  ): Promise<{
    orderId: number;
    symbol: string;
    side: string;
    origQty: string;
    avgPrice: string;
    clientOrderId: string;
    status: string;
  }> {
    const client = this.createClient(credentials, market);

    const orderType = params.orderType === "limit" ? "LIMIT" : "MARKET";

    const orderParams: Record<string, string | number> = {
      symbol: params.symbol,
      side: params.side,
      type: orderType,
      quantity: params.quantity,
      newClientOrderId: params.clientOrderId,
    };

    // Limit 주문 시 가격 필수
    if (params.orderType === "limit") {
      if (!params.price) {
        throw new Error("Price is required for limit orders");
      }
      orderParams.price = params.price;
      // Futures limit orders require timeInForce
      if (market === "futures_um") {
        orderParams.timeInForce = "GTC"; // Good Till Cancel
      }
    }

    if (market === "futures_um" && params.reduceOnly) {
      orderParams.reduceOnly = "true";
    }

    const signedParams = this.buildSignedParams(
      orderParams,
      credentials.secretKey,
    );

    try {
      const endpoint = market === "spot" ? "/api/v3/order" : "/fapi/v1/order";
      const response = await client.post(endpoint, signedParams);

      this.logger.log(
        `${orderType} order placed: ${params.clientOrderId}, orderId=${response.data.orderId}`,
      );

      // Normalize response
      if (market === "spot") {
        return {
          orderId: response.data.orderId,
          symbol: response.data.symbol,
          side: response.data.side,
          origQty: response.data.origQty,
          avgPrice: response.data.cummulativeQuoteQty
            ? (
                parseFloat(response.data.cummulativeQuoteQty) /
                parseFloat(response.data.executedQty)
              ).toString()
            : response.data.price || "0",
          clientOrderId: response.data.clientOrderId,
          status: response.data.status,
        };
      }

      return response.data;
    } catch (error) {
      this.logger.error(
        `Place ${orderType} order failed: ${error.message}`,
        error.response?.data,
      );
      throw error;
    }
  }

  /**
   * Place stop loss order (STOP_MARKET)
   */
  async placeStopLoss(
    credentials: ExchangeCredentials,
    params: {
      symbol: string;
      side: "BUY" | "SELL";
      quantity: string;
      stopPrice: string;
      clientOrderId: string;
    },
    market: "futures_um" | "spot" = "futures_um",
  ): Promise<{ orderId: number; clientOrderId: string }> {
    if (market === "spot") {
      throw new Error("Spot Stop Loss not implemented yet");
    }

    const client = this.createClient(credentials, market);

    const orderParams: Record<string, string | number> = {
      symbol: params.symbol,
      side: params.side,
      type: "STOP_MARKET",
      quantity: params.quantity,
      stopPrice: params.stopPrice,
      newClientOrderId: params.clientOrderId,
      // Note: closePosition과 quantity는 동시 사용 불가 (에러 -4137)
      // quantity를 사용하면 지정된 수량만 청산
    };

    const signedParams = this.buildSignedParams(
      orderParams,
      credentials.secretKey,
    );

    try {
      const response = await client.post("/fapi/v1/order", signedParams);
      this.logger.log(`Stop loss placed: ${params.clientOrderId}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Place stop loss failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Place take profit order (TAKE_PROFIT_MARKET)
   */
  async placeTakeProfit(
    credentials: ExchangeCredentials,
    params: {
      symbol: string;
      side: "BUY" | "SELL";
      quantity: string;
      stopPrice: string;
      clientOrderId: string;
    },
    market: "futures_um" | "spot" = "futures_um",
  ): Promise<{ orderId: number; clientOrderId: string }> {
    if (market === "spot") {
      throw new Error("Spot Take Profit not implemented yet");
    }

    const client = this.createClient(credentials, market);

    const orderParams: Record<string, string | number> = {
      symbol: params.symbol,
      side: params.side,
      type: "TAKE_PROFIT_MARKET",
      quantity: params.quantity,
      stopPrice: params.stopPrice,
      newClientOrderId: params.clientOrderId,
      // Note: closePosition과 quantity는 동시 사용 불가 (에러 -4137)
    };

    const signedParams = this.buildSignedParams(
      orderParams,
      credentials.secretKey,
    );

    try {
      const response = await client.post("/fapi/v1/order", signedParams);
      this.logger.log(`Take profit placed: ${params.clientOrderId}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Place take profit failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get current price
   */
  async getPrice(
    symbol: string,
    market: "futures_um" | "spot" = "futures_um",
  ): Promise<string> {
    try {
      const baseUrl = this.getBaseUrl(market);
      const endpoint =
        market === "spot" ? "/api/v3/ticker/price" : "/fapi/v1/ticker/price";

      const response = await axios.get(`${baseUrl}${endpoint}`, {
        params: { symbol },
      });
      return response.data.price;
    } catch (error) {
      this.logger.error(`Get price failed: ${error.message}`);
      throw error;
    }
  }
}
