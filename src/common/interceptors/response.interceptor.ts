import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  /**
   * Wraps successful responses with a common envelope and request id.
   * Skips OAuth routes to avoid conflicts with Passport redirects.
   */
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const url = request.url || '';

    // Skip OAuth routes (Passport handles redirects directly)
    if (url.includes('/oauth/') && (url.includes('/start') || url.includes('/callback'))) {
      return next.handle();
    }

    return next.handle().pipe(
      map((data) => ({
        success: true,
        data,
        request_id: request?.id,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
