import { UserRole } from "@common/enums";

/**
 * JWT payload shape carried inside signed access tokens.
 */
export interface JwtPayload {
  sub: string;
  email?: string;
  appId?: string;
  role?: UserRole;
  iat?: number;
  exp?: number;
}
