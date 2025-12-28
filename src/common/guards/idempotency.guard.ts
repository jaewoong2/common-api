import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ConflictException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { IdempotencyKeyRepository } from '../repositories/idempotency-key.repository';
import { sha256Hash } from '../utils/hmac.util';

/**
 * Idempotency Guard
 * @description Checks X-Idempotency-Key header and prevents duplicate requests
 * @note Optional - only processes if header is present
 */
@Injectable()
export class IdempotencyGuard implements CanActivate {
  constructor(
    private readonly idempotencyKeyRepository: IdempotencyKeyRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    const idempotencyKey = request.headers['x-idempotency-key'] as string;

    // If no idempotency key, proceed normally
    if (!idempotencyKey) {
      return true;
    }

    // Get appId from request (should be set by auth middleware)
    const appId = (request as any).appId;
    if (!appId) {
      // If no appId, skip idempotency check (public endpoints)
      return true;
    }

    // Calculate request hash
    const bodyHash = sha256Hash(request.body || {});

    // Check for existing idempotency key
    const existing = await this.idempotencyKeyRepository.findByKey(
      appId,
      idempotencyKey,
    );

    if (existing) {
      // Verify request hash matches
      if (existing.requestHash !== bodyHash) {
        throw new ConflictException(
          'Idempotency key reused with different request body',
        );
      }

      // Return cached response
      response.status(existing.httpStatus).json(existing.responseBody);
      return false; // Stop execution
    }

    // Store key and hash for later use in interceptor
    (request as any).idempotencyKey = idempotencyKey;
    (request as any).idempotencyHash = bodyHash;

    return true;
  }
}
