import { Injectable, NestMiddleware } from "@nestjs/common";
import { v4 as uuidv4 } from "uuid";
import { AppRequest } from "@common/interfaces/app-request.interface";

/**
 * Ensures every request has an `X-Request-Id` header and exposes it on req.id.
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  /**
   * Adds a request id header and property if missing.
   */
  use(req: AppRequest, res: any, next: () => void) {
    const headerValue = req.headers["x-request-id"];
    const requestId = Array.isArray(headerValue)
      ? headerValue[0]
      : headerValue || uuidv4();
    req.id = requestId;

    next();
  }
}
