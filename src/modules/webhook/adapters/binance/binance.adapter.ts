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
import { createHash } from "crypto";
import { TradePosition, TradeBalance } from "../../../../common/types";

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
    // Binance-specific: 티커 형식 검증 (quote_asset에 따라 동적 검증)
    const quoteAsset = payload.quote_asset || "USDT";
    const tickerRegex = new RegExp(`^[A-Z]{2,10}${quoteAsset}$`);

    if (!tickerRegex.test(payload.ticker)) {
      throw new BadRequestException(
        `Invalid ticker format for Binance Futures: ${payload.ticker}. Must be a ${quoteAsset} pair (e.g., BTC${quoteAsset}, XRP${quoteAsset})`,
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
   * @description Open 액션은 잔고 기반, Close 액션은 포지션 기반 수량 계산
   */
  async transformRequest(
    userId: string,
    signalId: string,
    payload: BasePayload,
    credentials: ExchangeCredentials,
  ): Promise<ProviderRequest> {
    const isClose = this.isCloseAction(payload.action);

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
      case WebhookAction.CLOSE_ALL:
        // close_all: 현재 포지션 방향에 따라 side 결정 (후에 수량 계산 시 결정)
        side = "SELL"; // 기본값, 실제로는 calculatePositionQuantity에서 결정
        break;
      default:
        side = "BUY";
    }

    // Generate deterministic clientOrderId (max 36 chars for Binance)
    const hash = this.generateShortHash(userId, signalId);
    const orderType = isClose ? "CLOSE" : "ENTRY";
    const clientOrderId = `WH_${hash}_${orderType}`;

    // Calculate quantity based on action type
    let quantity: string;

    if (isClose) {
      // Close 액션: 포지션 기반 수량 계산
      const closeResult = await this.calculatePositionQuantity(
        credentials,
        payload.ticker,
        payload.action === WebhookAction.CLOSE_ALL
          ? 100
          : payload.qty?.value || 100,
        payload.action,
      );
      quantity = closeResult.quantity;
      side = closeResult.side; // close_all의 경우 포지션 방향에 따라 side 결정
    } else if (payload.qty.type === "fixed") {
      // Open 액션 (fixed): 고정 수량
      quantity = payload.qty.value.toString();
    } else {
      // Open 액션 (percent): 잔고 기반 계산
      const quoteAsset = payload.quote_asset || "USDT";
      quantity = await this.calculatePercentQuantity(
        credentials,
        payload.ticker,
        payload.qty.value,
        payload.options.leverage || 1,
        quoteAsset,
      );
    }

    // Determine order type (market or limit, close always market)
    const entryOrderType = isClose ? "market" : payload.entry?.type || "market";
    const entryPrice =
      entryOrderType === "limit" && payload.entry?.price
        ? String(payload.entry.price)
        : undefined;

    return {
      userId,
      signalId,
      symbol: payload.ticker,
      side,
      orderType: entryOrderType, // market 또는 limit
      price: entryPrice, // limit 주문 시 가격
      quantity,
      leverage: isClose ? undefined : payload.options.leverage,
      stopLoss: isClose ? undefined : payload.strategy?.stop_loss?.value,
      takeProfit: isClose ? undefined : payload.strategy?.take_profit?.value,
      clientOrderId,
      positionMode: payload.options.position_mode,
      reduceOnly: isClose ? true : payload.options.reduce_only,
    };
  }

  /**
   * Check if action is a close action
   */
  private isCloseAction(action: string): boolean {
    return [
      WebhookAction.CLOSE_LONG,
      WebhookAction.CLOSE_SHORT,
      WebhookAction.CLOSE_ALL,
    ].includes(action as WebhookAction);
  }

  /**
   * Calculate quantity from position for close actions
   * @formula quantity = |positionAmt| × (percent / 100)
   */
  private async calculatePositionQuantity(
    credentials: ExchangeCredentials,
    symbol: string,
    percentValue: number,
    action: string,
  ): Promise<{ quantity: string; side: "BUY" | "SELL" }> {
    try {
      // 1. Get current position
      const positions = await this.apiClient.getPositionRisk(
        credentials,
        symbol,
      );

      const position = positions.find(
        (p) =>
          p.symbol === symbol &&
          (p.positionSide === "BOTH" || parseFloat(p.positionAmt) !== 0),
      );

      if (!position) {
        throw new BadRequestException(
          `No open position for ${symbol}. Cannot execute ${action}.`,
        );
      }

      const positionAmt = new Decimal(position.positionAmt);
      const isLong = positionAmt.gt(0);
      const isShort = positionAmt.lt(0);

      // 2. Validate position direction matches action
      if (action === WebhookAction.CLOSE_LONG && !isLong) {
        throw new BadRequestException(
          `Cannot close_long: current position is ${isShort ? "SHORT" : "NONE"}`,
        );
      }
      if (action === WebhookAction.CLOSE_SHORT && !isShort) {
        throw new BadRequestException(
          `Cannot close_short: current position is ${isLong ? "LONG" : "NONE"}`,
        );
      }

      // 3. Determine side for closing
      const side: "BUY" | "SELL" = isLong ? "SELL" : "BUY";

      // 4. Calculate quantity: |positionAmt| × (percent / 100)
      const absPositionAmt = positionAmt.abs();
      const quantity = absPositionAmt.mul(percentValue).div(100);

      // 5. Round appropriately (integer for most pairs)
      const roundedQty = quantity.toDecimalPlaces(0, Decimal.ROUND_DOWN);

      if (roundedQty.lte(0)) {
        throw new BadRequestException(
          `Calculated close quantity is zero. Position=${positionAmt}, percent=${percentValue}%`,
        );
      }

      this.logger.log(
        `Position close qty: position=${positionAmt}, percent=${percentValue}%, closeQty=${roundedQty}, side=${side}`,
      );

      return { quantity: roundedQty.toString(), side };
    } catch (error) {
      this.logger.error(
        `Failed to calculate position quantity: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Calculate quantity from percent of balance
   * @formula quantity = (balance × leverage × percent / 100) / currentPrice
   */
  private async calculatePercentQuantity(
    credentials: ExchangeCredentials,
    symbol: string,
    percentValue: number,
    leverage: number,
    quoteAsset: "USDT" | "USDC",
  ): Promise<string> {
    try {
      // 1. Get quote asset balance
      const balances = await this.apiClient.getBalance(
        credentials,
        "futures_um",
      );
      const quoteBalance = balances.find((b) => b.asset === quoteAsset);
      if (!quoteBalance) {
        throw new BadRequestException(`${quoteAsset} balance not found`);
      }

      // Use availableBalance for futures (actual usable balance)
      const balanceStr = quoteBalance.availableBalance || quoteBalance.balance;
      const balance = new Decimal(balanceStr);

      this.logger.log(
        `${quoteAsset} Balance: total=${quoteBalance.balance}, available=${quoteBalance.availableBalance || "N/A"}`,
      );

      // 2. Validate balance
      if (balance.lte(0)) {
        throw new BadRequestException(
          `Insufficient ${quoteAsset} balance. Available: ${balance}`,
        );
      }

      // 3. Get current price
      const priceStr = await this.apiClient.getPrice(symbol, "futures_um");
      const price = new Decimal(priceStr);

      // 4. Calculate: (balance × leverage × percent / 100) / price
      const orderValue = balance.mul(leverage).mul(percentValue).div(100);
      const quantity = orderValue.div(price);

      // 5. Round to 0 decimal places (integer) for maximum compatibility
      // Most Binance Futures pairs require whole number quantities (e.g., XRP, DOGE)
      // BTC and high-value assets handle fractional amounts differently
      const roundedQty = quantity.toDecimalPlaces(0, Decimal.ROUND_DOWN);

      // 6. Validate final quantity
      if (roundedQty.lte(0)) {
        throw new BadRequestException(
          `Calculated quantity is zero or negative. Balance=${balance}, leverage=${leverage}, percent=${percentValue}%, price=${price}, qty=${roundedQty}`,
        );
      }

      this.logger.log(
        `Calculated qty: balance=${balance}, leverage=${leverage}, percent=${percentValue}, price=${price}, orderValue=${orderValue}, qty=${roundedQty}`,
      );

      return roundedQty.toString();
    } catch (error) {
      this.logger.error(
        `Failed to calculate percent quantity: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Execute order on Binance
   */
  async execute(
    request: ProviderRequest,
    credentials: ExchangeCredentials,
  ): Promise<ExecutionResult> {
    try {
      // 0. Get Exchange Info for Precision
      // (Cache handling can be added later for performance)
      const exchangeInfo = await this.apiClient.getExchangeInfo(request.symbol);
      let tickSize = "0.01"; // Default default
      let stepSize = "0.001"; // Default default
      let minQty = "0.001"; // Default min qty
      let minNotional = "5"; // Default min notional (USDT)

      if (exchangeInfo) {
        const priceFilter = exchangeInfo.filters.find(
          (f) => f.filterType === "PRICE_FILTER",
        );
        const lotSize = exchangeInfo.filters.find(
          (f) => f.filterType === "LOT_SIZE",
        );
        const minNotionalFilter = exchangeInfo.filters.find(
          (f) => f.filterType === "MIN_NOTIONAL",
        );

        if (priceFilter?.tickSize) tickSize = priceFilter.tickSize;
        if (lotSize?.stepSize) stepSize = lotSize.stepSize;
        if (lotSize?.minQty) minQty = lotSize.minQty;
        if (minNotionalFilter?.minNotional)
          minNotional = minNotionalFilter.minNotional;
      }

      // Utils for formatting
      const formatPrice = (price: Decimal | number | string) =>
        this.formatPrecision(price, tickSize);
      const formatQty = (qty: Decimal | number | string) =>
        this.formatPrecision(qty, stepSize);

      // 1. Set leverage if specified
      if (request.leverage) {
        await this.apiClient.setLeverage(
          credentials,
          request.symbol,
          request.leverage,
        );
      }

      // 2. Validation & Formatting
      const formattedQty = formatQty(request.quantity);
      let formattedPrice = request.price
        ? formatPrice(request.price)
        : undefined;

      // 2.1 Min Quantity Check
      if (new Decimal(formattedQty).lt(minQty)) {
        throw new Error(
          `Order validation failed: Quantity ${formattedQty} is less than minimum ${minQty}`,
        );
      }

      // 2.2 Min Notional Check
      // We need a reference price. If it's a limit order, use the limit price.
      // If it's a market order, we fetch the current price to estimate.
      let refPrice = formattedPrice;
      if (!refPrice) {
        const priceInfo = await this.apiClient.getPrice(request.symbol);
        refPrice = priceInfo;
      }

      const estimatedNotional = new Decimal(formattedQty).mul(refPrice);
      if (estimatedNotional.lt(minNotional)) {
        throw new Error(
          `Order validation failed: Notional value ${estimatedNotional.toFixed(2)} is less than minimum ${minNotional}`,
        );
      }

      // 3. Place entry order (market or limit)
      const entryOrder = await this.apiClient.placeOrder(credentials, {
        symbol: request.symbol,
        side: request.side,
        orderType: request.orderType,
        quantity: formattedQty,
        price: formattedPrice,
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
          price: entryOrder.avgPrice || (entryOrder as any).price || "0",
          clientOrderId: entryOrder.clientOrderId,
        },
      };

      // 3. Place TP/SL orders if specified
      if (request.stopLoss || request.takeProfit) {
        const exitSide = request.side === "BUY" ? "SELL" : "BUY";

        // Use executed price for market orders, or specified price for limit orders
        // If limit order hasn't filled, this might be risky, but usually Webhook implies immediate action or strategy relative to entry price.
        // For limit orders, best practice is OCO or waiting for fill, but simple implementation uses entry priec.
        const refPriceStr =
          request.orderType === "market"
            ? entryOrder.avgPrice
            : formattedPrice || (entryOrder as any).price || "0";

        const currentPrice = new Decimal(refPriceStr);
        const actualQuantity = entryOrder.origQty; // Use actual filled quantity

        try {
          const exitResult: { tpOrderId?: string; slOrderId?: string } = {};

          // Stop Loss
          if (request.stopLoss) {
            const slPriceCalc =
              request.side === "BUY"
                ? currentPrice.mul(1 - request.stopLoss / 100)
                : currentPrice.mul(1 + request.stopLoss / 100);

            const slOrder = await this.apiClient.placeStopLoss(credentials, {
              symbol: request.symbol,
              side: exitSide,
              quantity: actualQuantity, // Use actual filled quantity (already formatted by Binance?) No, use origQty which is safe
              stopPrice: formatPrice(slPriceCalc),
              clientOrderId: `WH_${this.generateShortHash(request.userId, request.signalId)}_SL`,
            });
            exitResult.slOrderId = slOrder.orderId.toString();
          }

          // Take Profit
          if (request.takeProfit) {
            const tpPriceCalc =
              request.side === "BUY"
                ? currentPrice.mul(1 + request.takeProfit / 100)
                : currentPrice.mul(1 - request.takeProfit / 100);

            const tpOrder = await this.apiClient.placeTakeProfit(credentials, {
              symbol: request.symbol,
              side: exitSide,
              quantity: actualQuantity,
              stopPrice: formatPrice(tpPriceCalc),
              clientOrderId: `WH_${this.generateShortHash(request.userId, request.signalId)}_TP`,
            });
            exitResult.tpOrderId = tpOrder.orderId.toString();
          }

          result.exitJson = exitResult;
        } catch (exitError) {
          // Entry succeeded but exit failed = PARTIAL_FAIL
          result.status = "PARTIAL_FAIL";

          const errorDetails = exitError.response?.data || {
            error: exitError.message,
          };

          result.errorJson = {
            message: "Failed to place TP/SL orders",
            details: errorDetails,
          };

          this.logger.warn(
            `PARTIAL_FAIL: Entry placed but TP/SL failed. OrderId: ${entryOrder.orderId}`,
            { error: errorDetails, request },
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

  /**
   * Get Current Positions
   */
  async getPositions(
    credentials: ExchangeCredentials,
    symbol?: string,
    options?: Record<string, any>,
  ): Promise<TradePosition[]> {
    const rawPositions = await this.apiClient.getPositionRisk(
      credentials,
      symbol,
    );

    return rawPositions.map((p) => {
      let side = p.positionSide as "LONG" | "SHORT" | "BOTH";

      // One-Way Mode: side is BOTH, determine by amount sign
      if (side === "BOTH") {
        const amt = parseFloat(p.positionAmt);
        if (amt > 0) side = "LONG";
        else if (amt < 0) side = "SHORT";
      }

      return {
        symbol: p.symbol,
        side: side,
        amount: p.positionAmt,
        entryPrice: p.entryPrice,
        unrealizedProfit: p.unRealizedProfit,
        leverage: p.leverage,
        liquidationPrice: p.liquidationPrice,
        marginType: p.marginType,
      };
    });
  }

  /**
   * Get Account Balances
   */
  async getBalances(
    credentials: ExchangeCredentials,
    assets?: string[],
    options?: Record<string, any>,
  ): Promise<TradeBalance[]> {
    const market = options?.market || "futures_um"; // Default to futures
    const balances = await this.apiClient.getBalance(credentials, market);

    // Filter if assets provided
    let filtered = balances;
    if (assets && assets.length > 0) {
      const upperAssets = assets.map((a) => a.toUpperCase());
      filtered = balances.filter((b) =>
        upperAssets.includes(b.asset.toUpperCase()),
      );
    } else {
      // Default: exclude zero balances if no assets specified
      filtered = balances.filter(
        (b) =>
          parseFloat(b.balance) > 0 ||
          parseFloat(b.crossWalletBalance || "0") > 0,
      );
    }

    return filtered.map((b) => ({
      asset: b.asset,
      balance: b.balance,
      availableBalance: b.availableBalance || b.balance, // Spot has no availableBalance field same as futures
      crossWalletBalance: b.crossWalletBalance,
    }));
  }

  /**
   * Format value to specific precision (tickSize or stepSize)
   */
  private formatPrecision(
    value: Decimal | number | string,
    stepSize: string,
  ): string {
    const val = new Decimal(value);
    const step = new Decimal(stepSize);

    if (step.eq(0)) return val.toString();

    // Calculate number of decimal places from stepSize
    // e.g. 0.01 -> 2, 0.0001 -> 4, 1 -> 0
    // approach: use log? or string split. String split is safer for float issues.
    const parts = stepSize.split(".");
    const precision = parts.length === 2 ? parts[1].length : 0;

    // Round down for quantity, Round half up for price?
    // Usually Price: Round (or conform to tick), Quantity: Round Down (to avoid insufficient balance)
    // Here we use simple toDecimalPlaces with generic rounding.
    // Ideally:
    // Qty -> Round Down
    // Price -> Nearest tick

    // For simplicity, we use ROUND_DOWN for everything to be safe(ish) or standard rounding.
    // Let's use ROUND_DOWN for Qty to avoid exceeding balance, but Price needs to match tick.
    // For Price, ROUND_HALF_UP logic relative to tick is better, but toDecimalPlaces works on digits.

    // Using simple quantization: value - (value % step)
    // But Decimal.toDecimalPlaces is robust.

    return val.toDecimalPlaces(precision, Decimal.ROUND_DOWN).toString();
  }

  /**
   * Generate short deterministic hash from userId and signalId
   * @returns 8-character hash (deterministic, collision-resistant)
   */
  private generateShortHash(userId: string, signalId: string): string {
    const combined = `${userId}:${signalId}`;
    return createHash("sha256").update(combined).digest("hex").substring(0, 8);
  }
}
