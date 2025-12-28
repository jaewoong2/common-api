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

  private withRequestId(message: any) {
    return this.requestId ? `[req:${this.requestId}] ${message}` : message;
  }

  /**
   * Logs an info message with optional request id prefix.
   */
  override log(message: any, context?: string) {
    super.log(this.withRequestId(message), context);
  }

  /**
   * Logs a warning with optional request id prefix.
   */
  override warn(message: any, context?: string) {
    super.warn(this.withRequestId(message), context);
  }

  /**
   * Logs an error with optional request id prefix.
   */
  override error(message: any, trace?: string, context?: string) {
    super.error(this.withRequestId(message), trace, context);
  }
}
