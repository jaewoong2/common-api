import { Injectable, NestMiddleware } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

/**
 * Ensures every request has an `X-Request-Id` header and exposes it on req.id.
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  /**
   * Adds a request id header and property if missing.
   */
  use(req: any, res: any, next: () => void) {
    const requestId = req.headers['x-request-id'] || uuidv4();
    req.id = requestId;
    res.setHeader('X-Request-Id', requestId);
    next();
  }
}
