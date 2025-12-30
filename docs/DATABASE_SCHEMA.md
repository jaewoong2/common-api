# Database Schema

## Overview

- **Database**: PostgreSQL
- **Schema**: `common` (multi-tenant isolation via app_id)
- **ORM**: TypeORM with `synchronize: true` (local development only)
- **Common Fields**: All entities extend `BaseEntity` with:
  - `id` (uuid, primary key)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

## Entity Summary

| Entity | Table Name | Purpose | Key Relations | File Path |
|--------|------------|---------|---------------|-----------|
| AppEntity | apps | Tenant application configuration | - | [src/database/entities/app.entity.ts](../src/database/entities/app.entity.ts) |
| UserEntity | users | User accounts (OAuth/Magic Link only) | app_id → apps | [src/database/entities/user.entity.ts](../src/database/entities/user.entity.ts) |
| RefreshTokenEntity | refresh_tokens | Session refresh tokens | user_id → users | [src/database/entities/refresh-token.entity.ts](../src/database/entities/refresh-token.entity.ts) |
| MagicLinkTokenEntity | magic_link_tokens | Magic link tokens & OAuth authorization codes | app_id → apps, user_id → users | [src/database/entities/magic-link-token.entity.ts](../src/database/entities/magic-link-token.entity.ts) |
| OAuthProviderEntity | oauth_providers | OAuth account linking (Google, Kakao) | user_id → users | [src/database/entities/oauth-provider.entity.ts](../src/database/entities/oauth-provider.entity.ts) |
| WalletLotEntity | wallet_lots | Point batches with FIFO consumption | app_id → apps, user_id → users | [src/database/entities/wallet-lot.entity.ts](../src/database/entities/wallet-lot.entity.ts) |
| WalletLedgerEntity | wallet_ledger | Append-only transaction log | app_id → apps, user_id → users, lot_id → wallet_lots | [src/database/entities/wallet-ledger.entity.ts](../src/database/entities/wallet-ledger.entity.ts) |
| ProductEntity | products | Purchasable items/services | app_id → apps | [src/database/entities/product.entity.ts](../src/database/entities/product.entity.ts) |
| OrderEntity | orders | Purchase transactions using points | app_id → apps, user_id → users, product_id → products | [src/database/entities/order.entity.ts](../src/database/entities/order.entity.ts) |
| JobEntity | jobs | Unified job queue system (SQS + DB + EventBridge Scheduler) | app_id → apps | [src/database/entities/job.entity.ts](../src/database/entities/job.entity.ts) |
| IdempotencyKeyEntity | idempotency_keys | Idempotency tracking for financial ops | app_id → apps | [src/database/entities/idempotency-key.entity.ts](../src/database/entities/idempotency-key.entity.ts) |

---

## 1. apps

**Purpose**: Tenant application configuration

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| name | varchar(255) | No | - | App display name |
| status | varchar(20) | No | 'ACTIVE' | App status: ACTIVE, SUSPENDED |
| callback_base_url | varchar(512) | Yes | null | Base URL for job callbacks |
| callback_allowlist_paths | jsonb | Yes | null | Allowed callback paths (whitelist) |
| callback_secret_ref | varchar(512) | Yes | null | Reference to HMAC secret (AWS Secrets Manager ARN) |
| allowed_redirect_domains | jsonb | Yes | '[]' | Allowed OAuth redirect domains for Authorization Code Flow |
| created_at | timestamptz | No | now() | Creation timestamp |
| updated_at | timestamptz | No | now() | Last update timestamp |

**Indices**: None (primary key only)

---

## 2. users

**Purpose**: User accounts (OAuth and Magic Link only - NO passwords)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| app_id | uuid | No | - | FK to apps (tenant) |
| email | varchar(255) | No | - | User email (unique per app) |
| status | enum | No | 'ACTIVE' | ACTIVE, SUSPENDED, DELETED |
| profile | jsonb | Yes | null | User profile data (nickname, avatar, etc.) |
| role | enum | No | 'USER' | USER, APP_OPERATOR, APP_ADMIN, PLATFORM_SUPER_ADMIN |
| created_at | timestamptz | No | now() | Creation timestamp |
| updated_at | timestamptz | No | now() | Last update timestamp |

