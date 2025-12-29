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

      const queryRedirectUri =
        typeof query.redirect_uri === "string" ? query.redirect_uri : undefined;

      const isCallback = typeof query.code === "string";

      // On callback, decode state parameter
      if (isCallback && typeof query.state === "string") {
        try {
          const decoded = Buffer.from(query.state, "base64").toString("utf-8");
          const stateData = JSON.parse(decoded);

          req.appId = stateData.appId ?? DEFAULT_APP_ID;
          req.redirectUri = stateData.redirect_uri;
        } catch (error) {
          // Fallback to old format (just appId as string)
          req.appId = query.state;
        }

        return {};
      }

      // On start, encode state parameter
      const resolvedAppId = queryAppId ?? DEFAULT_APP_ID;
      req.appId = resolvedAppId;

      // If redirect_uri provided, encode both appId and redirect_uri in state
      if (queryRedirectUri) {
        const stateData = {
          appId: resolvedAppId,
          redirect_uri: queryRedirectUri,
        };
        const stateString = Buffer.from(JSON.stringify(stateData)).toString(
          "base64"
        );
        req.redirectUri = queryRedirectUri;
        return { state: stateString };
      }

      // Backward compatibility: just appId in state (old format)
      return { state: resolvedAppId };
    }
  }

  return FastifyAwareAuthGuard as Type<IAuthGuard>;
};
