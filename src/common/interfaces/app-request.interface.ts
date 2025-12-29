import { FastifyRequest } from 'fastify';
import { UserEntity } from '@database/entities/user.entity';

/**
 * Fastify request augmented with tenant/app metadata and authenticated user.
 */
export interface AppRequest<UserType = UserEntity> extends FastifyRequest {
  appId?: string;
  /**
   * OAuth redirect URI extracted from state parameter
   */
  redirectUri?: string;
  /**
   * Request identifier exposed by Fastify + middleware.
   */
  id: string;
  user?: UserType;
  idempotencyKey?: string;
  idempotencyHash?: string;
}
