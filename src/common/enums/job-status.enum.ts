/**
 * Job status enum
 * @description Tracks the execution state of asynchronous jobs
 */
export enum JobStatus {
  /** Job created and waiting for first execution */
  PENDING = 'PENDING',

  /** Job failed and will be retried */
  RETRYING = 'RETRYING',

  /** Job completed successfully */
  SUCCEEDED = 'SUCCEEDED',

  /** Job failed but max retries not reached */
  FAILED = 'FAILED',

  /** Job failed permanently (max retries exceeded or unrecoverable error) */
  DEAD = 'DEAD',
}
