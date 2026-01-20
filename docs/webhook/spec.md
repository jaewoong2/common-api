# ✅ [SPEC v2.8-FINAL+API] Serverless Async Execution Engine

Binance Spot + USDT-M Futures | SQS FIFO + Postgres-only | SaaS Edition

## 0. 기본 정보

### Base URL
`https://api.service.com/v1`

### 인증 방식
- Dashboard/API 인증: `Authorization: Bearer <access_token>`
- Webhook 인증: URL Path Param `:provider/:auth_token` + (옵션) HMAC 헤더

### provider 라우팅 규칙
- Webhook 엔드포인트는 `/webhook/:provider/:auth_token` 형식만 허용 (REST only)
- provider 값은 배포/설정으로 확장하며 스펙에서는 고정하지 않음
- 예시: `binance`, `hantoo` (국내 증권사 API 예시)

### 공통 응답 포맷
모든 API는 아래 규격을 따른다.

**✅ 성공**
```json
{
  "ok": true,
  "data": {},
  "meta": { "trace_id": "..." }
}
```

**❌ 실패**
```json
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "qty.value must be positive",
    "details": {}
  },
  "meta": { "trace_id": "..." }
}
```

## 1. Public / Auth API

### 1.1 회원가입 / 로그인 (기존 서비스 사용)

> [!IMPORTANT]
> 회원가입 및 로그인은 기존에 구축되어 있는 인증 서비스/엔드포인트를 사용합니다.
> 별도 구현 없이 기존 시스템과 통합하여 사용하세요.

**기존 서비스 엔드포인트 사용**
- POST /auth/register - 회원가입
- POST /auth/login - 로그인  
- POST /auth/logout - 로그아웃

상세 스펙은 기존 인증 서비스 문서를 참조하세요.

## 2. User / Settings API

### 2.1 내 정보 조회

#### GET /users/me
- Auth: Bearer

**Response 200**
```json
{
  "ok": true,
  "data": {
    "user_id": 1,
    "email": "test@a.com",
    "auth_token": "a3c1...uuid",
    "created_at": "2026-01-19T10:00:00Z"
  }
}
```

✅ 여기서 **auth_token은 "Webhook URL 생성용"**이라 무조건 내려줌.

### 2.2 Webhook URL 조회

#### GET /users/webhook
- Auth: Bearer

**Response 200**
```json
{
  "ok": true,
  "data": {
    "webhook_url": "https://api.service.com/v1/webhook/binance/a3c1...uuid"
  }
}
```

✅ provider는 호출 시 선택하는 라우팅 키이며 예시는 `binance` 기준이다.

### 2.3 Webhook Secret (HMAC) 활성화/재발급 (선택 기능)
SaaS면 이거 있으면 해킹/리플레이 공격 방어력 상승

#### POST /users/webhook/secret/rotate
- Auth: Bearer

**Response 200**
```json
{
  "ok": true,
  "data": {
    "webhook_secret": "masked_or_partial",
    "enabled": true
  }
}
```

## 3. Exchange Key Management API (거래소 키)

### 3.1 거래소 키 등록

#### POST /users/keys
- Auth: Bearer

**Request**
```json
{
  "exchange": "binance",
  "label": "main",
  "access_key": "AK...",
  "secret_key": "SK..."
}
```

**Rules**
- secret_key는 절대 평문 저장 금지
- **AWS KMS (Key Management Service)를 사용하여 암호화 키 관리**
  - KMS CMK(Customer Master Key)로 데이터 키 생성/관리
  - Envelope Encryption 패턴 사용
  - DB에는 암호화된 secret_key + KMS 데이터 키 메타데이터 저장
- label은 유저 내 중복 가능(허용) or unique(선택)

**Response 201**
```json
{
  "ok": true,
  "data": {
    "key_id": 10
  }
}
```

**Errors**
- `400 VALIDATION_ERROR`
- `409 DUPLICATE_KEY` (원하면 exchange+access_key unique 걸어도 됨)

### 3.2 거래소 키 목록 조회 (Secret 마스킹)

#### GET /users/keys
- Auth: Bearer

**Response 200**
```json
{
  "ok": true,
  "data": [
    {
      "key_id": 10,
      "exchange": "binance",
      "label": "main",
      "access_key_masked": "AK***1234",
      "created_at": "2026-01-19T10:00:00Z"
    }
  ]
}
```

