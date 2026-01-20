import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosInstance } from "axios";
import * as crypto from "crypto";

interface ExchangeCredentials {
  accessKey: string;
  secretKey: string;
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
   * Get account balance
   */
  async getBalance(
    credentials: ExchangeCredentials,
    market: "futures_um" | "spot" = "futures_um",
  ): Promise<{ asset: string; balance: string }[]> {
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
        return response.data.balances.map((b: any) => ({
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
   * Place market order
   */
  async placeMarketOrder(
    credentials: ExchangeCredentials,
    params: {
      symbol: string;
      side: "BUY" | "SELL";
      quantity: string;
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

    const orderParams: Record<string, string | number> = {
      symbol: params.symbol,
      side: params.side,
      type: "MARKET",
      quantity: params.quantity,
      newClientOrderId: params.clientOrderId,
    };

    if (market === "futures_um" && params.reduceOnly) {
      orderParams.reduceOnly = "true";
    }

    // Spot does not support reduceOnly in the same way, usually ignored or handled differently

    const signedParams = this.buildSignedParams(
      orderParams,
      credentials.secretKey,
    );

    try {
      const endpoint = market === "spot" ? "/api/v3/order" : "/fapi/v1/order";
      const response = await client.post(endpoint, signedParams);

      this.logger.log(
        `Order placed: ${params.clientOrderId}, orderId=${response.data.orderId}`,
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
            : "0", // Approx avg price
          clientOrderId: response.data.clientOrderId,
          status: response.data.status,
        };
      }

      return response.data;
    } catch (error) {
      this.logger.error(
        `Place order failed: ${error.message}`,
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
      closePosition: "true",
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
      closePosition: "true",
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
