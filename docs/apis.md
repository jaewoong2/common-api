# Common API Platform - API Reference v1.0

## Table of Contents

1. [Overview](#overview)
2. [Common Specifications](#common-specifications)
3. [Authentication & Identity APIs](#1-authentication--identity)
4. [Wallet APIs](#2-wallet)
5. [Billing APIs](#3-billing)
6. [Jobs APIs](#4-jobs)
7. [Admin APIs](#5-admin)
8. [Platform APIs](#6-platform)
9. [Error Codes](#error-codes)
10. [Idempotency](#idempotency)
11. [HMAC Signature Verification](#hmac-signature-verification)

---

## Overview

### Base URLs

| Environment | URL Pattern | Description |
|------------|-------------|-------------|
| App Tenant | `https://api.{appId}.com/v1` | App-specific endpoints (e.g., `api.appA.com`) |
| Platform | `https://platform.api.your.com/v1` | Platform super admin endpoints |

### Multi-Tenancy

- **Host-based resolution**: The server determines `app_id` from the `Host` header
- All requests are scoped to the resolved `app_id`
- JWT tokens contain `app_id` claim for validation

---

## Common Specifications

### Request Headers

| Header | Required | Description |
|--------|----------|-------------|
| `Authorization` | Yes* | Bearer token for authenticated endpoints |
| `X-Request-Id` | No | Client-provided request ID (auto-generated if missing) |
| `X-Idempotency-Key` | Yes** | Required for financial operations (wallet, orders) |
| `Content-Type` | Yes | `application/json` |

\* Required for authenticated endpoints
\** Required for: wallet credit/debit, orders, refunds, job creation

### Standard Response Format

#### Success Response
```json
{
  "data": {
    // Response payload
  },
  "request_id": "0b8d0e2e-4c6f-4d3a-9f2e-8a7b6c5d4e3f"
}
```

#### Error Response
```json
{
  "error": {
    "code": "INSUFFICIENT_FUNDS",
    "message": "Not enough points.",
    "details": {
      "required": 250,
      "balance": 120
    }
  },
  "request_id": "0b8d0e2e-4c6f-4d3a-9f2e-8a7b6c5d4e3f"
}
```

### Common HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 202 | Accepted (async operation) |
| 204 | No Content (successful delete) |
| 400 | Invalid request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not found |
| 409 | Conflict (idempotency, insufficient funds) |
| 422 | Unprocessable entity |
| 429 | Rate limited |
| 503 | Service unavailable (retryable) |

---

## 1. Authentication & Identity

### 1.1 Request Magic Link

Send a magic link (or code) via email for passwordless authentication.

**Endpoint:** `POST /v1/auth/magic-link/request`
**Auth:** Not required

#### Request Body
```json
{
  "email": "user@example.com",
  "redirect_url": "https://app.example.com/auth/callback"
}
```

#### Response (202 Accepted)
```json
{
  "data": {
    "status": "SENT"
  },
  "request_id": "..."
}
```

#### Error Responses
- **400 INVALID_ARGUMENT** - Invalid email format
- **429 RATE_LIMITED** - Too many requests

---

### 1.2 Verify Magic Link (Login)

Verify the magic link token and complete authentication.

**Endpoint:** `POST /v1/auth/magic-link/verify`
**Auth:** Not required

#### Request Body
```json
{
  "token": "magic_link_token_or_code"
}
```

#### Response (200 OK)
```json
{
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "access_token_expires_in": 900,
    "refresh_token": "opaque_refresh_token_string",
    "refresh_token_expires_in": 2592000,
    "user": {
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "status": "ACTIVE"
    }
  },
  "request_id": "..."
}
```

#### Error Responses
- **401 UNAUTHORIZED** - Token expired, used, or invalid

---

### 1.3 OAuth Authentication

Start OAuth flow with supported providers (Google, Kakao, etc.).

**Start Endpoint:** `GET /v1/auth/oauth/{provider}/start`
**Callback Endpoint:** `GET /v1/auth/oauth/{provider}/callback`
**Auth:** Not required

#### Supported Providers
- `google`
- `kakao`
- `naver`

#### Flow
1. Client redirects user to `/v1/auth/oauth/google/start`
2. User authenticates with provider
3. Provider redirects to `/v1/auth/oauth/google/callback`
4. Server issues JWT tokens and redirects to app's `redirect_url`

**Response:** 302 Redirect to app with session/code

> **Note:** For JSON response, implement separate `/v1/auth/oauth/verify` endpoint (optional)

---

### 1.4 Refresh Access Token

Obtain a new access token using a refresh token.

**Endpoint:** `POST /v1/auth/refresh`
**Auth:** Not required (uses refresh token)

#### Request Body
```json
{
  "refresh_token": "opaque_refresh_token_string"
}
```

#### Response (200 OK)
```json
{
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "access_token_expires_in": 900
  },
  "request_id": "..."
}
```

#### Error Responses
- **401 UNAUTHORIZED** - Refresh token revoked or expired

---

### 1.5 Logout

Revoke the refresh token to logout the user.

**Endpoint:** `POST /v1/auth/logout`
**Auth:** Bearer required (optional) OR refresh token

#### Request Body (Option A: Refresh Token)
```json
{
  "refresh_token": "opaque_refresh_token_string"
}
```

#### Response (200 OK)
```json
{
  "data": {
    "status": "LOGGED_OUT"
  },
  "request_id": "..."
}
```

---

### 1.6 Get Current User

Retrieve the authenticated user's profile.

**Endpoint:** `GET /v1/me`
**Auth:** Bearer required

#### Response (200 OK)
```json
{
  "data": {
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "status": "ACTIVE",
    "profile": {
      "nickname": "neo"
    }
  },
  "request_id": "..."
}
```

---

### 1.7 Update User Profile

Update the authenticated user's profile information.

**Endpoint:** `PATCH /v1/me`
**Auth:** Bearer required

#### Request Body
```json
{
  "profile": {
    "nickname": "neo2"
  }
}
```

#### Response (200 OK)
```json
{
  "data": {
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "profile": {
      "nickname": "neo2"
    }
  },
  "request_id": "..."
}
```

---

### 1.8 Delete User Account

Soft delete the authenticated user's account.

**Endpoint:** `DELETE /v1/me`
**Auth:** Bearer required

#### Response (204 No Content)
No response body.

---

## 2. Wallet

### 2.1 Credit Points

Add points to a user's wallet.

**Endpoint:** `POST /v1/wallet/credits`
**Auth:** Bearer required (server-to-server or app backend)
**Headers:** `X-Idempotency-Key` **required**

#### Request Body
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "amount": 100,
  "reason": "ATTENDANCE",
  "ref_type": "attendance",
  "ref_id": "attendance:2025-12-28:user:550e8400-e29b-41d4-a716-446655440000",
  "expires_at": null
}
```

#### Field Descriptions
- `user_id` - Target user UUID
- `amount` - Points to credit (positive number)
- `reason` - Reason code (ATTENDANCE, ADMIN_ADJUST, REFUND, REFERRAL)
- `ref_type` - Reference type for traceability
- `ref_id` - Reference ID for traceability
- `expires_at` - Optional expiry timestamp (null = never expires)

#### Response (200 OK)
```json
{
  "data": {
    "status": "SUCCEEDED",
    "ledger_ids": ["ledger-uuid"],
    "lot_id": "lot-uuid",
    "balance_after": 1300
  },
  "request_id": "..."
}
```

#### Error Responses
- **400 INVALID_ARGUMENT** - Invalid request parameters
- **409 IDEMPOTENCY_KEY_REUSE** - Same key with different request body

---

### 2.2 Debit Points

Deduct points from a user's wallet (FIFO consumption).

**Endpoint:** `POST /v1/wallet/debits`
**Auth:** Bearer required
**Headers:** `X-Idempotency-Key` **required**

#### Request Body
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "amount": 250,
  "reason": "BUY_ITEM",
  "ref_type": "order",
  "ref_id": "order:order-uuid"
}
```

#### Response (200 OK)
```json
{
  "data": {
    "status": "SUCCEEDED",
    "ledger_ids": ["ledger-uuid-1", "ledger-uuid-2"],
    "consumed": [
      {
        "lot_id": "lot-uuid-1",
        "amount": 200
      },
      {
        "lot_id": "lot-uuid-2",
        "amount": 50
      }
    ],
    "balance_after": 1050
  },
  "request_id": "..."
}
```

#### Error Responses
- **409 INSUFFICIENT_FUNDS** - Not enough points available
```json
{
  "error": {
    "code": "INSUFFICIENT_FUNDS",
    "message": "Not enough points.",
    "details": {
      "required": 250,
      "balance": 120
    }
  },
  "request_id": "..."
}
```

---

### 2.3 Get Wallet Balance

Retrieve a user's current point balance.

**Endpoint:** `GET /v1/wallet/balance?user_id={userId}`
**Auth:** Bearer required

#### Response (200 OK)
```json
{
  "data": {
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "balance": 1050
  },
  "request_id": "..."
}
```

---

### 2.4 Get Wallet Ledger

Retrieve transaction history with cursor-based pagination.

**Endpoint:** `GET /v1/wallet/ledger?user_id={userId}&limit=50&cursor={cursor}`
**Auth:** Bearer required

#### Query Parameters
- `user_id` - User UUID
- `limit` - Number of records (default: 50, max: 100)
- `cursor` - Opaque cursor for pagination (optional)

#### Response (200 OK)
```json
{
  "data": [
    {
      "ledger_id": "ledger-uuid",
      "direction": "DEBIT",
      "amount": 50,
      "lot_id": "lot-uuid",
      "reason": "BUY_ITEM",
      "ref_type": "order",
      "ref_id": "order:order-uuid",
      "created_at": "2025-12-28T12:00:00Z"
    }
  ],
  "next_cursor": "opaque_cursor_string",
  "request_id": "..."
}
```

---

## 3. Billing

### 3.1 List Products (Public)

Retrieve available products.

**Endpoint:** `GET /v1/products`
**Auth:** Optional (service policy-dependent)

#### Response (200 OK)
```json
{
  "data": [
    {
      "product_id": "product-uuid",
      "type": "DIGITAL",
      "name": "Premium Hint Pack",
      "is_active": true
    }
  ],
  "request_id": "..."
}
```

---

### 3.2 Create Product (Admin)

Create a new product.

**Endpoint:** `POST /v1/admin/products`
**Auth:** Bearer required
**Role:** `APP_ADMIN`

#### Request Body
```json
{
  "type": "DIGITAL",
  "name": "Premium Hint Pack",
  "metadata": {
    "desc": "50 hints for puzzle solving"
  },
  "is_active": true
}
```

#### Product Types
- `DIGITAL` - Digital goods
- `SUBSCRIPTION` - Recurring subscription
- `PHYSICAL` - Physical goods (placeholder)

#### Response (201 Created)
```json
{
  "data": {
    "product_id": "product-uuid"
  },
  "request_id": "..."
}
```

---

### 3.3 Update Product (Admin)

Update product details.

**Endpoint:** `PATCH /v1/admin/products/{productId}`
**Auth:** Bearer required
**Role:** `APP_ADMIN`

#### Request Body
```json
{
  "name": "Premium Hint Pack v2",
  "is_active": true,
  "metadata": {
    "desc": "Updated description"
  }
}
```

#### Response (200 OK)
```json
{
  "data": {
    "product_id": "product-uuid"
  },
  "request_id": "..."
}
```

> **Note:** For MVP, products should include a default price. Implement separate price management API for production.

---

### 3.4 Create Order (Point Purchase)

Create an order using points as payment method.

**Endpoint:** `POST /v1/orders`
**Auth:** Bearer required
**Headers:** `X-Idempotency-Key` **required**

#### Functionality
1. Creates order record
2. Debits wallet in same transaction
3. Sets order status to `PAID`

#### Request Body
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "price_id": "price-uuid",
  "quantity": 1,
  "ref_type": "order",
  "ref_id": "client_order:client-uuid",
  "reason": "BUY_ITEM"
}
```

#### Response (201 Created)
```json
{
  "data": {
    "order_id": "order-uuid",
    "status": "PAID",
    "total_amount": 250,
    "balance_after": 1050
  },
  "request_id": "..."
}
```

#### Error Responses
- **400 INVALID_ARGUMENT** - Invalid price_id or inactive price
- **409 INSUFFICIENT_FUNDS** - Not enough points
- **409 IDEMPOTENCY_KEY_REUSE** - Duplicate request with different body

---

### 3.5 Refund Order

Refund a completed order (full refund only for MVP).

**Endpoint:** `POST /v1/orders/{orderId}/refund`
**Auth:** Bearer required
**Role:** `APP_ADMIN` (or user for own orders)
**Headers:** `X-Idempotency-Key` **recommended**

#### Request Body
```json
{
  "reason": "REFUND",
  "ref_type": "order",
  "ref_id": "order:order-uuid"
}
```

#### Response (200 OK)
```json
{
  "data": {
    "order_id": "order-uuid",
    "status": "REFUNDED",
    "refunded_amount": 250,
    "balance_after": 1300
  },
  "request_id": "..."
}
```

---

## 4. Jobs

### 4.1 Create Callback Job

Register a failed operation for retry with HTTP callback.

**Endpoint:** `POST /v1/jobs/callback-http`
**Auth:** Bearer required (server-to-server) or app-specific key
**Headers:** `X-Idempotency-Key` **required**

#### Functionality
- Server validates path against allowlist
- Combines with base_url from app configuration
- Schedules retry with exponential backoff

#### Request Body
```json
{
  "method": "POST",
  "path": "/internal/settle/ad",
  "body": {
    "batch_id": "2025-12-28T12:00Z"
  },
  "timeout_ms": 5000,
  "expected_statuses": [200, 204],
  "next_retry_at": "2025-12-28T12:10:00Z"
}
```

#### Field Descriptions
- `method` - HTTP method (POST, PUT, PATCH)
- `path` - Path (must be in app's allowlist)
- `body` - Request payload
- `timeout_ms` - Request timeout
- `expected_statuses` - List of success status codes
- `next_retry_at` - When to attempt first execution

#### Response (201 Created)
```json
{
  "data": {
    "job_id": "job-uuid",
    "type": "CALLBACK_HTTP",
    "status": "PENDING",
    "next_retry_at": "2025-12-28T12:10:00Z"
  },
  "request_id": "..."
}
```

#### Error Responses
- **403 FORBIDDEN** - Path not in allowlist
- **409 IDEMPOTENCY_KEY_REUSE** - Duplicate job creation

---

### 4.2 Run Due Jobs (Internal)

Internal endpoint for scheduler to execute pending jobs.

**Endpoint:** `POST /internal/v1/jobs/run`
**Auth:** Internal authentication (X-Internal-Token or AWS IAM)

#### Functionality
1. Select due jobs using `FOR UPDATE SKIP LOCKED`
2. Execute each job
3. Update status based on result
4. Apply exponential backoff for retries

#### Request Body
```json
{
  "limit": 100
}
```

#### Response (200 OK)
```json
{
  "data": {
    "picked": 12,
    "succeeded": 10,
    "failed": 2,
    "dead": 0
  },
  "request_id": "..."
}
```

---

## 5. Admin

### 5.1 Suspend User

Suspend a user account.

**Endpoint:** `POST /v1/admin/users/{userId}/suspend`
**Auth:** Bearer required
**Role:** `APP_ADMIN`

#### Request Body
```json
{
  "reason": "ABUSE"
}
```

#### Response (200 OK)
```json
{
  "data": {
    "status": "SUSPENDED"
  },
  "request_id": "..."
}
```

---

### 5.2 Unsuspend User

Reactivate a suspended user account.

**Endpoint:** `POST /v1/admin/users/{userId}/unsuspend`
**Auth:** Bearer required
**Role:** `APP_ADMIN`

#### Response (200 OK)
```json
{
  "data": {
    "status": "ACTIVE"
  },
  "request_id": "..."
}
```

---

### 5.3 Adjust Wallet Balance

Manually adjust a user's wallet balance (requires audit logging).

**Endpoint:** `POST /v1/admin/wallet/adjust`
**Auth:** Bearer required
**Role:** `APP_ADMIN`
**Headers:** `X-Idempotency-Key` **recommended**

#### Request Body
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "delta": 500,
  "reason": "ADMIN_ADJUST",
  "ref_type": "admin",
  "ref_id": "ticket:CS-123"
}
```

#### Field Descriptions
- `delta` - Amount to adjust (positive = credit, negative = debit)
- All adjustments are logged to `admin_audit_log`

#### Response (200 OK)
```json
{
  "data": {
    "status": "SUCCEEDED",
    "balance_after": 1800
  },
  "request_id": "..."
}
```

---

### 5.4 List Jobs

Retrieve jobs with filtering and pagination.

**Endpoint:** `GET /v1/admin/jobs?status={status}&limit=50&cursor={cursor}`
**Auth:** Bearer required
**Role:** `APP_ADMIN`

#### Query Parameters
- `status` - Filter by status (PENDING, RETRYING, FAILED, DEAD, SUCCEEDED)
- `limit` - Records per page (default: 50)
- `cursor` - Pagination cursor

#### Response (200 OK)
```json
{
  "data": [
    {
      "job_id": "job-uuid",
      "type": "CALLBACK_HTTP",
      "status": "FAILED",
      "next_retry_at": "2025-12-28T13:00:00Z"
    }
  ],
  "next_cursor": "opaque_cursor",
  "request_id": "..."
}
```

---

### 5.5 Retry Job

Manually retry a failed job.

**Endpoint:** `POST /v1/admin/jobs/{jobId}/retry`
**Auth:** Bearer required
**Role:** `APP_ADMIN`

#### Response (200 OK)
```json
{
  "data": {
    "status": "PENDING"
  },
  "request_id": "..."
}
```

---

### 5.6 Move Job to Dead Letter Queue

Mark a job as permanently failed.

**Endpoint:** `POST /v1/admin/jobs/{jobId}/deadletter`
**Auth:** Bearer required
**Role:** `APP_ADMIN`

#### Response (200 OK)
```json
{
  "data": {
    "status": "DEAD"
  },
  "request_id": "..."
}
```

---

## 6. Platform

Platform APIs for super admin management of apps (tenants).

### 6.1 List Apps

Retrieve all registered apps.

**Endpoint:** `GET /v1/platform/apps`
**Auth:** Bearer required
**Role:** `PLATFORM_SUPER_ADMIN`

#### Response (200 OK)
```json
{
  "data": [
    {
      "app_id": "app-uuid",
      "name": "AppA",
      "status": "ACTIVE",
      "callback_base_url": "https://api.appA.com"
    }
  ],
  "request_id": "..."
}
```

---

### 6.2 Create App

Register a new app (tenant).

**Endpoint:** `POST /v1/platform/apps`
**Auth:** Bearer required
**Role:** `PLATFORM_SUPER_ADMIN`

#### Request Body
```json
{
  "name": "AppA",
  "hosts": ["api.appA.com"],
  "callback_base_url": "https://api.appA.com",
  "callback_allowlist_paths": [
    "/internal/settle/ad",
    "/internal/settle/prediction"
  ]
}
```

#### Response (201 Created)
```json
{
  "data": {
    "app_id": "app-uuid",
    "callback_secret_ref": "arn:aws:secretsmanager:..."
  },
  "request_id": "..."
}
```

---

### 6.3 Update App Configuration

Update app settings.

**Endpoint:** `PATCH /v1/platform/apps/{appId}`
**Auth:** Bearer required
**Role:** `PLATFORM_SUPER_ADMIN`

#### Request Body
```json
{
  "callback_base_url": "https://api.appA.com",
  "callback_allowlist_paths": [
    "/internal/settle/ad"
  ]
}
```

#### Response (200 OK)
```json
{
  "data": {
    "app_id": "app-uuid"
  },
  "request_id": "..."
}
```

---

## Error Codes

| Code | HTTP Status | Description |
|------|------------|-------------|
| `INVALID_ARGUMENT` | 400 | Invalid request parameters |
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `INVALID_SIGNATURE` | 401 | HMAC signature verification failed |
| `SIGNATURE_EXPIRED` | 401 | Timestamp outside acceptable range |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `IDEMPOTENCY_KEY_REUSE` | 409 | Same key with different request |
| `IDEMPOTENCY_IN_PROGRESS` | 409 | Request is currently being processed |
| `INSUFFICIENT_FUNDS` | 409 | Not enough points in wallet |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_RETRYABLE` | 503 | Temporary server error, retry later |

---

## Idempotency

### Overview
All financial operations (wallet, orders, refunds, jobs) require idempotency keys to prevent duplicate transactions.

### Rules

1. **Header Required**: `X-Idempotency-Key: {unique-key}`
2. **Key Scope**: One key per client event
3. **Server Behavior**:
   - Same key + same request → returns cached response
   - Same key + different request → returns `IDEMPOTENCY_KEY_REUSE` (409)

### Request Hash Calculation

**Canonical JSON Standard (JCS-like)**:
- Sort object keys alphabetically
- Remove whitespace/newlines (minified)
- UTF-8 encoding
- SHA-256 hash of result

**Example**:
```javascript
// Original
{ "amount": 100, "userId": "abc" }

// Canonical
{"amount":100,"userId":"abc"}

// Hash
SHA256(canonical) → "9f2c3d4e..."
```

### Implementation Example

```http
POST /v1/wallet/credits
X-Idempotency-Key: attendance:2025-12-28:user:abc
Content-Type: application/json

{
  "user_id": "abc",
  "amount": 100,
  "reason": "ATTENDANCE"
}
```

**First Request**: Creates transaction, returns 200
**Retry (same body)**: Returns cached 200
**Retry (different body)**: Returns 409 IDEMPOTENCY_KEY_REUSE

---

## HMAC Signature Verification

### Overview
Common API signs callback requests to app services using HMAC-SHA256 to prevent forgery.

### Required Headers (Common → App)

```http
X-App-Id: {app_id}
X-Job-Id: {job_id}
X-Idempotency-Key: {idempotency_key}
X-Timestamp: {unix_epoch_seconds}
X-Signature: {base64(hmac_sha256(secret, canonical_string))}
```

### Canonical String v1

**Format**:
```
v1
app_id:{X-App-Id}
job_id:{X-Job-Id}
idempotency_key:{X-Idempotency-Key}
timestamp:{X-Timestamp}
method:{METHOD}
path:{PATH}
query:{SORTED_QUERYSTRING}
body_sha256:{BODY_SHA256_HEX}
content_type:{CONTENT_TYPE}
```

**Example**:
```
v1
app_id:8b0f1234-5678-90ab-cdef-1234567890ab
job_id:6f1a9876-5432-10fe-dcba-0987654321fe
idempotency_key:ad_settle:2025-12-28T12:00Z
timestamp:1735387200
method:POST
path:/internal/settle/ad
query:
body_sha256:9f2c3d4e5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d
content_type:application/json
```

### Body SHA-256 Calculation

1. Convert request body to **canonical JSON** (sorted keys, minified)
2. Calculate SHA-256 hash
3. Encode as hexadecimal

### Signature Generation

```typescript
const secret = getSecretFromManager(app.callback_secret_ref);
const canonicalString = buildCanonicalString(...);
const signature = createHmac('sha256', secret)
  .update(canonicalString)
  .digest('base64');
```

### App-Side Verification

1. **Timestamp Check**: `|now - timestamp| <= 300` seconds (5 minutes)
2. **Signature Match**: Rebuild canonical string and verify HMAC
3. **Idempotency**: Check if key already processed

### Error Responses (App → Common)

- **401 INVALID_SIGNATURE** - Signature verification failed
- **401 SIGNATURE_EXPIRED** - Timestamp too old
- **200/204** - Already processed (idempotent response)

---

## Jobs Retry & Backoff

### Configuration

- **Max Retries**: 10
- **Backoff Formula**: `min(2^retry_count * 60 seconds, 24 hours)`
- **Next Retry**: `now + delay`

### Retry Policy

| Error Type | Action |
|------------|--------|
| Network error | Retry |
| Timeout | Retry |
| 5xx status | Retry |
| 4xx status | DEAD (no retry) |
| Max retries reached | DEAD |

### Example Retry Schedule

| Attempt | Delay | Next Retry After |
|---------|-------|------------------|
| 1 | 1 min | T+1min |
| 2 | 2 min | T+3min |
| 3 | 4 min | T+7min |
| 4 | 8 min | T+15min |
| 5 | 16 min | T+31min |
| 6 | 32 min | T+63min |
| 10 | 24 hours (cap) | T+24h |

---

## Appendix: Future Endpoints (Placeholder)

### Subscriptions (PG Integration Required)

- `POST /v1/subscriptions/start` - Start subscription
- `POST /v1/subscriptions/{id}/cancel` - Cancel subscription

### Payment Gateway

- `POST /v1/billing/payments/session` - Create payment session
- `POST /v1/billing/payments/confirm` - Confirm payment

> These endpoints will be implemented using AWS Step Functions Saga pattern after PG selection.

---

**Document Version**: 1.0
**Last Updated**: 2025-12-28
**Architecture Reference**: [architecture.md](./architecture.md)
