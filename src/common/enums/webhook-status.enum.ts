/**
 * Webhook Status Enum
 * @description Webhook 요청 처리 상태
 */
export enum WebhookStatus {
  RECEIVED = "RECEIVED",
  QUEUED = "QUEUED",
  PROCESSING = "PROCESSING",
  DONE = "DONE",
  FAIL = "FAIL",
  PARTIAL_FAIL = "PARTIAL_FAIL",
}
