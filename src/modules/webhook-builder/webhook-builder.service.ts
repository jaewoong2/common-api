import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { BinanceApiClient } from "../webhook/adapters/binance/binance-api.client";
import {
  BuilderRegistry,
  ProviderOptionsDto,
  ProviderTemplate,
} from "./builders";
import { GeneratedMessageDto } from "./dto/generate-message.dto";

/**
 * Combined Options Response DTO
 * @description 프론트엔드용 통합 옵션 응답
 */
export interface CombinedOptionsDto {
  providers: { value: string; label: string }[];
  [key: string]: unknown;
}

/**
 * Webhook Builder Service
 * @description TradingView 웹훅 메시지 빌더 서비스 (다중 Provider 지원)
 */
@Injectable()
export class WebhookBuilderService {
  private readonly logger = new Logger(WebhookBuilderService.name);

  constructor(
    private readonly binanceApiClient: BinanceApiClient,
    private readonly configService: ConfigService,
    private readonly builderRegistry: BuilderRegistry,
  ) {}

  /**
   * 지원 Provider 목록 조회
   */
  getSupportedProviders(): { value: string; label: string }[] {
    const providers = this.builderRegistry.getSupportedProviders();
    const labels: Record<string, string> = {
      binance: "Binance (바이낸스)",
      discord: "Discord (디스코드)",
      kis: "KIS (한국투자증권)",
    };

    return providers.map((p) => ({
      value: p,
      label: labels[p] || p,
    }));
  }

  /**
   * Provider별 Select 옵션 조회
   * @param provider - Provider 이름 (기본값: binance)
   */
  getOptions(provider: string = "binance"): ProviderOptionsDto {
    const builder = this.builderRegistry.getBuilder(provider);
    return builder.getOptions();
  }

  /**
   * 통합 옵션 조회 (Provider 목록 + 선택된 Provider 옵션)
   * @param provider - Provider 이름 (기본값: binance)
   */
  getCombinedOptions(provider: string = "binance"): CombinedOptionsDto {
    const providers = this.getSupportedProviders();
    const providerOptions = this.getOptions(provider);

    return {
      providers,
      ...providerOptions,
    };
  }

  /**
   * 거래소 티커(심볼) 목록 조회
   * @note Phase 3에서 DB 조회로 변경 예정
   */
  async getTickers(
    exchange: string = "binance",
    market: "spot" | "futures_um" | "futures_cm" = "futures_um",
  ): Promise<string[]> {
    if (exchange !== "binance") {
      return [];
    }

    try {
      const targetMarket = market === "spot" ? "spot" : "futures_um";
      const symbols =
        await this.binanceApiClient.getPublicSymbols(targetMarket);

      return symbols
        .filter((s) => s.status === "TRADING")
        .map((s) => s.symbol)
        .sort();
    } catch (error) {
      this.logger.error(
        `Failed to get tickers for ${exchange}/${market}: ${error.message}`,
      );
      return [];
    }
  }

  /**
   * 메시지 생성
   * @param provider - Provider 이름
   * @param input - 입력 데이터
   */
  generateMessage(
    provider: string,
    input: Record<string, unknown>,
  ): GeneratedMessageDto {
    const builder = this.builderRegistry.getBuilder(provider);
    return builder.generateMessage(input);
  }

  /**
   * JSON 스키마 조회
   * @param provider - Provider 이름 (기본값: binance)
   */
  getSchema(provider: string = "binance"): Record<string, unknown> {
    const builder = this.builderRegistry.getBuilder(provider);
    return builder.getSchema();
  }

  /**
   * 예제 템플릿 조회
   * @param provider - Provider 이름 (기본값: binance)
   */
  getTemplates(provider: string = "binance"): ProviderTemplate[] {
    const builder = this.builderRegistry.getBuilder(provider);
    return builder.getTemplates();
  }
}
