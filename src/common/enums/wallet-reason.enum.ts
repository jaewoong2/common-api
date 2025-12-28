/**
 * Wallet transaction reason enum
 * @description Categorizes why points were credited or debited
 */
export enum WalletReason {
  /** Daily attendance reward */
  ATTENDANCE = 'ATTENDANCE',

  /** Manual adjustment by admin */
  ADMIN_ADJUST = 'ADMIN_ADJUST',

  /** Refund from order cancellation */
  REFUND = 'REFUND',

  /** Referral bonus reward */
  REFERRAL = 'REFERRAL',

  /** Purchase/consume item with points */
  BUY_ITEM = 'BUY_ITEM',

  /** Promotional campaign reward */
  PROMOTION = 'PROMOTION',

  /** Initial signup bonus */
  SIGNUP_BONUS = 'SIGNUP_BONUS',

  /** Compensation for service issue */
  COMPENSATION = 'COMPENSATION',

  /** Expiration deduction (if implemented) */
  EXPIRATION = 'EXPIRATION',

  /** Other unlisted reasons */
  OTHER = 'OTHER',
}
