import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AppLogger } from '../../core/logger/logger.service';
import { AppRequest } from '../interfaces/app-request.interface';
import { sanitizeSensitiveData } from '../utils/sanitizer.util';

/**
 * Logs HTTP requests and responses with configurable detail levels
 * Supports basic (timing only) and detailed (with payloads) logging
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new AppLogger(LoggingInterceptor.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Intercepts HTTP requests to log request/response information
   * Execution order: before controller → controller → after controller
   */
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    const request = context.switchToHttp().getRequest<AppRequest>();
    const logLevel = this.configService.get<string>('logger.level', 'basic');

    // Skip if logging disabled
    if (logLevel === 'none') {
      return next.handle();
    }

    // Skip OAuth routes (same logic as ResponseInterceptor)
    if (this.isOAuthRoute(request.url)) {
      return next.handle();
    }

    // Skip excluded routes
    if (this.shouldExcludeRoute(request.url)) {
      return next.handle();
    }

    // Skip large payloads (file uploads)
    if (this.shouldSkipLogging(request)) {
      return next.handle();
    }

    const startTime = Date.now();
    const requestId = request.id;

    // Set request ID for logger context
    this.logger.setRequestId(requestId);

    // Log request details (detailed mode only)
    if (logLevel === 'detailed') {
      this.logRequest(request);
    }

    return next.handle().pipe(
      tap({
        next: (data) => {
          const duration = Date.now() - startTime;
          const response = context.switchToHttp().getResponse();
          const statusCode = response.statusCode;

          this.logResponse(
            request.method,
            request.url,
            statusCode,
            duration,
            data,
            logLevel,
          );
        },
        error: (error) => {
          // Errors are already logged by HttpExceptionFilter with full details
          // Here we only log timing information for consistency
          const duration = Date.now() - startTime;
          const statusCode = error?.status || 500;

          this.logTiming(request.method, request.url, statusCode, duration);
        },
      }),
    );
  }

  /**
   * Logs incoming request details (query, body, headers)
   */
  private logRequest(request: AppRequest): void {
    const sanitizedQuery = this.sanitizePayload(request.query);
    const sanitizedBody = this.sanitizePayload(request.body);
    const sanitizedHeaders = this.sanitizeHeaders(request.headers);

    this.logger.log(
      `Request: ${JSON.stringify({
        query: sanitizedQuery,
        body: sanitizedBody,
        headers: sanitizedHeaders,
      })}`,
    );
  }

  /**
   * Logs outgoing response with timing information
   */
  private logResponse(
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    data: unknown,
    logLevel: string,
  ): void {
    const basicLog = `[${method} ${url}] ${statusCode} - ${duration}ms`;

    if (logLevel === 'basic') {
      this.logger.log(basicLog);
      return;
    }

    // Detailed logging includes response payload
    const sanitizedData = this.sanitizePayload(data);
    this.logger.log(
      `${basicLog}\nResponse: ${JSON.stringify(sanitizedData)}`,
    );
  }

  /**
   * Logs only timing information (used for error cases)
   */
  private logTiming(
    method: string,
    url: string,
    statusCode: number,
    duration: number,
  ): void {
    this.logger.log(`[${method} ${url}] ${statusCode} - ${duration}ms`);
  }

  /**
   * Sanitizes payload data by masking sensitive fields and truncating large payloads
   */
  private sanitizePayload(data: unknown): unknown {
    if (!data) {
      return data;
    }

    const maxSize = this.configService.get<number>(
      'logger.maxPayloadSize',
      10000,
    );

    try {
      const stringified = JSON.stringify(data);

      // Truncate large payloads
      if (stringified.length > maxSize) {
        return {
          _truncated: true,
          size: stringified.length,
          maxAllowed: maxSize,
        };
      }

      // Sanitize sensitive data
      return sanitizeSensitiveData(data);
    } catch {
      // Handle circular references or non-serializable data
      return '[Non-serializable Data]';
    }
  }

  /**
   * Sanitizes HTTP headers by removing sensitive ones
   */
  private sanitizeHeaders(
    headers: Record<string, unknown>,
  ): Record<string, unknown> {
    const safe = { ...headers };

    // Remove sensitive headers
    delete safe.authorization;
    delete safe.cookie;
    delete safe['x-api-key'];
    delete safe['jwt_auth'];

    return safe;
  }

  /**
   * Checks if route should be excluded from logging
   */
  private shouldExcludeRoute(url: string): boolean {
    const excludedRoutes = this.configService.get<string[]>(
      'logger.excludeRoutes',
      [],
    );
    return excludedRoutes.some((route) => url.startsWith(route));
  }

  /**
   * Checks if this is an OAuth route (should skip logging to avoid conflicts)
   */
  private isOAuthRoute(url: string): boolean {
    return (
      url.includes('/oauth/') && (url.includes('/start') || url.includes('/callback'))
    );
  }

  /**
   * Checks if logging should be skipped for this request (e.g., file uploads)
   */
  private shouldSkipLogging(request: AppRequest): boolean {
    // Skip large file uploads
    const contentLength = request.headers['content-length'];
    if (contentLength && Number(contentLength) > 1_000_000) {
      // > 1MB
      return true;
    }

    // Skip multipart uploads
    const contentType = request.headers['content-type'] as string | undefined;
    if (contentType?.includes('multipart/form-data')) {
      return true;
    }

    return false;
  }
}
