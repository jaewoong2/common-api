import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Query,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from "@nestjs/swagger";
import { Public } from "../../common/decorators/public.decorator";
import { WebhookBuilderService } from "./webhook-builder.service";
import { GeneratedMessageDto } from "./dto";

/**
 * Webhook Builder Controller
 * @description TradingView 웹훅 메시지 빌더 API (다중 Provider 지원)
 */
@ApiTags("webhook-builder")
@Controller("webhook-builder")
@Public()
export class WebhookBuilderController {
  constructor(private readonly webhookBuilderService: WebhookBuilderService) {}

  /**
   * 지원 Provider 목록 조회
   */
  @Get("providers")
  @ApiOperation({
    summary: "지원 Provider 목록 조회",
    description: "Webhook Builder가 지원하는 Provider 목록 반환",
  })
  @ApiResponse({
    status: 200,
    description: "Provider 목록",
    schema: {
      type: "array",
      items: {
        type: "object",
        properties: {
          value: { type: "string", example: "binance" },
          label: { type: "string", example: "Binance (바이낸스)" },
        },
      },
    },
  })
  getProviders() {
    return {
      ok: true,
      data: this.webhookBuilderService.getSupportedProviders(),
    };
  }

  /**
   * Provider별 Select 옵션 조회
   */
  @Get("options")
  @ApiOperation({
    summary: "웹훅 빌더 옵션 조회",
    description:
      "Provider별 프론트엔드 Select 컴포넌트에서 사용할 옵션 목록 반환",
  })
  @ApiQuery({
    name: "provider",
    required: false,
    description: "Provider 이름 (binance, discord, kis)",
    example: "binance",
  })
  @ApiResponse({
    status: 200,
    description: "옵션 목록",
  })
  getOptions(@Query("provider") provider: string = "binance") {
    return {
      ok: true,
      data: this.webhookBuilderService.getCombinedOptions(provider),
    };
  }

  /**
   * TradingView 웹훅 메시지 생성
   */
  @Post("generate")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "TradingView 웹훅 메시지 생성",
    description: "선택된 옵션으로 TradingView Alert에 사용할 JSON 메시지 생성",
  })
  @ApiQuery({
    name: "provider",
    required: false,
    description: "Provider 이름 (binance, discord, kis)",
    example: "binance",
  })
  @ApiResponse({
    status: 200,
    description: "생성된 메시지",
    type: GeneratedMessageDto,
  })
  generateMessage(
    @Query("provider") provider: string = "binance",
    @Body() input: Record<string, unknown>,
  ): { ok: boolean; data: GeneratedMessageDto } {
    return {
      ok: true,
      data: this.webhookBuilderService.generateMessage(provider, input),
    };
  }

  /**
   * Webhook JSON 스키마 조회
   */
  @Get("schema")
  @ApiOperation({
    summary: "웹훅 페이로드 JSON 스키마 조회",
    description: "Provider별 Webhook 페이로드의 JSON 스키마 정보 반환",
  })
  @ApiQuery({
    name: "provider",
    required: false,
    description: "Provider 이름",
    example: "binance",
  })
  @ApiResponse({
    status: 200,
    description: "JSON 스키마",
  })
  getSchema(@Query("provider") provider: string = "binance") {
    return {
      ok: true,
      data: this.webhookBuilderService.getSchema(provider),
    };
  }

  /**
   * 예제 페이로드 템플릿 조회
   */
  @Get("templates")
  @ApiOperation({
    summary: "웹훅 페이로드 예제 템플릿 조회",
    description: "Provider별 다양한 액션의 예제 페이로드 템플릿 반환",
  })
  @ApiQuery({
    name: "provider",
    required: false,
    description: "Provider 이름",
    example: "binance",
  })
  @ApiResponse({
    status: 200,
    description: "템플릿 목록",
  })
  getTemplates(@Query("provider") provider: string = "binance") {
    return {
      ok: true,
      data: this.webhookBuilderService.getTemplates(provider),
    };
  }

  /**
   * 거래소 티커 목록 조회
   */
  @Get("tickers")
  @ApiOperation({
    summary: "거래소 티커 목록 조회",
    description: "거래소/마켓별 거래 가능한 티커(심볼) 목록 반환",
  })
  @ApiQuery({
    name: "exchange",
    required: false,
    description: "거래소 (기본값: binance)",
  })
  @ApiQuery({
    name: "market",
    required: false,
    description: "마켓 타입 (spot, futures_um, futures_cm)",
  })
  @ApiResponse({
    status: 200,
    description: "티커 목록",
    schema: {
      type: "object",
      properties: {
        ok: { type: "boolean", example: true },
        data: {
          type: "array",
          items: { type: "string", example: "BTCUSDT" },
        },
      },
    },
  })
  async getTickers(
    @Query("exchange") exchange: string = "binance",
    @Query("market")
    market: "spot" | "futures_um" | "futures_cm" = "futures_um",
  ) {
    const tickers = await this.webhookBuilderService.getTickers(
      exchange,
      market,
    );
    return {
      ok: true,
      data: tickers,
    };
  }
}
