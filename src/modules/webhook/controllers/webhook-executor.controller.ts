import { Controller, Post, Body, HttpCode, HttpStatus } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiExcludeEndpoint,
} from "@nestjs/swagger";
import { WebhookExecutorService, ExecuteRequestDto } from "../services";

/**
 * Webhook Executor Controller
 * @description 내부 전용 - Lambda에서 호출하는 엔드포인트
 * @warning 외부 노출 금지 (VPC 내부 또는 IAM 인증 필수)
 */
@ApiTags("Webhook Internal")
@Controller("webhook")
export class WebhookExecutorController {
  constructor(private readonly executorService: WebhookExecutorService) {}

  /**
   * POST /webhook/execute
   * @description Lambda로부터 주문 실행 요청 수신
   */
  @Post("execute")
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint() // Swagger에서 숨김
  @ApiOperation({ summary: "내부 전용 - 주문 실행" })
  @ApiResponse({ status: 200, description: "실행 성공" })
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
