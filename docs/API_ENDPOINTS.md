# API Endpoints

## Auth Module

| Method | Endpoint                         | Controller     | Handler         | Auth | Description                            |
| ------ | -------------------------------- | -------------- | --------------- | ---- | -------------------------------------- |
| POST   | /v1/auth/magic-link/request      | AuthController | requestMagicLink | Public | Request magic link                     |
| POST   | /v1/auth/magic-link/verify       | AuthController | verifyMagicLink | Public | Verify magic link token (legacy)       |
| POST   | /v1/auth/verify                  | AuthController | verifyToken     | Public | Unified verification (Magic Link + OAuth) |
| GET    | /v1/auth/oauth/google/start      | AuthController | googleOAuthStart | Public | Start Google OAuth (accepts appId, redirect_uri) |
| GET    | /v1/auth/oauth/google/callback   | AuthController | googleOAuthCallback | Public | Google OAuth callback (returns code or tokens) |
| GET    | /v1/auth/oauth/kakao/start       | AuthController | kakaoOAuthStart  | Public | Start Kakao OAuth (accepts appId, redirect_uri) |
| GET    | /v1/auth/oauth/kakao/callback    | AuthController | kakaoOAuthCallback | Public | Kakao OAuth callback (returns code or tokens) |
| POST   | /v1/auth/refresh                 | AuthController | refresh         | Public | Refresh access token                   |
| POST   | /v1/auth/logout                  | AuthController | logout          | Public | Logout (revoke refresh token)          |
| GET    | /v1/me                           | AuthController | getMe           | JWT  | Get current user                       |
| PATCH  | /v1/me                           | AuthController | updateMe        | JWT  | Update current user profile            |
| DELETE | /v1/me                           | AuthController | deleteMe        | JWT  | Delete current user (soft delete)      |

## User Module

| Method | Endpoint       | Controller     | Handler | Auth      | Description              |
| ------ | -------------- | -------------- | ------- | --------- | ------------------------ |
| GET    | /v1/users      | UserController | findAll | APP_ADMIN | List all users           |
| GET    | /v1/users/:id  | UserController | findOne | APP_ADMIN | Get user by ID           |
| POST   | /v1/users      | UserController | create  | APP_ADMIN | Create new user          |
| PATCH  | /v1/users/:id  | UserController | update  | APP_ADMIN | Update user              |
| DELETE | /v1/users/:id  | UserController | remove  | APP_ADMIN | Delete user (soft delete)|

## Wallet Module

| Method | Endpoint            | Controller        | Handler    | Auth   | Description                          |
| ------ | ------------------- | ----------------- | ---------- | ------ | ------------------------------------ |
| POST   | /v1/wallet/credit   | WalletController  | credit     | Public | Credit wallet (add points)           |
| POST   | /v1/wallet/debit    | WalletController  | debit      | Public | Debit wallet (deduct points)         |
| GET    | /v1/wallet/balance  | WalletController  | getBalance | Public | Get wallet balance                   |
| GET    | /v1/wallet/ledger   | WalletController  | getLedger  | Public | Get wallet transaction ledger        |

## Billing Module

| Method | Endpoint                      | Controller        | Handler       | Auth           | Description              |
| ------ | ----------------------------- | ----------------- | ------------- | -------------- | ------------------------ |
| GET    | /v1/products                  | ProductController | listProducts  | RolesGuard     | List active products     |
| POST   | /v1/admin/products            | ProductController | createProduct | APP_ADMIN      | Create product           |
| PATCH  | /v1/admin/products/:productId | ProductController | updateProduct | APP_ADMIN      | Update product           |
| POST   | /v1/orders                    | OrderController   | createOrder   | Public         | Create order             |
| POST   | /v1/orders/:orderId/refund    | OrderController   | refundOrder   | Public         | Refund order             |

## Job Module

### Legacy Endpoints (Backward Compatibility)

| Method | Endpoint                  | Controller  | Handler        | Auth   | Description                         |
| ------ | ------------------------- | ----------- | -------------- | ------ | ----------------------------------- |
| POST   | /v1/jobs/callback-http    | JobController | createCallbackJob | Public | [Legacy] Create callback HTTP job   |
| POST   | /internal/v1/jobs/run     | JobController | runDueJobs     | Internal | [Legacy] Run due jobs (scheduler)   |

### Unified Job System Endpoints

| Method | Endpoint                              | Controller  | Handler                   | Auth     | Description                                          |
| ------ | ------------------------------------- | ----------- | ------------------------- | -------- | ---------------------------------------------------- |
| POST   | /v1/jobs/create                       | JobController | createUnifiedJob        | Public   | Create unified job (mode: db\|sqs\|both)             |
| POST   | /internal/v1/poll-sqs                 | JobController | pollSqs                 | Internal | Poll SQS and process messages (EventBridge cron: 1m) |
| POST   | /internal/v1/run-db-jobs              | JobController | runDbJobs               | Internal | Run due DB jobs (EventBridge cron: 5m)               |
| POST   | /internal/v1/process-scheduled-message| JobController | processScheduledMessage | Internal | Process scheduled message (EventBridge Scheduler)    |

## Admin Module

| Method | Endpoint                      | Controller     | Handler       | Auth      | Description                  |
| ------ | ----------------------------- | -------------- | ------------ | --------- | ---------------------------- |
| POST   | /v1/admin/users/:userId/suspend   | AdminController | suspendUser  | APP_ADMIN | Suspend user                 |
| POST   | /v1/admin/users/:userId/unsuspend | AdminController | unsuspendUser | APP_ADMIN | Unsuspend user               |
| POST   | /v1/admin/wallet/adjust       | AdminController | adjustWallet | APP_ADMIN | Adjust wallet                |
| POST   | /v1/admin/jobs/:jobId/retry   | AdminController | retryJob     | APP_ADMIN | Retry job                    |
| POST   | /v1/admin/jobs/:jobId/deadletter | AdminController | deadletterJob | APP_ADMIN | Mark job as deadletter       |
| GET    | /v1/admin/jobs               | AdminController | listJobs     | APP_ADMIN | List jobs                    |

## Platform Module

| Method | Endpoint                      | Controller         | Handler   | Auth                  | Description           |
| ------ | ----------------------------- | ------------------ | --------- | --------------------- | --------------------- |
| GET    | /v1/platform/apps             | PlatformController | listApps  | PLATFORM_SUPER_ADMIN  | List apps             |
| POST   | /v1/platform/apps             | PlatformController | createApp | PLATFORM_SUPER_ADMIN  | Create app            |
| PATCH  | /v1/platform/apps/:appId      | PlatformController | updateApp | PLATFORM_SUPER_ADMIN  | Update app            |
