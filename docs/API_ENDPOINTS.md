# API Endpoints

## Auth Module

| Method | Endpoint                         | Controller     | Handler         | Auth | Description                            |
| ------ | -------------------------------- | -------------- | --------------- | ---- | -------------------------------------- |
| POST   | /v1/auth/magic-link/request      | AuthController | requestMagicLink | Public | Request magic link                     |
| POST   | /v1/auth/magic-link/verify       | AuthController | verifyMagicLink | Public | Verify magic link token                |
| GET    | /v1/auth/oauth/:provider/start   | AuthController | oauthStart      | Public | OAuth start (not implemented)          |
| GET    | /v1/auth/oauth/:provider/callback| AuthController | oauthCallback   | Public | OAuth callback (not implemented)       |
| POST   | /v1/auth/refresh                 | AuthController | refresh         | Public | Refresh access token                   |
| POST   | /v1/auth/logout                  | AuthController | logout          | Public | Logout (revoke refresh token)          |
| GET    | /v1/me                           | AuthController | getMe           | JWT  | Get current user                       |
| PATCH  | /v1/me                           | AuthController | updateMe        | JWT  | Update current user profile            |
| DELETE | /v1/me                           | AuthController | deleteMe        | JWT  | Delete current user (soft delete)      |

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
