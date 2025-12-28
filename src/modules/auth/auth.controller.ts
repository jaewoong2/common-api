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
} from '@nestjs/common';
import {
  RequestMagicLinkDto,
  VerifyMagicLinkDto,
  RefreshTokenDto,
  LogoutDto,
  UpdateProfileDto,
} from './dto/auth.dto';
import { AuthService } from './auth.service';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('v1/auth/magic-link/request')
  @HttpCode(HttpStatus.ACCEPTED)
  requestMagicLink(@Body() body: RequestMagicLinkDto) {
    return this.authService.requestMagicLink(body);
  }

  @Post('v1/auth/magic-link/verify')
  verifyMagicLink(@Body() body: VerifyMagicLinkDto) {
    return this.authService.verifyMagicLink(body);
  }

  @Get('v1/auth/oauth/:provider/start')
  oauthStart(@Param('provider') provider: string, @Req() req: any) {
    return this.authService.oauthStart(provider, req);
  }

  @Get('v1/auth/oauth/:provider/callback')
  oauthCallback(@Param('provider') provider: string, @Req() req: any) {
    return this.authService.oauthCallback(provider, req);
  }

  @Post('v1/auth/refresh')
  refresh(@Body() body: RefreshTokenDto) {
    return this.authService.refresh(body);
  }

  @Post('v1/auth/logout')
  logout(@Body() body: LogoutDto) {
    return this.authService.logout(body);
  }

  @Get('v1/me')
  getMe(@Req() req: any) {
    return this.authService.getMe(req.user);
  }

  @Patch('v1/me')
  updateMe(@Req() req: any, @Body() body: UpdateProfileDto) {
    return this.authService.updateMe(req.user, body);
  }

  @Delete('v1/me')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteMe(@Req() req: any) {
    return this.authService.deleteMe(req.user);
  }
}
