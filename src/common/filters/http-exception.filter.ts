import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  /**
   * Normalizes thrown errors into a JSON error envelope with request id.
   */
  catch(exception: unknown, host: ArgumentsHost) {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const responseBody = {
      error: {
        code: exception instanceof HttpException ? exception.name : 'INTERNAL_ERROR',
        message:
          exception instanceof HttpException
            ? exception.message
            : 'Internal server error',
        details: exception instanceof HttpException ? exception.getResponse() : {},
      },
      request_id: ctx.getRequest().id,
    };

    httpAdapter.reply(ctx.getResponse(), responseBody, status);
  }
}
