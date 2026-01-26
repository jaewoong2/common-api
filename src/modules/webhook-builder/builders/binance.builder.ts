import { Injectable } from "@nestjs/common";
import {
  ProviderBuilderAdapter,
  ProviderOptionsDto,
  ProviderTemplate,
  SelectOption,
} from "./provider-builder.interface";
import { GeneratedMessageDto } from "../dto/generate-message.dto";
import { WebhookAction, MarketType } from "../../../common/enums";

/**
 * Binance Builder
 * @description Binance 전용 Webhook Builder
 */
@Injectable()
export class BinanceBuilder implements ProviderBuilderAdapter {
  readonly provider = "binance";

  getOptions(): ProviderOptionsDto {
    const markets: SelectOption[] = [
      { value: MarketType.SPOT, label: "Spot" },
      { value: MarketType.FUTURES_UM, label: "Futures USDT-M" },
    ];

    const actions: SelectOption[] = [
      { value: WebhookAction.OPEN_LONG, label: "Open Long (롱 진입)" },
      { value: WebhookAction.OPEN_SHORT, label: "Open Short (숏 진입)" },
      { value: WebhookAction.CLOSE_LONG, label: "Close Long (롱 청산)" },
      { value: WebhookAction.CLOSE_SHORT, label: "Close Short (숏 청산)" },
      { value: WebhookAction.CLOSE_ALL, label: "Close All (전체 청산)" },
    ];

    const entryTypes: SelectOption[] = [
      { value: "market", label: "Market (시장가)" },
      { value: "limit", label: "Limit (지정가)" },
    ];

    const qtyTypes: SelectOption[] = [
      { value: "percent", label: "Percent (% 비율)" },
      { value: "fixed", label: "Fixed (고정 수량)" },
    ];

    const tpSlTypes: SelectOption[] = [
      { value: "percent", label: "Percent (진입가 대비 %)" },
      { value: "price", label: "Price (지정가)" },
    ];

    const positionModes: SelectOption[] = [
      { value: "ONE_WAY", label: "One-way Mode (단방향)" },
      { value: "HEDGE", label: "Hedge Mode (헤지)" },
    ];

    const quoteAssets: SelectOption[] = [
      { value: "USDT", label: "USDT (Tether)" },
      { value: "USDC", label: "USDC (USD Coin)" },
    ];

    return {
      provider: this.provider,
      markets,
      actions,
      entryTypes,
      qtyTypes,
      tpSlTypes,
      positionModes,
      quoteAssets,
      defaults: {
        leverage: { min: 1, max: 125, default: 10 },
        qtyPercent: { min: 1, max: 100, default: 50 },
        stopLossPercent: { min: 0.1, max: 50, default: 2 },
        takeProfitPercent: { min: 0.1, max: 100, default: 5 },
      },
    };
  }

  generateMessage(input: Record<string, unknown>): GeneratedMessageDto {
    const payload = {
      exchange: "binance",
      market: input.market || MarketType.FUTURES_UM,
      ticker: (input.ticker as string)?.toUpperCase(),
      action: input.action,
      entry: input.entry
        ? {
            type: (input.entry as Record<string, unknown>).type,
            price: (input.entry as Record<string, unknown>).price,
          }
        : { type: "market" },
      qty: input.qty,
      quote_asset: input.quote_asset || "USDT",
      strategy: this.buildStrategy(input.strategy as Record<string, unknown>),
      options: this.buildOptions(input.options as Record<string, unknown>),
    };

    const cleanedPayload = this.removeEmptyFields(payload);

    return {
      message: JSON.stringify(cleanedPayload, null, 2),
      formatted: cleanedPayload,
    };
  }

  getSchema(): Record<string, unknown> {
    return {
      type: "object",
      required: ["exchange", "market", "ticker", "action", "qty"],
      properties: {
        exchange: { type: "string", enum: ["binance"] },
        market: { type: "string", enum: ["spot", "futures_um", "futures_cm"] },
        ticker: { type: "string", pattern: "^[A-Z]{2,10}(USDT|USDC)$" },
        action: {
          type: "string",
          enum: [
            "open_long",
            "open_short",
            "close_long",
            "close_short",
            "close_all",
          ],
        },
        entry: {
          type: "object",
          properties: {
            type: { type: "string", enum: ["market", "limit"] },
            price: { type: "number" },
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
            stop_loss: { type: "object" },
            take_profit: { type: "array" },
          },
        },
        options: {
          type: "object",
          properties: {
            signal_id: { type: "string" },
            leverage: { type: "integer", minimum: 1, maximum: 125 },
            position_mode: { type: "string", enum: ["ONE_WAY", "HEDGE"] },
            reduce_only: { type: "boolean" },
          },
        },
      },
    };
  }

  getTemplates(): ProviderTemplate[] {
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
          options: { signal_id: "{{timenow}}", leverage: 10 },
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
          options: { signal_id: "{{timenow}}", leverage: 5 },
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
          options: { signal_id: "{{timenow}}" },
        },
      },
    ];
  }

  private buildStrategy(
    strategy?: Record<string, unknown>,
  ): Record<string, unknown> | undefined {
    if (!strategy) return undefined;

    const result: Record<string, unknown> = {};

    if (strategy.stop_loss) {
      result.stop_loss = strategy.stop_loss;
    }

    if (strategy.take_profit) {
      result.take_profit = strategy.take_profit;
    }

    return Object.keys(result).length > 0 ? result : undefined;
  }

  private buildOptions(
    options?: Record<string, unknown>,
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {
      signal_id: "{{timenow}}",
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

  private removeEmptyFields(
    obj: Record<string, unknown>,
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (value === undefined || value === null) continue;

      if (typeof value === "object" && !Array.isArray(value)) {
        const cleaned = this.removeEmptyFields(
          value as Record<string, unknown>,
        );
        if (Object.keys(cleaned).length > 0) {
          result[key] = cleaned;
        }
      } else if (Array.isArray(value)) {
        result[key] = value.map((item) =>
          typeof item === "object" ? this.removeEmptyFields(item) : item,
        );
      } else {
        result[key] = value;
      }
    }

    return result;
  }
}
