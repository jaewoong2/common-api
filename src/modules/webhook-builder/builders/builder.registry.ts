import { Injectable, Inject, NotFoundException } from "@nestjs/common";
import { ProviderBuilderAdapter } from "./provider-builder.interface";
import { BUILDER_ADAPTERS } from "./builder-adapters.token";

/**
 * Builder Registry
 * @description Provider별 Builder 라우팅 (DI Token 기반)
 */
@Injectable()
export class BuilderRegistry {
  private readonly builders: Map<string, ProviderBuilderAdapter>;

  constructor(@Inject(BUILDER_ADAPTERS) builders: ProviderBuilderAdapter[]) {
    this.builders = new Map<string, ProviderBuilderAdapter>();
    builders.forEach((builder) => {
      this.builders.set(builder.provider.toLowerCase(), builder);
    });
  }

  /**
   * Get builder by provider name
   */
  getBuilder(provider: string): ProviderBuilderAdapter {
    const builder = this.builders.get(provider.toLowerCase());
    if (!builder) {
      throw new NotFoundException(`Builder not found: ${provider}`);
    }
    return builder;
  }

  /**
   * List supported providers
   */
  getSupportedProviders(): string[] {
    return Array.from(this.builders.keys());
  }

  /**
   * Check if provider is supported
   */
  hasBuilder(provider: string): boolean {
    return this.builders.has(provider.toLowerCase());
  }
}
