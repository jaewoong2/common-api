import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ConflictException,
} from "@nestjs/common";
import { FastifyReply } from "fastify";
import { AppRequest } from "@common/interfaces/app-request.interface";
import { IdempotencyKeyRepository } from "../repositories/idempotency-key.repository";
import { sha256Hash } from "../utils/hmac.util";

/**
 * Idempotency Guard
 * @description Checks X-Idempotency-Key header and prevents duplicate requests
 * @note Optional - only processes if header is present
 */
@Injectable()
export class IdempotencyGuard implements CanActivate {
  constructor(
    private readonly idempotencyKeyRepository: IdempotencyKeyRepository
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AppRequest>();
    const response = context.switchToHttp().getResponse<FastifyReply>();

    const idempotencyKey = request.headers["x-idempotency-key"] as string;

    // If no idempotency key, proceed normally
    if (!idempotencyKey) {
      return true;
    }

    // Get appId from request (should be set by auth middleware)
    const appId = request.appId;
    if (!appId) {
      // If no appId, skip idempotency check (public endpoints)
      return true;
    }

    // Calculate request hash
    const bodyHash = sha256Hash(request.body || {});

    // Check for existing idempotency key
    const existing = await this.idempotencyKeyRepository.findByKey(
      appId,
      idempotencyKey
    );

    if (existing) {
      // Verify request hash matches
      if (existing.requestHash !== bodyHash) {
        throw new ConflictException(
          "Idempotency key reused with different request body"
        );
      }

      // Return cached response
      response.status(existing.httpStatus);
      response.send(existing.responseBody);
      return false; // Stop execution
    }

    // Store key and hash for later use in interceptor
    request.idempotencyKey = idempotencyKey;
    request.idempotencyHash = bodyHash;

    return true;
  }
}
