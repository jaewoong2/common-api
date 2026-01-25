import { Module } from "@nestjs/common";
import { WebhookModule } from "../webhook/webhook.module";
import { WebhookBuilderController } from "./webhook-builder.controller";
import { WebhookBuilderService } from "./webhook-builder.service";

/**
 * Webhook Builder Module
 * @description TradingView 웹훅 메시지 빌더
 */
@Module({
  imports: [WebhookModule],
  controllers: [WebhookBuilderController],
  providers: [WebhookBuilderService],
  exports: [WebhookBuilderService],
})
export class WebhookBuilderModule {}
