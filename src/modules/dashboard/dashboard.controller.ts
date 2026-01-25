import {
  Controller,
  Get,
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
import { DashboardService } from "./dashboard.service";
import { DashboardSummaryDto } from "./dto";

// CurrentUser decorator to extract user from JWT payload
const CurrentUser = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);

/**
 * Dashboard Controller
 * @description 대시보드 API 엔드포인트
 */
@ApiTags("Dashboard")
@ApiBearerAuth()
@UseGuards(AuthGuard("jwt"))
@Controller("v1/dashboard")
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  /**
   * GET /v1/dashboard/summary - 대시보드 요약 조회
   */
  @Get("summary")
  @ApiOperation({ summary: "대시보드 요약 조회" })
  @ApiResponse({
    status: 200,
    description: "대시보드 요약 데이터",
    type: DashboardSummaryDto,
  })
  async getSummary(@CurrentUser("id") userId: string) {
    const summary = await this.service.getSummary(userId);
    return {
      ok: true,
      data: summary,
    };
  }
}
