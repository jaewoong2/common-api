# Technical Implementation Specification

> 본 문서는 [spec.md](./spec.md) 및 [job_message_architecture.md](./job_message_architecture.md)의 기술적 구현 상세를 다룹니다.

## 1. Database Schema

### 1.1 users

사용자 계정 정보

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  auth_token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,

  CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

CREATE INDEX idx_users_auth_token ON users(auth_token) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
```

**Retention Policy:** Soft delete (deleted_at), 1년 후 물리 삭제

---

### 1.2 webhook_requests

Webhook 수신 이력 (모든 요청 기록)

```sql
CREATE TABLE webhook_requests (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  signal_id VARCHAR(100) NOT NULL,
  provider VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'RECEIVED',
  job_id UUID NULL,
  trace_id VARCHAR(100) NULL,
  request_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_user_signal UNIQUE (user_id, signal_id),
  CONSTRAINT valid_status CHECK (status IN ('RECEIVED', 'QUEUED', 'PROCESSING', 'DONE', 'FAIL', 'PARTIAL_FAIL'))
);

-- Indexes
CREATE INDEX idx_webhook_requests_user_id ON webhook_requests(user_id);
CREATE INDEX idx_webhook_requests_signal_id ON webhook_requests(signal_id);
CREATE INDEX idx_webhook_requests_status ON webhook_requests(status);
CREATE INDEX idx_webhook_requests_created_at ON webhook_requests(created_at DESC);
CREATE INDEX idx_webhook_requests_user_created ON webhook_requests(user_id, created_at DESC);

-- Composite index for admin recovery queries
CREATE INDEX idx_webhook_requests_recovery ON webhook_requests(status, created_at)
  WHERE status = 'RECEIVED';
```

**Retention Policy:** 90일 보관 후 S3로 이관 (Parquet 포맷)

**파티셔닝:** 월별 파티셔닝 (created_at 기준)

```sql
-- Example partition
CREATE TABLE webhook_requests_2026_01 PARTITION OF webhook_requests
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
```

---

### 1.3 trade_logs

거래 실행 결과 (성공한 주문만 상세 기록)

```sql
CREATE TABLE trade_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  signal_id VARCHAR(100) NOT NULL,
  provider VARCHAR(50) NOT NULL,
  exchange VARCHAR(50) NOT NULL,
  market VARCHAR(20) NOT NULL,
  ticker VARCHAR(50) NOT NULL,
  action VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL,
  entry_json JSONB NULL,
  exit_json JSONB NULL,
  error_json JSONB NULL,
  request_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_trade_status CHECK (status IN ('SUCCESS', 'FAIL', 'PARTIAL_FAIL'))
) PARTITION BY RANGE (created_at);

-- Indexes
CREATE INDEX idx_trade_logs_user_id ON trade_logs(user_id, created_at DESC);
CREATE INDEX idx_trade_logs_signal_id ON trade_logs(signal_id);
CREATE INDEX idx_trade_logs_ticker ON trade_logs(ticker);
CREATE INDEX idx_trade_logs_status ON trade_logs(status);
CREATE INDEX idx_trade_logs_provider_market ON trade_logs(provider, market);

-- GIN index for JSONB queries
CREATE INDEX idx_trade_logs_entry_json ON trade_logs USING GIN (entry_json);
CREATE INDEX idx_trade_logs_exit_json ON trade_logs USING GIN (exit_json);
```

**파티셔닝 전략:** 월별 파티셔닝 (고성능 쿼리 + 빠른 삭제)

```sql
-- Monthly partitions
CREATE TABLE trade_logs_2026_01 PARTITION OF trade_logs
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

CREATE TABLE trade_logs_2026_02 PARTITION OF trade_logs
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
```

**Retention Policy:**

- DB: 90일 보관
- 이후 S3로 이관 (Parquet 포맷, GZIP 압축)
- S3: 1년 보관 후 Glacier로 이동

**자동화:**

```sql
-- Monthly cron job (pg_cron)
SELECT cron.schedule(
  'archive-old-trade-logs',
  '0 2 1 * *', -- 매월 1일 02:00
  $$
  -- 90일 이전 데이터를 S3로 export 후 파티션 삭제
  $$
);
```

---

### 1.4 exchange_keys

거래소 API 키 (AWS KMS 암호화)

```sql
CREATE TABLE exchange_keys (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exchange VARCHAR(50) NOT NULL,
  label VARCHAR(100) NOT NULL,
  access_key_enc TEXT NOT NULL, -- KMS encrypted
  secret_key_enc TEXT NOT NULL, -- KMS encrypted
  kms_data_key_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_user_exchange_label UNIQUE (user_id, exchange, label)
);

