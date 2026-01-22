import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiExcludeEndpoint,
} from "@nestjs/swagger";
import { WebhookExecutorService, ExecuteRequestDto } from "../services";
import { JwtAuthGuard } from "@common/guards/jwt-auth.guard";
import { RolesGuard } from "@common/guards/roles.guard";
import { Roles } from "@common/decorators/roles.decorator";
import { UserRole } from "@common/enums";

/**
 * Webhook Executor Controller
 * @description 내부 전용 - Lambda에서 호출하는 엔드포인트
 * @security Admin JWT 토큰 필수 (VPC 내부 배포)
 */
@ApiTags("Webhook Internal")
@Controller("webhook")
export class WebhookExecutorController {
  constructor(private readonly executorService: WebhookExecutorService) {}

  /**
   * POST /webhook/execute
   * @description Lambda로부터 주문 실행 요청 수신
   * @security Admin JWT Token in Authorization header
   */
  @Post("execute")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.APP_ADMIN, UserRole.PLATFORM_SUPER_ADMIN)
  @ApiExcludeEndpoint() // Swagger에서 숨김
  @ApiOperation({ summary: "내부 전용 - 주문 실행" })
  @ApiResponse({ status: 200, description: "실행 성공" })
  @ApiResponse({ status: 401, description: "UNAUTHORIZED" })
  @ApiResponse({ status: 403, description: "FORBIDDEN - Admin role required" })
  @ApiResponse({ status: 409, description: "LOCK_CONFLICT" })
  @ApiResponse({ status: 500, description: "EXECUTION_FAILED" })
  async execute(@Body() request: ExecuteRequestDto) {
    try {
      const result = await this.executorService.execute(request);
      return {
        ok: true,
        data: result,
      };
    } catch (error) {
      if (error.status === 409) {
        throw error;
      }

      return {
        ok: false,
        error: {
          code: "EXECUTION_FAILED",
          message: error.message,
          details: error.response?.data,
        },
      };
    }
  }
}
