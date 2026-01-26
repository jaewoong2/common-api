import { Injectable, Logger } from "@nestjs/common";
import {
  SymbolRepository,
  SymbolDto,
  SymbolFilter,
  SymbolCreateInput,
} from "../repositories/symbol.repository";
import { BinanceApiClient } from "../../webhook/adapters/binance/binance-api.client";

/**
 * Sync Result
 */
export interface SyncResult {
  provider: string;
  market: string;
  total: number;
  added: number;
  updated: number;
}

/**
 * Symbol Service
 * @description 심볼 관리 및 동기화 서비스
 */
@Injectable()
export class SymbolService {
  private readonly logger = new Logger(SymbolService.name);

  constructor(
    private readonly symbolRepository: SymbolRepository,
    private readonly binanceApiClient: BinanceApiClient,
  ) {}

  /**
   * 심볼 목록 조회
   */
  async getSymbols(filter: SymbolFilter = {}): Promise<SymbolDto[]> {
    return this.symbolRepository.findAll(filter);
  }

  /**
   * 티커 코드만 조회 (WebhookBuilder용)
   */
  async getTickers(
    provider: string,
    market: string,
    status: string = "TRADING",
  ): Promise<string[]> {
    return this.symbolRepository.findSymbolCodes(provider, market, status);
  }

  /**
   * 심볼 개수 조회
   */
  async getCount(filter: SymbolFilter = {}): Promise<number> {
    return this.symbolRepository.count(filter);
  }

  /**
   * Provider에서 심볼 동기화
   */
  async syncFromProvider(
    provider: string,
    market: string,
  ): Promise<SyncResult> {
    this.logger.log(`Starting symbol sync: ${provider}/${market}`);

    let inputs: SymbolCreateInput[] = [];

    if (provider === "binance") {
      inputs = await this.fetchBinanceSymbols(market);
    } else {
      this.logger.warn(`Sync not implemented for provider: ${provider}`);
      return { provider, market, total: 0, added: 0, updated: 0 };
    }

    const { added, updated } = await this.symbolRepository.batchUpsert(inputs);

    this.logger.log(
      `Symbol sync completed: ${provider}/${market} - total: ${inputs.length}, added: ${added}, updated: ${updated}`,
    );

    return {
      provider,
      market,
      total: inputs.length,
      added,
      updated,
    };
  }

  /**
   * Binance 심볼 가져오기
   */
  private async fetchBinanceSymbols(
    market: string,
  ): Promise<SymbolCreateInput[]> {
    try {
      const targetMarket = market === "spot" ? "spot" : "futures_um";
      const symbols =
        await this.binanceApiClient.getPublicSymbols(targetMarket);

      return symbols.map((s) => ({
        provider: "binance",
        market: targetMarket,
        symbol: s.symbol,
        name: null, // Binance doesn't provide names directly
        baseAsset: s.baseAsset || null,
        quoteAsset: s.quoteAsset || null,
        status: s.status || "TRADING",
        assetType: targetMarket === "spot" ? "crypto" : "futures",
        pricePrecision: s.pricePrecision ?? null,
        quantityPrecision: s.quantityPrecision ?? null,
        minNotional: null,
        metadata: null, // ExchangeInfo doesn't have extra metadata fields
      }));
    } catch (error) {
      this.logger.error(`Failed to fetch Binance symbols: ${error.message}`);
      throw error;
    }
  }
}
