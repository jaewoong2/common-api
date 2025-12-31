import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@common/enums';

/**
 * Marks a handler with required roles for authorization guards.
 */
export const Roles = (...roles: UserRole[]) => SetMetadata('roles', roles);
