import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  createParamDecorator,
  ExecutionContext,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";

import { AuthGuard } from "@nestjs/passport";
import { BinanceTestService } from "../services/binance-test.service";
import {
  SetLeverageDto,
  PlaceOrderDto,
  GetBalanceDto,
} from "../dto/binance-test.dto";

// CurrentUser decorator
const CurrentUser = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);

/**
 * Binance Test Controller
 * @description 어드민용 Binance API 테스트 엔드포인트
 */
@ApiTags("Admin - Binance Test")
@ApiBearerAuth()
@UseGuards(AuthGuard("jwt"))
@Controller("admin/binance")
export class BinanceTestController {
  constructor(private readonly service: BinanceTestService) {}

  /**
   * GET /admin/binance/balance - 계정 잔고 조회
   */
  @Get("balance")
  @ApiOperation({ summary: "계정 잔고 조회" })
  @ApiResponse({
    status: 200,
    description: "Binance Futures 계정 잔고",
    schema: {
      example: {
        ok: true,
        data: [
          { asset: "USDT", balance: "1000.50" },
          { asset: "BTC", balance: "0.05" },
        ],
      },
    },
  })
  async getBalance(
    @CurrentUser("id") userId: string,
    @Query() dto: GetBalanceDto,
  ) {
    const balance = await this.service.getBalance(
      userId,
      dto.exchange,
      dto.market,
    ); // Pass market
    return {
      ok: true,
      data: balance,
    };
  }

  /**
   * POST /admin/binance/leverage - 레버리지 설정
   */
  @Post("leverage")
  @ApiOperation({ summary: "심볼별 레버리지 설정" })
  @ApiResponse({
    status: 200,
    description: "레버리지 설정 성공",
    schema: {
      example: {
        ok: true,
        message: "Leverage set to 10x for BTCUSDT",
      },
    },
  })
  async setLeverage(
    @CurrentUser("id") userId: string,
    @Body() dto: SetLeverageDto,
  ) {
    if (dto.market === "spot") return null;

    return this.service.setLeverage(
      userId,
      dto.exchange,
      dto.symbol,
      dto.leverage,
      dto.market, // Pass market
    );
  }

  /**
   * POST /admin/binance/order - 시장가 주문 테스트
   */
  @Post("order")
  @ApiOperation({ summary: "시장가 주문 실행" })
  @ApiResponse({
    status: 200,
    description: "주문 실행 성공",
    schema: {
      example: {
        ok: true,
        data: {
          orderId: 12345678,
          symbol: "BTCUSDT",
          side: "BUY",
          origQty: "0.001",
          avgPrice: "45000.50",
          clientOrderId: "TEST_1234567890",
          status: "FILLED",
        },
      },
    },
  })
  async placeOrder(
    @CurrentUser("id") userId: string,
    @Body() dto: PlaceOrderDto,
  ) {
    const result = await this.service.placeMarketOrder(
      userId,
      dto.exchange,
      dto.symbol,
      dto.side,
      dto.quantity,
      dto.reduceOnly,
      dto.market, // Pass market
    );
    return {
      ok: true,
      data: result,
    };
  }

  /**
   * GET /admin/binance/price/:symbol - 현재가 조회
   */
  @Get("price/:symbol")
  @ApiOperation({ summary: "심볼 현재가 조회 (인증 불필요)" })
  @ApiResponse({
    status: 200,
    description: "현재가",
    schema: {
      example: {
        ok: true,
        data: { symbol: "BTCUSDT", price: "45123.50" },
      },
    },
  })
  async getPrice(
    @Param("symbol") symbol: string,
    @Query("market") market: "futures_um" | "spot" = "futures_um", // Added query param
  ) {
    const result = await this.service.getPrice(symbol, market);
    return {
      ok: true,
      data: result,
    };
  }
}
