# Common MSA Implementation Summary

## Overview
This document summarizes the critical components implemented for the Common MSA platform, including job processing, platform management, admin operations, HMAC security, and idempotency handling.

---

## 1. HMAC Utility (`src/common/utils/hmac.util.ts`)

### Purpose
Provides cryptographic utilities for HMAC signature generation and verification for secure callback authentication.

### Functions

| Function | Description | Parameters | Returns |
|----------|-------------|------------|---------|
| `buildCanonicalString` | Build canonical string for HMAC signing | method, path, body, timestamp | string |
| `signRequest` | Generate HMAC-SHA256 signature | secret, canonical | hex string |
| `verifySignature` | Verify HMAC signature (timing-safe) | secret, canonical, signature | boolean |
| `generateHmacSecret` | Generate random 32-byte HMAC secret | - | hex string |
| `sha256Hash` | Create SHA-256 hash of data | data | hex string |

### Example Usage
```typescript
const canonical = buildCanonicalString('POST', '/v1/callback', { data: 'test' }, 1640000000);
const signature = signRequest('my-secret', canonical);
const isValid = verifySignature('my-secret', canonical, signature);
```

---

## 2. App Repository (`src/modules/platform/repositories/app.repository.ts`)

### Purpose
Handles database operations for tenant applications (multi-tenancy).

### Methods

| Method | Description | Parameters | Returns |
|--------|-------------|------------|---------|
| `findAll` | Get all apps | manager? | AppEntity[] |
| `findById` | Get app by ID | appId, manager? | AppEntity \| null |
| `create` | Create new app | data, manager? | AppEntity |
| `update` | Update app config | appId, data, manager? | AppEntity |

---

## 3. Idempotency Key Repository (`src/common/repositories/idempotency-key.repository.ts`)

### Purpose
Stores idempotency keys for financial operations to prevent duplicate transactions.

### Methods

| Method | Description | Parameters | Returns |
|--------|-------------|------------|---------|
| `findByKey` | Find by app and key | appId, key, manager? | IdempotencyKeyEntity \| null |
| `create` | Create idempotency record | data, manager? | IdempotencyKeyEntity |

---

## 4. Job Repository (`src/modules/job/repositories/job.repository.ts`)

### Purpose
Manages asynchronous job queue with pessimistic locking.

### Methods

| Method | Description | Parameters | Returns |
|--------|-------------|------------|---------|
| `findById` | Get job by ID | jobId, manager? | JobEntity \| null |
| `create` | Create new job | data, manager? | JobEntity |
| `getDueJobsForUpdate` | Get jobs with SELECT FOR UPDATE SKIP LOCKED | limit, manager? | JobEntity[] |
| `update` | Update job status/retry info | jobId, data, manager? | void |
| `findWithFilters` | Find jobs with pagination/filters | appId, filters, manager? | {jobs, total} |

### Key Feature: Pessimistic Locking
```typescript
// SELECT FOR UPDATE SKIP LOCKED implementation
.setLock('pessimistic_write_or_fail')
.setOnLocked('skip_locked')
```

---

## 5. Job Service (`src/modules/job/job.service.ts`)

### Purpose
Handles asynchronous job creation and execution with exponential backoff retry logic.

### Methods

| Method | Description | Parameters | Returns |
|--------|-------------|------------|---------|
| `createCallbackJob` | Create HTTP callback job | appId, payload, idempotencyKey? | JobEntity |
| `runDueJobs` | Execute due jobs (scheduler) | limit | number (processed count) |
| `getJob` | Get job by ID | jobId | JobEntity |
| `retryJob` | Reset job to PENDING (admin) | jobId | JobEntity |
| `deadletterJob` | Mark job as DEAD (admin) | jobId | JobEntity |

### Retry Logic (Exponential Backoff)
```typescript
const delaySeconds = Math.min(Math.pow(2, retryCount) * 60, 86400); // Cap at 24h
const nextRetryAt = new Date(Date.now() + delaySeconds * 1000);
```

**Retry Schedule:**
- Retry 1: 2 minutes
- Retry 2: 4 minutes
- Retry 3: 8 minutes
- Retry 4: 16 minutes
- Retry 5: 32 minutes
- Retry 6: 64 minutes
- Retry 7+: 24 hours (capped)

### HMAC Signature Storage
Job payload stores pre-computed HMAC signature for callback reuse:
```typescript
{
  method: 'POST',
  path: '/v1/callbacks/reward',
  body: {...},
  hmacSignature: 'pre-computed-sig',
  hmacTimestamp: 1640000000,
  expectedStatuses: [200, 201]
}
```

---

## 6. Platform Service (`src/modules/platform/platform.service.ts`)

### Purpose
Manages tenant applications (PLATFORM_SUPER_ADMIN only).

### Methods

