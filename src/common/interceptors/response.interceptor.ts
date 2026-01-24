import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { map } from "rxjs/operators";
import { Observable } from "rxjs";

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  /**
   * Wraps successful responses with a common envelope and request id.
   * Skips OAuth routes to avoid conflicts with Passport redirects.
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const url = request.url || "";

    // Skip OAuth routes (Passport handles redirects directly)
    if (
      url.includes("/oauth/") &&
      (url.includes("/start") || url.includes("/callback"))
    ) {
      return next.handle();
    }

    return next.handle().pipe(
      map((data) => {
        // 이미 컨트롤러에서 { ok: true, data: ... } 형태로 반환된 경우 병합
        if (data && typeof data === "object" && "ok" in data) {
          return {
            ...data,
            request_id: request?.id,
            timestamp: new Date().toISOString(),
          };
        }

        // 컨트롤러가 순수 데이터만 반환한 경우 래핑 (표준화: success -> ok)
        return {
          ok: true,
          data,
          request_id: request?.id,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
