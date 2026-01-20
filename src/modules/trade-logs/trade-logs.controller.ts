import {
  Controller,
  Get,
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
import { TradeLogService } from "./trade-logs.service";
import { TradeLogDto, TradeLogQueryDto } from "./dto";

// CurrentUser decorator to extract user from JWT payload
const CurrentUser = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);

/**
 * Trade Logs Controller
 * @description 거래 이력 조회 엔드포인트
 */
@ApiTags("Trade Logs")
@ApiBearerAuth()
@UseGuards(AuthGuard("jwt"))
@Controller("logs")
export class TradeLogsController {
  constructor(private readonly service: TradeLogService) {}

  /**
   * GET /logs - 거래 이력 목록 조회
   */
  @Get()
  @ApiOperation({ summary: "거래 이력 목록 조회" })
  @ApiResponse({
    status: 200,
    description: "이력 목록",
    schema: {
      example: {
        ok: true,
        data: {
          items: [],
          pagination: { page: 1, limit: 20, total: 0 },
        },
      },
    },
  })
  async getLogs(
    @CurrentUser("id") userId: string,
    @Query() query: TradeLogQueryDto,
  ) {
    const result = await this.service.getLogs(userId, query);
    return {
      ok: true,
      data: {
        items: result.items,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
        },
      },
    };
  }

  /**
   * GET /logs/:log_id - 거래 이력 상세 조회
   */
  @Get(":log_id")
  @ApiOperation({ summary: "거래 이력 상세 조회" })
  @ApiResponse({
    status: 200,
    description: "이력 상세",
    type: TradeLogDto,
  })
  @ApiResponse({ status: 404, description: "LOG_NOT_FOUND" })
  async getLogById(
    @CurrentUser("id") userId: string,
    @Param("log_id") logId: string,
  ) {
    const log = await this.service.getLogById(userId, logId);
    return {
      ok: true,
      data: log,
    };
  }
}
