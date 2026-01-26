import { Injectable } from "@nestjs/common";
import {
  ProviderBuilderAdapter,
  ProviderOptionsDto,
  ProviderTemplate,
  SelectOption,
} from "./provider-builder.interface";
import { GeneratedMessageDto } from "../dto/generate-message.dto";

/**
 * Discord Message Actions
 */
const DISCORD_ACTIONS = {
  TRADE_ALERT: "trade_alert",
  POSITION_UPDATE: "position_update",
  BALANCE_CHANGE: "balance_change",
  SYSTEM_MESSAGE: "system_message",
  CUSTOM: "custom",
} as const;

/**
 * Discord Embed Colors (Hex)
 */
const DISCORD_COLORS = {
  GREEN: 0x00ff00,
  RED: 0xff0000,
  BLUE: 0x3498db,
  YELLOW: 0xf1c40f,
  ORANGE: 0xe67e22,
  PURPLE: 0x9b59b6,
  CYAN: 0x1abc9c,
  PINK: 0xe91e63,
  GRAY: 0x95a5a6,
} as const;

/**
 * Discord Builder
 * @description Discord Webhook 전용 Builder
 */
@Injectable()
export class DiscordBuilder implements ProviderBuilderAdapter {
  readonly provider = "discord";

  getOptions(): ProviderOptionsDto {
    const actions: SelectOption[] = [
      { value: DISCORD_ACTIONS.TRADE_ALERT, label: "Trade Alert (거래 알림)" },
      {
        value: DISCORD_ACTIONS.POSITION_UPDATE,
        label: "Position Update (포지션 변경)",
      },
      {
        value: DISCORD_ACTIONS.BALANCE_CHANGE,
        label: "Balance Change (잔고 변경)",
      },
      {
        value: DISCORD_ACTIONS.SYSTEM_MESSAGE,
        label: "System Message (시스템 메시지)",
      },
      { value: DISCORD_ACTIONS.CUSTOM, label: "Custom (사용자 정의)" },
    ];

    const messageTypes: SelectOption[] = [
      { value: "embed", label: "Embed (리치 메시지)" },
      { value: "plain", label: "Plain Text (일반 텍스트)" },
    ];

    const mentionTypes: SelectOption[] = [
      { value: "none", label: "None (멘션 없음)" },
      { value: "here", label: "@here (온라인 유저)" },
      { value: "everyone", label: "@everyone (모든 유저)" },
      { value: "role", label: "Role (특정 역할)" },
      { value: "user", label: "User (특정 유저)" },
    ];

    const colorOptions: SelectOption[] = [
      { value: "0x00FF00", label: "🟢 Green (성공/롱)" },
      { value: "0xFF0000", label: "🔴 Red (실패/숏)" },
      { value: "0x3498DB", label: "🔵 Blue (정보)" },
      { value: "0xF1C40F", label: "🟡 Yellow (경고)" },
      { value: "0xE67E22", label: "🟠 Orange (주의)" },
      { value: "0x9B59B6", label: "🟣 Purple" },
      { value: "0x1ABC9C", label: "🩵 Cyan" },
      { value: "0xE91E63", label: "💗 Pink" },
      { value: "0x95A5A6", label: "⬜ Gray" },
    ];

    return {
      provider: this.provider,
      actions,
      messageTypes,
      mentionTypes,
      quoteAssets: colorOptions, // Reuse for embed colors
      defaults: {
        tts: { min: 0, max: 1, default: 0 },
      },
    };
  }

  generateMessage(input: Record<string, unknown>): GeneratedMessageDto {
    const messageType = (input.message_type as string) || "embed";

    let payload: Record<string, unknown>;

    if (messageType === "embed") {
      payload = this.buildEmbedPayload(input);
    } else {
      payload = this.buildPlainPayload(input);
    }

    return {
      message: JSON.stringify(payload, null, 2),
      formatted: payload,
    };
  }