| Method | Description | Parameters | Returns |
|--------|-------------|------------|---------|
| `listApps` | List all apps | - | AppEntity[] |
| `getApp` | Get app by ID | appId | AppEntity |
| `createApp` | Create new app | name, callbackBaseUrl?, allowlist? | AppEntity |
| `updateApp` | Update app config | appId, data | AppEntity |
| `suspendApp` | Suspend app | appId | AppEntity |
| `activateApp` | Activate app | appId | AppEntity |

### HMAC Secret Generation
When creating app with callback URL:
```typescript
callbackSecretRef = generateHmacSecret(); // 64 hex chars
// MVP: Store directly in DB
// Production: Store in AWS Secrets Manager, save ARN
```

---

## 7. Admin Service (`src/modules/admin/admin.service.ts`)

### Purpose
Handles admin operations (user management, wallet adjustments, job management).

### Methods

| Method | Description | Parameters | Returns |
|--------|-------------|------------|---------|
| `suspendUser` | Suspend user account | userId | void |
| `unsuspendUser` | Unsuspend user account | userId | void |
| `adjustWallet` | Admin wallet adjustment | appId, userId, amount, reason, key | ledger entries |
| `listJobs` | Get jobs with filters | appId, filters | {jobs, total} |
| `retryJob` | Retry failed job | jobId | JobEntity |
| `deadletterJob` | Mark job as dead | jobId | JobEntity |
| `getJob` | Get job details | jobId | JobEntity |

### Wallet Adjustment Logic
```typescript
// Positive amount = credit
// Negative amount = debit
const amountBigInt = BigInt(amount);
if (amountBigInt > 0) {
  await pointService.creditWallet(...);
} else {
  await pointService.debitWallet(absoluteAmount, ...);
}
```

---

## 8. Idempotency Guard (`src/common/guards/idempotency.guard.ts`)

### Purpose
Prevents duplicate requests by checking X-Idempotency-Key header.

### How It Works

1. **No Key Provided**: Proceed normally
2. **Key Exists in DB**:
   - Verify request hash matches
   - If match: Return cached response
   - If mismatch: Throw 409 Conflict
3. **New Key**: Store in request for interceptor to save

### Usage
```typescript
@UseGuards(IdempotencyGuard)
@Post('/wallet/credit')
async creditWallet(@Body() dto: CreditDto) { }
```

### Request Hash Calculation
```typescript
const bodyHash = sha256Hash(request.body || {});
```

---

## 9. Email Service (`src/infra/email/email.service.ts`)

### Purpose
Sends emails (currently logs to console for MVP, AWS SES ready).

### Methods

| Method | Description | Parameters | Returns |
|--------|-------------|------------|---------|
| `sendMagicLinkEmail` | Send magic link + code email | to, token, code, redirectUrl? | Promise<void> |

### Email Template Features
- HTML template with magic link button
- 6-digit verification code display
- Text fallback version
- Expiration notice (10 minutes)

### Production Setup (AWS SES)
```typescript
// Uncomment in production:
const ses = new SESClient({ region: process.env.AWS_REGION });
await ses.send(new SendEmailCommand({
  Source: process.env.AWS_SES_FROM_EMAIL,
  Destination: { ToAddresses: [to] },
  Message: { ... }
}));
```

---

## Module Configuration

### Job Module
```typescript
@Module({
  imports: [TypeOrmModule.forFeature([JobEntity, AppEntity])],
  providers: [JobService, JobRepository, AppRepository],
  exports: [JobService, JobRepository],
})
```

### Platform Module
```typescript
@Module({
  imports: [TypeOrmModule.forFeature([AppEntity])],
  providers: [PlatformService, AppRepository],
  exports: [PlatformService, AppRepository],
})
```

### Admin Module
```typescript
@Module({
  imports: [AuthModule, PointModule, JobModule],
  providers: [AdminService],
  exports: [AdminService],
})
```

### Point Module (Created)
```typescript
@Module({
  imports: [TypeOrmModule.forFeature([WalletLotEntity, WalletLedgerEntity, IdempotencyKeyEntity])],
  providers: [PointService, WalletLotRepository, WalletLedgerRepository, IdempotencyKeyRepository],
  exports: [PointService],
})
```

### Common Module (Global)
```typescript
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([IdempotencyKeyEntity])],
  providers: [IdempotencyKeyRepository, IdempotencyGuard],
  exports: [IdempotencyKeyRepository, IdempotencyGuard],
})
```

### Email Module (Global)
```typescript
@Global()
@Module({
  providers: [EmailService],
  exports: [EmailService],
})
```

---

## Database Schema Notes

### Job Status Flow
```
PENDING → [Execute] → SUCCEEDED
       ↓
       [Fail] → RETRYING → [Retry] → SUCCEEDED
                         ↓
                         [Max Retries] → FAILED
                                       ↓
                                       [Admin: deadletter] → DEAD
```