**Indices**:
- UNIQUE(app_id, email) - Email unique per app
- INDEX(status)
- INDEX(role)

**Key Notes**:
- **NO password field** - Authentication via OAuth (Google, Kakao) and Magic Link only
- email is unique within each app (not globally)

---

## 3. refresh_tokens

**Purpose**: JWT refresh tokens for session management

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| user_id | uuid | No | - | FK to users |
| token_hash | varchar(255) | No | - | SHA-256 hash of refresh token |
| expires_at | timestamptz | No | - | Token expiration time |
| revoked_at | timestamptz | Yes | null | Revocation timestamp (NULL = valid) |
| created_at | timestamptz | No | now() | Creation timestamp |
| updated_at | timestamptz | No | now() | Last update timestamp |

**Indices**:
- UNIQUE(token_hash)
- INDEX(user_id)
- INDEX(expires_at)

**Key Notes**:
- Tokens are hashed (SHA-256) before storage for security
- Never store plain refresh tokens in database

---

## 4. oauth_providers

**Purpose**: OAuth account linking for Google and Kakao authentication

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| app_id | uuid | No | - | FK to apps |
| user_id | uuid | No | - | FK to users |
| provider | varchar(50) | No | - | OAuth provider (google, kakao) |
| provider_user_id | varchar(255) | No | - | User ID from OAuth provider |
| email | varchar(255) | Yes | null | Email from OAuth provider |
| profile | jsonb | Yes | null | Full OAuth profile data |
| created_at | timestamptz | No | now() | Creation timestamp |
| updated_at | timestamptz | No | now() | Last update timestamp |

**Indices**:
- UNIQUE(user_id, provider) - One account per provider per user
- UNIQUE(app_id, provider, provider_user_id) - Enforce provider user uniqueness per app
- INDEX(provider, provider_user_id)

**Key Notes**:
- Links user accounts to external OAuth providers
- Supports multiple providers per user (Google + Kakao)
- profile field stores raw OAuth response for debugging

---

## 5. magic_link_tokens

**Purpose**: Unified storage for magic link tokens and OAuth authorization codes

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| app_id | uuid | No | - | FK to apps |
| email | varchar(255) | No | - | Email for magic link (empty for OAuth) |
| token_hash | varchar(255) | No | - | SHA-256 hash of token/code |
| verification_code | varchar(6) | No | - | 6-digit code for magic link (empty for OAuth) |
| redirect_url | text | Yes | null | Redirect URL after verification |
| provider | varchar(50) | Yes | 'magic-link' | Token type: magic-link, google, kakao |
| user_id | uuid | Yes | null | FK to users (for OAuth codes) |
| expires_at | timestamptz | No | - | Token expiration (15 min for magic link, 5 min for OAuth) |
| is_used | boolean | No | false | Whether token has been used |
| used_at | timestamptz | Yes | null | Timestamp when token was used |
| created_at | timestamptz | No | now() | Creation timestamp |
| updated_at | timestamptz | No | now() | Last update timestamp |

**Indices**:
- UNIQUE(token_hash)
- INDEX(email, app_id)
- INDEX(expires_at)
- INDEX(provider)
- INDEX(user_id)

**Key Notes**:
- **Unified table**: Stores both magic link tokens and OAuth authorization codes
- Magic link: Uses email + verification_code, provider = 'magic-link'
- OAuth codes: Uses user_id + redirect_url, provider = 'google' or 'kakao'
- One-time use only (is_used flag)
- Authorization Code Flow pattern for OAuth security

---

## 5. wallet_lots

**Purpose**: Point batches with FIFO consumption and optional expiration

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| app_id | uuid | No | - | FK to apps |
| user_id | uuid | No | - | FK to users (owner) |
| initial_amount | bigint | No | - | Initial points when lot created |
| remaining_amount | bigint | No | - | Remaining points (decreases with debits) |
| expires_at | timestamptz | Yes | **null** | Expiration timestamp (NULL = no expiration) |
| created_at | timestamptz | No | now() | Creation timestamp |
| updated_at | timestamptz | No | now() | Last update timestamp |

