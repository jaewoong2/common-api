import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { Public } from "../../common/decorators/public.decorator";
import { WebhookBuilderService } from "./webhook-builder.service";
import {
  WebhookBuilderOptionsDto,
  GenerateMessageRequestDto,
  GeneratedMessageDto,
} from "./dto";

/**
 * Webhook Builder Controller
 * @description TradingView 웹훅 메시지 빌더 API
 */
@ApiTags("webhook-builder")
@Controller("webhook-builder")
@Public()
export class WebhookBuilderController {
  constructor(private readonly webhookBuilderService: WebhookBuilderService) {}

  /**
   * 프론트엔드 Select 옵션 조회
   */
  @Get("options")
  @ApiOperation({
    summary: "웹훅 빌더 옵션 조회",
    description: "프론트엔드 Select 컴포넌트에서 사용할 옵션 목록 반환",
  })
  @ApiResponse({
    status: 200,
    description: "옵션 목록",
    type: WebhookBuilderOptionsDto,
  })
  getOptions(): WebhookBuilderOptionsDto {
    return this.webhookBuilderService.getOptions();
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
  @ApiResponse({
    status: 200,
    description: "생성된 메시지",
    type: GeneratedMessageDto,
  })
  generateMessage(
    @Body() input: GenerateMessageRequestDto,
  ): GeneratedMessageDto {
    return this.webhookBuilderService.generateMessage(input);
  }
}
