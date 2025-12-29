import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { HttpAdapterHost } from "@nestjs/core";
import { AppLogger } from "../../core/logger/logger.service";
import { ERROR_CODE } from "../exceptions/error-codes";

interface NormalizedError {
  status: number;
  code: string;
  message: string;
  details?: Record<string, unknown> | unknown;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new AppLogger(HttpExceptionFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  /**
   * Normalizes thrown errors into a JSON error envelope with request id.
   */
  catch(exception: unknown, host: ArgumentsHost) {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<{ id?: string }>();
    const requestId = request?.id;

    if (requestId) {
      this.logger.setRequestId(requestId);
    }

    const normalized = this.normalizeException(exception);

    if (normalized.status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      const trace = exception instanceof Error ? exception.stack : undefined;
      this.logger.error(normalized.message, trace);
    }

    const responseBody = {
      success: false,
      error: {
        code: normalized.code,
        message: normalized.message,
        ...(normalized.details ? { details: normalized.details } : {}),
      },
      request_id: requestId,
      timestamp: new Date().toISOString(),
    };

    httpAdapter.reply(ctx.getResponse(), responseBody, normalized.status);
  }

  private normalizeException(exception: unknown): NormalizedError {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      const payload = this.toObject(response);
      const code =
        typeof payload.code === "string"
          ? payload.code
          : typeof payload.error === "string"
            ? payload.error
            : exception.name;
      const message = this.formatMessage(
        payload.message ?? payload.error,
        exception.message
      );
      const details = this.extractDetails(payload);

      return {
        status,
        code,
        message,
        ...(details ? { details } : {}),
      };
    }

    const fallbackMessage =
      exception instanceof Error ? exception.message : "Internal server error";

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: ERROR_CODE.INTERNAL_ERROR,
      message: fallbackMessage || "Internal server error",
    };
  }

  private toObject(response: unknown): Record<string, unknown> {
    if (response && typeof response === "object") {
      return response as Record<string, unknown>;
    }

    if (typeof response === "string") {
      return { message: response };
    }

    return {};
  }

  private formatMessage(candidate: unknown, fallback: string): string {
    if (typeof candidate === "string") {
      return candidate;
    }

    if (Array.isArray(candidate) && candidate.length > 0) {
      const first = candidate[0];
      if (typeof first === "string") {
        return first;
      }
    }

    return fallback;
  }

  private extractDetails(
    payload: Record<string, unknown>
  ): Record<string, unknown> | undefined {
    if (payload.details && typeof payload.details === "object") {
      return payload.details as Record<string, unknown>;
    }

    const extra = { ...payload };
    if (Array.isArray(payload.message)) {
      extra.messages = payload.message;
    }
    delete extra.message;
    delete extra.error;
    delete extra.statusCode;
    delete extra.code;
    delete extra.details;

    return Object.keys(extra).length > 0 ? extra : undefined;
  }
}
