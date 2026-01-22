import { Test, TestingModule } from "@nestjs/testing";
import { WebhookBuilderService } from "./webhook-builder.service";
import { MarketType, WebhookAction } from "../../common/enums";
import { GenerateMessageRequestDto } from "./dto/generate-message.dto";

describe("WebhookBuilderService", () => {
  let service: WebhookBuilderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WebhookBuilderService],
    }).compile();

    service = module.get<WebhookBuilderService>(WebhookBuilderService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("should return correct options structure", () => {
    const options = service.getOptions();
    expect(options.exchanges).toBeDefined();
    expect(options.markets).toBeDefined();
    expect(options.entryTypes).toBeDefined();
    expect(options.tpSlTypes).toBeDefined();
    expect(options.defaults).toBeDefined();

    const entryLimit = options.entryTypes.find((e) => e.value === "limit");
    expect(entryLimit).toBeDefined();

    const tpPrice = options.tpSlTypes.find((e) => e.value === "price");
    expect(tpPrice).toBeDefined();
  });

  it("should generate basic market order message", () => {
    const input = {
      exchange: "binance",
      market: MarketType.FUTURES_UM,
      ticker: "BTCUSDT",
      action: WebhookAction.OPEN_LONG,
      entry: { type: "market" },
      qty: { type: "percent", value: 50 },
      options: { leverage: 10, position_mode: "ONE_WAY" },
    } as GenerateMessageRequestDto;

    const result = service.generateMessage(input);
    const parsed = JSON.parse(result.message);

    expect(parsed.entry.type).toBe("market");
    expect(parsed.entry.price).toBeUndefined();
    expect(parsed.options.signal_id).toBe("{{timenow}}");
  });

  it("should generate limit order message with price", () => {
    const input = {
      exchange: "binance",
      market: MarketType.FUTURES_UM,
      ticker: "BTCUSDT",
      action: WebhookAction.OPEN_LONG,
      entry: { type: "limit", price: 50000 },
      qty: { type: "percent", value: 50 },
    } as GenerateMessageRequestDto;

    const result = service.generateMessage(input);
    const parsed = JSON.parse(result.message);

    expect(parsed.entry.type).toBe("limit");
    expect(parsed.entry.price).toBe(50000);
  });

  it("should generate partial TP strategy", () => {
    const input = {
      exchange: "binance",
      market: MarketType.FUTURES_UM,
      ticker: "BTCUSDT",
      action: WebhookAction.OPEN_LONG,
      entry: { type: "market" },
      qty: { type: "percent", value: 50 },
      strategy: {
        stop_loss: { type: "price", value: 49000 },
        take_profit: [
          { type: "percent", value: 5, qty_percent: 50 },
          { type: "price", value: 55000, qty_percent: 100 },
        ],
      },
    } as GenerateMessageRequestDto;

    const result = service.generateMessage(input);
    const parsed = JSON.parse(result.message);

    expect(parsed.strategy.stop_loss.type).toBe("price");
    expect(parsed.strategy.stop_loss.value).toBe(49000);

    expect(Array.isArray(parsed.strategy.take_profit)).toBe(true);
    expect(parsed.strategy.take_profit[0].type).toBe("percent");
    expect(parsed.strategy.take_profit[0].qty_percent).toBe(50);
    expect(parsed.strategy.take_profit[1].type).toBe("price");
    expect(parsed.strategy.take_profit[1].value).toBe(55000);
  });

  it("should support TradingView placeholders in values", () => {
    const input = {
      exchange: "binance",
      market: MarketType.FUTURES_UM,
      ticker: "BTCUSDT",
      action: WebhookAction.OPEN_LONG,
      entry: { type: "limit", price: "{{close}}" }, // placeholder string
      qty: { type: "fixed", value: "{{strategy.order.contracts}}" }, // placeholder string
    } as GenerateMessageRequestDto;

    const result = service.generateMessage(input);
    const parsed = JSON.parse(result.message);

    expect(parsed.entry.price).toBe("{{close}}");
    expect(parsed.qty.value).toBe("{{strategy.order.contracts}}");
  });
});
