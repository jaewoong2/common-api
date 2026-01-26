import { Test, TestingModule } from "@nestjs/testing";
import { WebhookBuilderService } from "./webhook-builder.service";
import { MarketType, WebhookAction } from "../../common/enums";
import {
  BuilderRegistry,
  BinanceBuilder,
  DiscordBuilder,
  KisBuilder,
  BUILDER_ADAPTERS,
} from "./builders";

// Mock BinanceApiClient
const mockBinanceApiClient = {
  getPublicSymbols: jest.fn().mockResolvedValue([]),
};

// Mock ConfigService
const mockConfigService = {
  get: jest.fn(),
};

describe("WebhookBuilderService", () => {
  let service: WebhookBuilderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookBuilderService,
        BinanceBuilder,
        DiscordBuilder,
        KisBuilder,
        {
          provide: BUILDER_ADAPTERS,
          useFactory: (
            binanceBuilder: BinanceBuilder,
            discordBuilder: DiscordBuilder,
            kisBuilder: KisBuilder,
          ) => [binanceBuilder, discordBuilder, kisBuilder],
          inject: [BinanceBuilder, DiscordBuilder, KisBuilder],
        },
        BuilderRegistry,
        {
          provide: "BinanceApiClient",
          useValue: mockBinanceApiClient,
        },
        {
          provide: "ConfigService",
          useValue: mockConfigService,
        },
      ],
    })
      .overrideProvider("BinanceApiClient")
      .useValue(mockBinanceApiClient)
      .overrideProvider("ConfigService")
      .useValue(mockConfigService)
      .compile();

    service = module.get<WebhookBuilderService>(WebhookBuilderService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("should return correct options structure for binance", () => {
    const options = service.getOptions("binance");
    expect(options.provider).toBe("binance");
    expect(options.markets).toBeDefined();
    expect(options.entryTypes).toBeDefined();
    expect(options.tpSlTypes).toBeDefined();
    expect(options.defaults).toBeDefined();

    const entryLimit = options.entryTypes?.find((e) => e.value === "limit");
    expect(entryLimit).toBeDefined();

    const tpPrice = options.tpSlTypes?.find((e) => e.value === "price");
    expect(tpPrice).toBeDefined();
  });

  it("should return discord options", () => {
    const options = service.getOptions("discord");
    expect(options.provider).toBe("discord");
    expect(options.messageTypes).toBeDefined();
    expect(options.mentionTypes).toBeDefined();
  });

  it("should return kis options", () => {
    const options = service.getOptions("kis");
    expect(options.provider).toBe("kis");
    expect(options.orderTypes).toBeDefined();
    expect(options.accountTypes).toBeDefined();
  });

  it("should generate basic market order message for binance", () => {
    const input = {
      market: MarketType.FUTURES_UM,
      ticker: "BTCUSDT",
      action: WebhookAction.OPEN_LONG,
      entry: { type: "market" },
      qty: { type: "percent", value: 50 },
      options: { leverage: 10, position_mode: "ONE_WAY" },
    };

    const result = service.generateMessage("binance", input);
    const parsed = JSON.parse(result.message);

    expect(parsed.entry.type).toBe("market");
    expect(parsed.entry.price).toBeUndefined();
    expect(parsed.options.signal_id).toBe("{{timenow}}");
  });

  it("should generate limit order message with price", () => {
    const input = {
      market: MarketType.FUTURES_UM,
      ticker: "BTCUSDT",
      action: WebhookAction.OPEN_LONG,
      entry: { type: "limit", price: 50000 },
      qty: { type: "percent", value: 50 },
    };

    const result = service.generateMessage("binance", input);
    const parsed = JSON.parse(result.message);

    expect(parsed.entry.type).toBe("limit");
    expect(parsed.entry.price).toBe(50000);
  });

  it("should generate discord embed message", () => {
    const input = {
      message_type: "embed",
      embed: {
        title: "Test Alert",
        description: "Test description",
        color: 0x00ff00,
      },
    };

    const result = service.generateMessage("discord", input);
    const parsed = JSON.parse(result.message);

    expect(parsed.embeds).toBeDefined();
    expect(parsed.embeds[0].title).toBe("Test Alert");
  });

  it("should generate kis order message", () => {
    const input = {
      market: "kospi",
      ticker: "005930",
      action: "buy",
      qty: { type: "fixed", value: 10 },
      options: { order_type: "01" },
    };

    const result = service.generateMessage("kis", input);
    const parsed = JSON.parse(result.message);

    expect(parsed.provider).toBe("kis");
    expect(parsed.market).toBe("kospi");
    expect(parsed.ticker).toBe("005930");
  });

  it("should return supported providers", () => {
    const providers = service.getSupportedProviders();
    expect(providers).toContainEqual(
      expect.objectContaining({ value: "binance" }),
    );
    expect(providers).toContainEqual(
      expect.objectContaining({ value: "discord" }),
    );
    expect(providers).toContainEqual(expect.objectContaining({ value: "kis" }));
  });
});
