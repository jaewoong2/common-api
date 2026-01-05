import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { AuthenticatedUser } from "../interfaces/auth-user.interface";
import { JwtPayload } from "../interfaces/jwt-payload.interface";

/**
 * JWT 토큰을 여러 헤더에서 추출하는 커스텀 함수
 * 우선순위: Authorization > JWT_AUTH
 *
 * @param request - Fastify 요청 객체
 * @returns 추출된 JWT 토큰 또는 null
 */
function extractJwtFromHeaders(request: any): string | null {
  // 1. Authorization 헤더 확인 (Bearer <token> 형식)
  const authHeader = request.headers?.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7); // "Bearer " 제거
  }

  // 2. JWT_AUTH 헤더 확인 (Bearer <token> 형식)
  // Fastify는 헤더를 소문자로 정규화하므로 jwt_auth로 확인
  const jwtAuthHeader =
    request.headers?.jwt_auth || request.headers?.["JWT_AUTH"];
  if (jwtAuthHeader && jwtAuthHeader.startsWith("Bearer ")) {
    return jwtAuthHeader.substring(7); // "Bearer " 제거
  }

  return null;
}

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
      jwtFromRequest: extractJwtFromHeaders,
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
