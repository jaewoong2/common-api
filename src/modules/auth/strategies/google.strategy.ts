import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy, VerifyCallback } from "passport-google-oauth20";
import { ConfigService } from "@nestjs/config";
import { AuthService } from "../auth.service";
import { OAuthProfile } from "../interfaces/oauth-profile.interface";
import { AppRequest } from "@common/interfaces/app-request.interface";
import { OAuthProviderConfigMissingException } from "../exceptions/oauth.exceptions";

/**
 * Google OAuth Strategy
 * @description Handles Google OAuth authentication
 */
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, "google") {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService
  ) {
    const clientId = configService.get<string>("oauth.google.clientId");
    const clientSecret = configService.get<string>("oauth.google.clientSecret");
    const callbackUrl = configService.get<string>("oauth.google.callbackUrl");

    if (!clientId || !clientSecret || !callbackUrl) {
      throw new OAuthProviderConfigMissingException("google");
    }

    super({
      clientID: clientId,
      clientSecret,
      callbackURL: callbackUrl,
      scope: ["email", "profile"],
      passReqToCallback: true,
    });
  }

  /**
   * Validate Google OAuth user
   * @param req Request object (Fastify)
   * @param accessToken Access token from Google
   * @param refreshToken Refresh token from Google
   * @param profile User profile from Google
   * @param done Callback function
   */
  async validate(
    req: AppRequest,
    _accessToken: string,
    _refreshToken: string,
    profile: OAuthProfile,
    done: VerifyCallback
  ) {
    try {
      const user = await this.authService.validateOAuthUser(
        "google",
        profile,
        req.appId
      );

      done(null, user);
    } catch (error) {
      done(error, false);
    }
  }
}
