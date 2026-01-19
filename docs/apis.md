# Common API Platform - API Reference v1

## Table of Contents

1. [Overview](#overview)
2. [Common Specifications](#common-specifications)
3. [Response Object Schemas](#response-object-schemas)
4. [Health](#1-health)
5. [Authentication & Identity](#2-authentication--identity)
6. [Users](#3-users)
7. [Wallet](#4-wallet)
8. [Billing](#5-billing)
9. [Jobs](#6-jobs)
10. [Admin](#7-admin)
11. [Platform](#8-platform)
12. [Error Handling](#error-handling)
13. [Idempotency](#idempotency)

---

## Overview

### Versioning (버저닝)

- 모든 퍼블릭 API는 경로에 `/v1` 버전을 포함합니다.
- 내부 시스템 전용 API는 `/internal/v1` 경로를 사용합니다.
- `/health` 는 버전 미적용 엔드포인트입니다.

### Base URLs

| Environment | URL Pattern | Description |
|------------|-------------|-------------|
| App Tenant | `https://api.{appId}.com` | 테넌트(App)별 API 도메인 |
| Platform | `https://platform.api.your.com` | 플랫폼 슈퍼 관리자 전용 도메인 |

> 실제 appId 해석 방식은 현재 Host 서브도메인 기반입니다. (아래 Multi-Tenancy 참고)

### Multi-Tenancy

- **Host 기반 해석**: `TenantMiddleware` 가 `Host` 헤더의 첫 서브도메인을 `appId` 로 사용합니다.
  - 예: `api.my-app.com` → `appId = "api"`
- **예외/오버라이드**:
  - OAuth 시작: `appId` 를 query로 전달 가능 (없으면 DEFAULT_APP_ID)
  - Job 콜백 생성, Admin 일부: `x-app-id` 헤더 사용
  - Unified Job 생성: `appId` 를 body로 전달 가능 (없으면 DEFAULT_APP_ID)

### Authentication

- 기본적으로 모든 엔드포인트는 JWT 인증이 필요합니다.
- `@Public` 데코레이터가 붙은 엔드포인트만 인증 없이 접근 가능합니다.
- JWT 헤더는 아래 두 가지 중 하나를 사용합니다.

```
Authorization: Bearer <jwt_token>
JWT_AUTH: Bearer <jwt_token>
```

---

## Common Specifications

### Request Headers

| Header | Required | Description |
|--------|----------|-------------|
| `Authorization` | Yes* | Bearer JWT (우선순위 1) |
| `JWT_AUTH` | Yes* | Bearer JWT (대체, 우선순위 2) |
| `Content-Type` | Yes | `application/json` |
| `X-Request-Id` | No | 요청 추적용 ID (없으면 서버가 생성) |
| `x-app-id` | 일부 | Admin/Job 일부 엔드포인트에서 테넌트 지정 |
| `idempotency-key` | 일부 | `/v1/jobs/callback-http` 에서만 사용 (현재 강제 아님) |

\* 인증이 필요한 엔드포인트에 한함

### Success Response Envelope

OAuth start/callback을 제외한 모든 엔드포인트는 아래 공통 응답 래퍼를 사용합니다.

```json
{
  "success": true,
  "data": {
    // payload
  },
  "request_id": "0b8d0e2e-4c6f-4d3a-9f2e-8a7b6c5d4e3f",
  "timestamp": "2026-01-12T00:00:00.000Z"
}
```

### Error Response Envelope

```json
{
  "success": false,
  "error": {
    "code": "BadRequestException",
    "message": "Invalid input",
    "details": {
      "messages": ["email must be an email"]
    }
  },
  "request_id": "0b8d0e2e-4c6f-4d3a-9f2e-8a7b6c5d4e3f",
  "timestamp": "2026-01-12T00:00:00.000Z"
}
```

### OAuth Redirect Responses (예외)

`/v1/auth/oauth/*/start`, `/v1/auth/oauth/*/callback` 는 Passport 리다이렉트 흐름 때문에 **공통 래퍼를 사용하지 않습니다**.
- `start`: 302 Redirect to provider
- `callback`: 302 Redirect to `redirect_uri` with `?code=`

---

## Response Object Schemas

아래 스키마는 엔드포인트 설명에서 참조됩니다.

### UserResponseDto (User Module)

| Field | Type | Meaning |
|-------|------|---------|
| `id` | string (uuid) | 사용자 ID |
| `email` | string | 이메일 |
| `status` | string | 사용자 상태 (`ACTIVE`, `SUSPENDED`, `DELETED`) |
| `role` | string | 역할 (`USER`, `APP_OPERATOR`, `APP_ADMIN`, `PLATFORM_SUPER_ADMIN`) |
| `profile` | object \| null | 프로필 JSON (닉네임, 아바타 등) |
| `createdAt` | string (ISO) | 생성 시각 |
| `updatedAt` | string (ISO) | 수정 시각 |

### Auth User (UserEntity)

Auth 응답의 `user` 필드는 UserEntity 원본을 반환합니다.

| Field | Type | Meaning |
|-------|------|---------|
| `id` | string (uuid) | 사용자 ID |
| `appId` | string (uuid or tenant key) | 테넌트 ID |
| `email` | string | 이메일 |
| `status` | string | 사용자 상태 |
| `role` | string | 역할 |
| `profile` | object \| null | 프로필 JSON |
| `createdAt` | string (ISO) | 생성 시각 |
| `updatedAt` | string (ISO) | 수정 시각 |

### WalletLedgerEntity

| Field | Type | Meaning |
|-------|------|---------|
| `id` | string (uuid) | 레저 ID |
| `appId` | string | 테넌트 ID |
| `userId` | string | 사용자 ID |
| `lotId` | string \| null | LOT ID (credit는 null 가능) |
| `direction` | string | `CREDIT` 또는 `DEBIT` |
| `amount` | string | 금액 (bigint string) |
| `reason` | string | `WalletReason` 값 |
| `refType` | string | 참조 타입 |
| `refId` | string | 참조 ID |
| `balanceSnapshot` | string | 트랜잭션 이후 잔액 |
| `createdAt` | string (ISO) | 생성 시각 |
| `updatedAt` | string (ISO) | 수정 시각 |

### Wallet Balance

| Field | Type | Meaning |
|-------|------|---------|
| `balance` | string | 잔액 (bigint string) |
| `balanceNumber` | number | 잔액 (number 변환 값) |

### ProductEntity

| Field | Type | Meaning |
|-------|------|---------|
| `id` | string (uuid) | 상품 ID |
| `appId` | string | 테넌트 ID |
| `type` | string | `DIGITAL`, `SUBSCRIPTION`, `PHYSICAL` |
| `name` | string | 상품명 |
| `defaultPrice` | string | 기본 가격 (bigint string) |
| `metadata` | object \| null | 부가 정보 |
| `isActive` | boolean | 활성 여부 |
| `createdAt` | string (ISO) | 생성 시각 |
| `updatedAt` | string (ISO) | 수정 시각 |

### OrderEntity

| Field | Type | Meaning |
|-------|------|---------|
| `id` | string (uuid) | 주문 ID |
| `appId` | string | 테넌트 ID |
| `userId` | string | 사용자 ID |
| `productId` | string | 상품 ID |
| `quantity` | number | 수량 |
| `totalAmount` | string | 총액 (bigint string) |
| `status` | string | `PENDING`, `PAID`, `REFUNDED` |
| `refType` | string | 참조 타입 |
| `refId` | string | 참조 ID |
| `product` | ProductEntity | 주문 상품 (relations) |
| `user` | Auth User | 주문 사용자 (relations) |
| `createdAt` | string (ISO) | 생성 시각 |
| `updatedAt` | string (ISO) | 수정 시각 |

### JobEntity

| Field | Type | Meaning |
|-------|------|---------|
| `id` | string (uuid) | Job ID |
| `appId` | string | 테넌트 ID |
| `type` | string \| null | 레거시 타입 (`CALLBACK_HTTP` 등) |
| `executionType` | string \| null | `lambda-invoke`, `lambda-url`, `rest-api`, `schedule` |
| `status` | string | `PENDING`, `RETRYING`, `SUCCEEDED`, `FAILED`, `DEAD` |
| `payload` | object \| null | 레거시 payload (callback) |
| `lambdaProxyMessage` | object \| null | Unified job message (Lambda proxy event) |
| `executionConfig` | object \| null | 실행 설정 (type별) |
| `retryCount` | number | 현재 재시도 횟수 |
| `maxRetries` | number | 최대 재시도 횟수 |
| `nextRetryAt` | string \| null | 다음 실행 시각 |
| `lastError` | string \| null | 마지막 에러 메시지 |
| `scheduleArn` | string \| null | EventBridge Schedule ARN |
| `idempotencyKey` | string \| null | 중복 방지 키 |
| `messageGroupId` | string \| null | FIFO 그룹 ID |
| `createdAt` | string (ISO) | 생성 시각 |
| `updatedAt` | string (ISO) | 수정 시각 |

### AppEntity

| Field | Type | Meaning |
|-------|------|---------|
| `id` | string (uuid) | 앱 ID |
| `name` | string | 앱 이름 |
| `status` | string | `ACTIVE` \| `SUSPENDED` |
| `callbackBaseUrl` | string \| null | 콜백 베이스 URL |
| `callbackAllowlistPaths` | string[] \| null | 허용된 콜백 경로 목록 |
| `callbackSecretRef` | string \| null | HMAC 시크릿 참조 |
| `allowedRedirectDomains` | string[] \| null | OAuth redirect 허용 도메인 |
| `createdAt` | string (ISO) | 생성 시각 |
| `updatedAt` | string (ISO) | 수정 시각 |

---

## 1. Health

### 1.1 Health Check

**Endpoint:** `GET /health`
**Auth:** Public
**사용 시점:** 로드밸런서/모니터링에서 서비스 상태 확인

#### Response (200)
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "timestamp": "2026-01-12T00:00:00.000Z",
    "uptime": 12345.67
  },
  "request_id": "...",
  "timestamp": "..."
}
```

---

## 2. Authentication & Identity

### 2.1 Request Magic Link

**Endpoint:** `POST /v1/auth/magic-link/request`
**Auth:** Public
**사용 시점:** 이메일 기반 로그인 시작 (매직링크/코드 발송)

#### Request Body
```json
{
  "email": "user@example.com",
  "redirect_url": "https://app.example.com/auth/callback"
}
```

- `redirect_url`: 매직링크 클릭 후 리다이렉트될 URL (필수)

#### Response (202)
```json
{
  "success": true,
  "data": {
    "message": "Magic link sent to your email",
    "code": "123456"
  },
  "request_id": "...",
  "timestamp": "..."
}
```

> `code`는 **NODE_ENV != production** 환경에서만 포함됩니다.

---

### 2.2 Verify Magic Link (Legacy)

**Endpoint:** `POST /v1/auth/magic-link/verify`
**Auth:** Public
**사용 시점:** 이메일로 받은 매직링크 토큰 검증 (레거시)

#### Request Body
```json
{
  "token": "magic_link_token"
}
```

#### Response (200)
```json
{
  "success": true,
  "data": {
    "access_token": "jwt_access_token",
    "refresh_token": "opaque_refresh_token",
    "user": {
      "id": "...",
      "appId": "...",
      "email": "user@example.com",
      "status": "ACTIVE",
      "role": "USER",
      "profile": null,
      "createdAt": "...",
      "updatedAt": "..."
    }
  },
  "request_id": "...",
  "timestamp": "..."
}
```

---

### 2.3 Verify Token (Unified)

**Endpoint:** `POST /v1/auth/verify`
**Auth:** Public
**사용 시점:** OAuth 콜백에서 받은 `code` 또는 매직링크 토큰을 통합 검증

#### Request Body
```json
{
  "code": "oauth_or_magic_link_code",
  "redirect_uri": "https://app.example.com/auth/callback",
  "provider": "google"
}
```

- `redirect_uri`: OAuth 흐름에서 사용한 redirect_uri (optional이지만 권장)
- `provider`: `magic-link`, `google`, `kakao` (optional)

#### Response (200)
```json
{
  "success": true,
  "data": {
    "access_token": "jwt_access_token",
    "refresh_token": "opaque_refresh_token",
    "user": { "...UserEntity" }
  },
  "request_id": "...",
  "timestamp": "..."
}
```

#### Notes
- `provider` 값은 현재 검증 로직에서 사용되지 않습니다.

---

### 2.4 OAuth Start

**Endpoint:** `GET /v1/auth/oauth/{provider}/start`
**Auth:** Public
**사용 시점:** OAuth 로그인 시작

#### Query Parameters
- `appId` (string) - 테넌트 식별자
- `redirect_uri` (string) - OAuth 완료 후 리다이렉트될 URL

#### Response
- 302 Redirect to provider 로그인 페이지

> `redirect_uri`가 없으면 callback 단계에서 오류가 발생할 수 있습니다.

---

### 2.5 OAuth Callback

**Endpoint:** `GET /v1/auth/oauth/{provider}/callback`
**Auth:** Public
**사용 시점:** OAuth provider가 호출하는 콜백 URL

#### Response
- 302 Redirect to `redirect_uri?code=...`

> 이 엔드포인트는 JSON 응답을 반환하지 않습니다.

---

### 2.6 Refresh Access Token

**Endpoint:** `POST /v1/auth/refresh`
**Auth:** Public (refresh token 필요)
**사용 시점:** Access token 재발급

#### Request Body
```json
{
  "refresh_token": "opaque_refresh_token"
}
```

#### Response (200)
```json
{
  "success": true,
  "data": {
    "access_token": "jwt_access_token"
  },
  "request_id": "...",
  "timestamp": "..."
}
```

---

### 2.7 Logout

**Endpoint:** `POST /v1/auth/logout`
**Auth:** Public (refresh token 필요)
**사용 시점:** 리프레시 토큰 폐기 (로그아웃)

#### Request Body
```json
{
  "refresh_token": "opaque_refresh_token"
}
```

#### Response (200)
```json
{
  "success": true,
  "data": {
    "message": "Logged out successfully"
  },
  "request_id": "...",
  "timestamp": "..."
}
```

#### Notes
- `refresh_token` 누락 시 서버 오류가 발생할 수 있으므로 필수로 전달하세요.

---

### 2.8 Get Current User

**Endpoint:** `GET /v1/me`
**Auth:** Bearer
**사용 시점:** 로그인된 사용자 정보 조회

#### Response (200)
```json
{
  "success": true,
  "data": { "...UserEntity" },
  "request_id": "...",
  "timestamp": "..."
}
```

---

### 2.9 Update Current User

**Endpoint:** `PATCH /v1/me`
**Auth:** Bearer
**사용 시점:** 내 프로필 정보 수정

#### Request Body
```json
{
  "nickname": "JohnDoe"
}
```

#### Response (200)
```json
{
  "success": true,
  "data": { "...UserEntity" },
  "request_id": "...",
  "timestamp": "..."
}
```

---

### 2.10 Delete Current User

**Endpoint:** `DELETE /v1/me`
**Auth:** Bearer
**사용 시점:** 계정 소프트 삭제

#### Response (204)
```json
{
  "success": true,
  "data": { "message": "Account deleted successfully" },
  "request_id": "...",
  "timestamp": "..."
}
```

> HTTP 204로 설정되어 있어 일부 클라이언트는 바디를 무시할 수 있습니다.

---

## 3. Users

### 3.1 List Users

**Endpoint:** `GET /v1/users`
**Auth:** Bearer + Role `APP_ADMIN`
**사용 시점:** 앱 내 전체 사용자 목록 조회

#### Response (200)
```json
{
  "success": true,
  "data": ["...UserResponseDto"],
  "request_id": "...",
  "timestamp": "..."
}
```

---

### 3.2 Get User by ID

**Endpoint:** `GET /v1/users/{id}`
**Auth:** Bearer + Role `APP_ADMIN` 또는 `USER`
**사용 시점:** 사용자 단건 조회

#### Response (200)
```json
{
  "success": true,
  "data": { "...UserResponseDto" },
  "request_id": "...",
  "timestamp": "..."
}
```

---

### 3.3 Create User

**Endpoint:** `POST /v1/users`
**Auth:** Bearer + Role `APP_ADMIN`
**사용 시점:** 앱 관리자용 사용자 생성

#### Request Body
```json
{
  "email": "user@example.com",
  "profile": { "displayName": "John Doe" },
  "role": "USER"
}
```

#### Response (201)
```json
{
  "success": true,
  "data": { "...UserResponseDto" },
  "request_id": "...",
  "timestamp": "..."
}
```

---

### 3.4 Update User

**Endpoint:** `PATCH /v1/users/{id}`
**Auth:** Bearer + Role `APP_ADMIN`
**사용 시점:** 사용자 상태/역할/프로필 변경

#### Request Body
```json
{
  "profile": { "displayName": "Jane Doe" },
  "status": "ACTIVE",
  "role": "APP_ADMIN"
}
```

#### Response (200)
```json
{
  "success": true,
  "data": { "...UserResponseDto" },
  "request_id": "...",
  "timestamp": "..."
}
```

---

### 3.5 Delete User

**Endpoint:** `DELETE /v1/users/{id}`
**Auth:** Bearer + Role `APP_ADMIN`
**사용 시점:** 사용자 소프트 삭제

#### Response (204)
```json
{
  "success": true,
  "data": null,
  "request_id": "...",
  "timestamp": "..."
}
```

---

## 4. Wallet

> Wallet API는 **APP_ADMIN** 권한이 필요합니다.

### WalletReason 값 (권장)

| Value | Meaning |
|-------|---------|
| `ATTENDANCE` | 출석 보상 |
| `ADMIN_ADJUST` | 관리자 수동 조정 |
| `REFUND` | 주문 환불 |
| `REFERRAL` | 추천 보상 |
| `BUY_ITEM` | 상품 구매 |
| `PROMOTION` | 프로모션 보상 |
| `SIGNUP_BONUS` | 가입 보너스 |
| `COMPENSATION` | 보상 지급 |
| `EXPIRATION` | 만료 차감 |
| `OTHER` | 기타 |

### 4.1 Credit Wallet

**Endpoint:** `POST /v1/wallet/credits`
**Auth:** Bearer + Role `APP_ADMIN`
**사용 시점:** 포인트 지급 (출석, 보상, 관리자 지급 등)

#### Request Body
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "amount": 1000,
  "reason": "ATTENDANCE",
  "ref_type": "attendance",
  "ref_id": "attendance:2026-01-12:user:550e...",
  "expires_at": null,
  "idempotency_key": "credit:attendance:2026-01-12"
}
```

- `reason` 은 `WalletReason` enum 값 권장
- `idempotency_key` 는 **body**로 전달됩니다 (header 아님)

#### Response (200)
```json
{
  "success": true,
  "data": { "...WalletLedgerEntity" },
  "request_id": "...",
  "timestamp": "..."
}
```

---

### 4.2 Debit Wallet

**Endpoint:** `POST /v1/wallet/debits`
**Auth:** Bearer + Role `APP_ADMIN`
**사용 시점:** 포인트 차감 (구매, 사용 등)

#### Request Body
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "amount": 500,
  "reason": "BUY_ITEM",
  "ref_type": "order",
  "ref_id": "order:123",
  "idempotency_key": "debit:order:123"
}
```

#### Response (200)
```json
{
  "success": true,
  "data": ["...WalletLedgerEntity"],
  "request_id": "...",
  "timestamp": "..."
}
```

> 차감은 FIFO로 여러 lot에서 나눠질 수 있어 배열로 반환됩니다.

---

### 4.3 Get Wallet Balance

**Endpoint:** `GET /v1/wallet/balance?user_id={userId}`
**Auth:** Bearer + Role `APP_ADMIN`
**사용 시점:** 사용자 잔액 조회

#### Response (200)
```json
{
  "success": true,
  "data": {
    "balance": "1050",
    "balanceNumber": 1050
  },
  "request_id": "...",
  "timestamp": "..."
}
```

---

### 4.4 Get Wallet Ledger

**Endpoint:** `GET /v1/wallet/ledger?user_id={userId}&limit=50&cursor=...`
**Auth:** Bearer + Role `APP_ADMIN`
**사용 시점:** 지갑 거래 내역 조회

#### Query Parameters
- `user_id` (required)
- `limit` (optional, 1~100, default 20)
- `cursor` (optional, **현재 미사용**)

#### Response (200)
```json
{
  "success": true,
  "data": {
    "entries": ["...WalletLedgerEntity"],
    "total": 123
  },
  "request_id": "...",
  "timestamp": "..."
}
```

---

## 5. Billing

### 5.1 List Products

**Endpoint:** `GET /v1/products`
**Auth:** Bearer (Public 아님)
**사용 시점:** 판매 가능한 상품 목록 조회

#### Notes
- `isActive = true` 인 상품만 반환됩니다.

#### Response (200)
```json
{
  "success": true,
  "data": ["...ProductEntity"],
  "request_id": "...",
  "timestamp": "..."
}
```

---

### 5.2 Create Product (Admin)

**Endpoint:** `POST /v1/admin/products`
**Auth:** Bearer + Role `APP_ADMIN`
**사용 시점:** 상품 생성

#### Request Body
```json
{
  "type": "DIGITAL",
  "name": "Premium Subscription",
  "default_price": "1000",
  "metadata": { "features": ["feature1"] },
  "is_active": true
}
```

#### Response (201)
```json
{
  "success": true,
  "data": { "...ProductEntity" },
  "request_id": "...",
  "timestamp": "..."
}
```

---

### 5.3 Update Product (Admin)

**Endpoint:** `PATCH /v1/admin/products/{productId}`
**Auth:** Bearer + Role `APP_ADMIN`
**사용 시점:** 상품 정보 수정

#### Request Body
```json
{
  "name": "Premium Subscription Plus",
  "is_active": true,
  "metadata": { "features": ["feature1", "feature2"] }
}
```

#### Notes
- 현재 구현에서는 `is_active` 업데이트가 반영되지 않습니다. (Create 시점에만 is_active 적용)

#### Response (200)
```json
{
  "success": true,
  "data": { "...ProductEntity" },
  "request_id": "...",
  "timestamp": "..."
}
```

---

### 5.4 Create Order

**Endpoint:** `POST /v1/orders`
**Auth:** Bearer
**사용 시점:** 포인트 결제 주문 생성 (지갑 차감 포함)

#### Request Body
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "price_id": "660e8400-e29b-41d4-a716-446655440001",
  "quantity": 1,
  "ref_type": "order",
  "ref_id": "client_order:123",
  "reason": "BUY_ITEM",
  "idempotency_key": "order:client_order:123"
}
```

#### Notes
- `price_id`는 현재 **ProductEntity.id**를 의미합니다. (별도 price 테이블 없음)
- `reason` 값은 현재 주문 생성 로직에 사용되지 않습니다.
- 주문 생성 시 지갑 차감이 같은 트랜잭션에서 수행되며, 성공 시 주문 상태는 `PAID` 로 변경됩니다.

#### Response (201)
```json
{
  "success": true,
  "data": { "...OrderEntity" },
  "request_id": "...",
  "timestamp": "..."
}
```

---

### 5.5 Refund Order

**Endpoint:** `POST /v1/orders/{orderId}/refund`
**Auth:** Bearer
**사용 시점:** 주문 환불 (포인트 재적립 포함)

#### Request Body
```json
{
  "reason": "Customer requested refund",
  "ref_type": "order",
  "ref_id": "order:123",
  "idempotency_key": "refund:order:123"
}
```

#### Notes
- `reason` 값은 현재 환불 로직에 사용되지 않습니다.
- `status = PAID` 인 주문만 환불 가능합니다.

#### Response (200)
```json
{
  "success": true,
  "data": { "...OrderEntity" },
  "request_id": "...",
  "timestamp": "..."
}
```

---

## 6. Jobs

### 6.1 Create Callback Job (Legacy)

**Endpoint:** `POST /v1/jobs/callback-http`
**Auth:** Bearer
**사용 시점:** 외부 HTTP 콜백 재시도용 레거시 작업 생성

#### Headers
- `x-app-id` (required)
- `idempotency-key` (optional, 현재 강제/검증 없음)

#### Request Body
```json
{
  "method": "POST",
  "path": "/webhooks/payment",
  "body": { "order_id": "123", "status": "completed" },
  "timeout_ms": 5000,
  "expected_statuses": [200, 201, 204],
  "next_retry_at": "2026-01-12T12:00:00.000Z"
}
```

#### Notes
- app의 `callbackBaseUrl` 및 `callbackSecretRef` 가 설정되어 있어야 생성됩니다.

#### Response (201)
```json
{
  "success": true,
  "data": { "...JobEntity" },
  "request_id": "...",
  "timestamp": "..."
}
```

---

### 6.2 Run Due Jobs (Legacy Internal)

**Endpoint:** `POST /internal/v1/jobs/run`
**Auth:** Bearer
**사용 시점:** 스케줄러가 DB에서 due job 실행

#### Request Body
```json
{ "limit": 100 }
```

#### Response (200)
```json
{
  "success": true,
  "data": 12,
  "request_id": "...",
  "timestamp": "..."
}
```

---

### 6.3 Create Unified Job

**Endpoint:** `POST /v1/jobs/create`
**Auth:** Bearer
**사용 시점:** SQS/DB/스케줄 통합 Job 생성

#### Request Body (요약)
```json
{
  "appId": "550e8400-e29b-41d4-a716-446655440000",
  "mode": "both",
  "message": {
    "lambdaProxyMessage": {
      "body": "{\"key\":\"value\"}",
      "resource": "/{proxy+}",
      "path": "/v1/jobs/callback",
      "httpMethod": "POST",
      "isBase64Encoded": false,
      "pathParameters": { "proxy": "v1/jobs/callback" },
      "queryStringParameters": { "key": "value" },
      "headers": { "Content-Type": "application/json" },
      "requestContext": { "path": "/v1/jobs/callback", "resourcePath": "/{proxy+}", "httpMethod": "POST" }
    },
    "execution": {
      "type": "rest-api",
      "baseUrl": "https://api.example.com"
    },
    "metadata": {
      "idempotencyKey": "job:order:123",
      "messageGroupId": "rest-api",
      "createdAt": "2026-01-12T00:00:00.000Z"
    }
  }
}
```

#### Notes
- `metadata.jobId`, `metadata.appId`, `metadata.messageGroupId`, `metadata.createdAt`, `metadata.retryCount` 는 서버에서 **덮어씁니다**.
- `mode`:
  - `db`: DB에만 저장
  - `sqs`: SQS에만 전송 (응답 data는 `null`)
  - `both`: DB 저장 + SQS 전송
- `mode` 기본값은 `sqs` 입니다.
- `appId`가 없으면 DEFAULT_APP_ID가 사용됩니다.

#### Response (201)
```json
{
  "success": true,
  "data": { "...JobEntity" },
  "request_id": "...",
  "timestamp": "..."
}
```

> `mode = sqs`일 때는 `data: null` 로 반환됩니다.

---

### 6.4 Poll SQS (Internal)

**Endpoint:** `POST /internal/v1/poll-sqs`
**Auth:** Bearer
**사용 시점:** EventBridge cron이 SQS 메시지 처리

#### Request Body
```json
{ "limit": 10 }
```

#### Response (200)
```json
{
  "success": true,
  "data": { "processed": 5 },
  "request_id": "...",
  "timestamp": "..."
}
```

---

### 6.5 Run DB Jobs (Internal)

**Endpoint:** `POST /internal/v1/run-db-jobs`
**Auth:** Bearer
**사용 시점:** DB에 저장된 due job 실행

#### Request Body
```json
{ "limit": 100 }
```

#### Response (200)
```json
{
  "success": true,
  "data": { "processed": 12 },
  "request_id": "...",
  "timestamp": "..."
}
```

---

### 6.6 Process Scheduled Message (Internal)

**Endpoint:** `POST /internal/v1/process-scheduled-message`
**Auth:** Bearer
**사용 시점:** EventBridge Scheduler가 전달한 메시지 처리

#### Request Body
- `UnifiedJobMessageDto` 전체 구조

#### Response (200)
```json
{
  "success": true,
  "data": { "success": true },
  "request_id": "...",
  "timestamp": "..."
}
```

---

### 6.7 Poll Source Queue (Internal)

**Endpoint:** `POST /internal/v1/poll-source-queue`
**Auth:** Bearer
**사용 시점:** 여러 FIFO source 큐에서 메시지 수집 후 메인 큐로 전달

#### Response (200)
```json
{
  "success": true,
  "data": {
    "processed": {
      "https://sqs.ap-northeast-2.amazonaws.com/123/crypto.fifo": 3
    },
    "timestamp": "2026-01-12T00:00:00.000Z"
  },
  "request_id": "...",
  "timestamp": "..."
}
```

---

## 7. Admin

### 7.1 Suspend User

**Endpoint:** `POST /v1/admin/users/{userId}/suspend`
**Auth:** Bearer + Role `APP_ADMIN`
**사용 시점:** 사용자 계정 정지

#### Response (200)
```json
{
  "success": true,
  "data": null,
  "request_id": "...",
  "timestamp": "..."
}
```

#### Notes
- 요청 바디는 사용되지 않습니다.

---

### 7.2 Unsuspend User

**Endpoint:** `POST /v1/admin/users/{userId}/unsuspend`
**Auth:** Bearer + Role `APP_ADMIN`
**사용 시점:** 정지된 사용자 복구

#### Response (200)
```json
{
  "success": true,
  "data": null,
  "request_id": "...",
  "timestamp": "..."
}
```

#### Notes
- 요청 바디는 사용되지 않습니다.

---

### 7.3 Adjust Wallet (Admin)

**Endpoint:** `POST /v1/admin/wallet/adjust`
**Auth:** Bearer + Role `APP_ADMIN`
**사용 시점:** 관리자 수동 지갑 증감

#### Headers
- `x-app-id` (required)

#### Request Body
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "delta": -500,
  "reason": "Admin adjustment",
  "ref_type": "admin_action",
  "ref_id": "admin_adj_123"
}
```

#### Response (200)
```json
{
  "success": true,
  "data": { "...WalletLedgerEntity" },
  "request_id": "...",
  "timestamp": "..."
}
```

#### Notes
- `delta`가 음수이면 debit이 수행되어 **배열**이 반환될 수 있습니다.
- 현재 구현에서는 `ref_type`, `reason` 값은 내부 처리에 사용되지 않으며, `ref_id`가 idempotency key로 활용됩니다.

---

### 7.4 List Jobs

**Endpoint:** `GET /v1/admin/jobs?status=FAILED&limit=20&cursor=...`
**Auth:** Bearer + Role `APP_ADMIN`
**사용 시점:** 앱별 Job 목록 조회

#### Headers
- `x-app-id` (required)

#### Query Parameters
- `status` (optional)
- `limit` (optional)
- `cursor` (optional, **현재 미사용**)

#### Response (200)
```json
{
  "success": true,
  "data": {
    "jobs": ["...JobEntity"],
    "total": 123
  },
  "request_id": "...",
  "timestamp": "..."
}
```

---

### 7.5 Retry Job

**Endpoint:** `POST /v1/admin/jobs/{jobId}/retry`
**Auth:** Bearer + Role `APP_ADMIN`
**사용 시점:** 실패 Job 재시도 요청

#### Response (200)
```json
{
  "success": true,
  "data": { "...JobEntity" },
  "request_id": "...",
  "timestamp": "..."
}
```

---

### 7.6 Deadletter Job

**Endpoint:** `POST /v1/admin/jobs/{jobId}/deadletter`
**Auth:** Bearer + Role `APP_ADMIN`
**사용 시점:** Job을 영구 실패(DEAD)로 처리

#### Response (200)
```json
{
  "success": true,
  "data": { "...JobEntity" },
  "request_id": "...",
  "timestamp": "..."
}
```

---

## 8. Platform

### 8.1 List Apps

**Endpoint:** `GET /v1/platform/apps`
**Auth:** Bearer + Role `PLATFORM_SUPER_ADMIN`
**사용 시점:** 전체 앱(테넌트) 목록 조회

#### Response (200)
```json
{
  "success": true,
  "data": ["...AppEntity"],
  "request_id": "...",
  "timestamp": "..."
}
```

---

### 8.2 Create App

**Endpoint:** `POST /v1/platform/apps`
**Auth:** Bearer + Role `PLATFORM_SUPER_ADMIN`
**사용 시점:** 신규 테넌트 생성

#### Request Body
```json
{
  "name": "My Application",
  "hosts": ["app.example.com"],
  "callback_base_url": "https://api.example.com/webhooks",
  "callback_allowlist_paths": ["/payment/success", "/payment/failed"]
}
```

#### Notes
- `hosts` 필드는 **현재 DB에 저장되지 않습니다** (향후 호스트 허용 목록용).
- `allowed_redirect_domains` 는 현재 API로 설정할 수 없습니다.

#### Response (201)
```json
{
  "success": true,
  "data": { "...AppEntity" },
  "request_id": "...",
  "timestamp": "..."
}
```

---

### 8.3 Update App

**Endpoint:** `PATCH /v1/platform/apps/{appId}`
**Auth:** Bearer + Role `PLATFORM_SUPER_ADMIN`
**사용 시점:** 앱 콜백/보안 설정 변경

#### Request Body
```json
{
  "callback_base_url": "https://api.example.com/webhooks",
  "callback_allowlist_paths": ["/payment/success"],
  "callback_secret_ref": "secret_ref_abc123"
}
```

#### Response (200)
```json
{
  "success": true,
  "data": { "...AppEntity" },
  "request_id": "...",
  "timestamp": "..."
}
```

---

## Error Handling

### Common HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 202 | Accepted |
| 204 | No Content |
| 400 | Invalid request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not found |
| 409 | Conflict |
| 422 | Unprocessable entity |
| 429 | Rate limited |
| 500 | Internal server error |

### Error Code Field (`error.code`)

- `AppException`을 사용하는 경우: `ERROR_CODE.*` 값
- Nest 기본 예외: `BadRequestException`, `UnauthorizedException` 등
- Validation 오류는 `message`가 배열일 수 있으며, `details.messages`로 전달됩니다.

---

## Idempotency

### 적용 위치 (현재 코드 기준)

| Endpoint | Idempotency Field | 위치 |
|----------|-------------------|------|
| `POST /v1/wallet/credits` | `idempotency_key` | Body |
| `POST /v1/wallet/debits` | `idempotency_key` | Body |
| `POST /v1/orders` | `idempotency_key` | Body |
| `POST /v1/orders/{orderId}/refund` | `idempotency_key` | Body |
| `POST /v1/admin/wallet/adjust` | `ref_id` | Body (내부에서 idempotency key로 사용) |
| `POST /v1/jobs/callback-http` | `idempotency-key` | Header (현재 검증/캐싱 없음) |

### 동작 방식

- 동일 키 + 동일 요청 바디 → 캐시된 응답 반환
- 동일 키 + 다른 요청 바디 → **409 Conflict**
- idempotency 로직은 `PointService`에서 처리되며 **header 기반 guard는 현재 적용되지 않습니다**.

---

**Document Version**: 1.0
**Last Updated**: 2026-01-12
