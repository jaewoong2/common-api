/**
 * Job type enum
 * @description Defines different types of asynchronous jobs
 */
export enum JobType {
  /** HTTP callback job for external service notifications */
  CALLBACK_HTTP = 'CALLBACK_HTTP',

  /** Reward grant job for wallet credit operations (optional) */
  REWARD_GRANT = 'REWARD_GRANT',
}
