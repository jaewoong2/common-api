# Frontend API Specification

> **목적**: 프론트엔드 개발자를 위한 유저 대상 REST API 상세 스펙  
> **버전**: v1.0  
> **최종 수정**: 2026-01-22

---

## 📌 목차

1. [기본 정보](#1-기본-정보)
2. [Authentication API](#2-authentication-api)
3. [User Info API](#3-user-info-api)
4. [Exchange Key Management API](#4-exchange-key-management-api)
5. [Trade Logs & History API](#5-trade-logs--history-api)
6. [Trade Info API](#6-trade-info-api)
7. [Dashboard & Statistics API](#7-dashboard--statistics-api)
8. [Notifications API](#8-notifications-api)
9. [Settings API](#9-settings-api)
10. [에러 코드](#10-에러-코드)
11. [공통 규칙](#11-공통-규칙)
12. [Webhook Builder API](#12-webhook-builder-api)

---

## 1. 기본 정보

### Base URL

```
https://api.service.com/v1
```

### 인증

모든 API는 JWT Bearer token 인증 필요 (Public endpoint 제외)

```http
Authorization: Bearer <access_token>
```

### 공통 응답 포맷

> [!IMPORTANT]
> ResponseInterceptor가 응답에 `request_id`, `timestamp` 메타 데이터를 자동으로 추가합니다.
>
> **실제 응답 구조**:
>
> - Standard Fields: `ok`, `data`, `request_id`, `timestamp`
> -

**✅ 성공**

```json
{
  "ok": true,

  "data": {
    /* 응답 데이터 */
  },
  "request_id": "req_abc123xyz",
  "timestamp": "2026-01-24T05:30:36.950Z"
}
```

**❌ 실패**

```json
{
  "ok": false,

  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {
      /* 추가 정보 */
    }
  },
  "request_id": "req_abc123xyz",
  "timestamp": "2026-01-24T05:30:36.950Z"
}
```

**응답 필드 설명:**

| 필드         | 타입              | 설명                    |
| ------------ | ----------------- | ----------------------- |
| `ok`         | boolean           | 요청 성공 여부          |
| `data`       | any               | 실제 응답 데이터        |
| `error`      | object            | 에러 정보 (실패 시)     |
| `request_id` | string            | 요청 추적 ID (디버깅용) |
| `timestamp`  | string (ISO 8601) | 응답 생성 시각          |

> [!NOTE]
> **프론트엔드 데이터 접근**: `response.data.data`가 실제 비즈니스 데이터입니다.
> `unwrapResponse()` 유틸리티 함수를 사용하여 내부 데이터를 추출하세요.

---

## 2. Authentication API

> [!IMPORTANT]
> 이 서비스는 **비밀번호 없는 인증(Passwordless Authentication)**을 사용합니다.
>
> - Magic Link (이메일 인증)
> - OAuth 2.0 (Google, Kakao)

### 2.1 인증 플로우 개요

**지원하는 인증 방식:**

1. **Magic Link**: 이메일로 6자리 코드 전송
2. **Google OAuth**: Google 계정으로 로그인
3. **Kakao OAuth**: 카카오 계정으로 로그인

**토큰 만료 시간:**

- Access Token: 15분
- Refresh Token: 30일

---

### 2.2 Magic Link 인증

#### 2.2.1 Magic Link 요청

6자리 인증 코드를 이메일로 전송합니다.

```http
POST /v1/auth/magic-link/request
Content-Type: application/json
```

**Request Body**

```json
{
  "email": "user@example.com",
  "redirect_url": "https://yourapp.com/auth/callback"
}
```

**Request Schema**

| 필드           | 타입   | 필수 | 검증 규칙   | 설명                        |
| -------------- | ------ | ---- | ----------- | --------------------------- |
| `email`        | string | Yes  | 이메일 형식 | 사용자 이메일 주소          |
| `redirect_url` | string | Yes  | URL 형식    | 인증 완료 후 리다이렉트 URL |

**Response 202 - Accepted**

```json
{
  "ok": true,
  "data": {
    "message": "Magic link sent to your email",
    "code": "123456"
  }
}
```

**Response Schema**

| 필드      | 타입   | 설명                              |
| --------- | ------ | --------------------------------- |
| `message` | string | 안내 메시지                       |
| `code`    | string | 6자리 인증 코드 (개발 환경에서만) |

> [!NOTE]
> `code` 필드는 NODE_ENV가 'production'이 아닐 때만 응답에 포함됩니다.

**Error Responses**

```json
// 400 - 잘못된 이메일 형식
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format"
  }
}
```

---

### 2.3 OAuth 인증 (Google)

#### 2.3.1 Google OAuth 시작

Google OAuth 인증 페이지로 리다이렉트합니다.

```http
GET /v1/auth/oauth/google/start?redirect_uri=https://yourapp.com/auth/callback
```

**Query Parameters**

| 파라미터       | 타입   | 필수 | 설명                    |
| -------------- | ------ | ---- | ----------------------- |
| `redirect_uri` | string | Yes  | 인증 완료 후 돌아올 URL |

**Response 302 - Redirect to Google**

사용자를 Google OAuth 동의 화면으로 리다이렉트합니다.

#### 2.3.2 Google OAuth Callback

**자동 호출 엔드포인트** - 프론트엔드에서 직접 호출하지 마세요.

```http
GET /v1/auth/oauth/google/callback
```

**Response 302 - Redirect with Code**

```
https://yourapp.com/auth/callback?code=abc123xyz
```

**Error Response**

```
https://yourapp.com/auth/callback?error=unauthorized
```

---

### 2.4 OAuth 인증 (Kakao)

#### 2.4.1 Kakao OAuth 시작

Kakao OAuth 인증 페이지로 리다이렉트합니다.

```http
GET /v1/auth/oauth/kakao/start?redirect_uri=https://yourapp.com/auth/callback
```

**Query Parameters**

| 파라미터       | 타입   | 필수 | 설명                    |
| -------------- | ------ | ---- | ----------------------- |
| `redirect_uri` | string | Yes  | 인증 완료 후 돌아올 URL |

**Response 302 - Redirect to Kakao**

사용자를 Kakao OAuth 동의 화면으로 리다이렉트합니다.

#### 2.4.2 Kakao OAuth Callback

**자동 호출 엔드포인트** - 프론트엔드에서 직접 호출하지 마세요.

```http
GET /v1/auth/oauth/kakao/callback
```

**Response 302 - Redirect with Code**

```
https://yourapp.com/auth/callback?code=xyz789abc
```

> [!NOTE]
> Kakao는 이메일 제공이 선택사항입니다. 이메일이 없을 경우 `{kakao_id}@kakao.com` 형식의 fallback 이메일이 자동 생성됩니다.

---

### 2.5 통합 토큰 검증 (권장)

Magic Link 코드 또는 OAuth authorization code를 JWT 토큰으로 교환합니다.

```http
POST /v1/auth/verify
Content-Type: application/json
```

**Request Body**

```json
{
  "code": "abc123xyz",
  "redirect_uri": "https://yourapp.com/auth/callback"
}
```

**Request Schema**

| 필드           | 타입   | 필수 | 설명                                          |
| -------------- | ------ | ---- | --------------------------------------------- |
| `code`         | string | Yes  | Magic Link 코드 또는 OAuth authorization code |
| `redirect_uri` | string | No   | OAuth 플로우의 경우 필수 (검증용)             |

**Response 200**

```json
{
  "ok": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "app_id": "default",
      "role": "user",
      "profile": {
        "displayName": "John Doe",
        "photo": "https://lh3.googleusercontent.com/...",
        "emailVerified": true
      },
      "created_at": "2026-01-15T10:00:00Z",
      "updated_at": "2026-01-22T10:00:00Z",
      "deleted_at": null
    }
  }
}
```

**Response Schema - User Object**

| 필드         | 타입              | 설명                          |
| ------------ | ----------------- | ----------------------------- |
| `id`         | string (UUID)     | 사용자 고유 ID                |
| `email`      | string            | 사용자 이메일                 |
| `app_id`     | string            | 앱 ID (multi-tenant)          |
| `role`       | string            | 사용자 역할 (user, admin)     |
| `profile`    | object            | 프로필 정보 (provider별 상이) |
| `created_at` | string (ISO 8601) | 계정 생성 시각                |
| `updated_at` | string (ISO 8601) | 최근 수정 시각                |
| `deleted_at` | string \| null    | 삭제 시각 (soft delete)       |

**Error Responses**

```json
// 401 - 유효하지 않은 코드
{
  "ok": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired token"
  }
}

// 401 - 이미 사용된 코드
{
  "ok": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Token already used"
  }
}

// 401 - redirect_uri 불일치 (OAuth)
{
  "ok": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "redirect_uri does not match"
  }
}
```

---

### 2.6 토큰 갱신

Refresh token으로 새로운 access token을 발급받습니다.

```http
POST /v1/auth/refresh
Content-Type: application/json
```

**Request Body**

```json
{
  "refresh_token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
}
```

**Response 200**

```json
{
  "ok": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Responses**

```json
// 401 - 유효하지 않은 refresh token
{
  "ok": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid refresh token"
  }
}

// 401 - 만료된 refresh token
{
  "ok": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Refresh token has expired"
  }
}
```

---

### 2.7 로그아웃

Refresh token을 무효화합니다.

```http
POST /v1/auth/logout
Content-Type: application/json
```

**Request Body**

```json
{
  "refresh_token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
}
```

**Request Schema**

| 필드            | 타입   | 필수 | 설명                   |
| --------------- | ------ | ---- | ---------------------- |
| `refresh_token` | string | No   | 무효화할 refresh token |

**Response 200**

```json
{
  "ok": true,
  "data": {
    "message": "Logged out successfully"
  }
}
```

> [!TIP]
> 프론트엔드에서는 로그아웃 시 로컬 스토리지의 모든 토큰을 삭제해야 합니다.

---

### 2.8 계정 관리

#### 2.8.1 내 정보 조회

현재 로그인한 사용자 정보를 조회합니다.

```http
GET /v1/me
Authorization: Bearer <token>
```

**Response 200**

```json
{
  "ok": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "app_id": "default",
    "role": "user",
    "profile": {
      "displayName": "John Doe",
      "photo": "https://example.com/photo.jpg",
      "nickname": "JohnD"
    },
    "created_at": "2026-01-15T10:00:00Z",
    "updated_at": "2026-01-22T10:00:00Z",
    "deleted_at": null
  }
}
```

**Error Responses**

- `401 UNAUTHORIZED`: 인증되지 않은 요청
- `404 NOT_FOUND`: 사용자를 찾을 수 없음

#### 2.8.2 프로필 수정

사용자 프로필을 수정합니다.

```http
PATCH /v1/me
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body**

```json
{
  "nickname": "NewNickname"
}
```

**Request Schema**

| 필드       | 타입   | 필수 | 설명          |
| ---------- | ------ | ---- | ------------- |
| `nickname` | string | No   | 사용자 닉네임 |

**Response 200**

```json
{
  "ok": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "app_id": "default",
    "role": "user",
    "profile": {
      "displayName": "John Doe",
      "photo": "https://example.com/photo.jpg",
      "nickname": "NewNickname"
    },
    "created_at": "2026-01-15T10:00:00Z",
    "updated_at": "2026-01-22T11:00:00Z",
    "deleted_at": null
  }
}
```

**Error Responses**

- `404 NOT_FOUND`: 사용자를 찾을 수 없음

#### 2.8.3 계정 삭제

현재 로그인한 계정을 Soft Delete 합니다.

```http
DELETE /v1/me
Authorization: Bearer <token>
```

**Response 204 - No Content**

성공 시 응답 본문 없음

**동작:**

- `deleted_at` 필드에 현재 시각 기록
- 모든 refresh token 무효화
- 사용자 데이터는 일정 기간 후 영구 삭제
- 삭제된 계정으로 재로그인 불가

**Error Responses**

- `404 NOT_FOUND`: 사용자를 찾을 수 없음

> [!CAUTION]
> 계정 삭제는 되돌릴 수 없습니다. 사용자에게 확인 절차를 거치는 것을 권장합니다.

---

## 3. User Info API

### 3.1 Webhook URL 조회

TradingView 등에서 사용할 Webhook URL을 조회합니다.

```http
GET /users/webhook
Authorization: Bearer <token>
```

**Query Parameters**
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| `provider` | string | No | Provider 이름 (기본값: binance) |

**Response 200**

```json
{
  "ok": true,
  "data": {
    "webhook_url": "https://api.service.com/v1/webhook/binance/a3c1b2d4-5e6f-7a8b-9c0d-e1f2a3b4c5d6",
    "provider": "binance",
    "auth_token": "a3c1b2d4-5e6f-7a8b-9c0d-e1f2a3b4c5d6"
  }
}
```

---

## 4. Exchange Key Management API

### 4.1 거래소 API 키 등록

```http
POST /users/keys
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body**

```json
{
  "exchange": "binance",
  "label": "Main Account",
  "access_key": "AKxxxxxxxxxxxxxxxxxxxx",
  "secret_key": "SKyyyyyyyyyyyyyyyyyyyy"
}
```

**필드 설명:**

- `exchange`: 거래소 이름 (binance, upbit 등)
- `label`: 사용자 정의 라벨 (내 계좌, 테스트 계좌 등)
- `access_key`: API Access Key
- `secret_key`: API Secret Key (AWS KMS로 암호화 저장)

**Response 201**

```json
{
  "ok": true,
  "data": {
    "key_id": 15,
    "exchange": "binance",
    "label": "Main Account",
    "created_at": "2026-01-22T10:00:00Z"
  }
}
```

**Error Responses**

- `400 VALIDATION_ERROR`: 필수 필드 누락 또는 형식 오류
- `409 DUPLICATE_KEY`: 동일한 access_key가 이미 존재

---

### 4.2 거래소 키 목록 조회

```http
GET /users/keys
Authorization: Bearer <token>
```

**Response 200**

```json
{
  "ok": true,

  "data": [
    {
      "keyId": "550e8400-e29b-41d4-a716-446655440000",
      "exchange": "binance",
      "label": "Main Account",
      "accessKeyMasked": "AK***1234",
      "createdAt": "2026-01-15T10:00:00Z"
    },
    {
      "keyId": "660e8400-e29b-41d4-a716-446655440001",
      "exchange": "binance",
      "label": "Test Account",
      "accessKeyMasked": "AK***5678",
      "createdAt": "2026-01-18T14:30:00Z"
    }
  ],
  "request_id": "req-2ek",
  "timestamp": "2026-01-24T05:30:36.950Z"
}
```

**필드 설명:**

- `access_key_masked`: 보안을 위해 마스킹된 Access Key
- `is_valid`: 마지막 검증 결과 (true: 정상, false: 오류)
- `last_verified`: 마지막 검증 시각

---

### 4.3 거래소 키 삭제

```http
DELETE /users/keys/:key_id
Authorization: Bearer <token>
```

**Response 200**

```json
{
  "ok": true,
  "data": {
    "deleted": true,
    "key_id": 15
  }
}
```

**Error Responses**

- `404 KEY_NOT_FOUND`: 해당 key_id가 존재하지 않음

---

### 4.4 거래소 키 검증

API 키의 유효성 및 권한 검증

```http
POST /users/keys/:key_id/verify
Authorization: Bearer <token>
```

**Response 200**

```json
{
  "ok": true,
  "data": {
    "key_id": 15,
    "valid": true,
    "permissions": {
      "spot_trading": true,
      "futures_trading": true,
      "margin_trading": false,
      "withdraw": false
    },
    "restrictions": {
      "ip_restricted": true,
      "allowed_ips": ["123.45.67.89"]
    },
    "verified_at": "2026-01-22T10:30:00Z"
  }
}
```

**Error Responses**

- `400 INVALID_API_KEY`: API 키가 유효하지 않음
- `403 INSUFFICIENT_PERMISSIONS`: 필요한 권한 없음

---

## 5. Trade Logs & History API

### 5.1 매매 이력 조회

페이징 및 필터링 지원하는 매매 이력 조회

```http
GET /logs
Authorization: Bearer <token>
```

**Query Parameters**
| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|---------|------|------|--------|------|
| `page` | integer | No | 1 | 페이지 번호 |
| `limit` | integer | No | 20 | 페이지당 항목 수 (최대 100) |
| `status` | string | No | - | SUCCESS, FAIL, PARTIAL_FAIL |
| `ticker` | string | No | - | 심볼 필터 (예: BTCUSDT) |
| `market` | string | No | - | spot, futures_um |
| `provider` | string | No | - | binance, upbit 등 |
| `from` | string | No | - | 시작 날짜 (ISO 8601) |
| `to` | string | No | - | 종료 날짜 (ISO 8601) |
| `action` | string | No | - | open_long, close_long 등 |

**Example**

```http
GET /logs?page=1&limit=20&status=SUCCESS&ticker=BTCUSDT&from=2026-01-01T00:00:00Z
```

**Response 200**

```json
{
  "ok": true,
  "data": {
    "items": [
      {
        "log_id": 501,
        "signal_id": "1737360000000",
        "provider": "binance",
        "exchange": "binance",
        "market": "futures_um",
        "ticker": "BTCUSDT",
        "action": "open_long",
        "status": "SUCCESS",
        "entry_price": "50000.00",
        "quantity": "0.1",
        "created_at": "2026-01-22T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 132,
      "total_pages": 7
    }
  }
}
```

---

### 5.2 매매 이력 상세 조회

특정 거래의 상세 정보 (Entry/Exit JSON 포함)

```http
GET /logs/:log_id
Authorization: Bearer <token>
```

**Response 200**

```json
{
  "ok": true,
  "data": {
    "log_id": 501,
    "signal_id": "1737360000000",
    "provider": "binance",
    "exchange": "binance",
    "market": "futures_um",
    "ticker": "BTCUSDT",
    "action": "open_long",
    "status": "SUCCESS",
    "request_json": {
      "ticker": "BTCUSDT",
      "action": "open_long",
      "qty": { "type": "percent", "value": 50 },
      "strategy": {
        "stop_loss": { "type": "percent", "value": 2.0 },
        "take_profit": { "type": "percent", "value": 5.0 }
      }
    },
    "entry_json": {
      "order_id": "12345678",
      "client_order_id": "WH_U1_SIG1737360000000_ENTRY",
      "symbol": "BTCUSDT",
      "side": "BUY",
      "type": "MARKET",
      "quantity": "0.1",
      "price": "50000.00",
      "status": "FILLED"
    },
    "exit_json": {
      "tp_order_id": "12345679",
      "sl_order_id": "12345680",
      "tp": {
        "price": "52500.00",
        "quantity": "0.1"
      },
      "sl": {
        "price": "49000.00",
        "quantity": "0.1"
      }
    },
    "error_json": null,
    "created_at": "2026-01-22T10:00:00Z"
  }
}
```

**Error Responses**

- `404 LOG_NOT_FOUND`: 해당 log_id가 존재하지 않음

---

### 5.3 Webhook 요청 상태 조회

signal_id 기준으로 Webhook 요청 상태 확인

```http
GET /requests/:signal_id
Authorization: Bearer <token>
```

**Response 200**

```json
{
  "ok": true,
  "data": {
    "signal_id": "1737360000000",
    "status": "DONE",
    "provider": "binance",
    "market": "futures_um",
    "ticker": "BTCUSDT",
    "job_id": "550e8400-e29b-41d4-a716-446655440000",
    "trace_id": "sqs_msg_abc123",
    "created_at": "2026-01-22T10:00:00Z",
    "updated_at": "2026-01-22T10:00:15Z"
  }
}
```

**Status 값:**

- `RECEIVED`: Webhook 수신됨
- `QUEUED`: SQS에 대기 중
- `PROCESSING`: Worker가 처리 중
- `DONE`: 성공적으로 완료
- `FAIL`: 실패
- `PARTIAL_FAIL`: 부분 실패 (Entry 성공, Exit 실패)

---

## 6. Trade Info API

### 6.1 현재 포지션 조회

실시간 거래소 포지션 조회

```http
GET /trade/positions
Authorization: Bearer <token>
```

**Query Parameters**
| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|---------|------|------|--------|------|
| `exchange` | string | No | binance | 거래소 이름 |
| `market` | string | No | futures_um | spot, futures_um |
| `symbol` | string | No | - | 특정 심볼만 조회 |

**Response 200**

```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "symbol": "BTCUSDT",
      "position_amt": "0.15",
      "entry_price": "50000.00",
      "mark_price": "51000.00",
      "unrealized_pnl": "+150.00",
      "leverage": "10",
      "position_side": "LONG",
      "liquidation_price": "45500.00"
    },
    {
      "symbol": "ETHUSDT",
      "position_amt": "2.5",
      "entry_price": "3000.00",
      "mark_price": "3100.00",
      "unrealized_pnl": "+250.00",
      "leverage": "5",
      "position_side": "LONG",
      "liquidation_price": "2400.00"
    }
  ]
}
```

---

### 6.2 계좌 잔고 조회

실시간 거래소 잔고 조회

```http
GET /trade/balances
Authorization: Bearer <token>
```

**Query Parameters**
| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|---------|------|------|--------|------|
| `exchange` | string | No | binance | 거래소 이름 |
| `market` | string | No | futures_um | spot, futures_um |
| `assets` | string | No | - | 쉼표 구분 자산 목록 (예: USDT,USDC) |

**Response 200**

```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "asset": "USDT",
      "balance": "10000.50",
      "available": "8500.30",
      "locked": "1500.20"
    },
    {
      "asset": "USDC",
      "balance": "5000.00",
      "available": "5000.00",
      "locked": "0.00"
    }
  ]
}
```

---

## 7. Dashboard & Statistics API

### 7.1 대시보드 요약 정보

프론트엔드 대시보드에 표시할 요약 정보

```http
GET /dashboard/summary
Authorization: Bearer <token>
```

**Response 200**

```json
{
  "ok": true,
  "data": {
    "total_trades": 152,
    "success_rate": 87.5,
    "total_profit_usdt": "1234.56",
    "today_trades": 12,
    "active_positions": 3,
    "last_24h_pnl": "+234.12",
    "last_24h_pnl_percent": "+2.34",
    "webhook_url": "https://api.service.com/v1/webhook/binance/xxx",
    "connected_exchanges": [
      {
        "exchange": "binance",
        "markets": ["spot", "futures_um"],
        "key_count": 1,
        "status": "connected"
      }
    ],
    "recent_trades": [
      {
        "log_id": 501,
        "ticker": "BTCUSDT",
        "action": "open_long",
        "status": "SUCCESS",
        "created_at": "2026-01-22T10:00:00Z"
      }
    ]
  }
}
```

---

### 7.2 거래 성과 통계

기간별 거래 성과 및 분석 데이터

```http
GET /stats/performance
Authorization: Bearer <token>
```

**Query Parameters**
| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|---------|------|------|--------|------|
| `from` | string | No | 30일 전 | 시작 날짜 (ISO 8601) |
| `to` | string | No | 현재 | 종료 날짜 (ISO 8601) |
| `interval` | string | No | day | day, week, month |

**Response 200**

```json
{
  "ok": true,
  "data": {
    "period": {
      "from": "2026-01-01T00:00:00Z",
      "to": "2026-01-31T23:59:59Z"
    },
    "summary": {
      "total_trades": 234,
      "win_rate": 67.5,
      "avg_profit_percent": "+12.3",
      "avg_loss_percent": "-2.1",
      "profit_factor": 2.8,
      "sharpe_ratio": 1.45,
      "max_drawdown": "-8.5"
    },
    "by_symbol": [
      {
        "symbol": "BTCUSDT",
        "trades": 45,
        "win_rate": 71.1,
        "pnl": "+567.89",
        "pnl_percent": "+5.67"
      }
    ],
    "by_action": {
      "open_long": { "count": 120, "win_rate": 70.0 },
      "open_short": { "count": 80, "win_rate": 62.5 },
      "close_long": { "count": 100, "win_rate": 65.0 },
      "close_short": { "count": 70, "win_rate": 71.4 }
    },
    "timeline": [
      {
        "date": "2026-01-01",
        "trades": 8,
        "pnl": "+45.67",
        "cumulative_pnl": "+45.67"
      }
    ]
  }
}
```

---

## 8. Notifications API

### 8.1 알림 목록 조회

```http
GET /notifications
Authorization: Bearer <token>
```

**Query Parameters**
| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|---------|------|------|--------|------|
| `page` | integer | No | 1 | 페이지 번호 |
| `limit` | integer | No | 20 | 페이지당 항목 수 |
| `unread_only` | boolean | No | false | 읽지 않은 알림만 조회 |
| `type` | string | No | - | 알림 타입 필터 |

**Response 200**

```json
{
  "ok": true,
  "data": {
    "items": [
      {
        "id": 1,
        "type": "TRADE_SUCCESS",
        "title": "Long position opened",
        "message": "BTCUSDT long @ $50,000",
        "severity": "info",
        "read": false,
        "metadata": {
          "log_id": 501,
          "signal_id": "1737360000000"
        },
        "created_at": "2026-01-22T10:00:00Z"
      }
    ],
    "unread_count": 5,
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45
    }
  }
}
```

**Notification Types:**

- `TRADE_SUCCESS`: 거래 성공
- `TRADE_FAIL`: 거래 실패
- `PARTIAL_FAIL`: 부분 실패
- `API_KEY_INVALID`: API 키 오류
- `POSITION_LIQUIDATED`: 청산 경고
- `SYSTEM_ALERT`: 시스템 알림

---

### 8.2 알림 읽음 처리

```http
POST /notifications/:id/read
Authorization: Bearer <token>
```

**Response 200**

```json
{
  "ok": true,
  "data": {
    "id": 1,
    "read": true,
    "read_at": "2026-01-22T10:30:00Z"
  }
}
```

---

### 8.3 모든 알림 읽음 처리

```http
POST /notifications/read-all
Authorization: Bearer <token>
```

**Response 200**

```json
{
  "ok": true,
  "data": {
    "marked_read": 15
  }
}
```

---

## 9. Settings API

### 9.1 사용자 설정 조회

```http
GET /users/settings
Authorization: Bearer <token>
```

**Response 200**

```json
{
  "ok": true,
  "data": {
    "notifications": {
      "discord": {
        "enabled": true,
        "webhook_url": "https://discord.com/api/webhooks/..."
      },
      "telegram": {
        "enabled": false,
        "chat_id": null
      },
      "email": {
        "enabled": true
      }
    },
    "trading": {
      "default_leverage": 10,
      "default_position_size_percent": 50,
      "auto_retry_failed_orders": true,
      "max_retry_count": 3
    },
    "risk_management": {
      "max_position_size_usdt": 10000,
      "daily_loss_limit_usdt": 1000,
      "max_concurrent_positions": 5
    }
  }
}
```

---

### 9.2 사용자 설정 업데이트

```http
PUT /users/settings
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body**

```json
{
  "notifications": {
    "discord": {
      "enabled": true,
      "webhook_url": "https://discord.com/api/webhooks/new_url"
    }
  },
  "trading": {
    "default_leverage": 15
  }
}
```

**Response 200**

```json
{
  "ok": true,
  "data": {
    "updated": true,
    "settings": {
      /* 전체 설정 */
    }
  }
}
```

---

## 10. 에러 코드

### 공통 에러 코드

| 코드                  | HTTP Status | 설명                       |
| --------------------- | ----------- | -------------------------- |
| `VALIDATION_ERROR`    | 400         | 요청 데이터 검증 실패      |
| `UNAUTHORIZED`        | 401         | 인증 실패 (토큰 없음/만료) |
| `FORBIDDEN`           | 403         | 권한 없음                  |
| `NOT_FOUND`           | 404         | 리소스 없음                |
| `CONFLICT`            | 409         | 충돌 (중복 등)             |
| `RATE_LIMIT_EXCEEDED` | 429         | Rate limit 초과            |
| `INTERNAL_ERROR`      | 500         | 서버 내부 오류             |

### 도메인별 에러 코드

**User/Auth**

- `INVALID_TOKEN`: 유효하지 않은 인증 토큰
- `TOKEN_EXPIRED`: 토큰 만료
- `USER_NOT_FOUND`: 사용자 없음

**Exchange Key**

- `KEY_NOT_FOUND`: API 키 없음
- `DUPLICATE_KEY`: 중복 API 키
- `INVALID_API_KEY`: 유효하지 않은 API 키
- `INSUFFICIENT_PERMISSIONS`: 권한 부족

**Trade**

- `LOG_NOT_FOUND`: 거래 기록 없음
- `POSITION_NOT_FOUND`: 포지션 없음
- `INSUFFICIENT_BALANCE`: 잔고 부족

**Webhook**

- `PROVIDER_NOT_FOUND`: 지원하지 않는 provider
- `ENQUEUE_FAILED`: SQS 전송 실패
- `LOCK_CONFLICT`: 처리 중 충돌

---

## 11. 공통 규칙

### 페이징

모든 list 엔드포인트는 동일한 페이징 규칙 사용:

**Query Parameters:**

- `page`: 페이지 번호 (1부터 시작, 기본값: 1)
- `limit`: 페이지당 항목 수 (최대 100, 기본값: 20)

**Response:**

```json
{
  "items": [
    /* 데이터 */
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 152,
    "total_pages": 8
  }
}
```

---

### 날짜/시간 포맷

모든 날짜/시간은 **ISO 8601** 형식 (UTC):

```
2026-01-22T10:30:00Z
```

---

### Rate Limiting

**사용자별:**

- 10 req/sec (Burst)
- 100 req/min (Sustained)

**Response Headers:**

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1737540600
```

**Rate limit 초과 시:**

```json
{
  "ok": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests",
    "retry_after": 5
  }
}
```

---

### CORS

프론트엔드 도메인에서 API 호출 허용:

```
Access-Control-Allow-Origin: https://yourdomain.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

---

### Pagination Patterns

모든 리스트 조회 API는 다음 페이징 규칙을 따릅니다:

- `page`: 페이지 번호 (1부터 시작, 기본값: 1)
- `limit`: 페이지당 항목 수 (기본값: 20, 최대: 100)
- 응답에는 `pagination` 객체 포함 (`page`, `limit`, `total`, `total_pages`)

---

### Caching

**Cacheable Endpoints:**

- `GET /users/me`: 5분
- `GET /users/keys`: 1분
- `GET /trade/positions`: 10초
- `GET /trade/balances`: 10초

**Cache Headers:**

```http
Cache-Control: max-age=300, private
ETag: "abc123xyz"
```

---

## 12. Webhook Builder API

> Public Endpoint (Authorization 불필요)

### 12.1 Webhook Builder 옵션 조회

프론트엔드 Webhook Builder UI에서 사용할 옵션 목록을 반환합니다.

```http
GET /webhook-builder/options
```

**Response 200**

```json
{
  "ok": true,
  "data": {
    "exchanges": [{ "value": "binance", "label": "Binance" }],
    "markets": [
      { "value": "spot", "label": "Spot" },
      { "value": "futures_um", "label": "Futures USDT-M" },
      { "value": "futures_cm", "label": "Futures Coin-M" }
    ],
    "actions": [
      { "value": "open_long", "label": "Open Long (롱 진입)" },
      { "value": "open_short", "label": "Open Short (숏 진입)" },
      { "value": "close_long", "label": "Close Long (롱 청산)" },
      { "value": "close_short", "label": "Close Short (숏 청산)" },
      { "value": "close_all", "label": "Close All (전체 청산)" }
    ],
    "entryTypes": [
      { "value": "market", "label": "Market (시장가)" },
      { "value": "limit", "label": "Limit (지정가)" }
    ],
    "qtyTypes": [
      { "value": "percent", "label": "Percent (% 비율)" },
      { "value": "fixed", "label": "Fixed (고정 수량)" }
    ],
    "tpSlTypes": [
      { "value": "percent", "label": "Percent (진입가 대비 %)" },
      { "value": "price", "label": "Price (지정가)" }
    ],
    "positionModes": [
      { "value": "ONE_WAY", "label": "One-way Mode (단방향)" },
      { "value": "HEDGE", "label": "Hedge Mode (헤지)" }
    ],
    "quoteAssets": [
      { "value": "USDT", "label": "USDT (Tether)" },
      { "value": "USDC", "label": "USDC (USD Coin)" }
    ],
    "defaults": {
      "leverage": { "min": 1, "max": 125, "default": 10 },
      "qtyPercent": { "min": 1, "max": 100, "default": 50 },
      "stopLossPercent": { "min": 0.1, "max": 50, "default": 2 },
      "takeProfitPercent": { "min": 0.1, "max": 100, "default": 5 }
    }
  }
}
```

**Response Schema**

| 필드            | 타입             | 설명        |
| --------------- | ---------------- | ----------- |
| `exchanges`     | `SelectOption[]` | 거래소 목록 |
| `markets`       | `SelectOption[]` | 시장 타입   |
| `actions`       | `SelectOption[]` | 주문 액션   |
| `entryTypes`    | `SelectOption[]` | 진입 타입   |
| `qtyTypes`      | `SelectOption[]` | 수량 타입   |
| `tpSlTypes`     | `SelectOption[]` | TP/SL 타입  |
| `positionModes` | `SelectOption[]` | 포지션 모드 |
| `quoteAssets`   | `SelectOption[]` | 쿼트 자산   |
| `defaults`      | `Defaults`       | 기본값 범위 |

**SelectOption**

| 필드    | 타입   | 설명         |
| ------- | ------ | ------------ |
| `value` | string | 실제 전송 값 |
| `label` | string | UI 표시 라벨 |

**Defaults**

| 필드                | 타입          | 설명          |
| ------------------- | ------------- | ------------- |
| `leverage`          | `NumberRange` | 레버리지 범위 |
| `qtyPercent`        | `NumberRange` | 수량 % 범위   |
| `stopLossPercent`   | `NumberRange` | 손절 % 범위   |
| `takeProfitPercent` | `NumberRange` | 익절 % 범위   |

**NumberRange**

| 필드      | 타입   | 설명   |
| --------- | ------ | ------ |
| `min`     | number | 최소값 |
| `max`     | number | 최대값 |
| `default` | number | 기본값 |

---

### 12.2 TradingView 웹훅 메시지 생성

선택된 옵션으로 TradingView Alert 메시지를 생성합니다.

```http
POST /webhook-builder/generate
Content-Type: application/json
```

**Request Body**

```json
{
  "exchange": "binance",
  "market": "futures_um",
  "ticker": "BTCUSDT",
  "action": "open_long",
  "entry": { "type": "limit", "price": "{{close}}" },
  "qty": { "type": "percent", "value": 50 },
  "strategy": {
    "stop_loss": { "type": "percent", "value": 2.0 },
    "take_profit": [
      { "type": "percent", "value": 5.0, "qty_percent": 50 },
      { "type": "percent", "value": 10.0, "qty_percent": 50 }
    ]
  },
  "options": {
    "leverage": 10,
    "position_mode": "ONE_WAY",
    "reduce_only": false
  },
  "quote_asset": "USDT"
}
```

**Request Schema (요약)**

| 필드          | 타입   | 필수 | 설명                                                                |
| ------------- | ------ | ---- | ------------------------------------------------------------------- |
| `exchange`    | string | Yes  | 거래소 (현재 binance 고정)                                          |
| `market`      | string | Yes  | `spot`, `futures_um`, `futures_cm`                                  |
| `ticker`      | string | Yes  | 거래 심볼 (대문자 변환됨)                                           |
| `action`      | string | Yes  | `open_long`, `open_short`, `close_long`, `close_short`, `close_all` |
| `entry`       | object | Yes  | 진입 주문 설정                                                      |
| `qty`         | object | Yes  | 수량 설정                                                           |
| `strategy`    | object | No   | TP/SL 설정                                                          |
| `options`     | object | No   | 레버리지/포지션 옵션                                                |
| `quote_asset` | string | No   | `USDT` or `USDC`                                                    |

**entry**

| 필드    | 타입             | 필수 | 설명                                             |
| ------- | ---------------- | ---- | ------------------------------------------------ |
| `type`  | string           | Yes  | `market` or `limit`                              |
| `price` | number \| string | No   | `limit`일 때 필수 (TradingView placeholder 허용) |

**qty**

| 필드    | 타입             | 필수 | 설명                         |
| ------- | ---------------- | ---- | ---------------------------- |
| `type`  | string           | Yes  | `percent` or `fixed`         |
| `value` | number \| string | No   | TradingView placeholder 허용 |

**strategy**

| 필드          | 타입     | 필수 | 설명                    |
| ------------- | -------- | ---- | ----------------------- |
| `stop_loss`   | object   | No   | 손절 설정               |
| `take_profit` | object[] | No   | 익절 설정 (다단계 배열) |

**tp/sl**

| 필드          | 타입             | 필수 | 설명                         |
| ------------- | ---------------- | ---- | ---------------------------- |
| `type`        | string           | Yes  | `percent` or `price`         |
| `value`       | number \| string | No   | TradingView placeholder 허용 |
| `qty_percent` | number           | No   | 부분 청산 비율 (0~100)       |

**options**

| 필드            | 타입    | 필수 | 설명                 |
| --------------- | ------- | ---- | -------------------- |
| `leverage`      | number  | No   | 1~125                |
| `position_mode` | string  | No   | `ONE_WAY` or `HEDGE` |
| `reduce_only`   | boolean | No   | 리듀스 온리          |

**Response 200**

```json
{
  "ok": true,
  "data": {
    "message": "{\n  \"exchange\": \"binance\",\n  \"market\": \"futures_um\",\n  \"ticker\": \"BTCUSDT\",\n  \"action\": \"open_long\",\n  \"entry\": { \"type\": \"limit\", \"price\": \"{{close}}\" },\n  \"qty\": { \"type\": \"percent\", \"value\": 50 },\n  \"quote_asset\": \"USDT\",\n  \"strategy\": {\n    \"stop_loss\": { \"type\": \"percent\", \"value\": 2 },\n    \"take_profit\": [\n      { \"type\": \"percent\", \"value\": 5, \"qty_percent\": 50 },\n      { \"type\": \"percent\", \"value\": 10, \"qty_percent\": 50 }\n    ]\n  },\n  \"options\": {\n    \"signal_id\": \"{{timenow}}\",\n    \"leverage\": 10,\n    \"position_mode\": \"ONE_WAY\",\n    \"reduce_only\": false\n  }\n}",
    "formatted": {
      "exchange": "binance",
      "market": "futures_um",
      "ticker": "BTCUSDT",
      "action": "open_long",
      "entry": { "type": "limit", "price": "{{close}}" },
      "qty": { "type": "percent", "value": 50 },
      "quote_asset": "USDT",
      "strategy": {
        "stop_loss": { "type": "percent", "value": 2 },
        "take_profit": [
          { "type": "percent", "value": 5, "qty_percent": 50 },
          { "type": "percent", "value": 10, "qty_percent": 50 }
        ]
      },
      "options": {
        "signal_id": "{{timenow}}",
        "leverage": 10,
        "position_mode": "ONE_WAY",
        "reduce_only": false
      }
    }
  }
}
```

> [!NOTE]
> `options.signal_id`는 서버에서 자동으로 `{{timenow}}`로 추가됩니다.
> `strategy`, `quote_asset` 등은 값이 없으면 응답에서 제거됩니다.

---

## 📝 변경 이력 (Changelog)

### 2026-01-24

**응답 구조 업데이트 - ResponseInterceptor 래핑 반영**

#### 변경 사항:

1. **공통 응답 포맷 재정의**
   - ResponseInterceptor의 병합 구조 문서화
   - Standard Fields: `ok`, `data`, `request_id`, `timestamp`
   -
   - 응답 필드 설명 테이블 추가

2. **Exchange Keys API 응답 스키마 수정**
   - `GET /users/keys`: 실제 응답 구조로 변경
   - 필드명 통일 (`keyId`, `accessKeyMasked`, `createdAt` 등)

#### 기술적 배경:

```typescript
// src/common/interceptors/response.interceptor.ts
// 모든 컨트롤러 응답을 자동으로 래핑함
return next.handle().pipe(
  map((data) => ({
    success: true,
    data, // 여기에 controller의 {ok, data}가 들어감
    request_id: request?.id,
    timestamp: new Date().toISOString(),
  })),
);
```

#### 영향 범위:

- ✅ 섹션 1: 기본 정보 > 공통 응답 포맷
- ✅ 섹션 4: Exchange Key Management API
  - 4.2 거래소 키 목록 조회 (GET /users/keys)

#### 프론트엔드 처리:

```typescript
// 실제 데이터에 접근하기 위한 unwrapResponse 유틸리티
function unwrapResponse<T>(response: ApiResponse<T>): T {
  return response.data; // response.data.data를 반환
}

// 사용 예시
const response = await apiClient.get("/users/keys");
const keys = unwrapResponse(response.data);
// keys는 이제 ExchangeKey[] 배열
```

---

**Webhook Builder API 문서 추가**

#### 변경 사항:

1. **Webhook Builder API 섹션 추가** (섹션 12)
2. **옵션 조회/메시지 생성 요청·응답 스키마 정의**

#### 변경 이유:

- 백엔드 구현(`src/modules/webhook-builder`)과 문서 불일치 해소
- 프론트엔드에서 사용할 정확한 스키마/예시 제공

#### 영향받는 섹션:

- ✅ 12. Webhook Builder API

---

### v1.0 - 2026-01-22

초안 작성

---

**문서 버전**: v1.1  
**최종 수정**: 2026-01-24  
**다음 업데이트**: 나머지 API 엔드포인트 응답 구조 통일