CREATE INDEX idx_exchange_keys_user_id ON exchange_keys(user_id);
CREATE INDEX idx_exchange_keys_user_exchange ON exchange_keys(user_id, exchange);
```

**보안:**

- `access_key_enc`, `secret_key_enc`: AWS KMS CMK로 암호화된 값
- `kms_data_key_id`: 암호화에 사용된 KMS 데이터 키 ID
- Envelope Encryption 패턴 사용

**Retention Policy:** 사용자 삭제 시 즉시 삭제 (CASCADE)

---

### 1.5 processing_locks

동시 처리 방지 락 (TTL 기반)

```sql
CREATE TABLE processing_locks (
  user_id INTEGER NOT NULL,
  signal_id VARCHAR(100) NOT NULL,
  lock_token UUID NOT NULL DEFAULT gen_random_uuid(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (user_id, signal_id)
);

CREATE INDEX idx_processing_locks_expires ON processing_locks(expires_at);
```

**TTL 정책:**

- `expires_at = NOW() + 3분`
- Override 로직: `expires_at < NOW()` 이면 UPDATE로 락 회수

**자동 정리:**

```sql
-- Cleanup job (매 5분)
DELETE FROM processing_locks WHERE expires_at < NOW() - INTERVAL '10 minutes';
```

**Retention Policy:** 처리 완료 시 즉시 DELETE (성공/실패 무관)

---

## 2. Rate Limiting

### 2.1 사용자별 Rate Limit

**정책:**

- **10 req/sec** (Burst)
- **100 req/min** (Sustained)

**구현:** Redis + Token Bucket 알고리즘

```typescript
// Token Bucket pseudo-code
interface RateLimit {
  key: string; // user_id
  tokens: number; // 현재 토큰 수
  capacity: number; // 최대 토큰 수 (10)
  refill_rate: number; // 초당 refill (10)
  last_refill: number; // Unix timestamp
}

async function checkRateLimit(userId: number): Promise<boolean> {
  const key = `ratelimit:user:${userId}`;
  const bucket = await redis.get(key);

  // Refill tokens
  const now = Date.now() / 1000;
  const elapsed = now - bucket.last_refill;
  const newTokens = Math.min(
    bucket.capacity,
    bucket.tokens + elapsed * bucket.refill_rate,
  );

  if (newTokens < 1) {
    return false; // Rate limited
  }

  await redis.set(
    key,
    {
      tokens: newTokens - 1,
      last_refill: now,
    },
    { EX: 120 },
  ); // 2분 TTL

  return true;
}
```

**응답:**

```json
HTTP 429 TOO_MANY_REQUESTS
{
  "ok": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "retry_after": 5
  }
}
```

---

### 2.2 IP 기반 Rate Limit

**정책:**

- **20 req/sec** (전체 IP)
- **200 req/min** (전체 IP)

**목적:** DDoS 방어, 인증 전 요청 제한

**구현:** Nginx/API Gateway level에서 처리

```nginx
limit_req_zone $binary_remote_addr zone=ip_limit:10m rate=20r/s;
limit_req zone=ip_limit burst=40 nodelay;
```

---

### 2.3 Provider API Rate Limit 관리

**Binance Futures API Limits:**

- **1200 requests/min** (가중치 포함)
- **Order API: 가중치 1-50** (복잡도에 따라)

**전략:**

```typescript
class BinanceRateLimiter {
  private weightUsed: number = 0;
  private windowStart: number = Date.now();

  async checkWeight(requestWeight: number): Promise<void> {
    const now = Date.now();

    // 1분 윈도우 초과 시 리셋
    if (now - this.windowStart > 60000) {
      this.weightUsed = 0;
      this.windowStart = now;
    }

    if (this.weightUsed + requestWeight > 1200) {
      const waitMs = 60000 - (now - this.windowStart);
      throw new RateLimitError(`Wait ${waitMs}ms`);
    }

    this.weightUsed += requestWeight;
  }
}