### 3.3 거래소 키 삭제

#### DELETE /users/keys/:key_id
- Auth: Bearer

**Response 200**
```json
{ "ok": true, "data": {} }
```

**Errors**
- `404 KEY_NOT_FOUND`

## 4. Logs / History API (매매 이력)

### 4.1 매매 이력 조회 (Paging + Filter)

#### GET /logs
- Auth: Bearer

**Query Params**
- page (default 1)
- limit (default 20, max 100)
- status (optional: SUCCESS|FAIL|PARTIAL_FAIL|RETRYING)
- ticker (optional)
- market (optional: spot|futures_um)
- provider (optional: ex. binance, hantoo)
- from / to (optional ISO date)

**Response 200**
```json
{
  "ok": true,
  "data": {
    "items": [
      {
        "log_id": 501,
        "signal_id": "123",
        "provider": "binance",
        "market": "futures_um",
        "ticker": "BTCUSDT",
        "action": "open_long",
        "status": "SUCCESS",
        "created_at": "2026-01-19T10:00:00Z"
      }
    ],
    "page": 1,
    "limit": 20,
    "total": 132
  }
}
```

### 4.2 매매 이력 상세 조회 (Entry/Exit JSON 보기)

#### GET /logs/:log_id
- Auth: Bearer

**Response 200**
```json
{
  "ok": true,
  "data": {
    "log_id": 501,
    "signal_id": "123",
    "provider": "binance",
    "request_json": {},
    "entry_json": {},
    "exit_json": {},
    "error_json": null
  }
}
```

## 5. Webhook Receiver API (TradingView → Receiver)

### 5.1 Webhook 수신

#### POST /webhook/:provider/:auth_token
- Auth: Path Param (:auth_token)

> [!WARNING]
> **TradingView 웹훅 제약사항**
> TradingView는 웹훅 요청 시 커스텀 헤더(X-TIMESTAMP, X-SIGNATURE 등)를 전송할 수 없습니다.
> 따라서 HMAC 서명 기반 인증은 **사용 불가**하며, **auth_token 기반 인증만** 사용합니다.
> 보안 강화가 필요한 경우 IP 화이트리스트, Rate Limiting 등 다른 방법을 고려하세요.

**Request Body**
```json
{
  "exchange": "binance",
  "market": "futures_um",
  "ticker": "BTCUSDT",
  "action": "open_long",
  "qty": { "type": "percent", "value": 50 },
  "strategy": {
    "stop_loss": { "type": "percent", "value": 2.0 },
    "take_profit": { "type": "percent", "value": 5.0 }
  },
  "options": {
    "leverage": 10,
    "position_mode": "ONE_WAY",
    "reduce_only": false,
    "signal_id": "{{timenow}}"
  }
}
```

✅ provider는 Path Param으로 전달하며, payload의 provider/거래소 정보가 있더라도 라우팅의 기준은 Path Param이다.  
✅ provider와 payload의 exchange가 동시에 존재하는 경우 불일치 시 400 처리.

**Receiver 처리 흐름 (중요)**
1. Payload 검증 (DTO validation)
2. DB에 webhook_requests 레코드 INSERT (status=RECEIVED)
3. **`job_service`를 통해 job message 발행** (Webhook Event SQS로 전송)
4. 성공 시 status=QUEUED 업데이트
5. 응답 반환 (job_id 포함)

> [!NOTE]
> **Job Service 통합**
> Receiver는 직접 SQS에 메시지를 보내지 않고, `job_service`를 사용합니다.
> Job message는 **Webhook Event SQS**로 전송되며, Lambda가 event source mapping으로 자동 실행됩니다.
> 상세 아키텍처는 [job_message_architecture.md](./job_message_architecture.md) 참조.

**✅ Response 200 - queued**
```json
{
  "ok": true,
  "data": {
    "status": "queued",
    "job_id": "550e8400-e29b-41d4-a716-446655440000",
    "trace_id": "sqs_message_id_here"
  }
}
```

**✅ Response 200 - already_processed**
```json
{
  "ok": true,
  "data": {
    "status": "already_processed"
  }
}
```

**❌ 400 - payload invalid**
```json
{
  "ok": false,
  "error": { "code": "VALIDATION_ERROR", "message": "invalid schema" }
}
```

**❌ 401 - token invalid / signature mismatch**
```json
{
  "ok": false,
  "error": { "code": "UNAUTHORIZED", "message": "invalid token" }
}
```