**Indices**:
- INDEX(app_id, user_id)
- INDEX(expires_at)
- INDEX(remaining_amount)

**Key Notes**:
- FIFO consumption: Oldest lots (by created_at) are consumed first
- **Default expires_at is NULL** (no expiration unless explicitly set)
- Use pessimistic locking (FOR UPDATE) when deducting points

---

## 6. wallet_ledger

**Purpose**: Append-only transaction log for all wallet operations

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| app_id | uuid | No | - | FK to apps |
| user_id | uuid | No | - | FK to users |
| lot_id | uuid | Yes | null | FK to wallet_lots (NULL for credits) |
| direction | enum | No | - | CREDIT or DEBIT |
| amount | bigint | No | - | Transaction amount |
| reason | enum | No | - | ATTENDANCE, ADMIN_ADJUST, REFUND, BUY_ITEM, etc. |
| ref_type | varchar(100) | No | - | Reference type (e.g., "order", "attendance") |
| ref_id | varchar(255) | No | - | Reference ID (e.g., "order:123") |
| balance_snapshot | bigint | No | - | User's total balance after this transaction |
| created_at | timestamptz | No | now() | Creation timestamp |
| updated_at | timestamptz | No | now() | Last update timestamp |

**Indices**:
- INDEX(app_id, user_id, created_at DESC) - For transaction history
- INDEX(ref_type, ref_id) - For traceability
- INDEX(direction)

**Key Notes**:
- **Append-only**: Never update or delete entries
- balance_snapshot for auditing and balance verification
- lot_id is NULL for credit transactions (new lot created)

---

## 7. products

**Purpose**: Purchasable items and services

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| app_id | uuid | No | - | FK to apps |
| type | enum | No | - | DIGITAL, SUBSCRIPTION, PHYSICAL |
| name | varchar(255) | No | - | Product name |
| default_price | bigint | No | - | Default price in points |
| metadata | jsonb | Yes | null | Additional data (description, images, features) |
| is_active | boolean | No | true | Whether product is available for purchase |
| created_at | timestamptz | No | now() | Creation timestamp |
| updated_at | timestamptz | No | now() | Last update timestamp |

**Indices**:
- INDEX(app_id, is_active)
- INDEX(type)

**Key Notes**:
- For MVP: single default_price per product
- Separate price management can be added later

---

## 8. orders

**Purpose**: Purchase transactions using wallet points

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| app_id | uuid | No | - | FK to apps |
| user_id | uuid | No | - | FK to users (buyer) |
| product_id | uuid | No | - | FK to products |
| quantity | integer | No | 1 | Quantity purchased |
| total_amount | bigint | No | - | Total charged (quantity * price at time) |
| status | enum | No | 'PENDING' | PENDING, PAID, REFUNDED |
| ref_type | varchar(100) | No | - | Reference type for traceability |
| ref_id | varchar(255) | No | - | Reference ID for traceability |
| created_at | timestamptz | No | now() | Creation timestamp |
| updated_at | timestamptz | No | now() | Last update timestamp |

**Indices**:
- INDEX(app_id, user_id)
- INDEX(status)
- INDEX(created_at)

**Key Notes**:
- Order creation and wallet debit happen in single database transaction
- Refunds credit wallet and update status to REFUNDED

---

## 9. jobs

