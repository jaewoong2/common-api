import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import {
  ProviderAdapter,
  BasePayload,
  ProviderRequest,
  ExchangeCredentials,
  ExecutionResult,
} from "../provider-adapter.interface";
import { BinanceApiClient } from "./binance-api.client";
import { WebhookAction } from "../../../../common/enums";
import Decimal from "decimal.js";

/**
 * Binance Adapter
 * @description Binance Futures ProviderAdapter 구현
 */
@Injectable()
export class BinanceAdapter implements ProviderAdapter {
  readonly provider = "binance";
  private readonly logger = new Logger(BinanceAdapter.name);

  constructor(private readonly apiClient: BinanceApiClient) {}

  /**
   * Validate Binance-specific payload
   * @note DTO에서 기본 검증이 이미 수행됨. 여기서는 Binance 고유 규칙만 검증.
   */
  async validatePayload(payload: BasePayload): Promise<void> {
    // Binance-specific: 티커 형식 검증 (USDT 페어만 지원)
    if (!/^[A-Z]{2,10}USDT$/.test(payload.ticker)) {
      throw new BadRequestException(
        `Invalid ticker format for Binance Futures: ${payload.ticker}. Must be a USDT pair (e.g., BTCUSDT)`,
      );
    }

    // Binance-specific: leverage 범위 검증 (1-125)
    if (
      payload.options.leverage !== undefined &&
      (payload.options.leverage < 1 || payload.options.leverage > 125)
    ) {
      throw new BadRequestException(
        `Leverage must be between 1 and 125 for Binance Futures. Got: ${payload.options.leverage}`,
      );
    }

    // Binance-specific: stop_loss/take_profit percent 검증
    if (payload.strategy?.stop_loss && payload.strategy.stop_loss.value > 50) {
      throw new BadRequestException(
        `Stop loss percent too high: ${payload.strategy.stop_loss.value}%. Max is 50%`,
      );
    }

    if (
      payload.strategy?.take_profit &&
      payload.strategy.take_profit.value > 500
    ) {
      throw new BadRequestException(
        `Take profit percent too high: ${payload.strategy.take_profit.value}%. Max is 500%`,
      );
    }
  }

  /**
   * Transform payload to Binance request
   */
  async transformRequest(
    userId: string,
    signalId: string,
    payload: BasePayload,
  ): Promise<ProviderRequest> {
    // Determine side based on action
    let side: "BUY" | "SELL";
    switch (payload.action) {
      case WebhookAction.OPEN_LONG:
        side = "BUY";
        break;
      case WebhookAction.OPEN_SHORT:
      case WebhookAction.CLOSE_LONG:
        side = "SELL";
        break;
      case WebhookAction.CLOSE_SHORT:
        side = "BUY";
        break;
      default:
        side = "BUY";
    }

    // Generate deterministic clientOrderId: WH_U{userId}_SIG{signalId}_ENTRY
    const clientOrderId = `WH_U${userId}_SIG${signalId}_ENTRY`;

    // Calculate quantity (simplified - actual implementation needs balance check)
    const quantity =
      payload.qty.type === "fixed" ? payload.qty.value.toString() : "0.001"; // Placeholder - will calculate from balance and percent

    return {
      userId,
      signalId,
      symbol: payload.ticker,
      side,
      quantity,
      leverage: payload.options.leverage,
      stopLoss: payload.strategy?.stop_loss?.value,
      takeProfit: payload.strategy?.take_profit?.value,
      clientOrderId,
      positionMode: payload.options.position_mode,
      reduceOnly: payload.options.reduce_only,
    };
  }

  /**
   * Execute order on Binance
   */
  async execute(
    request: ProviderRequest,
    credentials: ExchangeCredentials,
  ): Promise<ExecutionResult> {
    try {
      // 1. Set leverage if specified
      if (request.leverage) {
        await this.apiClient.setLeverage(
          credentials,
          request.symbol,
          request.leverage,
        );
      }

      // 2. Place entry order
      const entryOrder = await this.apiClient.placeMarketOrder(credentials, {
        symbol: request.symbol,
        side: request.side,
        quantity: request.quantity,
        clientOrderId: request.clientOrderId,
        reduceOnly: request.reduceOnly,
      });

      const result: ExecutionResult = {
        success: true,
        status: "SUCCESS",
        entryJson: {
          orderId: entryOrder.orderId.toString(),
          symbol: entryOrder.symbol,
          side: entryOrder.side,
          quantity: entryOrder.origQty,
          price: entryOrder.avgPrice,
          clientOrderId: entryOrder.clientOrderId,
        },
      };

      // 3. Place TP/SL orders if specified
      if (request.stopLoss || request.takeProfit) {
        const exitSide = request.side === "BUY" ? "SELL" : "BUY";
        const currentPrice = new Decimal(entryOrder.avgPrice);

        try {
          const exitResult: { tpOrderId?: string; slOrderId?: string } = {};

          // Stop Loss
          if (request.stopLoss) {
            const slPrice =
              request.side === "BUY"
                ? currentPrice.mul(1 - request.stopLoss / 100)
                : currentPrice.mul(1 + request.stopLoss / 100);

            const slOrder = await this.apiClient.placeStopLoss(credentials, {
              symbol: request.symbol,
              side: exitSide,
              quantity: request.quantity,
              stopPrice: slPrice.toFixed(2),
              clientOrderId: `WH_U${request.userId}_SIG${request.signalId}_SL`,
            });
            exitResult.slOrderId = slOrder.orderId.toString();
          }

          // Take Profit
          if (request.takeProfit) {
            const tpPrice =
              request.side === "BUY"
                ? currentPrice.mul(1 + request.takeProfit / 100)
                : currentPrice.mul(1 - request.takeProfit / 100);

            const tpOrder = await this.apiClient.placeTakeProfit(credentials, {
              symbol: request.symbol,
              side: exitSide,
              quantity: request.quantity,
              stopPrice: tpPrice.toFixed(2),
              clientOrderId: `WH_U${request.userId}_SIG${request.signalId}_TP`,
            });
            exitResult.tpOrderId = tpOrder.orderId.toString();
          }

          result.exitJson = exitResult;
        } catch (exitError) {
          // Entry succeeded but exit failed = PARTIAL_FAIL
          result.status = "PARTIAL_FAIL";
          result.errorJson = {
            message: "Failed to place TP/SL orders",
            details: { error: exitError.message },
          };
          this.logger.warn(
            `TP/SL failed for ${request.clientOrderId}: ${exitError.message}`,
          );
        }
      }

      this.logger.log(
        `Order executed: ${request.clientOrderId}, status=${result.status}`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Order execution failed: ${error.message}`,
        error.stack,
      );
      return {
        success: false,
        status: "FAIL",
        errorJson: {
          message: error.message,
          code: error.response?.data?.code?.toString(),
          details: error.response?.data,
        },
      };
    }
  }
}
