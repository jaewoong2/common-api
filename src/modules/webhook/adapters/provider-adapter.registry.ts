import { Injectable, NotFoundException } from "@nestjs/common";
import { ProviderAdapter } from "./provider-adapter.interface";
import { BinanceAdapter } from "./binance/binance.adapter";

/**
 * Provider Adapter Registry
 * @description Provider별 Adapter 라우팅
 */
@Injectable()
export class ProviderAdapterRegistry {
  private readonly adapters: Map<string, ProviderAdapter>;

  constructor(private readonly binanceAdapter: BinanceAdapter) {
    this.adapters = new Map<string, ProviderAdapter>([
      ["binance", binanceAdapter],
    ]);
  }

  /**
   * Get adapter by provider name
   */
  getAdapter(provider: string): ProviderAdapter {
    const adapter = this.adapters.get(provider.toLowerCase());
    if (!adapter) {
      throw new NotFoundException(`Provider not found: ${provider}`);
    }
    return adapter;
  }

  /**
   * List supported providers
   */
  getSupportedProviders(): string[] {
    return Array.from(this.adapters.keys());
  }
}
