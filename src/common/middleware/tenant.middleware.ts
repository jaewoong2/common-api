import { Injectable, NestMiddleware } from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { AppRequest } from '@common/interfaces/app-request.interface';

/**
 * Resolves tenant appId from the Host header and attaches it to the request.
 * Placeholder implementation: extracts subdomain before first dot.
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: AppRequest, _: FastifyReply, next: () => void) {
    const host: string = req.headers.host || '';
    const appId = host.split('.')[0] || 'platform';
    req.appId = appId;
    next();
  }
}
