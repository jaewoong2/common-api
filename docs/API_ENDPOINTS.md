# API Endpoints

## Auth Module

| Method | Endpoint                         | Controller     | Handler         | Auth | Description                            |
| ------ | -------------------------------- | -------------- | --------------- | ---- | -------------------------------------- |
| POST   | /v1/auth/magic-link/request      | AuthController | requestMagicLink | Public | Request magic link                     |
| POST   | /v1/auth/magic-link/verify       | AuthController | verifyMagicLink | Public | Verify magic link token                |
| GET    | /v1/auth/oauth/google/start      | AuthController | googleOAuthStart | Public | Start Google OAuth flow               |
| GET    | /v1/auth/oauth/google/callback   | AuthController | googleOAuthCallback | Public | Google OAuth callback              |
| GET    | /v1/auth/oauth/kakao/start       | AuthController | kakaoOAuthStart  | Public | Start Kakao OAuth flow                |
| GET    | /v1/auth/oauth/kakao/callback    | AuthController | kakaoOAuthCallback | Public | Kakao OAuth callback               |
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

| Method | Endpoint                  | Controller  | Handler        | Auth   | Description                         |
| ------ | ------------------------- | ----------- | -------------- | ------ | ----------------------------------- |
| POST   | /v1/jobs/callback-http    | JobController | createCallbackJob | Public | Create callback HTTP job            |
| POST   | /internal/v1/jobs/run     | JobController | runDueJobs     | Internal | Run due jobs (scheduler)            |

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