  getSchema(): Record<string, unknown> {
    return {
      type: "object",
      properties: {
        message_type: {
          type: "string",
          enum: ["embed", "plain"],
          default: "embed",
        },
        content: {
          type: "string",
          description: "Plain text content or mention text",
        },
        username: { type: "string", description: "Override webhook username" },
        avatar_url: {
          type: "string",
          description: "Override webhook avatar URL",
        },
        tts: { type: "boolean", default: false },
        embed: {
          type: "object",
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            url: { type: "string" },
            color: { type: "integer", description: "Hex color as integer" },
            author: {
              type: "object",
              properties: {
                name: { type: "string" },
                url: { type: "string" },
                icon_url: { type: "string" },
              },
            },
            thumbnail: {
              type: "object",
              properties: { url: { type: "string" } },
            },
            image: { type: "object", properties: { url: { type: "string" } } },
            footer: {
              type: "object",
              properties: {
                text: { type: "string" },
                icon_url: { type: "string" },
              },
            },
            fields: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  value: { type: "string" },
                  inline: { type: "boolean" },
                },
              },
            },
            timestamp: { type: "string", format: "date-time" },
          },
        },
        allowed_mentions: {
          type: "object",
          properties: {
            parse: {
              type: "array",
              items: { type: "string", enum: ["roles", "users", "everyone"] },
            },
            roles: { type: "array", items: { type: "string" } },
            users: { type: "array", items: { type: "string" } },
          },
        },
      },
    };
  }

  getTemplates(): ProviderTemplate[] {
    return [
      {
        name: "Trade Alert (거래 알림)",
        description: "트레이딩 시그널 알림 템플릿",
        payload: {
          message_type: "embed",
          embed: {
            title: "🚀 LONG Entry: {{ticker}}",
            description: "📈 롱 포지션 진입\n시장가 주문",
            color: DISCORD_COLORS.GREEN,
            fields: [
              { name: "💵 Price", value: "{{price}}", inline: true },
              { name: "📊 Quantity", value: "{{quantity}}%", inline: true },
              { name: "⚡ Leverage", value: "x{{leverage}}", inline: true },
            ],
            footer: { text: "Signal ID: {{timenow}}" },
            timestamp: "{{timestamp}}",
          },
        },
      },
      {
        name: "Position Update (포지션 변경)",
        description: "포지션 상태 변경 알림",
        payload: {
          message_type: "embed",
          embed: {
            title: "📊 Position Update",
            description: "포지션 상태가 변경되었습니다",
            color: DISCORD_COLORS.BLUE,
            fields: [
              { name: "Symbol", value: "{{ticker}}", inline: true },
              { name: "PnL", value: "{{pnl}}", inline: true },
            ],
            timestamp: "{{timestamp}}",
          },
        },
      },
      {
        name: "System Alert with Mention",
        description: "@here 멘션 포함 시스템 알림",
        payload: {
          message_type: "embed",
          content: "@here 🚨 중요 알림",
          embed: {
            title: "⚠️ System Alert",
            description: "시스템 상태 확인 필요",
            color: DISCORD_COLORS.YELLOW,
          },
          allowed_mentions: {
            parse: ["everyone"],
          },
        },
      },
      {
        name: "Custom Plain Text",
        description: "일반 텍스트 메시지",
        payload: {
          message_type: "plain",
          content: "📢 {{message}}",
          tts: false,
        },
      },
    ];
  }

  private buildEmbedPayload(
    input: Record<string, unknown>,
  ): Record<string, unknown> {
    const payload: Record<string, unknown> = {};

    // Basic fields
    if (input.content) payload.content = input.content;
    if (input.username) payload.username = input.username;
    if (input.avatar_url) payload.avatar_url = input.avatar_url;
    if (input.tts) payload.tts = input.tts;

    // Embed
    const embedInput = (input.embed as Record<string, unknown>) || {};
    const embed: Record<string, unknown> = {};

    if (embedInput.title) embed.title = embedInput.title;
    if (embedInput.description) embed.description = embedInput.description;
    if (embedInput.url) embed.url = embedInput.url;
    if (embedInput.color) {
      embed.color =
        typeof embedInput.color === "string"
          ? parseInt(embedInput.color as string, 16)
          : embedInput.color;
    }
    if (embedInput.author) embed.author = embedInput.author;
    if (embedInput.thumbnail) embed.thumbnail = embedInput.thumbnail;
    if (embedInput.image) embed.image = embedInput.image;
    if (embedInput.footer) embed.footer = embedInput.footer;
    if (embedInput.fields) embed.fields = embedInput.fields;
    if (embedInput.timestamp) {
      embed.timestamp =
        embedInput.timestamp === "{{timestamp}}"
          ? new Date().toISOString()
          : embedInput.timestamp;
    }

    if (Object.keys(embed).length > 0) {
      payload.embeds = [embed];
    }

    // Allowed mentions
    if (input.allowed_mentions) {
      payload.allowed_mentions = input.allowed_mentions;
    } else if (input.mention_type && input.mention_type !== "none") {
      payload.allowed_mentions = this.buildAllowedMentions(input);
    }

    return payload;
  }

  private buildPlainPayload(
    input: Record<string, unknown>,
  ): Record<string, unknown> {
    return {
      content: input.content || "",
      username: input.username,
      avatar_url: input.avatar_url,
      tts: input.tts || false,
      allowed_mentions: input.allowed_mentions,
    };
  }

  private buildAllowedMentions(
    input: Record<string, unknown>,
  ): Record<string, unknown> {
    const mentionType = input.mention_type as string;

    switch (mentionType) {
      case "here":
      case "everyone":
        return { parse: ["everyone"] };
      case "role":
        return { roles: input.mention_role_ids || [] };
      case "user":
        return { users: input.mention_user_ids || [] };
      default:
        return {};
    }
  }
}