### Job Locking Strategy
Uses PostgreSQL's `SELECT FOR UPDATE SKIP LOCKED` to:
- Prevent duplicate job execution
- Allow horizontal scaling (multiple workers)
- Skip locked rows automatically

---

## Security Features

### 1. HMAC Signature (Callbacks)
- v1 canonical string format
- SHA-256 HMAC
- Timestamp included to prevent replay attacks
- Timing-safe comparison

### 2. Idempotency
- SHA-256 request hash
- Permanent storage for audit trail
- Conflict detection on hash mismatch

### 3. Multi-Tenancy
- App-scoped data isolation
- Separate HMAC secrets per app
- Tenant middleware (appId from JWT/subdomain)

---

## Testing Checklist

### HMAC Utility
- [ ] Canonical string generation
- [ ] Signature verification (valid/invalid)
- [ ] Timing-safe comparison
- [ ] Secret generation (32 bytes)

### Job Service
- [ ] Job creation with HMAC signature
- [ ] Exponential backoff calculation
- [ ] Success execution (status → SUCCEEDED)
- [ ] Retry on failure
- [ ] Max retries → FAILED
- [ ] Admin retry (reset to PENDING)
- [ ] Admin deadletter (set to DEAD)

### Platform Service
- [ ] Create app with auto-generated secret
- [ ] Update app (regenerate secret on URL change)
- [ ] Suspend/activate app

### Admin Service
- [ ] Suspend/unsuspend user
- [ ] Wallet adjustment (positive = credit)
- [ ] Wallet adjustment (negative = debit)
- [ ] List jobs with filters
- [ ] Job retry/deadletter delegation

### Idempotency Guard
- [ ] No key → proceed
- [ ] Duplicate key + same body → cached response
- [ ] Duplicate key + different body → 409 Conflict
- [ ] New key → proceed + store for interceptor

---

## Next Steps (Not Yet Implemented)

### Controllers (Need Updates)
Some controllers need signature updates to match service methods:
- `JobController.createCallbackJob` - needs appId + payload parameters
- `PlatformController.createApp` - needs to destructure CreateAppDto
- `AdminController` - various method signature mismatches

### Missing Interceptor
Need to create interceptor to save idempotency keys after successful response:
```typescript
@Injectable()
export class IdempotencySaveInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    return next.handle().pipe(
      tap(async (response) => {
        const request = context.switchToHttp().getRequest();
        if (request.idempotencyKey) {
          await idempotencyRepo.create({
            appId: request.appId,
            idempotencyKey: request.idempotencyKey,
            requestHash: request.idempotencyHash,
            responseBody: response,
            httpStatus: 200,
          });
        }
      }),
    );
  }
}
```

### Job Scheduler
Need to create scheduled task to run `jobService.runDueJobs()`:
```typescript
@Cron('*/1 * * * *') // Every minute
async handleCron() {
  await this.jobService.runDueJobs(100);
}
```

---

## File Structure Summary

```
src/
├── common/
│   ├── guards/
│   │   ├── idempotency.guard.ts ✅
│   │   └── index.ts ✅
│   ├── repositories/
│   │   ├── idempotency-key.repository.ts ✅
│   │   └── index.ts ✅
│   ├── utils/
│   │   ├── hmac.util.ts ✅
│   │   └── index.ts ✅
│   └── common.module.ts ✅
├── modules/
│   ├── admin/
│   │   ├── admin.service.ts ✅
│   │   └── admin.module.ts ✅ (updated)
│   ├── auth/
│   │   └── auth.module.ts ✅ (updated)
│   ├── job/
│   │   ├── job.service.ts ✅
│   │   ├── job.module.ts ✅ (updated)
│   │   └── repositories/
│   │       └── job.repository.ts ✅
│   ├── platform/
│   │   ├── platform.service.ts ✅
│   │   ├── platform.module.ts ✅ (updated)
│   │   └── repositories/
│   │       └── app.repository.ts ✅
│   └── point/
│       └── point.module.ts ✅ (created)
└── infra/
    └── email/
        ├── email.service.ts ✅
        └── email.module.ts ✅
```

---

## Summary

All critical components have been successfully implemented:

1. ✅ HMAC utility functions (signing, verification, secret generation)
2. ✅ App Repository (multi-tenant app management)
3. ✅ Idempotency Key Repository (duplicate prevention)
4. ✅ Job Repository (with pessimistic locking)
5. ✅ Job Service (with exponential backoff retry)
6. ✅ Platform Service (app lifecycle management)
7. ✅ Admin Service (user + wallet + job admin ops)
8. ✅ Idempotency Guard (request deduplication)
9. ✅ Email Service (magic link emails, SES-ready)

**Status:** Core implementation complete. Minor controller signature adjustments and interceptor implementation remain.
