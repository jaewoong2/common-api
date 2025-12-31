import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { AuthenticatedUser } from "../interfaces/auth-user.interface";
import { JwtPayload } from "../interfaces/jwt-payload.interface";

/**
 * Passport JWT strategy that validates bearer tokens and maps payload to user object.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(configService: ConfigService) {
    const secret =
      configService.get<string>("JWT_SECRET") ||
      configService.get<string>("JWT_SECRET_KEY") ||
      configService.get<string>("jwt.secret") ||
      "your-secret-key";

    const algorithm =
      configService.get<string>("JWT_ALGORITHM") ||
      configService.get<string>("jwt.algorithm") ||
      "HS256";

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
      algorithms: [algorithm],
    });
  }

  /**
   * Validates JWT payload and attaches it to the request as AuthenticatedUser.
   */
  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    return {
      id: payload.sub,
      email: payload.email,
      appId: payload.appId,
      role: payload.role,
    };
  }
}
