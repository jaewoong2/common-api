import { Injectable } from "@nestjs/common";
import {
  ProviderBuilderAdapter,
  ProviderOptionsDto,
  ProviderTemplate,
  SelectOption,
} from "./provider-builder.interface";
import { GeneratedMessageDto } from "../dto/generate-message.dto";

/**
 * KIS (한국투자증권) Markets
 */
const KIS_MARKETS = {
  KOSPI: "kospi",
  KOSDAQ: "kosdaq",
  NASDAQ: "nasdaq",
  NYSE: "nyse",
  AMEX: "amex",
} as const;

/**
 * KIS Order Types
 */
const KIS_ORDER_TYPES = {
  MARKET: "00", // 지정가
  LIMIT: "01", // 시장가
  CONDITIONAL: "02", // 조건부지정가
  BEST_LIMIT: "03", // 최유리지정가
  PRIORITY_LIMIT: "04", // 최우선지정가
  IOC_LIMIT: "11", // 장개시전시간외
  AFTER_MARKET: "51", // 장후시간외
} as const;

/**
 * KIS Builder
 * @description 한국투자증권 전용 Webhook Builder
 */
@Injectable()
export class KisBuilder implements ProviderBuilderAdapter {
  readonly provider = "kis";

  getOptions(): ProviderOptionsDto {
    const markets: SelectOption[] = [
      { value: KIS_MARKETS.KOSPI, label: "KOSPI (유가증권)" },
      { value: KIS_MARKETS.KOSDAQ, label: "KOSDAQ (코스닥)" },
      { value: KIS_MARKETS.NASDAQ, label: "NASDAQ (나스닥)" },
      { value: KIS_MARKETS.NYSE, label: "NYSE (뉴욕증권거래소)" },
      { value: KIS_MARKETS.AMEX, label: "AMEX (아멕스)" },
    ];

    const actions: SelectOption[] = [
      { value: "buy", label: "Buy (매수)" },
      { value: "sell", label: "Sell (매도)" },
    ];

    const orderTypes: SelectOption[] = [
      { value: KIS_ORDER_TYPES.LIMIT, label: "시장가" },
      { value: KIS_ORDER_TYPES.MARKET, label: "지정가" },
      { value: KIS_ORDER_TYPES.CONDITIONAL, label: "조건부지정가" },
      { value: KIS_ORDER_TYPES.BEST_LIMIT, label: "최유리지정가" },
      { value: KIS_ORDER_TYPES.PRIORITY_LIMIT, label: "최우선지정가" },
    ];

    const qtyTypes: SelectOption[] = [
      { value: "percent", label: "Percent (% 비율)" },
      { value: "fixed", label: "Fixed (고정 수량)" },
    ];

    const accountTypes: SelectOption[] = [
      { value: "real", label: "Real (실전투자)" },
      { value: "virtual", label: "Virtual (모의투자)" },
    ];

    return {
      provider: this.provider,
      markets,
      actions,
      orderTypes,
      qtyTypes,
      accountTypes,
      defaults: {
        qtyPercent: { min: 1, max: 100, default: 50 },
      },
    };
  }

  generateMessage(input: Record<string, unknown>): GeneratedMessageDto {
    const market = (input.market as string) || KIS_MARKETS.KOSPI;
    const overseasMarkets: string[] = [
      KIS_MARKETS.NASDAQ,
      KIS_MARKETS.NYSE,
      KIS_MARKETS.AMEX,
    ];
    const isOverseas = overseasMarkets.includes(market);
    const payload = {
      provider: "kis",
      market,
      ticker: input.ticker,
      action: input.action,
      qty: input.qty,
      options: this.buildOptions(input, isOverseas),
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
      required: ["provider", "market", "ticker", "action", "qty"],
      properties: {
        provider: { type: "string", enum: ["kis"] },
        market: {
          type: "string",
          enum: ["kospi", "kosdaq", "nasdaq", "nyse", "amex"],
          description: "거래 시장",
        },
        ticker: {
          type: "string",
          description: "종목코드 (예: 005930, AAPL)",
        },
        action: {
          type: "string",
          enum: ["buy", "sell"],
          description: "매수/매도",
        },
        qty: {
          type: "object",
          required: ["type", "value"],
          properties: {
            type: { type: "string", enum: ["percent", "fixed"] },
            value: { type: "number" },
          },
        },
        options: {
          type: "object",
          properties: {
            signal_id: { type: "string" },
            order_type: {
              type: "string",
              enum: ["00", "01", "02", "03", "04"],
              description: "주문구분 (00:지정가, 01:시장가, ...)",
            },
            price: { type: "number", description: "주문가격 (지정가 시)" },
            account_type: {
              type: "string",
              enum: ["real", "virtual"],
              description: "실전/모의 투자",
            },
          },
        },
      },
    };
  }

  getTemplates(): ProviderTemplate[] {
    return [
      {
        name: "국내 주식 시장가 매수",
        description: "KOSPI/KOSDAQ 종목 시장가 매수",
        payload: {
          provider: "kis",
          market: "kospi",
          ticker: "005930", // 삼성전자
          action: "buy",
          qty: { type: "percent", value: 50 },
          options: {
            signal_id: "{{timenow}}",
            order_type: "01", // 시장가
            account_type: "real",
          },
        },
      },
      {
        name: "국내 주식 지정가 매수",
        description: "KOSPI/KOSDAQ 종목 지정가 매수",
        payload: {
          provider: "kis",
          market: "kospi",
          ticker: "005930",
          action: "buy",
          qty: { type: "fixed", value: 10 },
          options: {
            signal_id: "{{timenow}}",
            order_type: "00", // 지정가
            price: 75000,
            account_type: "real",
          },
        },
      },
      {
        name: "해외 주식 매수 (NASDAQ)",
        description: "나스닥 종목 시장가 매수",
        payload: {
          provider: "kis",
          market: "nasdaq",
          ticker: "AAPL",
          action: "buy",
          qty: { type: "fixed", value: 5 },
          options: {
            signal_id: "{{timenow}}",
            order_type: "01",
            account_type: "real",
          },
        },
      },
      {
        name: "국내 주식 매도",
        description: "보유 주식 전량 매도",
        payload: {
          provider: "kis",
          market: "kospi",
          ticker: "005930",
          action: "sell",
          qty: { type: "percent", value: 100 },
          options: {
            signal_id: "{{timenow}}",
            order_type: "01",
            account_type: "real",
          },
        },
      },
    ];
  }

  private buildOptions(
    input: Record<string, unknown>,
    isOverseas: boolean,
  ): Record<string, unknown> {
    const options = (input.options as Record<string, unknown>) || {};

    const result: Record<string, unknown> = {
      signal_id: "{{timenow}}",
    };

    if (options.order_type !== undefined) {
      result.order_type = options.order_type;
    } else {
      result.order_type = "01"; // Default: 시장가
    }

    if (options.price !== undefined) {
      result.price = options.price;
    }

    if (options.account_type !== undefined) {
      result.account_type = options.account_type;
    } else {
      result.account_type = "real";
    }

    // 해외 주식 추가 옵션
    if (isOverseas) {
      result.overseas = true;
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
