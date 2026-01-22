import { Injectable, Logger } from "@nestjs/common";
import { BinanceApiClient } from "../adapters/binance/binance-api.client";
import { ExchangeKeyService } from "../../exchange-keys";

/**
 * Binance Test Service
 * @description 어드민용 Binance API 테스트 서비스
 */
@Injectable()
export class BinanceTestService {
  private readonly logger = new Logger(BinanceTestService.name);

  constructor(
    private readonly binanceClient: BinanceApiClient,
    private readonly exchangeKeyService: ExchangeKeyService,
  ) {}

  /**
   * 계정 잔고 조회
   */
  async getBalance(
    userId: string,
    exchange: string,
    market: "futures_um" | "spot" = "futures_um",
  ) {
    const credentials = await this.exchangeKeyService.getCredentials(
      userId,
      exchange,
    );
    return this.binanceClient.getBalance(credentials, market);
  }

  /**
   * 레버리지 설정 (Futures Only)
   */
  async setLeverage(
    userId: string,
    exchange: string,
    symbol: string,
    leverage: number,
    market: "futures_um" = "futures_um",
  ): Promise<{ ok: boolean; message: string }> {
    const credentials = await this.exchangeKeyService.getCredentials(
      userId,
      exchange,
    );
    await this.binanceClient.setLeverage(credentials, symbol, leverage, market);
    return {
      ok: true,
      message: `Leverage set to ${leverage}x for ${symbol} (${market})`,
    };
  }

  /**
   * 시장가 주문
   */
  async placeMarketOrder(
    userId: string,
    exchange: string,
    symbol: string,
    side: "BUY" | "SELL",
    quantity: string,
    reduceOnly?: boolean,
    market: "futures_um" | "spot" = "futures_um",
  ) {
    const credentials = await this.exchangeKeyService.getCredentials(
      userId,
      exchange,
    );
    const clientOrderId = `TEST_${Date.now()}`;

    // Spot reduceOnly check handled in client if needed, but primarily for Futures
    return this.binanceClient.placeOrder(
      credentials,
      {
        symbol,
        side,
        orderType: "market", // Default to market for simple test
        quantity,
        clientOrderId,
        reduceOnly,
      },
      market,
    );
  }

  /**
   * 현재가 조회
   */
  async getPrice(
    symbol: string,
    market: "futures_um" | "spot" = "futures_um",
  ): Promise<{ symbol: string; price: string }> {
    const price = await this.binanceClient.getPrice(symbol, market);
    return { symbol, price };
  }
}
