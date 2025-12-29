import { HttpException, HttpStatus } from "@nestjs/common";
import { ErrorCode } from "./error-codes";

interface ErrorResponseBody {
  code: ErrorCode | string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Application-level HTTP exception with a stable error code and optional details.
 */
export class AppException extends HttpException {
  constructor(
    code: ErrorCode | string,
    message: string,
    status: HttpStatus,
    details?: Record<string, unknown>
  ) {
    const response: ErrorResponseBody = details
      ? { code, message, details }
      : { code, message };

    super(response, status);
  }
}
