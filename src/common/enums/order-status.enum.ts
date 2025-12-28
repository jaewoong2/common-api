/**
 * Order status enum
 * @description Tracks the lifecycle of an order
 */
export enum OrderStatus {
  /** Order created but payment not completed */
  PENDING = 'PENDING',

  /** Payment completed successfully */
  PAID = 'PAID',

  /** Order was refunded (full or partial) */
  REFUNDED = 'REFUNDED',
}