**❌ 500 - enqueue failed**
```json
{
  "ok": false,
  "error": { "code": "ENQUEUE_FAILED", "message": "failed to send SQS message" }
}
```

### 5.2 Payload 확장 원칙 (BasePayload + ProviderPayload)
- BasePayload는 모든 provider에서 공통으로 사용되는 최소 필드 집합이다.
- ProviderPayload는 BasePayload를 확장하며, provider별 프로토콜/필드를 어댑터에서만 해석한다.
- DTO/검증은 `BasePayload` + `ProviderPayload` 조합으로 분리한다.

**BasePayload (예시)**
```json
{
  "ticker": "BTCUSDT",
  "action": "open_long",
  "qty": { "type": "percent", "value": 50 },
  "strategy": {
    "stop_loss": { "type": "percent", "value": 2.0 },
    "take_profit": { "type": "percent", "value": 5.0 }
  },
  "options": {
    "signal_id": "{{timenow}}"
  }
}
```

**ProviderPayload (예시: binance)**
```json
{
  "exchange": "binance",
  "market": "futures_um",
  "options": {
    "leverage": 10,
    "position_mode": "ONE_WAY"
  }
}
```

**ProviderPayload (예시: 국내 증권사 API 예: 한투증)**
```json
{
  "market": "KRX",
  "order_type": "LIMIT",
  "account_id": "12345678-01"
}
```

### 5.3 Provider Adapter 설계 (구체적 구현 가이드)

**설계 목표**
- 거래소/증권사별 프로토콜 차이를 추상화
- 새로운 provider 추가 시 기존 코드 수정 없이 확장 가능
- 공통 비즈니스 로직과 provider별 구현 완전 분리

**아키텍처 레이어**
```
Webhook Controller → Use Case → Provider Adapter Registry → Concrete Adapter
                                                           ↓
                                                    BinanceAdapter
                                                    HantooAdapter
                                                    UpbitAdapter
```

**1) Adapter 인터페이스 정의**
```ts
export interface ProviderAdapter {
  readonly provider: string;
  
  // Payload 검증 (provider별 스키마)
  validatePayload(payload: BasePayload): Promise<void>;
  
  // Payload → Provider API Request 변환
  transformRequest(payload: BasePayload): Promise<ProviderRequest>;
  
  // 주문 실행
  execute(request: ProviderRequest, credentials: ExchangeCredentials): Promise<ExecutionResult>;
  
  // Provider API Response → 표준 응답 변환
  transformResponse(providerResponse: any): ExecutionResult;
}

export interface ExecutionResult {
  success: boolean;
  entry_json?: EntryOrder;
  exit_json?: ExitOrders;
  error_json?: ErrorDetail;
}
```

**2) Binance Adapter 구현 예시**
```ts
@Injectable()
export class BinanceAdapter implements ProviderAdapter {
  readonly provider = 'binance';
  
  constructor(
    private readonly httpService: HttpService,
    private readonly config: ConfigService,
  ) {}
  
  async validatePayload(payload: BasePayload): Promise<void> {
    const schema = BinancePayloadSchema; // Zod/class-validator
    await schema.parseAsync(payload);
  }
  
  async transformRequest(payload: BasePayload): Promise<BinanceRequest> {
    // action → Binance API params 변환
    // qty.percent → USDT 금액 계산
    // leverage 설정 등
    return { /* Binance-specific request */ };
  }
  
  async execute(request: BinanceRequest, credentials: ExchangeCredentials): Promise<ExecutionResult> {
    // Binance REST API 호출
    // clientOrderId 생성
    // Entry + TP/SL (OCO or 개별) 주문
    const entryResult = await this.placeOrder(request.entry);
    const exitResult = await this.placeExitOrders(request.exit);
    
    return this.transformResponse({ entry: entryResult, exit: exitResult });
  }
  
  transformResponse(providerResponse: any): ExecutionResult {
    return {
      success: true,
      entry_json: { /* 표준화된 Entry */ },
      exit_json: { /* 표준화된 Exit */ },
    };
  }
}
```

