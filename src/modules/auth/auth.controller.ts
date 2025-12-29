import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  Delete,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import {
  RequestMagicLinkDto,
  VerifyMagicLinkDto,
  RefreshTokenDto,
  LogoutDto,
  UpdateProfileDto,
} from "./dto/auth.dto";
import { AuthService } from "./auth.service";
import { AppRequest } from "@common/interfaces/app-request.interface";
import { UserEntity } from "../../database/entities/user.entity";
import { AuthenticatedUser } from "./interfaces/auth-user.interface";
import { FastifyPassportGuard } from "@common/guards/fastify-passport.guard";
import { DEFAULT_APP_ID } from "./constants/auth.constants";

@ApiTags("auth")
@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("v1/auth/magic-link/request")
  @HttpCode(HttpStatus.ACCEPTED)
  requestMagicLink(@Body() body: RequestMagicLinkDto, @Req() req: AppRequest) {
    const appId = req.appId ?? DEFAULT_APP_ID;
    return this.authService.requestMagicLink(appId, body);
  }

  @Post("v1/auth/magic-link/verify")
  verifyMagicLink(@Body() body: VerifyMagicLinkDto) {
    return this.authService.verifyMagicLink(body);
  }

  @Get("v1/auth/oauth/google/start")
  @UseGuards(FastifyPassportGuard("google"))
  googleOAuthStart() {
    // Guard will handle redirect to Google
  }

  @Get("v1/auth/oauth/google/callback")
  @UseGuards(FastifyPassportGuard("google"))
  googleOAuthCallback(@Req() req: AppRequest<UserEntity>) {
    return this.authService.oauthCallback("google", req);
  }

  @Get("v1/auth/oauth/kakao/start")
  @UseGuards(FastifyPassportGuard("kakao"))
  kakaoOAuthStart() {
    // Guard will handle redirect to Kakao
  }

  @Get("v1/auth/oauth/kakao/callback")
  @UseGuards(FastifyPassportGuard("kakao"))
  kakaoOAuthCallback(@Req() req: AppRequest<UserEntity>) {
    return this.authService.oauthCallback("kakao", req);
  }

  @Post("v1/auth/refresh")
  refresh(@Body() body: RefreshTokenDto) {
    return this.authService.refresh(body);
  }

  @Post("v1/auth/logout")
  logout(@Body() body: LogoutDto) {
    return this.authService.logout(body);
  }

  @Get("v1/me")
  getMe(@Req() req: AppRequest<AuthenticatedUser>) {
    return this.authService.getMe(req.user);
  }

  @Patch("v1/me")
  updateMe(
    @Req() req: AppRequest<AuthenticatedUser>,
    @Body() body: UpdateProfileDto
  ) {
    return this.authService.updateMe(req.user, body);
  }

  @Delete("v1/me")
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteMe(@Req() req: AppRequest<AuthenticatedUser>) {
    return this.authService.deleteMe(req.user);
  }
}
