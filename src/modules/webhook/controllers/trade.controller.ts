import {
  Controller,
  Get,
  Query,
  UseGuards,
  Req,
  BadRequestException,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { TradeService } from "../services/trade.service";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";

@ApiTags("Trade Info")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("trade")
export class TradeController {
  constructor(private readonly tradeService: TradeService) {}

  @Get("positions")
  @ApiOperation({ summary: "내 포지션 조회 (My Positions)" })
  @ApiQuery({
    name: "exchange",
    required: false,
    example: "binance",
    enum: ["binance"],
  })
  @ApiQuery({
    name: "market",
    required: false,
    example: "futures_um",
    enum: ["futures_um", "spot"],
  })
  @ApiQuery({
    name: "symbol",
    required: false,
    description: "Specific symbol (e.g. BTCUSDT)",
  })
  async getPositions(
    @Req() req: any,
    @Query("exchange") exchange: string = "binance",
    @Query("market") market: "futures_um" | "spot" = "futures_um",
    @Query("symbol") symbol?: string,
  ) {
    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestException("User ID not found in token");
    }

    const positions = await this.tradeService.getPositions(
      userId,
      exchange,
      market,
      symbol,
    );

    return {
      success: true,
      count: positions.length,
      data: positions,
    };
  }

  @Get("balances")
  @ApiOperation({ summary: "내 계좌 잔고 조회 (My Balances)" })
  @ApiQuery({
    name: "exchange",
    required: false,
    example: "binance",
    enum: ["binance"],
  })
  @ApiQuery({
    name: "market",
    required: false,
    example: "futures_um",
    enum: ["futures_um", "spot"],
  })
  @ApiQuery({
    name: "assets",
    required: false,
    description: "Comma separated assets (e.g. USDT,USDC)",
  })
  async getBalances(
    @Req() req: any,
    @Query("exchange") exchange: string = "binance",
    @Query("market") market: "futures_um" | "spot" = "futures_um",
    @Query("assets") assets?: string,
  ) {
    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestException("User ID not found in token");
    }

    const assetList = assets
      ? assets.split(",").map((a) => a.trim())
      : undefined;

    const balances = await this.tradeService.getBalances(
      userId,
      exchange,
      market,
      assetList,
    );

    return {
      success: true,
      count: balances.length,
      data: balances,
    };
  }
}
