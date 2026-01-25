import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { BinanceApiClient } from "../webhook/adapters/binance/binance-api.client";
import { WebhookAction, MarketType } from "../../common/enums";
import {
  WebhookBuilderOptionsDto,
  SelectOptionDto,
  DefaultsDto,
} from "./dto/webhook-builder-options.dto";
import {
  GenerateMessageRequestDto,
  GeneratedMessageDto,
} from "./dto/generate-message.dto";

/**
 * Webhook Builder Service
 * @description TradingView 웹훅 메시지 빌더 서비스
 */
@Injectable()
export class WebhookBuilderService {
  private readonly logger = new Logger(WebhookBuilderService.name);

  constructor(
    private readonly binanceApiClient: BinanceApiClient,
    private readonly configService: ConfigService,
  ) {}

  /**
   * 거래소 티커(심볼) 목록 조회
   */
  async getTickers(
    exchange: string = "binance",
    market: "spot" | "futures_um" | "futures_cm" = "futures_um",
  ): Promise<string[]> {
    if (exchange !== "binance") {
      return [];
    }

    try {
      // futures_um or spot (currently supported by adapter)
      const targetMarket = market === "spot" ? "spot" : "futures_um";
      const symbols =
        await this.binanceApiClient.getPublicSymbols(targetMarket);

      // Filter for TRADING status and map to symbol string
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
   * 프론트엔드 Select 옵션 조회
   */
  getOptions(): WebhookBuilderOptionsDto {
    const exchanges: SelectOptionDto[] = [
      { value: "binance", label: "Binance" },
    ];

    const markets: SelectOptionDto[] = [
      { value: MarketType.SPOT, label: "Spot" },
      { value: MarketType.FUTURES_UM, label: "Futures USDT-M" },
      // { value: MarketType.FUTURES_CM, label: "Futures Coin-M" }, // Not fully supported yet
    ];

    const actions: SelectOptionDto[] = [
      { value: WebhookAction.OPEN_LONG, label: "Open Long (롱 진입)" },
      { value: WebhookAction.OPEN_SHORT, label: "Open Short (숏 진입)" },
      { value: WebhookAction.CLOSE_LONG, label: "Close Long (롱 청산)" },
      { value: WebhookAction.CLOSE_SHORT, label: "Close Short (숏 청산)" },
      { value: WebhookAction.CLOSE_ALL, label: "Close All (전체 청산)" },
    ];

    const entryTypes: SelectOptionDto[] = [
      { value: "market", label: "Market (시장가)" },
      { value: "limit", label: "Limit (지정가)" },
    ];

    const qtyTypes: SelectOptionDto[] = [
      { value: "percent", label: "Percent (% 비율)" },
      { value: "fixed", label: "Fixed (고정 수량)" },
    ];

    const tpSlTypes: SelectOptionDto[] = [
      { value: "percent", label: "Percent (진입가 대비 %)" },
      { value: "price", label: "Price (지정가)" },
    ];

    const positionModes: SelectOptionDto[] = [
      { value: "ONE_WAY", label: "One-way Mode (단방향)" },
      { value: "HEDGE", label: "Hedge Mode (헤지)" },
    ];

    const quoteAssets: SelectOptionDto[] = [
      { value: "USDT", label: "USDT (Tether)" },
      { value: "USDC", label: "USDC (USD Coin)" },
    ];

    const defaults: DefaultsDto = {
      leverage: { min: 1, max: 125, default: 10 },
      qtyPercent: { min: 1, max: 100, default: 50 },
      stopLossPercent: { min: 0.1, max: 50, default: 2 },
      takeProfitPercent: { min: 0.1, max: 100, default: 5 },
    };

    return {
      exchanges,
      markets,
      actions,
      entryTypes,
      qtyTypes,
      tpSlTypes,
      positionModes,
      quoteAssets,
      defaults,
    };
  }

  /**
   * TradingView 웹훅 메시지 생성
   * @param input - 사용자 입력
   * @returns 생성된 메시지 (JSON 문자열 + 객체)
   */
  generateMessage(input: GenerateMessageRequestDto): GeneratedMessageDto {
    // BinancePayloadDto 형식으로 변환
    const payload = {
      exchange: input.exchange,
      market: input.market,
      ticker: input.ticker.toUpperCase(),
      action: input.action,
      entry: {
        type: input.entry.type,
        price: input.entry.price,
      },
      qty: {
        type: input.qty.type,
        value: input.qty.value,
      },
      quote_asset: input.quote_asset, // Add quote_asset field
      strategy: this.buildStrategy(input.strategy),
      options: this.buildOptions(input.options),
    };

    // null/undefined 필드 제거
    const cleanedPayload = this.removeEmptyFields(payload);

    return {
      message: JSON.stringify(cleanedPayload, null, 2),
      formatted: cleanedPayload,
    };
  }

  /**
   * Webhook 페이로드 JSON 스키마 조회
   */
  getSchema(): Record<string, unknown> {
    return {
      type: "object",
      required: ["exchange", "market", "ticker", "action", "qty"],
      properties: {
        exchange: {
          type: "string",
          enum: ["binance"],
          description: "거래소 이름",
        },
        market: {
          type: "string",
          enum: ["spot", "futures_um", "futures_cm"],
          description: "마켓 타입",
        },
        ticker: {
          type: "string",
          pattern: "^[A-Z]{2,10}(USDT|USDC)$",
          description: "심볼 (예: BTCUSDT)",
        },
        action: {
          type: "string",
          enum: [
            "open_long",
            "open_short",
            "close_long",
            "close_short",
            "close_all",
          ],
          description: "액션",
        },
        entry: {
          type: "object",
          properties: {
            type: { type: "string", enum: ["market", "limit"] },
            price: { type: "number", description: "지정가 (limit 주문 시)" },
          },
        },
        qty: {
          type: "object",
          required: ["type", "value"],
          properties: {
            type: { type: "string", enum: ["percent", "fixed"] },
            value: { type: "number" },
          },
        },
        quote_asset: {
          type: "string",
          enum: ["USDT", "USDC"],
          default: "USDT",
        },
        strategy: {
          type: "object",
          properties: {
            stop_loss: {
              type: "object",
              properties: {
                type: { type: "string", enum: ["percent", "price"] },
                value: { type: "number" },
                qty_percent: { type: "number" },
              },
            },
            take_profit: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string", enum: ["percent", "price"] },
                  value: { type: "number" },
                  qty_percent: { type: "number" },
                },
              },
            },
          },
        },
        options: {
          type: "object",
          properties: {
            signal_id: {
              type: "string",
              description: "TradingView {{timenow}}",
            },
            leverage: { type: "integer", minimum: 1, maximum: 125 },
            position_mode: { type: "string", enum: ["ONE_WAY", "HEDGE"] },
            reduce_only: { type: "boolean" },
          },
        },
      },
    };
  }

  /**
   * 예제 페이로드 템플릿 조회
   */
  getTemplates(): {
    name: string;
    description: string;
    payload: Record<string, unknown>;
  }[] {
    return [
      {
        name: "Open Long (시장가)",
        description: "시장가로 롱 포지션 진입, 10x 레버리지, 잔고 50%",
        payload: {
          exchange: "binance",
          market: "futures_um",
          ticker: "BTCUSDT",
          action: "open_long",
          entry: { type: "market" },
          qty: { type: "percent", value: 50 },
          options: {
            signal_id: "{{timenow}}",
            leverage: 10,
          },
        },
      },
      {
        name: "Open Long with TP/SL",
        description: "롱 진입 + 손절 2% / 익절 5%",
        payload: {
          exchange: "binance",
          market: "futures_um",
          ticker: "ETHUSDT",
          action: "open_long",
          entry: { type: "market" },
          qty: { type: "percent", value: 30 },
          strategy: {
            stop_loss: { type: "percent", value: 2 },
            take_profit: [{ type: "percent", value: 5, qty_percent: 100 }],
          },
          options: {
            signal_id: "{{timenow}}",
            leverage: 5,
          },
        },
      },
      {
        name: "Close Long (전체 청산)",
        description: "롱 포지션 100% 청산",
        payload: {
          exchange: "binance",
          market: "futures_um",
          ticker: "BTCUSDT",
          action: "close_long",
          qty: { type: "percent", value: 100 },
          options: {
            signal_id: "{{timenow}}",
          },
        },
      },
      {
        name: "Open Short (지정가)",
        description: "지정가로 숏 포지션 진입",
        payload: {
          exchange: "binance",
          market: "futures_um",
          ticker: "XRPUSDT",
          action: "open_short",
          entry: { type: "limit", price: 2.5 },
          qty: { type: "fixed", value: 1000 },
          options: {
            signal_id: "{{timenow}}",
            leverage: 20,
          },
        },
      },
      {
        name: "Close All",
        description: "모든 포지션 청산",
        payload: {
          exchange: "binance",
          market: "futures_um",
          ticker: "BTCUSDT",
          action: "close_all",
          options: {
            signal_id: "{{timenow}}",
          },
        },
      },
    ];
  }

  /**
   * Strategy 객체 빌드
   */
  private buildStrategy(
    strategy?: GenerateMessageRequestDto["strategy"],
  ): Record<string, unknown> | undefined {
    if (!strategy) return undefined;

    const result: Record<string, unknown> = {};

    if (strategy.stop_loss) {
      result.stop_loss = {
        type: strategy.stop_loss.type,
        value: strategy.stop_loss.value,
        qty_percent: strategy.stop_loss.qty_percent,
      };
    }

    if (strategy.take_profit && strategy.take_profit.length > 0) {
      // 배열로 변환
      result.take_profit = strategy.take_profit.map((tp) => ({
        type: tp.type,
        value: tp.value,
        qty_percent: tp.qty_percent,
      }));
    }

    return Object.keys(result).length > 0 ? result : undefined;
  }

  /**
   * Options 객체 빌드 (signal_id 자동 추가)
   */
  private buildOptions(
    options?: GenerateMessageRequestDto["options"],
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {
      signal_id: "{{timenow}}", // TradingView 변수
    };

    if (options?.leverage !== undefined) {
      result.leverage = options.leverage;
    }

    if (options?.position_mode !== undefined) {
      result.position_mode = options.position_mode;
    }

    if (options?.reduce_only !== undefined) {
      result.reduce_only = options.reduce_only;
    }

    return result;
  }

  /**
   * 빈 필드 제거 (재귀)
   */
  private removeEmptyFields(
    obj: Record<string, unknown>,
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (value === undefined || value === null) {
        continue;
      }

      if (typeof value === "object" && !Array.isArray(value)) {
        const cleaned = this.removeEmptyFields(
          value as Record<string, unknown>,
        );
        if (Object.keys(cleaned).length > 0) {
          result[key] = cleaned;
        }
      } else if (Array.isArray(value)) {
        // 배열 내부 undefined 제거 (Optional)
        // 여기서는 단순 배열 복사
        result[key] = value.map((item) => {
          if (typeof item === "object") {
            return this.removeEmptyFields(item);
          }
          return item;
        });
      } else {
        result[key] = value;
      }
    }

    return result;
  }
}
