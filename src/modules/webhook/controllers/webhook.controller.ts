import {
  Controller,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from "@nestjs/swagger";
import { Public } from "@common/decorators/public.decorator";
import { WebhookReceiverService } from "../services";
import { BinancePayloadDto, WebhookResponseDto, WebhookErrorDto } from "../dto";
import { validateOrReject } from "class-validator";
import { plainToInstance } from "class-transformer";

/**
 * Webhook Controller
 * @description TradingView webhook 수신 엔드포인트
 */
@ApiTags("Webhook")
@Controller("webhook")
export class WebhookController {
  constructor(private readonly receiverService: WebhookReceiverService) {}

  /**
   * POST /webhook/:provider/:auth_token
   * @description TradingView webhook 수신
   */
  @Public()
  @Post(":provider/:auth_token")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Webhook 수신 (TradingView)" })
  @ApiParam({
    name: "provider",
    example: "binance",
    description: "Provider 이름",
  })
  @ApiParam({
    name: "auth_token",
    example: "uuid",
    description: "사용자 인증 토큰",
  })
  @ApiResponse({
    status: 200,
    description: "Webhook 처리 결과",
    type: WebhookResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Validation Error",
    type: WebhookErrorDto,
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized",
    type: WebhookErrorDto,
  })
  async receiveWebhook(
    @Param("provider") provider: string,
    @Param("auth_token") authToken: string,
    @Body() payload: any,
  ) {
    try {
      // Binance Provider인 경우 엄격한 Validation 수행
      if (provider === "binance") {
        const binancePayload = plainToInstance(BinancePayloadDto, payload);
        await validateOrReject(binancePayload);
      }
      const result = await this.receiverService.handleWebhook(
        provider,
        authToken,
        payload,
      );

      return {
        ok: true,
        data: result,
      };
    } catch (error) {
      if (error.status === 401 || error.status === 400) {
        throw error;
      }

      // SQS 발행 실패
      throw new InternalServerErrorException({
        ok: false,
        error: {
          code: "ENQUEUE_FAILED",
          message: error.message || "Failed to send SQS message",
        },
      });
    }
  }
}
