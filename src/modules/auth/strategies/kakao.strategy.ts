import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-kakao";
import { ConfigService } from "@nestjs/config";
import { AuthService } from "../auth.service";
import { OAuthProfile } from "../interfaces/oauth-profile.interface";
import { AppRequest } from "@common/interfaces/app-request.interface";
import { OAuthProviderConfigMissingException } from "../exceptions/oauth.exceptions";

/**
 * Kakao OAuth Strategy
 * @description Handles Kakao OAuth authentication
 */
@Injectable()
export class KakaoStrategy extends PassportStrategy(Strategy, "kakao") {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService
  ) {
    const clientId = configService.get<string>("oauth.kakao.clientId");
    const clientSecret = configService.get<string>("oauth.kakao.clientSecret");
    const callbackUrl = configService.get<string>("oauth.kakao.callbackUrl");

    if (!clientId || !clientSecret || !callbackUrl) {
      throw new OAuthProviderConfigMissingException("kakao");
    }

    super({
      clientID: clientId,
      clientSecret,
      callbackURL: callbackUrl,
      passReqToCallback: true,
    });
  }

  /**
   * Validate Kakao OAuth user
   * @param req Request object (Fastify)
   * @param accessToken Access token from Kakao
   * @param refreshToken Refresh token from Kakao
   * @param profile User profile from Kakao
   * @param done Callback function
   */
  async validate(
    req: AppRequest,
    _accessToken: string,
    _refreshToken: string,
    profile: OAuthProfile,
    _done: (err: unknown, user?: unknown) => void
  ) {
    try {
      const user = await this.authService.validateOAuthUser(
        "kakao",
        profile,
        req.appId
      );

      return user;
    } catch (error) {
      console.error(error);
      return false;
    }
  }
}