**3) Provider Adapter Registry (DI 기반 라우팅)**
```ts
@Injectable()
export class ProviderAdapterRegistry {
  private readonly adapters = new Map<string, ProviderAdapter>();
  
  constructor(
    @Inject(PROVIDER_ADAPTERS) adapters: ProviderAdapter[],
  ) {
    adapters.forEach(adapter => {
      this.adapters.set(adapter.provider, adapter);
    });
  }
  
  getAdapter(provider: string): ProviderAdapter {
    const adapter = this.adapters.get(provider);
    if (!adapter) {
      throw new ProviderNotSupportedException(provider);
    }
    return adapter;
  }
}
```

**4) Use Case에서 사용**
```ts
@Injectable()
export class ExecuteWebhookUseCase {
  constructor(
    private readonly registry: ProviderAdapterRegistry,
    private readonly keyService: ExchangeKeyService,
  ) {}
  
  async execute(provider: string, payload: BasePayload, userId: number): Promise<ExecutionResult> {
    // 1. Provider Adapter 가져오기
    const adapter = this.registry.getAdapter(provider);
    
    // 2. Payload 검증
    await adapter.validatePayload(payload);
    
    // 3. Request 변환
    const request = await adapter.transformRequest(payload);
    
    // 4. 거래소 키 조회
    const credentials = await this.keyService.getCredentials(userId, payload.exchange);
    
    // 5. 실행
    return adapter.execute(request, credentials);
  }
}
```

**5) Module 등록**
```ts
@Module({
  providers: [
    BinanceAdapter,
    HantooAdapter,
    {
      provide: PROVIDER_ADAPTERS,
      useFactory: (
        binance: BinanceAdapter,
        hantoo: HantooAdapter,
      ) => [binance, hantoo],
      inject: [BinanceAdapter, HantooAdapter],
    },
    ProviderAdapterRegistry,
    ExecuteWebhookUseCase,
  ],
})
export class WebhookModule {}
```

**확장 시나리오: Upbit Adapter 추가**
1. `UpbitAdapter` 클래스 구현 (ProviderAdapter 인터페이스 준수)
2. Module providers에 추가
3. PROVIDER_ADAPTERS factory에 inject
→ 기존 코드 수정 없이 확장 완료

### 5.4 Internal Execution API (Lambda 전용)

> [!WARNING]
> **내부 전용 엔드포인트**
> 이 API는 Lambda function 전용이며 외부에 노출되면 안 됩니다.
> - VPC 내부 전용 또는 IAM 인증 필수
> - API Gateway에서 제외하거나 IAM Authorizer 적용
> - Lambda execution role만 호출 가능

#### POST /webhook/execute
- Auth: IAM (Lambda execution role)
- **외부 노출 금지**

**Request**
```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "job_type": "webhook_execution",
  "user_id": 1,
  "payload": {
    "signal_id": "1737360000000",
    "provider": "binance",
    "auth_token": "a3c1...uuid",
    "request": {
      "exchange": "binance",
      "market": "futures_um",
      "ticker": "BTCUSDT",
      "action": "open_long",
      "qty": { "type": "percent", "value": 50 },
      "strategy": {
        "stop_loss": { "type": "percent", "value": 2.0 },
        "take_profit": { "type": "percent", "value": 5.0 }
      },
      "options": {
        "leverage": 10,
        "position_mode": "ONE_WAY",
        "signal_id": "1737360000000"
      }
    }
  },
  "metadata": {
    "trace_id": "sqs_msg_abc123",
    "retry_count": 0
  }
}
```

**처리 흐름**
1. Processing lock 획득 시도 (user_id + signal_id)
2. Lock 획득 실패 시:
   - `expires_at < now()` → Override update로 Lock 회수 후 진행
   - `expires_at >= now()` → 409 CONFLICT 반환 (다른 worker 처리 중)
3. Lock 획득 성공 시:
   - webhook_requests.status = PROCESSING 업데이트
   - Provider Adapter 통해 거래소 주문 실행
   - Entry + TP/SL 주문 실행
   - 결과 DB 저장 (entry_json, exit_json)
   - Processing lock 삭제
   - webhook_requests.status = DONE/FAIL/PARTIAL_FAIL 업데이트

**✅ Response 200 - Success**
```json
{
  "ok": true,
  "data": {
    "status": "DONE",
    "entry_json": {
      "order_id": "12345678",
      "symbol": "BTCUSDT",
      "side": "BUY",
      "quantity": "0.001",
      "price": "50000.00"
    },
    "exit_json": {
      "tp_order_id": "12345679",
      "sl_order_id": "12345680"
    }
  }
}
```

