import { ExecutionContext, Type } from "@nestjs/common";
import { AuthGuard, IAuthGuard } from "@nestjs/passport";
import { FastifyReply } from "fastify";
import { AppRequest } from "@common/interfaces/app-request.interface";
import { DEFAULT_APP_ID } from "@modules/auth/constants/auth.constants";

type Strategy = string | string[] | undefined;

/**
 * Factory returning a Passport AuthGuard compatible with Fastify responses.
 * It ensures Passport receives the raw ServerResponse so redirect flows work.
 */
export const FastifyPassportGuard = (strategy?: Strategy): Type<IAuthGuard> => {
  const BaseGuard = AuthGuard(strategy);

  class FastifyAwareAuthGuard extends BaseGuard {
    protected getResponse(context: ExecutionContext) {
      const reply = context.switchToHttp().getResponse<FastifyReply>();
      return reply.raw;
    }

    async getAuthenticateOptions(
      context: ExecutionContext
    ): Promise<{ state?: string }> {
      const req = context.switchToHttp().getRequest<AppRequest>();
      const query = (req.query ?? {}) as Record<string, unknown>;

      const queryAppId =
        typeof query.appId === "string" ? query.appId : undefined;

      const stateAppId =
        typeof query.state === "string" ? query.state : undefined;

      const resolvedAppId = queryAppId ?? stateAppId ?? DEFAULT_APP_ID;

      const isCallback = typeof query.code === "string";

      req.appId = resolvedAppId;

      if (isCallback) {
        return {};
      }

      return { state: resolvedAppId };
    }
  }

  return FastifyAwareAuthGuard as Type<IAuthGuard>;
};
