import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import axios from "axios";
import {
  ProviderAdapter,
  BasePayload,
  ProviderRequest,
  ExchangeCredentials,
  ExecutionResult,
} from "../provider-adapter.interface";
import { DiscordPayloadDto } from "../../dto/discord-payload.dto";
import { TradePosition, TradeBalance } from "../../../../common/types";
import { WebhookAction } from "../../../../common/enums";

/**
 * Discord Embed 색상 정의
 */
const EMBED_COLORS = {
  LONG: 0x00ff00, // Green
  SHORT: 0xff0000, // Red
  CLOSE: 0xffa500, // Orange
  CLOSE_ALL: 0xffff00, // Yellow
  INFO: 0x3498db, // Blue
  SUCCESS: 0x2ecc71, // Light Green
  ERROR: 0xe74c3c, // Dark Red
} as const;

/**
 * Action 별 Emoji 정의
 */
const ACTION_EMOJIS: Record<string, string> = {
  [WebhookAction.OPEN_LONG]: "🚀",
  [WebhookAction.OPEN_SHORT]: "📉",
  [WebhookAction.CLOSE_LONG]: "💰",
  [WebhookAction.CLOSE_SHORT]: "💰",
  [WebhookAction.CLOSE_ALL]: "🔄",
};

/**
 * Discord Adapter
 * @description Discord Webhook으로 트레이딩 알림 전송
 */
@Injectable()
export class DiscordAdapter implements ProviderAdapter<DiscordPayloadDto> {
  readonly provider = "discord";
  private readonly logger = new Logger(DiscordAdapter.name);

  /**
   * Validate payload based on message_type
   */
  async validatePayload(payload: DiscordPayloadDto): Promise<void> {
    // Embed mode: require embed object
    if (payload.message_type === "embed") {
      if (!payload.embed && !payload.content) {
        throw new BadRequestException(
          "For embed message_type, either 'embed' or 'content' is required",
        );
      }
      return;
    }

    // Trading mode: existing permissive validation (no strict requirements)
    // Fields are optional to support flexible usage
  }

  async transformRequest(
    userId: string,
    signalId: string,
    payload: DiscordPayloadDto,
    credentials: ExchangeCredentials,
  ): Promise<ProviderRequest> {
    // Store message_type and embed data in metadata for execute
    const messageType = payload.message_type || "trading";

    return {
      userId,
      signalId,
      symbol: payload.ticker ?? "Symbol Is Empty",
      side: payload.action?.includes("LONG") ? "BUY" : "SELL",
      orderType: payload.entry?.type || "market",
      quantity: payload.qty?.value?.toString() || "0",
      price: payload.entry?.price?.toString(),
      leverage: payload.options?.leverage,
      stopLoss: payload.strategy?.stop_loss?.value,
      takeProfit: payload.strategy?.take_profit?.value,
      clientOrderId: signalId,
      positionMode: payload.options?.position_mode,
      reduceOnly: payload.options?.reduce_only,
      // Store all data in metadata for execute
      metadata: {
        messageType,
        embed: payload.embed,
        content: payload.content,
        // Trading mode data
        payload,
        action: payload?.action || "",
        strategy: payload?.strategy || {},
        qtyType: payload.qty?.type,
        qtyValue: payload.qty?.value,
      },
    } as ProviderRequest;
  }

