import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
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
import { ExchangeKeyService } from "./exchange-keys.service";
import { CreateExchangeKeyDto, ExchangeKeyDto } from "./dto";

// CurrentUser decorator to extract user from JWT payload
const CurrentUser = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);

/**
 * Exchange Keys Controller
 * @description 거래소 API 키 CRUD 엔드포인트
 */
@ApiTags("Exchange Keys")
@ApiBearerAuth()
@UseGuards(AuthGuard("jwt"))
@Controller("users/keys")
export class ExchangeKeysController {
  constructor(private readonly service: ExchangeKeyService) {}

  /**
   * POST /users/keys - 거래소 키 등록
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "거래소 API 키 등록" })
  @ApiResponse({
    status: 201,
    description: "키 등록 성공",
    schema: {
      example: {
        ok: true,
        data: { key_id: "uuid-123" },
      },
    },
  })
  @ApiResponse({ status: 409, description: "DUPLICATE_KEY" })
  async createKey(
    @CurrentUser("id") userId: string,
    @Body() dto: CreateExchangeKeyDto,
  ) {
    const keyId = await this.service.createKey(userId, dto);
    return {
      ok: true,
      data: { key_id: keyId },
    };
  }

  /**
   * GET /users/keys - 거래소 키 목록 조회
   */
  @Get()
  @ApiOperation({ summary: "거래소 키 목록 조회 (Secret 마스킹)" })
  @ApiResponse({
    status: 200,
    description: "키 목록",
    type: [ExchangeKeyDto],
  })
  async getKeys(@CurrentUser("id") userId: string) {
    const keys = await this.service.getKeys(userId);
    return {
      ok: true,
      data: keys,
    };
  }

  /**
   * DELETE /users/keys/:key_id - 거래소 키 삭제
   */
  @Delete(":key_id")
  @ApiOperation({ summary: "거래소 키 삭제" })
  @ApiResponse({
    status: 200,
    description: "삭제 성공",
    schema: { example: { ok: true, data: {} } },
  })
  @ApiResponse({ status: 404, description: "KEY_NOT_FOUND" })
  async deleteKey(
    @CurrentUser("id") userId: string,
    @Param("key_id") keyId: string,
  ) {
    await this.service.deleteKey(userId, keyId);
    return {
      ok: true,
      data: {},
    };
  }
}
