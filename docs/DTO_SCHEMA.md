# DTO Schema

현재 정의된 DTO 목록입니다. 각 모듈의 DTO를 추가할 때 아래 형식을 따릅니다.

| DTO Name                | File Path                                  | Purpose                                       | Notes |
| ----------------------- | -------------------------------------------| --------------------------------------------- | ----- |
| `RequestMagicLinkDto`   | src/modules/auth/dto/auth.dto.ts           | Request body for magic link email             | -     |
| `VerifyMagicLinkDto`    | src/modules/auth/dto/auth.dto.ts           | Verify magic link token (legacy)              | Deprecated, use VerifyTokenDto |
| `VerifyTokenDto`        | src/modules/auth/dto/verify-token.dto.ts   | Unified verification (Magic Link + OAuth)     | code, redirect_uri, provider |
| `OAuthStartQueryDto`    | src/modules/auth/dto/oauth-start-query.dto.ts | OAuth start query parameters              | appId, redirect_uri |
| `RefreshTokenDto`       | src/modules/auth/dto/auth.dto.ts           | Refresh access token                          | -     |
| `LogoutDto`             | src/modules/auth/dto/auth.dto.ts           | Logout via refresh token                      | refresh optional |
| `UpdateProfileDto`      | src/modules/auth/dto/auth.dto.ts           | Update profile fields                         | nickname optional |
| `CreateUserDto`         | src/modules/user/dto/create-user.dto.ts    | Create new user                               | email, profile, role optional |
| `UpdateUserDto`         | src/modules/user/dto/update-user.dto.ts    | Update user                                   | profile, status, role optional |
| `UserResponseDto`       | src/modules/user/dto/user-response.dto.ts  | User response DTO                             | with fromEntity transformation |
| `CreditWalletDto`       | src/modules/wallet/dto/wallet.dto.ts       | Wallet credit request                         | idempotency_key is in body (optional) |
| `DebitWalletDto`        | src/modules/wallet/dto/wallet.dto.ts       | Wallet debit request                          | idempotency_key is in body (optional) |
| `WalletBalanceQueryDto` | src/modules/wallet/dto/wallet.dto.ts       | Balance query params                          | user_id |
| `WalletLedgerQueryDto`  | src/modules/wallet/dto/wallet.dto.ts       | Ledger query params                           | limit used; cursor currently ignored |
| `CreateProductDto`      | src/modules/billing/dto/product.dto.ts     | Admin create product                          | type/name/default_price/metadata/is_active |
| `UpdateProductDto`      | src/modules/billing/dto/product.dto.ts     | Admin update product                          | name/is_active/metadata (is_active not applied yet) |
| `CreateOrderDto`        | src/modules/billing/dto/order.dto.ts       | Create order with wallet payment              | price_id maps to ProductEntity.id; reason unused |
| `RefundOrderDto`        | src/modules/billing/dto/order.dto.ts       | Refund order request                          | reason unused; idempotency_key optional |
| `CreateCallbackJobDto`  | src/modules/job/dto/job.dto.ts             | [Legacy] Create callback HTTP job             | method/path/body/timeout |
| `RunJobsDto`            | src/modules/job/dto/job.dto.ts             | [Legacy] Internal job runner payload          | limit optional |
| `LambdaProxyMessageDto` | src/modules/job/dto/unified-job-message.dto.ts | AWS Lambda proxy event structure          | body/path/httpMethod/headers/requestContext |
| `ExecutionConfigDto`    | src/modules/job/dto/unified-job-message.dto.ts | Execution type-specific configuration     | type/functionName/invocationType/functionUrl/baseUrl/scheduleExpression/targetJob |
| `JobMetadataDto`        | src/modules/job/dto/unified-job-message.dto.ts | Job tracking metadata                     | jobId/appId/messageGroupId/idempotencyKey/createdAt/retryCount |
| `UnifiedJobMessageDto`  | src/modules/job/dto/unified-job-message.dto.ts | Complete unified job message wrapper      | lambdaProxyMessage/execution/metadata |
| `CreateUnifiedJobDto`   | src/modules/job/dto/create-job.dto.ts      | Create unified job request                    | appId/message/mode(db\|sqs\|both) |
| `JobCreationMode`       | src/modules/job/dto/create-job.dto.ts      | Job creation mode enum                        | DB/SQS/BOTH |
| `SuspendReasonDto`      | src/modules/admin/dto/admin.dto.ts         | Admin suspend reason                          | reason |
| `AdjustWalletDto`       | src/modules/admin/dto/admin.dto.ts         | Admin wallet adjust payload                   | ref_id used as idempotency key internally |
| `RetryJobDto`           | src/modules/admin/dto/admin.dto.ts         | Admin job id payload                          | jobId |
| `ListJobsQueryDto`      | src/modules/admin/dto/admin.dto.ts         | Admin job listing filters                     | status/limit used; cursor ignored |
| `CreateAppDto`          | src/modules/platform/dto/app.dto.ts        | Platform create app/tenant                    | hosts/callback settings |
| `UpdateAppDto`          | src/modules/platform/dto/app.dto.ts        | Platform update app config                    | callback updates |
