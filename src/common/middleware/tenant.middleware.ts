import { Injectable, NestMiddleware } from '@nestjs/common';

/**
 * Resolves tenant appId from the Host header and attaches it to the request.
 * Placeholder implementation: extracts subdomain before first dot.
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: any, _: any, next: () => void) {
    const host: string = req.headers.host || '';
    const appId = host.split('.')[0] || 'platform';
    req.appId = appId;
    next();
  }
}