**✅ Response 200 - Partial Fail**
```json
{
  "ok": true,
  "data": {
    "status": "PARTIAL_FAIL",
    "entry_json": { "order_id": "12345678" },
    "exit_json": null,
    "error_json": {
      "message": "Failed to place TP/SL orders",
      "details": "Rate limit exceeded"
    }
  }
}
```

**❌ 409 - Lock conflict**
```json
{
  "ok": false,
  "error": {
    "code": "LOCK_CONFLICT",
    "message": "Another worker is processing this signal"
  }
}
```

**❌ 500 - Execution failed**
```json
{
  "ok": false,
  "error": {
    "code": "EXECUTION_FAILED",
    "message": "Binance API error",
    "details": {}
  }
}
```

## 6. Job Message Queue Architecture

이 시스템은 **dual SQS queue 아키텍처**를 사용합니다.

### 6.1 Queue 구조

**Common-API Queue (기존)**
- 목적: 범용 job queue
- 처리: Worker가 long polling으로 조회

**Webhook Event Queue (신규)**
- 목적: Event-driven Lambda trigger 전용
- 처리: SQS event source mapping으로 Lambda 자동 실행
- Message Group ID: `user_id` (FIFO 순서 보장)

### 6.2 Lambda Event Source Mapping

```yaml
Function: webhook-executor
Event Source: Webhook Event SQS (FIFO)
Batch Size: 1
Maximum Concurrency: 10
Visibility Timeout: 180s
maxReceiveCount: 3 → DLQ
```

### 6.3 처리 흐름

```
TradingView → Receiver → job_service → Webhook Event SQS
                                              ↓ (event trigger)
                                           Lambda
                                              ↓
                                    POST /webhook/execute
                                              ↓
                                      거래소 주문 실행
```

**상세 아키텍처:** [job_message_architecture.md](./job_message_architecture.md) 참조

## 7. Execution Status API (Webhook 요청 상태)

### 6.1 Webhook 요청 상태 조회 (signal_id 기준)
운영/유저 디버깅에 매우 유용

#### GET /requests/:signal_id
- Auth: Bearer

**Response 200**
```json
{
  "ok": true,
  "data": {
    "signal_id": "123",
    "status": "DONE",
    "provider": "binance",
    "market": "futures_um",
    "ticker": "BTCUSDT",
    "trace_id": "sqs...",
    "created_at": "2026-01-19T10:00:00Z"
  }
}
```

## 7. Admin / Ops API (운영용 — 필수)
SaaS 운영하면 무조건 필요함. 사용자/개발자/운영자 디버깅, 무손실 보장 마무리

### 7.1 Recovery Re-Enqueue (RECEIVED → QUEUED)

> [!NOTE]
> **Re-Enqueue와 DLQ Replay의 차이**
> - **Re-Enqueue**: Receiver가 메시지를 받았지만(RECEIVED) SQS에 넣지 못한 경우 복구
>   - DB에는 기록되었지만 큐에 없는 상태
>   - 원인: SQS 일시 장애, 네트워크 오류 등
> - **DLQ Replay**: Worker가 메시지를 처리했지만 실패하여 DLQ로 이동한 경우 재처리
>   - 메시지는 큐에 도달했지만 처리 중 실패 (예: 거래소 API 오류, 타임아웃)
>   - DLQ에 쌓인 실패 메시지를 수동으로 재시도

#### POST /admin/recovery/re-enqueue
- Auth: Admin Bearer (Role required)

**Request**
```json
{
  "max_items": 100
}
```

**Behavior**
- webhook_requests.status=RECEIVED AND created_at < now()-60s 인 것들을 조회
- SQS enqueue 재시도
- 성공 시 status=QUEUED 업데이트

**Response 200**
```json
{
  "ok": true,
  "data": {
    "requeued": 12
  }
}
```

### 7.2 DLQ 메시지 재처리 (Manual)

#### POST /admin/dlq/replay
- Auth: Admin Bearer

**Request**
```json
{
  "signal_id": "123"
}
```

**Behavior**
- DLQ에서 signal_id 매칭되는 메시지를 찾아 원큐로 재전송(또는 worker 직접 실행)
- 재처리 전 lock / status 체크 필수

**Response 200**
```json
{
  "ok": true,
  "data": { "replayed": true }
}
```

### 7.3 강제 Lock 해제 (Dead Lock 수동 해제) - 선택사항

