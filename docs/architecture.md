# 1) 설계 MD — Common API Platform v1 (멀티테넌트 B)

## 0. 목표

- 여러 앱(초기 2~3개)을 **단일 Common API 플랫폼**으로 운영한다.
- 앱 서비스가 “정산/확정(도메인 로직)”을 소유하고,
- Common API는 **Identity/AuthZ + Wallet(포인트 원장) + Billing(상품/주문/구독 자리) + Jobs(재시도 플랫폼)**을 제공한다.
- **PG/구독만** 추후 Step Functions Saga로 확장한다(PG 확정 후).
- Annotation 을 통해서 실패 API의 경우 Jobs 재시도를 위해 Database insert 처리 지원.

---

## 1. Tenancy (app_id 서버 결정)

### 1.1 Host 기반 매핑

- `api.appA.com` → app_id=A
- `api.appB.com` → app_id=B
- `platform.api.your.com` → “플랫폼 테넌트”(Super Admin)

요청 처리:

1. 미들웨어가 `Host`로 `req.appId` 확정
2. 이후 **모든 DB 쿼리/권한/로직은 req.appId 기준**
3. 바디/쿼리로 들어오는 `app_id`는 **무시**

### 1.2 토큰(app_id) 일치 검사 (강추)

- Access token(JWT) claim에 `app_id` 포함
- 요청에서 확정된 `req.appId`와 불일치하면 401
  - 앱A 토큰을 앱B에서 재사용하는 사고 방지

---

## 2. 모듈 경계

### 2.1 Identity

- 소셜 OAuth + Magic Email Link(비번 없음)
- Refresh token은 서버에 hash 저장(세션 테이블)
- Logout = refresh revoke(권장)
- Me 조회/수정/탈퇴(soft delete)

### 2.2 AuthZ

- RBAC
  - App scoped: `APP_ADMIN`, `APP_OPERATOR`, `USER`
  - Platform scoped: `PLATFORM_SUPER_ADMIN` (플랫폼 테넌트에서만)
- Entitlement 스냅샷: `user_entitlements`에 tier/feature 저장

### 2.3 Wallet (포인트)

- 원칙: **Ledger(append-only) + Balance(snapshot) + Lots(만료/재고 대비)**
- 만료: 기본 `expires_at = NULL` (만료 없음)
- 모든 돈 관련 요청은 `X-Idempotency-Key` 필수

### 2.4 Billing

- Products/Prices CRUD (admin)
- 포인트 구매(결제): **DB 트랜잭션으로 주문 + wallet debit + paid**
- 구독/PG: 지금은 자리만, 추후 Step Functions Saga

### 2.5 Jobs(재시도 플랫폼)

- 실행: EventBridge Scheduler → `POST /internal/v1/jobs/run`
- 타입:
  - `CALLBACK_HTTP`: Common이 **앱 서비스 엔드포인트를 대신 호출** + 재시도/백오프/DEAD
  - `REWARD_GRANT`: wallet 처리 중 retryable 장애를 job으로 안전 재처리(옵션)

---

## 3. 공통 규칙 (운영/확장에 핵심)

### 3.1 Idempotency(멱등성) 강제 범위

- Wallet credit/debit
- Orders create/refund
- Jobs create (callback-http)
- (추후) 구독/결제 API

### 3.2 Traceability(추적가능성) 필수 필드

Wallet/Orders/Jobs 모두:

- `reason`
- `ref_type`, `ref_id`
- (그리고) `idempotency_key`

### 3.3 표준 에러 코드

- `INSUFFICIENT_FUNDS`
- `IDEMPOTENCY_KEY_REUSE`
- `IDEMPOTENCY_IN_PROGRESS`
- `FORBIDDEN`, `UNAUTHORIZED`, `NOT_FOUND`
- `INVALID_ARGUMENT`
- `INTERNAL_RETRYABLE`

---

## 4. MVP 구현 순서(추천)

1. Tenancy(Host→app_id) + apps/app_domains
2. Identity(매직링크/소셜) + 세션(revoke)
3. Wallet(credit/debit + idempotency)
4. Billing(products/prices + point orders + refund)
5. Jobs(CALLBACK_HTTP + runner + HMAC/allowlist)
6. Admin(App + Platform 최소 기능)
7. 구독/PG는 PG 확정 후 Step Functions로 연결

# 2) 자세한 API MD — Common API v1 (Request/Response JSON)

## 0. 공통

### Base URL

- 앱별: `https://api.appA.com`, `https://api.appB.com`
- 플랫폼: `https://platform.api.your.com`

### 공통 헤더

- `Authorization: Bearer <access_token>` (필요한 엔드포인트에만)
- `X-Request-Id: <uuid>` (선택, 없으면 서버가 생성)
- `X-Idempotency-Key: <string>` (지갑/주문/잡 생성 계열 필수)
- `Content-Type: application/json`

### 공통 성공 응답 포맷

```json
{
  "data": {},
  "request_id": "0b8d0e2e-..."
}
```

### 공통 에러 응답 포맷

```json
{
  "error": {
    "code": "INSUFFICIENT_FUNDS",
    "message": "Not enough points.",
    "details": {}
  },
  "request_id": "0b8d0e2e-..."
}
```
