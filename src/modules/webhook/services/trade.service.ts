import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { ExchangeKeyService } from "../../exchange-keys";
import { ProviderAdapterRegistry } from "../adapters/provider-adapter.registry";
import { TradePosition, TradeBalance } from "../../../common/types";

@Injectable()
export class TradeService {
  private readonly logger = new Logger(TradeService.name);

  constructor(
    private readonly keyService: ExchangeKeyService,
    private readonly registry: ProviderAdapterRegistry,
  ) {}

  /**
   * 내 포지션 조회
   * @param userId 사용자 ID
   * @param exchange 거래소 (binance)
   * @param market 마켓 타입 (futures_um)
   * @param symbol 특정 심볼 (옵션)
   */
  async getPositions(
    userId: string,
    exchange: string = "binance",
    market: "futures_um" | "spot" = "futures_um",
    symbol?: string,
  ): Promise<TradePosition[]> {
    // 1. Get Adapter
    const adapter = this.registry.getAdapter(exchange);
    if (!adapter) {
      throw new BadRequestException(`Provider ${exchange} not supported`);
    }

    // 2. Get API Keys
    const credentials = await this.keyService.getCredentials(userId, exchange);

    // 3. Call Adapter (Standardized)
    return adapter.getPositions(credentials, symbol, { market });
  }

  /**
   * 내 계좌 잔고 조회
   * @param userId 사용자 ID
   * @param exchange 거래소
   * @param market 마켓 타입
   * @param assets 필터링할 자산 목록 (예: ["USDT", "USDC"])
   */
  async getBalances(
    userId: string,
    exchange: string = "binance",
    market: "futures_um" | "spot" = "futures_um",
    assets?: string[],
  ): Promise<TradeBalance[]> {
    const adapter = this.registry.getAdapter(exchange);
    if (!adapter) {
      throw new BadRequestException(`Provider ${exchange} not supported`);
    }

    const credentials = await this.keyService.getCredentials(userId, exchange);

    // Call Adapter (Standardized)
    return adapter.getBalances(credentials, assets, { market });
  }
}