  async execute(
    request: ProviderRequest,
    credentials: ExchangeCredentials,
  ): Promise<ExecutionResult> {
    const webhookUrl = credentials.accessKey; // User stores Webhook URL in accessKey

    if (!webhookUrl || !webhookUrl.startsWith("http")) {
      return {
        success: false,
        status: "FAIL",
        errorJson: { message: "Invalid Discord Webhook URL" },
      };
    }

    const metadata = request.metadata || {};
    const messageType = metadata.messageType || "trading";

    this.logger.log(
      `Discord execute: messageType=${messageType}, signalId=${request.signalId}`,
    );

    try {
      let discordPayload: { embeds?: any[]; content?: string };

      if (messageType === "embed") {
        // Direct embed mode: use user-provided embed directly
        discordPayload = {
          content: metadata.content as string | undefined,
          embeds: metadata.embed ? [metadata.embed] : undefined,
        };
        this.logger.log(
          `Discord direct embed mode: sending user-provided embed, signalId=${request.signalId}`,
        );
      } else {
        // Trading mode: generate embed from trading data
        const embed = this.createEmbed(request);
        discordPayload = { embeds: [embed] };
        this.logger.log(
          `Discord trading embed sent: symbol=${request.symbol}, action=${metadata.action}`,
        );
      }

      await axios.post(webhookUrl, discordPayload);

      // Return appropriate response based on message type
      if (messageType === "embed") {
        return {
          success: true,
          status: "SUCCESS",
          entryJson: {
            orderId: `discord-${Date.now()}`,
            messageType: "embed",
            clientOrderId: request.clientOrderId,
          },
        };
      }

      return {
        success: true,
        status: "SUCCESS",
        entryJson: {
          orderId: `discord-${Date.now()}`,
          symbol: request.symbol,
          side: request.side,
          quantity: request.quantity,
          price: request.price || "market",
          clientOrderId: request.clientOrderId,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to send Discord webhook: ${error.message}`);
      return {
        success: false,
        status: "FAIL",
        errorJson: {
          message: error.message,
          details: error.response?.data,
        },
      };
    }
  }

  /**
   * Discord Embed 생성
   */
  private createEmbed(
    request: ProviderRequest & { metadata?: Record<string, unknown> },
  ) {
    const metadata = request.metadata || {};
    const action = (metadata.action as string) || "";
    const payload = (metadata.payload as DiscordPayloadDto) || {};
    const strategy = metadata.strategy as DiscordPayloadDto["strategy"];

    // Action별 색상과 Emoji 결정
    const { color, emoji, title } = this.getActionStyles(
      action,
      request.symbol,
    );

    // Description 생성
    const description = this.buildDescription(action, request);

    // Fields 생성
    const fields = this.buildFields(request, metadata, strategy);

    return {
      title: `${emoji} ${title}`,
      description,
      color,
      fields,
      footer: {
        text: `Signal ID: ${request.signalId}`,
        icon_url: "https://cdn.discordapp.com/embed/avatars/0.png",
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Action별 스타일 결정
   */
  private getActionStyles(
    action: string,
    symbol: string,
  ): { color: number; emoji: string; title: string } {
    const emoji = ACTION_EMOJIS[action] || "📊";

    if (action === WebhookAction.OPEN_LONG) {
      return {
        color: EMBED_COLORS.LONG,
        emoji,
        title: `LONG Entry: ${symbol}`,
      };
    }
    if (action === WebhookAction.OPEN_SHORT) {
      return {
        color: EMBED_COLORS.SHORT,
        emoji,
        title: `SHORT Entry: ${symbol}`,
      };
    }
    if (action === WebhookAction.CLOSE_LONG) {
      return {
        color: EMBED_COLORS.CLOSE,
        emoji,
        title: `Close LONG: ${symbol}`,
      };
    }
    if (action === WebhookAction.CLOSE_SHORT) {
      return {
        color: EMBED_COLORS.CLOSE,
        emoji,
        title: `Close SHORT: ${symbol}`,
      };
    }
    if (action === WebhookAction.CLOSE_ALL) {
      return {
        color: EMBED_COLORS.CLOSE_ALL,
        emoji,
        title: `Close ALL: ${symbol}`,
      };
    }

    return { color: EMBED_COLORS.INFO, emoji, title: `Signal: ${symbol}` };
  }

  /**
   * Description 생성
   */
  private buildDescription(action: string, request: ProviderRequest): string {
    const parts: string[] = [];

    if (action === WebhookAction.CLOSE_ALL) {
      parts.push("🔄 **모든 포지션 청산 요청**");
    } else if (action.includes("CLOSE")) {
      parts.push("💰 **포지션 청산 요청**");
    } else if (action.includes("LONG")) {
      parts.push("📈 **롱 포지션 진입**");
    } else if (action.includes("SHORT")) {
      parts.push("📉 **숏 포지션 진입**");
    }

    if (request.orderType === "limit" && request.price) {
      parts.push(`\n지정가: $${request.price}`);
    } else {
      parts.push("\n시장가 주문");
    }

    return parts.join("");
  }

  /**
   * Embed Fields 생성
   */
  private buildFields(
    request: ProviderRequest,
    metadata: Record<string, unknown>,
    strategy?: DiscordPayloadDto["strategy"],
  ): Array<{ name: string; value: string; inline: boolean }> {
    const fields: Array<{ name: string; value: string; inline: boolean }> = [];

    // 가격 정보
    fields.push({
      name: "💵 Price",
      value: request.price ? `$${request.price}` : "Market",
      inline: true,
    });

    // 수량 정보
    const qtyType = metadata.qtyType as string;
    const qtyValue = metadata.qtyValue as number;
    const qtyDisplay =
      qtyType === "percent" ? `${qtyValue}%` : request.quantity || "N/A";
    fields.push({
      name: "📊 Quantity",
      value: qtyDisplay,
      inline: true,
    });

    // 레버리지
    if (request.leverage) {
      fields.push({
        name: "⚡ Leverage",
        value: `x${request.leverage}`,
        inline: true,
      });
    }

    // Strategy - Stop Loss
    if (strategy?.stop_loss) {
      const sl = strategy.stop_loss;
      const slValue = sl.type === "percent" ? `${sl.value}%` : `$${sl.value}`;
      fields.push({
        name: "🛑 Stop Loss",
        value: slValue,
        inline: true,
      });
    }

    // Strategy - Take Profit
    if (strategy?.take_profit) {
      const tp = strategy.take_profit;
      // take_profit이 배열인 경우 처리
      if (Array.isArray(tp)) {
        const tpValues = tp
          .map((t: { type: string; value: number; qty_percent?: number }) => {
            const val = t.type === "percent" ? `${t.value}%` : `$${t.value}`;
            return t.qty_percent ? `${val} (${t.qty_percent}%)` : val;
          })
          .join(", ");
        fields.push({
          name: "🎯 Take Profit",
          value: tpValues,
          inline: true,
        });
      } else {
        const tpValue = tp.type === "percent" ? `${tp.value}%` : `$${tp.value}`;
        fields.push({
          name: "🎯 Take Profit",
          value: tpValue,
          inline: true,
        });
      }
    }

    // Position Mode
    if (request.positionMode) {
      fields.push({
        name: "📋 Mode",
        value: request.positionMode,
        inline: true,
      });
    }

    return fields;
  }

  async getPositions(
    credentials: ExchangeCredentials,
    symbol?: string,
    options?: Record<string, unknown>,
  ): Promise<TradePosition[]> {
    return []; // Discord doesn't support positions
  }

  async getBalances(
    credentials: ExchangeCredentials,
    assets?: string[],
    options?: Record<string, unknown>,
  ): Promise<TradeBalance[]> {
    return []; // Discord doesn't support balances
  }
}