// Usage
await rateLimiter.checkWeight(5); // New Order 가중치
await binanceApi.placeOrder(...);
```

**Rate limit 초과 시:**

- Lambda에서 즉시 실패 처리 (재시도 없음)
- DB에 FAIL 상태 기록
- Discord/Slack 알림 전송

---

## 3. Lambda Worker Implementation

### 3.1 SQS Message Processing Flow

```
SQS Event → Lambda Handler → /webhook/execute API
                                    ↓
                              Lock 획득 시도
                                    ↓
                        [성공] → 거래소 주문 실행
                                    ↓
                              결과 DB 저장
                                    ↓
                              Lock 해제
                                    ↓
                        Lambda return (Ack)

                        [실패] → 409 CONFLICT
                                    ↓
                              Lambda return (Ack)
```

**중요:** 재시도 없음, 실패 시 즉시 알림만

---

### 3.2 Lambda Configuration

```yaml
Function Name: webhook-executor
Runtime: Node.js 20.x
Memory: 512 MB
Timeout: 180s (3분)
Reserved Concurrency: 10
Environment Variables:
  - API_ENDPOINT: https://internal-api.example.com
  - DISCORD_WEBHOOK_URL: https://discord.com/api/webhooks/...
  - LOG_LEVEL: INFO
VPC:
  Subnets: [private-subnet-1, private-subnet-2]
  Security Groups: [lambda-sg]
```

---

### 3.3 Event Source Mapping

```yaml
Event Source: Webhook Event SQS (FIFO)
Batch Size: 1 # 한 번에 1개씩 처리
Batch Window: 0 # 즉시 처리
Maximum Concurrency: 10 # 동시 실행 Lambda 최대 10개
Function Response Types: ReportBatchItemFailures
Scaling:
  Maximum Concurrency: 10
  Messages per batch: 1
Visibility Timeout: 180s # Lambda timeout과 동일
```

---

### 3.4 DLQ Policy - 필요성 검토

> [!CAUTION]
> **DLQ 필요성 재검토**
>
> **현재 아키텍처:**
>
> - 재시도 없음 (실패 시 즉시 알림)
> - Lock conflict는 정상 동작 (다른 Lambda 처리 중)
> - 거래소 API 오류는 DB에 FAIL 기록
>
> **DLQ가 필요한 경우:**
>
> - Lambda 자체 크래시 (코드 버그, OOM 등)
> - Internal API timeout/unreachable
>
> **권장 설정:**
>
> ```yaml
> maxReceiveCount: 1 # 1회만 시도
> DLQ: webhook-events-dlq (FIFO)
> Redrive Policy: Manual (Admin API)
> ```
>
> **DLQ 메시지는 사람이 직접 확인 후 재처리 여부 결정**

---

### 3.5 Lambda Handler (Pseudo-code)

```typescript
export async function handler(event: SQSEvent): Promise<SQSBatchResponse> {
  const failedItems: SQSBatchItemFailure[] = [];

  for (const record of event.Records) {
    try {
      const jobMessage = JSON.parse(record.body);

      // Call internal API
      const result = await axios.post(
        process.env.API_ENDPOINT + "/webhook/execute",
        jobMessage,
        {
          timeout: 170000, // 170초 (Lambda timeout보다 짧게)
          headers: {
            "X-Lambda-Request-Id": context.requestId,
          },
        },
      );

      // 성공 또는 PARTIAL_FAIL → Ack
      if (result.data.ok) {
        logger.info("Execution success", { job_id: jobMessage.job_id });

        // PARTIAL_FAIL 시 알림
        if (result.data.data.status === "PARTIAL_FAIL") {
          await sendDiscordAlert({
            type: "PARTIAL_FAIL",
            job_id: jobMessage.job_id,
            signal_id: jobMessage.payload.signal_id,
            error: result.data.data.error_json,
          });
        }
      }
    } catch (error) {
      // Lambda 크래시, API unreachable 등 → DLQ로
      logger.error("Lambda execution failed", { error, record });
      failedItems.push({ itemIdentifier: record.messageId });

      // 긴급 알림
      await sendDiscordAlert({
        type: "LAMBDA_ERROR",
        error: error.message,
        record,
      });
    }
  }

  return { batchItemFailures: failedItems };
}
```

**재시도 없음 정책:**

- 거래소 API 오류 → DB에 FAIL 기록 + 알림
- Lock conflict (409) → 정상 동작, Ack
- 5xx 에러, timeout → 알림 + Ack (재시도 안 함)

---

### 3.6 Graceful Shutdown

Lambda는 자동으로 graceful shutdown 지원 (SIGTERM)

```typescript
let isShuttingDown = false;