**Purpose**: Unified job queue system (SQS, DB, EventBridge Scheduler)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| app_id | uuid | No | - | FK to apps |
| **execution_type** | varchar(50) | Yes | null | **[NEW]** Execution type: lambda-invoke, lambda-url, rest-api, schedule |
| **lambda_proxy_message** | jsonb | Yes | null | **[NEW]** AWS Lambda proxy event structure (body, path, httpMethod, headers, requestContext) |
| **execution_config** | jsonb | Yes | null | **[NEW]** Type-specific config (functionName, baseUrl, scheduleExpression, targetJob) |
| **message_group_id** | varchar(100) | Yes | null | **[NEW]** SQS FIFO MessageGroupId (same as execution_type) |
| **idempotency_key** | varchar(255) | Yes | null | **[NEW]** Deduplication key for SQS and job creation |
| **schedule_arn** | varchar(255) | Yes | null | **[NEW]** EventBridge Schedule ARN for cleanup |
| type | enum | Yes | null | **[DEPRECATED]** CALLBACK_HTTP, REWARD_GRANT (use execution_type) |
| payload | jsonb | Yes | null | **[DEPRECATED]** Legacy job data (use lambda_proxy_message) |
| status | enum | No | 'PENDING' | PENDING, RETRYING, SUCCEEDED, FAILED, DEAD |
| retry_count | integer | No | 0 | Current retry attempt count |
| max_retries | integer | No | 10 | Maximum retries allowed |
| next_retry_at | timestamptz | Yes | null | Next scheduled execution (NULL = not scheduled) |
| last_error | text | Yes | null | Last error message for debugging |
| created_at | timestamptz | No | now() | Creation timestamp |
| updated_at | timestamptz | No | now() | Last update timestamp |

**Indices**:
- INDEX(status, next_retry_at) - For due jobs query (PENDING/RETRYING)
- INDEX(execution_type) - For execution type filtering
- INDEX(idempotency_key) WHERE idempotency_key IS NOT NULL - For deduplication
- INDEX(schedule_arn) WHERE schedule_arn IS NOT NULL - For schedule cleanup
- INDEX(app_id, status, next_retry_at) - Legacy index (kept for backward compatibility)
- INDEX(type) - Legacy index
- INDEX(status) - Legacy index

**Key Notes**:
- **Hybrid Architecture**: SQS for active jobs, DB for failed/retrying jobs, EventBridge Scheduler for delayed execution
- **4 Execution Types**: lambda-invoke (AWS SDK), lambda-url (HTTP + SigV4), rest-api (HTTP), schedule (EventBridge wrapper)
- **Message Format**: LambdaProxyMessage (AWS Lambda proxy event) + ExecutionConfig (type-specific params) + Metadata (tracking)
- **Exponential Backoff**: `min(2^retry_count * 60s, 24h)`
- **Status Transitions**: SQS failure → DB save with RETRYING, DB success → SUCCEEDED, Max retries → FAILED
- **Legacy Compatibility**: Old columns (type, payload) kept for backward compatibility but nullable
- **SQS FIFO Queue**: jobs-main.fifo with MessageGroupId routing by execution_type
- **EventBridge Cron**: Poll SQS every 1 min, Run DB jobs every 5 min

---

## 10. idempotency_keys

**Purpose**: Idempotency tracking for financial operations

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| app_id | uuid | No | - | FK to apps |
| idempotency_key | varchar(255) | No | - | Client-provided idempotency key |
| request_hash | varchar(255) | No | - | SHA-256 hash of canonical request body |
| response_body | jsonb | No | - | Cached response for duplicate requests |
| http_status | integer | No | - | HTTP status code of original response |
| created_at | timestamptz | No | now() | Creation timestamp |
| updated_at | timestamptz | No | now() | Last update timestamp |

**Indices**:
- UNIQUE(app_id, idempotency_key)
- INDEX(created_at)

**Key Notes**:
- **Permanent storage** (no auto-deletion) for audit trail
- request_hash prevents key reuse with different request bodies
- Returns cached response if idempotency key matches with same request hash

---

## Multi-Tenancy Strategy

All tenant-specific tables include `app_id` (FK to apps):
- users
- wallet_lots
- wallet_ledger
- products
- orders
- jobs
- idempotency_keys
- magic_link_tokens

**Tenant Resolution**: Via Host header → app_id (handled by TenantMiddleware)

**Schema Isolation**: All tables in `common` schema (logical isolation via app_id, not schema-level)

---

## Migration Strategy

**Current**: Using TypeORM `synchronize: true` (local development only)

**Production**: Will use migrations with:
```bash
npm run migration:generate -- src/migrations/MigrationName
npm run migration:run
```

**Important**: NEVER use `synchronize: true` in production!
