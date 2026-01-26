import {
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { SymbolService, SyncResult } from "../services/symbol.service";
import { SymbolDto, SymbolFilter } from "../repositories/symbol.repository";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";
import { AdminGuard } from "../../../common/guards/admin.guard";

/**
 * Symbol Admin Controller
 * @description 심볼 관리 Admin API
 */
@ApiTags("admin/symbols")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller("admin/symbols")
export class SymbolAdminController {
  constructor(private readonly symbolService: SymbolService) {}

  /**
   * Provider에서 심볼 동기화
   */
  @Post("sync")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "심볼 동기화",
    description: "거래소/Provider에서 심볼 목록을 가져와 DB에 동기화",
  })
  @ApiQuery({
    name: "provider",
    required: true,
    description: "Provider (binance, kis)",
    example: "binance",
  })
  @ApiQuery({
    name: "market",
    required: true,
    description: "마켓 (futures_um, spot, kospi)",
    example: "futures_um",
  })
  @ApiResponse({
    status: 200,
    description: "동기화 결과",
    schema: {
      type: "object",
      properties: {
        ok: { type: "boolean", example: true },
        data: {
          type: "object",
          properties: {
            provider: { type: "string", example: "binance" },
            market: { type: "string", example: "futures_um" },
            total: { type: "number", example: 350 },
            added: { type: "number", example: 10 },
            updated: { type: "number", example: 340 },
          },
        },
      },
    },
  })
  async syncSymbols(
    @Query("provider") provider: string,
    @Query("market") market: string,
  ): Promise<{ ok: boolean; data: SyncResult }> {
    const result = await this.symbolService.syncFromProvider(provider, market);
    return { ok: true, data: result };
  }

  /**
   * 심볼 목록 조회
   */
  @Get()
  @ApiOperation({
    summary: "심볼 목록 조회",
    description: "DB에 저장된 심볼 목록 조회",
  })
  @ApiQuery({ name: "provider", required: false })
  @ApiQuery({ name: "market", required: false })
  @ApiQuery({ name: "status", required: false })
  @ApiQuery({ name: "assetType", required: false })
  @ApiResponse({
    status: 200,
    description: "심볼 목록",
  })
  async listSymbols(
    @Query("provider") provider?: string,
    @Query("market") market?: string,
    @Query("status") status?: string,
    @Query("assetType") assetType?: string,
  ): Promise<{ ok: boolean; count: number; data: SymbolDto[] }> {
    const filter: SymbolFilter = {};
    if (provider) filter.provider = provider;
    if (market) filter.market = market;
    if (status) filter.status = status;
    if (assetType) filter.assetType = assetType;

    const symbols = await this.symbolService.getSymbols(filter);
    return { ok: true, count: symbols.length, data: symbols };
  }

  /**
   * 심볼 카운트 조회
   */
  @Get("count")
  @ApiOperation({
    summary: "심볼 개수 조회",
    description: "조건에 맞는 심볼 개수 반환",
  })
  @ApiQuery({ name: "provider", required: false })
  @ApiQuery({ name: "market", required: false })
  @ApiResponse({
    status: 200,
    description: "심볼 개수",
  })
  async getCount(
    @Query("provider") provider?: string,
    @Query("market") market?: string,
  ): Promise<{ ok: boolean; count: number }> {
    const filter: SymbolFilter = {};
    if (provider) filter.provider = provider;
    if (market) filter.market = market;

    const count = await this.symbolService.getCount(filter);
    return { ok: true, count };
  }
}
