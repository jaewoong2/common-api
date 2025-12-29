import { ConsoleLogger, Injectable } from '@nestjs/common';

/**
 * Minimal logger that prefixes messages with request id when present.
 */
@Injectable()
export class AppLogger extends ConsoleLogger {
  private requestId?: string;

  /**
   * Binds a request id to prefix log output.
   */
  setRequestId(requestId: string) {
    this.requestId = requestId;
  }

  private formatWithRequestId(message: unknown): string {
    const normalized =
      typeof message === 'string' ? message : JSON.stringify(message);
    return this.requestId ? `[req:${this.requestId}] ${normalized}` : normalized;
  }

  /**
   * Logs an info message with optional request id prefix.
   */
  override log(message: unknown, context?: string) {
    super.log(this.formatWithRequestId(message), context);
  }

  /**
   * Logs a warning with optional request id prefix.
   */
  override warn(message: unknown, context?: string) {
    super.warn(this.formatWithRequestId(message), context);
  }

  /**
   * Logs an error with optional request id prefix.
   */
  override error(message: unknown, trace?: string, context?: string) {
    super.error(this.formatWithRequestId(message), trace, context);
  }
}
