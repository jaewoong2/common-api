/**
 * User role enum for RBAC (Role-Based Access Control)
 * @description Defines user roles with different permission levels
 */
export enum UserRole {
  /** Regular user with basic permissions */
  USER = 'USER',

  /** App-level operator with limited admin permissions */
  APP_OPERATOR = 'APP_OPERATOR',

  /** App-level administrator with full app management permissions */
  APP_ADMIN = 'APP_ADMIN',

  /** Platform super administrator with cross-app permissions */
  PLATFORM_SUPER_ADMIN = 'PLATFORM_SUPER_ADMIN',
}