> [!CAUTION]
> **이 엔드포인트의 필요성 재검토**
> - TTL (expires_at) 기반 자동 해제가 정상 동작하면 불필요
> - 수동 해제는 데이터 일관성 위험 (실제로 처리 중인 worker가 있을 수 있음)
> - **권장**: TTL을 3분으로 설정하고 자동 해제에만 의존
> - 긴급 상황에서만 사용하거나, 충분한 테스트 후 도입 여부 결정

#### POST /admin/locks/force-release (Optional)
- Auth: Admin Bearer

**Request**
```json
{
  "user_id": 1,
  "signal_id": "123"
}
```

**Response 200**
```json
{
  "ok": true,
  "data": { "released": true }
}
```

## 8. 핵심 스펙 디테일 (2% 채우기 3종 세트) ✅✅✅

### 8.1 processing_locks TTL (Dead Lock 방지)
- **expires_at = now() + 3 min** (가격 변동이 심한 암호화폐 특성상 3분이면 충분)
- insert conflict 시
  - expires_at < now() → override update로 회수
  - 아니면 다른 Worker 처리 중 → Ack 종료

> [!TIP]
> 암호화폐는 가격 변동성이 크므로 5분은 과도하게 긴 시간입니다.
> 3분 TTL로 설정하면 Dead Lock 복구가 더 빠르고, 오래된 시세 기준 주문을 방지할 수 있습니다.

### 8.2 Binance clientOrderId Deterministic 규칙
`{PROJECT}_U{userId}_SIG{signalId}_{TYPE}`

**예)**
```
WH_U1_SIG123_ENTRY
WH_U1_SIG123_TP
WH_U1_SIG123_SL
```

✅ Worker 재실행되어도 항상 동일한 값 생성

### 8.3 Spot OCO stopLimitPrice 보정(시장가처럼 동작)
- Spot은 STOP_MARKET이 없고 STOP_LIMIT 기반이라 stopLimitPrice를 stopPrice와 같게 두면 급락/급등 시 미체결 위험.

**Sell OCO (롱 청산)**
- stopLimitPrice = stopPrice × (1 - buffer)

**Buy OCO (숏 커버)**
- stopLimitPrice = stopPrice × (1 + buffer)

**buffer 기본값**
- 1% 기본
- 0.5% ~ 2% 옵션 가능

## 9. Health / Diagnostics API (필수)

### 9.1 헬스 체크

#### GET /health

**Response 200**
```json
{
  "ok": true,
  "data": {
    "status": "ok",
    "db": "ok",
    "sqs": "ok"
  }
}
```

## 10. Definition of Done (API 포함 최종)

**✅ Receiver**
- /webhook/:provider/:auth_token이 0.5초 내 응답? → **예, Receiver는 오직 검증+DB insert+enqueue만 수행하므로 빠른 응답 보장**
- 중복 signal_id는 200 already_processed? → **예, 멱등성 보장**
- enqueue 실패 시 500? → **예, ENQUEUE_FAILED 에러 코드 반환**
- provider 미지원/오타는 404 또는 400 처리? → **404 PROVIDER_NOT_FOUND 처리**

**✅ Worker**
- processing_locks TTL + override 동작? → **예, expires_at 3분 설정 + TTL 초과 시 자동 override**
- clientOrderId deterministic? → **예, {PROJECT}_U{userId}_SIG{signalId}_{TYPE} 규칙 준수**
- Exit 실패는 PARTIAL_FAIL + 알림 + 내부 1회 재시도? → **예, Entry 성공 + Exit 실패 시 PARTIAL_FAIL 상태 + Discord/Slack 알림 + 재시도 로직 포함**

**✅ Admin Ops**
- re-enqueue endpoint 존재? → **예, RECEIVED 상태가 오래된 항목을 SQS로 복구**
- DLQ replay endpoint 존재? → **예, DLQ에 쌓인 실패 메시지를 수동 재처리 (재시도 횟수 초과한 건)**
- lock force-release endpoint 존재? → **선택사항, TTL 자동 해제가 정상 동작하면 불필요하므로 초기에는 구현하지 않음**

**✅ Logs**
- /logs paging/filter 가능? → **예, page/limit + status/ticker/market/provider/date 필터 지원**
- /logs/:id 상세 조회 가능? → **예, request_json/entry_json/exit_json/error_json 포함 상세 정보 제공**