process.on("SIGTERM", async () => {
  isShuttingDown = true;
  logger.info("Received SIGTERM, graceful shutdown...");

  // 진행 중인 요청 완료 대기 (최대 10초)
  await sleep(10000);
});

// Handler에서 체크
if (isShuttingDown) {
  throw new Error("Shutting down");
}
```

---

## 4. Logging

### 4.1 Structured Logging Format (JSON)

```typescript
interface LogEntry {
  timestamp: string; // ISO 8601
  level: string; // ERROR/WARN/INFO/DEBUG
  service: string; // 'webhook-receiver' | 'webhook-executor'
  trace_id: string; // 요청 추적 ID
  user_id?: number;
  signal_id?: string;
  job_id?: string;
  message: string;
  metadata?: object;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}
```

**Example:**

```json
{
  "timestamp": "2026-01-20T12:00:00.000Z",
  "level": "ERROR",
  "service": "webhook-executor",
  "trace_id": "sqs_abc123",
  "user_id": 1,
  "signal_id": "1737360000000",
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Binance API error: Insufficient balance",
  "metadata": {
    "exchange": "binance",
    "ticker": "BTCUSDT",
    "error_code": "-2010"
  }
}
```

---

### 4.2 Log Levels

**ERROR:**

- 거래소 API 오류
- DB 쿼리 실패
- Lambda 크래시
- 예상치 못한 예외

**WARN:**

- Rate limit 근접 (80% 사용)
- Processing lock 지연 (expires_at 임박)
- 캐시 미스

**INFO:**

- Webhook 수신
- Job message 발행
- 주문 성공
- Lock 획득/해제

**DEBUG:**

- Request/Response 상세
- Provider Adapter 변환 과정
- 캐시 hit/miss 상세

---

### 4.3 Required Context Fields

모든 로그에 포함되어야 할 필수 필드:

- `trace_id`: 요청 전체 추적 (SQS message ID)
- `user_id`: 사용자 식별
- `signal_id`: 주문 신호 식별

**사용 예:**

```typescript
logger.info("Order placed successfully", {
  trace_id: jobMessage.metadata.trace_id,
  user_id: jobMessage.user_id,
  signal_id: jobMessage.payload.signal_id,
  order_id: result.orderId,
});
```

---

### 4.4 CloudWatch Configuration

**Log Group:** `/aws/lambda/webhook-executor`  
**Retention:** 7일 (CloudWatch)  
**Export:** S3로 매일 export (장기 보관용)

**CloudWatch Insights Query 예시:**

```
fields @timestamp, level, message, user_id, signal_id
| filter level = "ERROR"
| sort @timestamp desc
| limit 100
```

---

## 5. Balance/Position Caching

### 5.1 캐싱 전략

**목적:** `qty.percent` 계산 시 잔고 조회 성능 향상

**Cache Key:**

```
balance:{user_id}:{exchange}:{market}
```

**TTL:** 30초 (암호화폐 가격 변동성 고려)

**구현:**

```typescript
async function getBalance(
  userId: number,
  exchange: string,
  market: string,
): Promise<Decimal> {
  const cacheKey = `balance:${userId}:${exchange}:${market}`;

  // Cache hit
  const cached = await redis.get(cacheKey);
  if (cached) {
    return new Decimal(cached);
  }

  // Cache miss → 거래소 API 호출
  const balance = await binanceApi.getBalance(userId, market);

  // Cache set (30초)
  await redis.setex(cacheKey, 30, balance.toString());

  return balance;
}
```

---

### 5.2 Leverage 적용 로직 (선물)

```typescript
function calculateOrderQty(
  balance: Decimal,
  leverage: number,
  percentValue: number,
  price: Decimal,
): Decimal {
  // 잔고 * leverage * percent / 가격
  const orderValue = balance.mul(leverage).mul(percentValue).div(100);
  return orderValue.div(price);
}

