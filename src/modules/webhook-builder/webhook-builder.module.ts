import { Module } from "@nestjs/common";
import { WebhookModule } from "../webhook/webhook.module";
import { WebhookBuilderController } from "./webhook-builder.controller";
import { WebhookBuilderService } from "./webhook-builder.service";
import {
  BUILDER_ADAPTERS,
  BuilderRegistry,
  BinanceBuilder,
  DiscordBuilder,
  KisBuilder,
} from "./builders";

/**
 * Webhook Builder Module
 * @description TradingView 웹훅 메시지 빌더 (다중 Provider 지원)
 */
@Module({
  imports: [WebhookModule],
  controllers: [WebhookBuilderController],
  providers: [
    WebhookBuilderService,
    // Builders
    BinanceBuilder,
    DiscordBuilder,
    KisBuilder,
    // DI Token Factory
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
  ],
  exports: [WebhookBuilderService, BuilderRegistry],
})
export class WebhookBuilderModule {}
