import * as crypto from 'crypto';

/**
 * Build canonical string for HMAC signature (v1 format)
 * @param method - HTTP method (GET, POST, etc.)
 * @param path - URL path (e.g., /v1/callbacks/reward-granted)
 * @param body - Request body (object or string)
 * @param timestamp - Unix timestamp in seconds
 * @returns Canonical string for signing
 * @example
 * buildCanonicalString('POST', '/v1/callbacks/reward', {userId: '123'}, 1640000000)
 * // Returns: "POST\n/v1/callbacks/reward\n{\"userId\":\"123\"}\n1640000000"
 */
export function buildCanonicalString(
  method: string,
  path: string,
  body: any,
  timestamp: number,
): string {
  const bodyString = typeof body === 'string' ? body : JSON.stringify(body);
  return `${method.toUpperCase()}\n${path}\n${bodyString}\n${timestamp}`;
}

/**
 * Sign request with HMAC-SHA256
 * @param secret - HMAC secret key
 * @param canonical - Canonical string to sign
 * @returns HMAC signature (hex string)
 * @example
 * signRequest('my-secret', canonicalString)
 * // Returns: "a1b2c3d4..."
 */
export function signRequest(secret: string, canonical: string): string {
  return crypto.createHmac('sha256', secret).update(canonical).digest('hex');
}

/**
 * Verify HMAC signature (timing-safe comparison)
 * @param secret - HMAC secret key
 * @param canonical - Canonical string to verify
 * @param signature - Provided signature to check
 * @returns True if signature is valid
 * @example
 * verifySignature('my-secret', canonicalString, providedSignature)
 */
export function verifySignature(
  secret: string,
  canonical: string,
  signature: string,
): boolean {
  const expected = signRequest(secret, canonical);
  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(signature),
  );
}

/**
 * Generate random HMAC secret (32 bytes = 64 hex chars)
 * @returns Random hex string for HMAC secret
 * @example
 * generateHmacSecret()
 * // Returns: "a1b2c3d4e5f6..."
 */
export function generateHmacSecret(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Create SHA-256 hash of canonical JSON
 * @param data - Object to hash
 * @returns SHA-256 hash (hex string)
 * @example
 * sha256Hash({userId: '123', amount: '1000'})
 */
export function sha256Hash(data: any): string {
  const canonical = typeof data === 'string' ? data : JSON.stringify(data);
  return crypto.createHash('sha256').update(canonical).digest('hex');
}
