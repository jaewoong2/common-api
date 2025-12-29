import { UserRole } from '@common/enums';

/**
 * Shape of the authenticated user attached to requests.
 */
export interface AuthenticatedUser {
  id: string;
  email?: string;
  appId?: string;
  role?: UserRole;
}
