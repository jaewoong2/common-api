import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import axios from "axios";
import {
  ProviderAdapter,
  BasePayload,
  ProviderRequest,
  ExchangeCredentials,
  ExecutionResult,
} from "../provider-adapter.interface";
import { TradePosition, TradeBalance } from "../../../../common/types";
import { WebhookAction } from "../../../../common/enums";

@Injectable()
export class DiscordAdapter implements ProviderAdapter {
  readonly provider = "discord";
  private readonly logger = new Logger(DiscordAdapter.name);

  async validatePayload(payload: BasePayload): Promise<void> {
    // Discord doesn't require strict payload validation like exchanges
    // But we still check for required fields for message formatting
    if (!payload.ticker) {
      throw new BadRequestException(
        "Ticker is required for Discord notification",
      );
    }
    if (!payload.action) {
      throw new BadRequestException(
        "Action is required for Discord notification",
      );
    }
  }

  async transformRequest(
    userId: string,
    signalId: string,
    payload: BasePayload,
    credentials: ExchangeCredentials,
  ): Promise<ProviderRequest> {
    // Discord adapter uses the credentials (webhook URL) directly in execute
    // So here we just pass through necessary data
    return {
      userId,
      signalId,
      symbol: payload.ticker,
      side: payload.action.includes("LONG") ? "BUY" : "SELL", // Approximate mapping
      orderType: "market",
      quantity: "0",
      clientOrderId: signalId,
      // We pass the raw payload in a way that execute can use it for formatting
      // leveraging the fact that ProviderRequest is internal
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

    try {
      // Re-construct context since transformRequest simplified it.
      // In a cleaner design, we might pass the full payload through,
      // but for now we will infer from what we have or if possible access the original payload.
      // Wait, execute() receives ProviderRequest which we created.
      // Let's rely on the fact that existing flow passes payload to transformRequest.
      // But execute only gets ProviderRequest.

      // To properly support rich messages, we need the FULL payload in execute.
      // We can smuggle it in via type casting or by adding a field to ProviderRequest
      // if we were modifying the interface, but we shouldn't modify the interface just for this if possible.
      // However, ProviderRequest is an interface we Control.
      // But typically we should use the fields we have.

      // Let's rebuild the message based on the standard ProviderRequest fields
      // AND maybe we can store the 'strategy' details in the 'clientOrderId' or similar hack?
      // NO, that's bad.

      // Better approach: The `handleWebhook` service calls `transformRequest` then `execute`.
      // The `ProviderRequest` interface is:
      /*
      export interface ProviderRequest {
        userId: string;
        signalId: string;
        symbol: string;
        side: OrderSide;
        ...
      }
      */
      // It seems `ProviderRequest` is tightly coupled to Trading logic.
      // For Discord, we want to display Strategy (TP/SL).
      // I will check if I can add optional 'metadata' or 'originalPayload' to ProviderRequest interface
      // Or I will just format the message IN transformRequest and pass it as a string to execute?
      // ProviderRequest doesn't have a generic 'data' field.

      // Let's modify ProviderAdapter interface slightly to allow 'metadata' or 'raw'
      // OR (safer) just put the formatted Discord Body into a field we repurpose or add.

      // Actually, looking at `ProviderRequest`, it has specific fields.
      // I will add an optional `metadata` field to `ProviderRequest` in the interface.
      // This is a common pattern for flexibility.

      // But first, let's write this assuming I'll update the interface.

      const embed = this.createEmbed(request);

      await axios.post(webhookUrl, {
        embeds: [embed],
      });

      return {
        success: true,
        status: "SUCCESS",
        entryJson: {
          orderId: "discord-msg-" + Date.now(),
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

  private createEmbed(request: ProviderRequest & { metadata?: any }) {
    const isLong = request.side === "BUY";
    const color = isLong ? 0x00ff00 : 0xff0000; // Green or Red
    const title = `${isLong ? "🚀 LONG" : "📉 SHORT"} Entry: ${request.symbol}`;

    // Try to recover details from metadata if valid
    const metadata = request.metadata || {};
    const payload = metadata.payload || {};

    // Fallback or specific action handling
    let description = "Trading Signal Received";
    if (payload.action === WebhookAction.CLOSE_ALL)
      description = "Close All Positions";
    else if (payload.action?.includes("CLOSE")) description = "Close Position";

    // Build Fields
    const fields = [
      {
        name: "Price",
        value: request.price ? `$${request.price}` : "Market",
        inline: true,
      },
      { name: "Quantity", value: request.quantity || "N/A", inline: true },
      {
        name: "Leverage",
        value: request.leverage ? `x${request.leverage}` : "-",
        inline: true,
      },
    ];

    if (request.takeProfit)
      fields.push({
        name: "Take Profit",
        value: `${request.takeProfit}`,
        inline: true,
      });
    if (request.stopLoss)
      fields.push({
        name: "Stop Loss",
        value: `${request.stopLoss}`,
        inline: true,
      });

    return {
      title,
      description,
      color,
      fields,
      footer: {
        text: `Signal ID: ${request.signalId}`,
      },
      timestamp: new Date().toISOString(),
    };
  }

  async getPositions(
    credentials: ExchangeCredentials,
    symbol?: string,
    options?: Record<string, any>,
  ): Promise<TradePosition[]> {
    return []; // Not supported
  }

  async getBalances(
    credentials: ExchangeCredentials,
    assets?: string[],
    options?: Record<string, any>,
  ): Promise<TradeBalance[]> {
    return []; // Not supported
  }
}
