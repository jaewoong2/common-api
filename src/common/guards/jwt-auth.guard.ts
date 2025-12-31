import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "@common/decorators/public.decorator";
import { AppRequest } from "@common/interfaces/app-request.interface";
import { FastifyPassportGuard } from "./fastify-passport.guard";
import { AuthenticatedUser } from "@modules/auth/interfaces/auth-user.interface";

const PassportJwtGuard = FastifyPassportGuard("jwt");

/**
 * Global JWT guard that enforces bearer authentication unless @Public is present.
 */
@Injectable()
export class JwtAuthGuard extends PassportJwtGuard {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  /**
   * Skip JWT auth when @Public is applied; otherwise defer to passport guard.
   */
  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }

  /**
   * Attach authenticated user to request and surface friendly error on failure.
   */
  handleRequest<TUser = AuthenticatedUser>(
    err: unknown,
    user: TUser | false,
    info: unknown,
    context: ExecutionContext,
    status?: unknown
  ): TUser {
    // Check for authentication errors or missing user
    if (err || !user) {
      // Extract more specific error message from info object
      let message = "Invalid or missing authentication token";

      if (info instanceof Error) {
        message = info.message;
      } else if (
        typeof info === "object" &&
        info !== null &&
        "message" in info
      ) {
        message = String((info as { message: string }).message);
      }

      throw new UnauthorizedException(message);
    }

    const authenticatedUser = user as unknown as AuthenticatedUser;

    const request = context
      .switchToHttp()
      .getRequest<AppRequest<AuthenticatedUser>>();

    request.user = authenticatedUser;
    if (authenticatedUser.appId) {
      request.appId = authenticatedUser.appId;
    }

    return authenticatedUser as unknown as TUser;
  }
}
