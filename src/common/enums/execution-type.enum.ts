/**
 * Execution type for unified job system
 *
 * @description
 * Defines the execution method for job processing:
 * - lambda-invoke: AWS Lambda SDK invoke (Event type, async)
 * - lambda-url: Lambda Function URL with SigV4 authentication
 * - rest-api: External/internal REST API call via HTTP
 * - schedule: EventBridge Schedule creation (wrapper for delayed execution)
 */
export enum ExecutionType {
  /** AWS Lambda SDK invoke (InvocationType=Event for async execution) */
  LAMBDA_INVOKE = 'lambda-invoke',

  /** Lambda Function URL with SigV4 authentication */
  LAMBDA_URL = 'lambda-url',

  /** External or internal REST API call */
  REST_API = 'rest-api',

  /** EventBridge Schedule wrapper (creates scheduled execution) */
  SCHEDULE = 'schedule',
}
