/**
 * Wallet transaction direction enum
 * @description Indicates whether points are added or deducted
 */
export enum WalletDirection {
  /** Points are added to wallet (incoming transaction) */
  CREDIT = 'CREDIT',

  /** Points are deducted from wallet (outgoing transaction) */
  DEBIT = 'DEBIT',
}