// Example
const balance = new Decimal("1000"); // 1000 USDT
const leverage = 10;
const percent = 50; // 50%
const btcPrice = new Decimal("50000");

const qty = calculateOrderQty(balance, leverage, percent, btcPrice);
// = 1000 * 10 * 0.5 / 50000 = 0.1 BTC
```

---

## 6. Environment Configuration

### 6.1 Environment Variables

**Lambda Function:**

```yaml
# Database
DATABASE_URL: postgresql://user:pass@db.example.com:5432/webhook_db

# SQS
WEBHOOK_EVENT_QUEUE_URL: https://sqs.ap-northeast-2.amazonaws.com/123456789/webhook-events

# AWS KMS
KMS_KEY_ID: arn:aws:kms:ap-northeast-2:123456789:key/abc-123

# Binance API
BINANCE_API_ENDPOINT: https://fapi.binance.com # mainnet
BINANCE_TESTNET_ENDPOINT: https://testnet.binancefuture.com # testnet

# Internal API
INTERNAL_API_ENDPOINT: https://internal-api.example.com

# Redis (Cache)
REDIS_URL: redis://cache.example.com:6379/0

# Monitoring
DISCORD_WEBHOOK_URL: https://discord.com/api/webhooks/...
LOG_LEVEL: INFO
```

**NestJS API (Receiver):**

```yaml
DATABASE_URL: postgresql://...
WEBHOOK_EVENT_QUEUE_URL: https://sqs...
KMS_KEY_ID: arn:aws:kms:...
REDIS_URL: redis://...
JWT_SECRET: xxx
```

---

### 6.2 Deployment Target

**Lambda Function:**

- **Runtime:** Node.js 20.x
- **Architecture:** arm64 (Graviton2 - 비용 효율)
- **Package:** Zip or Container image
- **VPC:** Private subnet (RDS/Redis 접근용)

**NestJS API (Receiver):**

- **ECS Fargate** 또는 **Lambda Function URL**
- Auto-scaling: 불필요 (Lambda의 경우)
- Load Balancer: ALB (ECS) or CloudFront (Lambda Function URL)

---

### 6.3 IAM Roles

**Lambda Execution Role:**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "sqs:ReceiveMessage",
        "sqs:DeleteMessage",
        "sqs:GetQueueAttributes"
      ],
      "Resource": "arn:aws:sqs:*:*:webhook-events"
    },
    {
      "Effect": "Allow",
      "Action": ["kms:Decrypt", "kms:DescribeKey"],
      "Resource": "arn:aws:kms:*:*:key/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ec2:CreateNetworkInterface",
        "ec2:DescribeNetworkInterfaces",
        "ec2:DeleteNetworkInterface"
      ],
      "Resource": "*"
    }
  ]
}
```

---

## 7. Monitoring & Alerts

### 7.1 CloudWatch Metrics

**Custom Metrics:**

- `WebhookReceived` (count)
- `JobPublished` (count)
- `OrderSuccess` (count)
- `OrderFail` (count)
- `PartialFail` (count)
- `ProcessingLockConflict` (count)
- `RateLimitExceeded` (count)

**Lambda Metrics:**

- `Invocations`
- `Duration` (p50, p95, p99)
- `Errors`
- `Throttles`
- `ConcurrentExecutions`

---

### 7.2 Alarms

```yaml
Rate Limit 80% 초과:
  Metric: RateLimitExceeded
  Threshold: > 80 per minute
  Action: Discord 알림

Lambda 에러율 5% 초과:
  Metric: Errors / Invocations
  Threshold: > 0.05
  Action: PagerDuty

DLQ 메시지 발생:
  Metric: ApproximateNumberOfMessagesVisible (DLQ)
  Threshold: > 0
  Action: Slack + PagerDuty

Processing Lock 병목:
  SQL Query: SELECT COUNT(*) FROM processing_locks WHERE expires_at < NOW()
  Threshold: > 50
  Action: Auto cleanup + alert
```
