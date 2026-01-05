import { registerAs } from "@nestjs/config";

/**
 * Logger configuration
 * Controls logging behavior for HTTP requests/responses
 */
export default registerAs("logger", () => ({
  /**
   * Logging level
   * - basic: Method, URL, status code, latency
   * - detailed: Includes request/response payloads (sanitized)
   * - none: Disable response logging (errors still logged by HttpExceptionFilter)
   */
  level: process.env.LOG_LEVEL || "detailed",

  /**
   * Maximum payload size to log in bytes
   * Payloads exceeding this size will be truncated
   */
  maxPayloadSize: Number(process.env.LOG_MAX_PAYLOAD_SIZE) || 10000,

  /**
   * Routes to exclude from detailed logging
   * Useful for high-traffic endpoints like health checks
   */
  excludeRoutes: (
    process.env.LOG_EXCLUDE_ROUTES || "/health,/metrics,/api-docs"
  )
    .split(",")
    .map((route) => route.trim())
    .filter(Boolean),
}));
