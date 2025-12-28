import { SetMetadata } from '@nestjs/common';

/**
 * Marks a handler with required roles for authorization guards.
 */
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
