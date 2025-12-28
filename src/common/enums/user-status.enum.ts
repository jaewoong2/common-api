/**
 * User account status enum
 * @description Defines the possible states of a user account
 */
export enum UserStatus {
  /** User account is active and can use the system */
  ACTIVE = 'ACTIVE',

  /** User account is suspended by admin (temporary block) */
  SUSPENDED = 'SUSPENDED',

  /** User account is soft-deleted (can be restored) */
  DELETED = 'DELETED',
}
