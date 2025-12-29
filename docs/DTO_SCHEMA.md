# DTO Schema

현재 정의된 DTO 목록입니다. 각 모듈의 DTO를 추가할 때 아래 형식을 따릅니다.

| DTO Name                | File Path                                  | Purpose                                       | Notes |
| ----------------------- | -------------------------------------------| --------------------------------------------- | ----- |
| `RequestMagicLinkDto`   | src/modules/auth/dto/auth.dto.ts           | Request body for magic link email             | -     |
| `VerifyMagicLinkDto`    | src/modules/auth/dto/auth.dto.ts           | Verify magic link token                       | -     |
| `RefreshTokenDto`       | src/modules/auth/dto/auth.dto.ts           | Refresh access token                          | -     |
| `LogoutDto`             | src/modules/auth/dto/auth.dto.ts           | Logout via refresh token                      | refresh optional |
| `UpdateProfileDto`      | src/modules/auth/dto/auth.dto.ts           | Update profile fields                         | nickname optional |
| `CreateUserDto`         | src/modules/user/dto/create-user.dto.ts    | Create new user                               | email, profile, role optional |
| `UpdateUserDto`         | src/modules/user/dto/update-user.dto.ts    | Update user                                   | profile, status, role optional |
| `UserResponseDto`       | src/modules/user/dto/user-response.dto.ts  | User response DTO                             | with fromEntity transformation |
| `CreditWalletDto`       | src/modules/wallet/dto/wallet.dto.ts       | Wallet credit request                         | requires idempotency header |
| `DebitWalletDto`        | src/modules/wallet/dto/wallet.dto.ts       | Wallet debit request                          | requires idempotency header |
| `WalletBalanceQueryDto` | src/modules/wallet/dto/wallet.dto.ts       | Balance query params                          | user_id |
| `WalletLedgerQueryDto`  | src/modules/wallet/dto/wallet.dto.ts       | Ledger query params                           | pagination cursor/limit |
| `CreateProductDto`      | src/modules/billing/dto/product.dto.ts     | Admin create product                          | type/name/metadata |
| `UpdateProductDto`      | src/modules/billing/dto/product.dto.ts     | Admin update product                          | name/active/metadata |
| `CreateOrderDto`        | src/modules/billing/dto/order.dto.ts       | Create order with wallet payment              | includes reason/ref fields |
| `RefundOrderDto`        | src/modules/billing/dto/order.dto.ts       | Refund order request                          | idempotency key optional |
| `CreateCallbackJobDto`  | src/modules/job/dto/job.dto.ts             | Create callback HTTP job                      | method/path/body/timeout |
| `RunJobsDto`            | src/modules/job/dto/job.dto.ts             | Internal job runner payload                   | limit optional |
| `SuspendReasonDto`      | src/modules/admin/dto/admin.dto.ts         | Admin suspend reason                          | reason |
| `AdjustWalletDto`       | src/modules/admin/dto/admin.dto.ts         | Admin wallet adjust payload                   | delta with refs |
| `RetryJobDto`           | src/modules/admin/dto/admin.dto.ts         | Admin job id payload                          | jobId |
| `ListJobsQueryDto`      | src/modules/admin/dto/admin.dto.ts         | Admin job listing filters                     | status/limit/cursor |
| `CreateAppDto`          | src/modules/platform/dto/app.dto.ts        | Platform create app/tenant                    | hosts/callback settings |
| `UpdateAppDto`          | src/modules/platform/dto/app.dto.ts        | Platform update app config                    | callback updates |
