/**
 * Product type enum
 * @description Categorizes products by delivery/consumption model
 */
export enum ProductType {
  /** Digital goods delivered instantly (e.g., hints, boosts) */
  DIGITAL = 'DIGITAL',

  /** Recurring subscription service */
  SUBSCRIPTION = 'SUBSCRIPTION',

  /** Physical goods requiring shipping (placeholder for future) */
  PHYSICAL = 'PHYSICAL',
}
