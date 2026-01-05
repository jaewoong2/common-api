/**
 * Patterns to identify sensitive field names
 * Case-insensitive matching for common sensitive data fields
 */
const SENSITIVE_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /api[_-]?key/i,
  /authorization/i,
  /bearer/i,
  /cookie/i,
  /session/i,
  /credit[_-]?card/i,
  /cvv/i,
  /ssn/i,
  /private[_-]?key/i,
];

/**
 * Checks if a field name matches sensitive patterns
 * @param key - Field name to check
 * @returns True if field is considered sensitive
 */
function isSensitiveField(key: string): boolean {
  return SENSITIVE_PATTERNS.some((pattern) => pattern.test(key));
}

/**
 * Masks a sensitive string value
 * @param value - String to mask
 * @returns Masked string (shows first 2 and last 2 chars for values > 4 chars)
 * @example
 * maskValue('password123') // => 'pa***23'
 * maskValue('tok') // => '***'
 */
function maskValue(value: string): string {
  if (value.length <= 4) {
    return '***';
  }
  return `${value.substring(0, 2)}***${value.substring(value.length - 2)}`;
}

/**
 * Recursively sanitizes an object by masking sensitive fields
 * Handles nested objects, arrays, and prevents infinite loops with circular references
 *
 * @param data - Data to sanitize (any type)
 * @param maxDepth - Maximum recursion depth to prevent stack overflow (default: 10)
 * @param currentDepth - Current recursion level (internal use)
 * @param visited - Set of visited objects to detect circular references (internal use)
 * @returns Sanitized copy of the data with sensitive fields masked
 *
 * @example
 * const data = { email: 'user@test.com', password: 'secret123' };
 * sanitizeSensitiveData(data);
 * // => { email: 'user@test.com', password: '***' }
 */
export function sanitizeSensitiveData(
  data: unknown,
  maxDepth = 10,
  currentDepth = 0,
  visited: WeakSet<object> = new WeakSet(),
): unknown {
  // Base cases: null, undefined, or max depth reached
  if (data === null || data === undefined) {
    return data;
  }

  if (currentDepth >= maxDepth) {
    return '[Max Depth Reached]';
  }

  // Handle primitives (string, number, boolean)
  if (typeof data !== 'object') {
    return data;
  }

  // Detect circular references
  if (visited.has(data as object)) {
    return '[Circular Reference]';
  }

  // Mark as visited
  visited.add(data as object);

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map((item) =>
      sanitizeSensitiveData(item, maxDepth, currentDepth + 1, visited),
    );
  }

  // Handle objects
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (isSensitiveField(key)) {
      // Mask sensitive fields
      if (typeof value === 'string') {
        sanitized[key] = maskValue(value);
      } else {
        sanitized[key] = '***';
      }
    } else {
      // Recursively sanitize non-sensitive fields
      sanitized[key] = sanitizeSensitiveData(
        value,
        maxDepth,
        currentDepth + 1,
        visited,
      );
    }
  }

  return sanitized;
}
