import { ConsoleLogger, Injectable } from '@nestjs/common';

/**
 * Minimal logger that prefixes messages with request id when present.
 */
@Injectable()
export class AppLogger extends ConsoleLogger {
  private requestId?: string;
  private winstonLogger: winston.Logger;

  constructor() {
    super();
    this.winstonLogger = this.createWinstonLogger();
  }

  /**
   * Creates Winston logger instance with production-grade configuration
   */
  private createWinstonLogger(): winston.Logger {
    const isProduction = process.env.NODE_ENV === 'production';
    const logLevel = process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug');

    // Custom format for structured logging
    const structuredFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
      winston.format.errors({ stack: true }),
      winston.format.metadata({ fillExcept: ['timestamp', 'level', 'message'] }),
      winston.format.json(),
    );

    // Human-readable format for development
    const consoleFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
      winston.format.colorize(),
      winston.format.printf(({ timestamp, level, message, requestId, ...meta }) => {
        const reqId = requestId ? `[req:${requestId}]` : '';
        const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
        return `${timestamp} ${level} ${reqId} ${message}${metaStr}`;
      }),
    );

    const transports: winston.transport[] = [];

    // Console transport (always enabled)
    transports.push(
      new winston.transports.Console({
        format: isProduction ? structuredFormat : consoleFormat,
        level: logLevel,
      }),
    );

    // File transports (production only)
    if (isProduction) {
      // Combined log (all levels)
      transports.push(
        new DailyRotateFile({
          filename: 'logs/combined-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '14d',
          format: structuredFormat,
          level: logLevel,
        }),
      );

      // Error log (error level only)
      transports.push(
        new DailyRotateFile({
          filename: 'logs/error-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '30d',
          format: structuredFormat,
          level: 'error',
        }),
      );

      // HTTP log (dedicated for request/response tracking)
      transports.push(
        new DailyRotateFile({
          filename: 'logs/http-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: '50m',
          maxFiles: '7d',
          format: structuredFormat,
          level: 'http',
        }),
      );
    }

    return winston.createLogger({
      level: logLevel,
      transports,
      exitOnError: false,
    });
  }

  /**
   * Binds a request id to prefix log output
   */
  setRequestId(requestId: string) {
    this.requestId = requestId;
  }

  /**
   * Gets current request ID
   */
  getRequestId(): string | undefined {
    return this.requestId;
  }

  /**
   * Clears request ID (for cleanup)
   */
  clearRequestId() {
    this.requestId = undefined;
  }

  /**
   * Creates metadata object with request ID
   */
  private createMetadata(meta?: Record<string, unknown>): Record<string, unknown> {
    const metadata: Record<string, unknown> = {
      ...(meta || {}),
    };

    if (this.requestId) {
      metadata.requestId = this.requestId;
    }

    return metadata;
  }

  /**
   * Logs an info message with structured metadata
   */
  override log(message: unknown, context?: string) {
    const msg = typeof message === 'string' ? message : JSON.stringify(message);
    this.winstonLogger.info(msg, this.createMetadata({ context }));
    super.log(this.formatWithRequestId(message), context);
  }

  /**
   * Logs a warning with structured metadata
   */
  override warn(message: unknown, context?: string) {
    const msg = typeof message === 'string' ? message : JSON.stringify(message);
    this.winstonLogger.warn(msg, this.createMetadata({ context }));
    super.warn(this.formatWithRequestId(message), context);
  }

  /**
   * Logs an error with structured metadata and stack trace
   */
  override error(message: unknown, trace?: string, context?: string) {
    const msg = typeof message === 'string' ? message : JSON.stringify(message);
    this.winstonLogger.error(msg, this.createMetadata({ trace, context }));
    super.error(this.formatWithRequestId(message), trace, context);
  }

  /**
   * Logs debug information (development only)
   */
  override debug(message: unknown, context?: string) {
    const msg = typeof message === 'string' ? message : JSON.stringify(message);
    this.winstonLogger.debug(msg, this.createMetadata({ context }));
    super.debug(this.formatWithRequestId(message), context);
  }

  /**
   * Logs verbose information (detailed tracing)
   */
  override verbose(message: unknown, context?: string) {
    const msg = typeof message === 'string' ? message : JSON.stringify(message);
    this.winstonLogger.verbose(msg, this.createMetadata({ context }));
    super.verbose(this.formatWithRequestId(message), context);
  }

  /**
   * Logs HTTP request/response flow (production tracking)
   */
  http(message: string, meta?: Record<string, unknown>) {
    this.winstonLogger.log('http', message, this.createMetadata(meta));
  }

  /**
   * Logs request start with full context
   */
  logRequestStart(data: {
    method: string;
    url: string;
    ip: string;
    userAgent?: string;
    query?: Record<string, unknown>;
    body?: Record<string, unknown>;
    headers?: Record<string, unknown>;
  }) {
    this.http('REQUEST_START', {
      event: 'request_start',
      ...data,
    });
  }

  /**
   * Logs request completion with response details
   */
  logRequestEnd(data: {
    method: string;
    url: string;
    statusCode: number;
    duration: number;
    responseSize?: number;
    responseData?: unknown;
  }) {
    this.http('REQUEST_END', {
      event: 'request_end',
      ...data,
    });
  }

  /**
   * Logs request error with full context
   */
  logRequestError(data: {
    method: string;
    url: string;
    statusCode: number;
    duration: number;
    errorCode?: string;
    errorMessage: string;
    stack?: string;
  }) {
    this.winstonLogger.error('REQUEST_ERROR', this.createMetadata({
      event: 'request_error',
      ...data,
    }));
  }

  private formatWithRequestId(message: unknown): string {
    const normalized =
      typeof message === 'string' ? message : JSON.stringify(message);
    return this.requestId ? `[req:${this.requestId}] ${normalized}` : normalized;
  }
}
