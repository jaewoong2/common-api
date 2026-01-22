import { Injectable, Inject, NotFoundException } from "@nestjs/common";
import { ProviderAdapter } from "./provider-adapter.interface";
import { PROVIDER_ADAPTERS } from "./provider-adapters.token";

/**
 * Provider Adapter Registry
 * @description Provider별 Adapter 라우팅 (DI Token 기반)
 * @note 새 Adapter 추가 시 Registry 수정 불필요 (OCP 준수)
 */
@Injectable()
export class ProviderAdapterRegistry {
  private readonly adapters: Map<string, ProviderAdapter>;

  constructor(@Inject(PROVIDER_ADAPTERS) adapters: ProviderAdapter[]) {
    this.adapters = new Map<string, ProviderAdapter>();
    adapters.forEach((adapter) => {
      this.adapters.set(adapter.provider.toLowerCase(), adapter);
    });
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
