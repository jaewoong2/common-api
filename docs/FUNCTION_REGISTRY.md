# Function Registry

## Application Bootstrap

| Function                 | File               | Description                                    | Parameters                              | Return              | Example                                      |
| ------------------------ | ------------------ | ---------------------------------------------- | --------------------------------------- | ------------------- | -------------------------------------------- |
| `bootstrap`              | src/main.ts        | Starts Nest + Fastify server for ECS/Fargate   | `()`                                    | `Promise<void>`     | `node dist/main.js`                          |
| `bootstrapLambdaProxy`   | src/lambda.ts      | Initializes Nest app and caches lambda adapter | `()`                                    | `Promise<Handler>`  | `await bootstrapLambdaProxy()`               |
| `handler`                | src/lambda.ts      | AWS Lambda handler entrypoint                  | `event: any, context: any`              | `Promise<any>`      | `await handler(event, context)`              |

## Database Utilities

| Function              | File                                   | Description                                             | Parameters                                                     | Return                          | Example                                                     |
| --------------------- | -------------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------- | ----------------------------------------------------------- |
| `buildTypeOrmOptions` | src/core/database/typeorm.config.ts    | Builds TypeORM options from ConfigService               | `configService: ConfigService`                                 | `TypeOrmModuleOptions`          | `buildTypeOrmOptions(configService)`                        |
| `runInTransaction`    | src/core/database/transaction.helper.ts| Runs a task inside a managed TypeORM transaction        | `dataSource: DataSource`, `task: (manager) => Promise<T>`      | `Promise<T>`                    | `await runInTransaction(dataSource, (m) => m.save(entity))` |
| `AppDataSource`       | src/core/database/data-source.ts       | Standalone DataSource for TypeORM CLI migrations        | env-driven                                                     | `DataSource`                    | `npm run migration:run -d src/core/database/data-source.ts` |

### Idempotency Key Repository

| Function/Method | File                                                    | Description                           | Parameters                                                              | Return                                   | Example                                           |
| --------------- | ------------------------------------------------------- | ------------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------- |
| `findByKey`     | src/common/repositories/idempotency-key.repository.ts   | Find idempotency key by app and key   | `appId: string`, `idempotencyKey: string`                               | `Promise<IdempotencyKeyEntity \| null>`  | `idempotencyRepo.findByKey(appId, key)`           |
| `create`        | src/common/repositories/idempotency-key.repository.ts   | Create new idempotency key record     | `data: {...}`, `manager?: EntityManager`                                | `Promise<IdempotencyKeyEntity>`          | `idempotencyRepo.create(data, manager)`           |

## HTTP Pipeline

| Function/Method          | File                                       | Description                                        | Parameters                                  | Return             | Example                                                        |
| ------------------------ | ------------------------------------------ | -------------------------------------------------- | ------------------------------------------- | ------------------ | -------------------------------------------------------------- |
| `catch`                  | src/common/filters/http-exception.filter.ts| Wraps errors into JSON envelope with request id    | `exception: unknown`, `host: ArgumentsHost` | `void`             | Used as a global filter                                        |
| `intercept`              | src/common/interceptors/response.interceptor.ts| Wraps successful responses with `data` + request id | `context: ExecutionContext`, `next: CallHandler` | `Observable<any>` | Used as a global interceptor                                   |
| `use`                    | src/core/logger/request-id.middleware.ts   | Ensures `X-Request-Id` header and sets `req.id`    | `req`, `res`, `next`                        | `void`             | Registered for all routes                                      |
| `canActivate`            | src/common/guards/roles.guard.ts           | Simple role check guard                            | `context: ExecutionContext`                 | `boolean`          | Attached via `@UseGuards(RolesGuard)`                          |
| `Roles` decorator        | src/common/decorators/roles.decorator.ts   | Sets route metadata for required roles             | `...roles: string[]`                        | `CustomDecorator`   | `@Roles('ADMIN')`                                              |

## Auth & User

### Auth Service (Controller Methods)

| Function/Method          | File                                   | Description                                    | Parameters                       | Return                                       | Example                               |
| ------------------------ | -------------------------------------- | ---------------------------------------------- | -------------------------------- | -------------------------------------------- | ------------------------------------- |
| `requestMagicLink`       | src/modules/auth/auth.service.ts       | Sends magic link email (generates token + code) | `RequestMagicLinkDto`            | `Promise<{message: string, code?: string}>`  | `authService.requestMagicLink(dto)`   |
| `verifyMagicLink`        | src/modules/auth/auth.service.ts       | Verifies magic link token and issues JWT tokens | `VerifyMagicLinkDto`             | `Promise<{access_token, refresh_token, user}>` | `authService.verifyMagicLink(dto)`    |
| `oauthStart`             | src/modules/auth/auth.service.ts       | Starts OAuth flow (placeholder, not implemented) | `provider: string`, `req: any`   | `Promise<never>`                             | `authService.oauthStart('google', req)` |
| `oauthCallback`          | src/modules/auth/auth.service.ts       | Handles OAuth callback (placeholder, not implemented) | `provider: string`, `req: any`   | `Promise<never>`                             | `authService.oauthCallback('google', req)` |
| `refresh`                | src/modules/auth/auth.service.ts       | Issues new access token from refresh token     | `RefreshTokenDto`                | `Promise<{access_token: string}>`            | `authService.refresh(dto)`            |
| `logout`                 | src/modules/auth/auth.service.ts       | Revokes refresh token                          | `LogoutDto`                      | `Promise<{message: string}>`                 | `authService.logout(dto)`             |
| `getMe`                  | src/modules/auth/auth.service.ts       | Retrieves current user profile                 | `user: any`                      | `Promise<UserEntity>`                        | `authService.getMe(req.user)`         |
| `updateMe`               | src/modules/auth/auth.service.ts       | Updates current user profile                   | `user: any`, `UpdateProfileDto`  | `Promise<UserEntity>`                        | `authService.updateMe(req.user, dto)` |
| `deleteMe`               | src/modules/auth/auth.service.ts       | Soft-deletes current user                      | `user: any`                      | `Promise<{message: string}>`                 | `authService.deleteMe(req.user)`      |

### Auth Service (Core Methods)

| Function/Method          | File                                   | Description                                    | Parameters                                                        | Return                                       | Example                                            |
| ------------------------ | -------------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------- | -------------------------------------------- | -------------------------------------------------- |
| `verifyMagicLinkByToken` | src/modules/auth/auth.service.ts       | Verifies magic link by URL token               | `token: string`                                                   | `Promise<{access_token, refresh_token, user}>` | `authService.verifyMagicLinkByToken(token)`        |
| `verifyMagicLinkByCode`  | src/modules/auth/auth.service.ts       | Verifies magic link by 6-digit code            | `appId: string`, `email: string`, `code: string`                  | `Promise<{access_token, refresh_token, user}>` | `authService.verifyMagicLinkByCode(appId, email, code)` |
| `refreshAccessToken`     | src/modules/auth/auth.service.ts       | Refresh access token using refresh token       | `refreshToken: string`                                            | `Promise<{access_token: string}>`            | `authService.refreshAccessToken(token)`            |
| `getCurrentUser`         | src/modules/auth/auth.service.ts       | Get user by ID                                 | `userId: string`                                                  | `Promise<UserEntity>`                        | `authService.getCurrentUser(userId)`               |
| `updateProfile`          | src/modules/auth/auth.service.ts       | Update user profile                            | `userId: string`, `profile: Record<string, any>`                  | `Promise<UserEntity>`                        | `authService.updateProfile(userId, profile)`       |
| `deleteAccount`          | src/modules/auth/auth.service.ts       | Soft delete user account                       | `userId: string`                                                  | `Promise<{message: string}>`                 | `authService.deleteAccount(userId)`                |

### User Repository

| Function/Method  | File                                       | Description                       | Parameters                                        | Return                            | Example                                    |
| ---------------- | ------------------------------------------ | --------------------------------- | ------------------------------------------------- | --------------------------------- | ------------------------------------------ |
| `findById`       | src/modules/auth/repositories/user.repository.ts | Find user by ID                   | `id: string`                                      | `Promise<UserEntity \| null>`     | `userRepo.findById(id)`                    |
| `findByEmail`    | src/modules/auth/repositories/user.repository.ts | Find user by email within app     | `appId: string`, `email: string`                  | `Promise<UserEntity \| null>`     | `userRepo.findByEmail(appId, email)`       |
| `create`         | src/modules/auth/repositories/user.repository.ts | Create new user                   | `data: {appId, email, profile?}`                  | `Promise<UserEntity>`             | `userRepo.create(data)`                    |
| `updateProfile`  | src/modules/auth/repositories/user.repository.ts | Update user profile               | `userId: string`, `profile: Record<string, any>`  | `Promise<UserEntity>`             | `userRepo.updateProfile(userId, profile)`  |
| `updateStatus`   | src/modules/auth/repositories/user.repository.ts | Update user status                | `userId: string`, `status: UserStatus`            | `Promise<void>`                   | `userRepo.updateStatus(userId, status)`    |
| `softDelete`     | src/modules/auth/repositories/user.repository.ts | Soft delete user (set to DELETED) | `userId: string`                                  | `Promise<void>`                   | `userRepo.softDelete(userId)`              |

### Refresh Token Repository

| Function/Method       | File                                                    | Description                           | Parameters                                        | Return                                   | Example                                           |
| --------------------- | ------------------------------------------------------- | ------------------------------------- | ------------------------------------------------- | ---------------------------------------- | ------------------------------------------------- |
| `create`              | src/modules/auth/repositories/refresh-token.repository.ts | Create new refresh token (hashed)     | `userId: string`, `plainToken: string`, `expiresAt: Date` | `Promise<RefreshTokenEntity>`            | `refreshTokenRepo.create(userId, token, expires)` |
| `findValidToken`      | src/modules/auth/repositories/refresh-token.repository.ts | Find valid token by plain token       | `plainToken: string`                              | `Promise<RefreshTokenEntity \| null>`    | `refreshTokenRepo.findValidToken(token)`          |
| `revoke`              | src/modules/auth/repositories/refresh-token.repository.ts | Revoke refresh token (for logout)     | `plainToken: string`                              | `Promise<void>`                          | `refreshTokenRepo.revoke(token)`                  |
| `revokeAllForUser`    | src/modules/auth/repositories/refresh-token.repository.ts | Revoke all user's tokens              | `userId: string`                                  | `Promise<void>`                          | `refreshTokenRepo.revokeAllForUser(userId)`       |
| `deleteExpired`       | src/modules/auth/repositories/refresh-token.repository.ts | Delete expired tokens (cleanup job)   | `()`                                              | `Promise<number>`                        | `refreshTokenRepo.deleteExpired()`                |

### Magic Link Token Repository

| Function/Method       | File                                                    | Description                           | Parameters                                                        | Return                                   | Example                                           |
| --------------------- | ------------------------------------------------------- | ------------------------------------- | ----------------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------- |
| `create`              | src/modules/auth/repositories/magic-link-token.repository.ts | Create magic link token (hashed)      | `data: {appId, email, plainToken, verificationCode, redirectUrl?, expiresAt}` | `Promise<MagicLinkTokenEntity>`          | `magicLinkRepo.create(data)`                      |
| `findByToken`         | src/modules/auth/repositories/magic-link-token.repository.ts | Find valid token by plain URL token   | `plainToken: string`                                              | `Promise<MagicLinkTokenEntity \| null>`  | `magicLinkRepo.findByToken(token)`                |
| `findByEmailAndCode`  | src/modules/auth/repositories/magic-link-token.repository.ts | Find valid token by email and code    | `appId: string`, `email: string`, `code: string`                  | `Promise<MagicLinkTokenEntity \| null>`  | `magicLinkRepo.findByEmailAndCode(appId, email, code)` |
| `markAsUsed`          | src/modules/auth/repositories/magic-link-token.repository.ts | Mark token as used (one-time use)     | `tokenId: string`                                                 | `Promise<void>`                          | `magicLinkRepo.markAsUsed(tokenId)`               |
| `deleteExpired`       | src/modules/auth/repositories/magic-link-token.repository.ts | Delete expired tokens (cleanup job)   | `()`                                                              | `Promise<number>`                        | `magicLinkRepo.deleteExpired()`                   |
| `generateVerificationCode` | src/modules/auth/repositories/magic-link-token.repository.ts | Generate random 6-digit code          | `()`                                                              | `string`                                 | `magicLinkRepo.generateVerificationCode()`        |

## Wallet/Point System

### Point Service

| Function/Method   | File                                   | Description                                           | Parameters                                                                                        | Return                                  | Example                                                |
| ----------------- | -------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------- | --------------------------------------- | ------------------------------------------------------ |
| `creditWallet`    | src/modules/point/point.service.ts     | Credit wallet - Add points (create lot + ledger)      | `appId`, `userId`, `amount`, `reason`, `refType`, `refId`, `expiresAt?`, `idempotencyKey?`       | `Promise<WalletLedgerEntity>`           | `pointService.creditWallet(appId, userId, '1000', ...)` |
| `debitWallet`     | src/modules/point/point.service.ts     | Debit wallet - Deduct points using FIFO               | `appId`, `userId`, `amount`, `reason`, `refType`, `refId`, `idempotencyKey?`                     | `Promise<WalletLedgerEntity[]>`         | `pointService.debitWallet(appId, userId, '500', ...)`  |
| `getBalance`      | src/modules/point/point.service.ts     | Get user balance (sum of remaining lots)              | `userId: string`                                                                                  | `Promise<{balance: string, balanceNumber: number}>` | `pointService.getBalance(userId)`                      |
| `getLedger`       | src/modules/point/point.service.ts     | Get user ledger (transaction history)                 | `userId: string`, `limit?: number`, `offset?: number`                                             | `Promise<{entries: WalletLedgerEntity[], total: number}>` | `pointService.getLedger(userId, 20, 0)`                |

### Wallet Service

| Function/Method | File                                   | Description                                  | Parameters                                 | Return | Example                          |
| --------------- | -------------------------------------- | -------------------------------------------- | ------------------------------------------ | ------ | -------------------------------- |
| `credit`        | src/modules/wallet/wallet.service.ts   | Credit wallet (placeholder)                  | `CreditWalletDto`                          | `never` | `walletService.credit(dto)`     |
| `debit`         | src/modules/wallet/wallet.service.ts   | Debit wallet (placeholder)                   | `DebitWalletDto`                           | `never` | `walletService.debit(dto)`      |
| `getBalance`    | src/modules/wallet/wallet.service.ts   | Get wallet balance (placeholder)             | `WalletBalanceQueryDto`                    | `never` | `walletService.getBalance(q)`   |
| `getLedger`     | src/modules/wallet/wallet.service.ts   | Get wallet ledger (placeholder)              | `WalletLedgerQueryDto`                     | `never` | `walletService.getLedger(q)`    |

### Wallet Lot Repository

| Function/Method              | File                                              | Description                                    | Parameters                                                          | Return                            | Example                                           |
| ---------------------------- | ------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------- | --------------------------------- | ------------------------------------------------- |
| `create`                     | src/modules/point/repositories/wallet-lot.repository.ts | Create new wallet lot (for credit)             | `data: {appId, userId, initialAmount, expiresAt?}`, `manager?`     | `Promise<WalletLotEntity>`        | `lotRepo.create(data, manager)`                   |
| `getAvailableLotsForDebit`   | src/modules/point/repositories/wallet-lot.repository.ts | Get user's available lots for FIFO deduction   | `userId: string`, `manager?: EntityManager`                         | `Promise<WalletLotEntity[]>`      | `lotRepo.getAvailableLotsForDebit(userId, mgr)`   |
| `updateRemainingAmount`      | src/modules/point/repositories/wallet-lot.repository.ts | Update lot remaining amount (for debit)        | `lotId: string`, `newAmount: string`, `manager?: EntityManager`     | `Promise<void>`                   | `lotRepo.updateRemainingAmount(lotId, '500', mgr)`|
| `getUserBalance`             | src/modules/point/repositories/wallet-lot.repository.ts | Get total user balance (sum of remaining)      | `userId: string`                                                    | `Promise<string>`                 | `lotRepo.getUserBalance(userId)`                  |
| `getUserLots`                | src/modules/point/repositories/wallet-lot.repository.ts | Get user's lots with remaining balance         | `userId: string`                                                    | `Promise<WalletLotEntity[]>`      | `lotRepo.getUserLots(userId)`                     |
| `findById`                   | src/modules/point/repositories/wallet-lot.repository.ts | Find lot by ID                                 | `lotId: string`                                                     | `Promise<WalletLotEntity \| null>`| `lotRepo.findById(lotId)`                         |

### Wallet Ledger Repository

| Function/Method          | File                                                 | Description                                    | Parameters                                                                                        | Return                                                  | Example                                           |
| ------------------------ | ---------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------- |
| `create`                 | src/modules/point/repositories/wallet-ledger.repository.ts | Create ledger entry (append-only)              | `data: {appId, userId, lotId, direction, amount, reason, refType, refId, balanceSnapshot}`, `manager?` | `Promise<WalletLedgerEntity>`                           | `ledgerRepo.create(data, manager)`                |
| `getUserLedger`          | src/modules/point/repositories/wallet-ledger.repository.ts | Get user's transaction history with pagination | `userId: string`, `options?: {limit?, offset?, direction?}`                                       | `Promise<{entries: WalletLedgerEntity[], total: number}>` | `ledgerRepo.getUserLedger(userId, {limit: 20})`   |
| `getByReference`         | src/modules/point/repositories/wallet-ledger.repository.ts | Get ledger entries by reference (traceability) | `refType: string`, `refId: string`                                                                | `Promise<WalletLedgerEntity[]>`                         | `ledgerRepo.getByReference('order', orderId)`     |
| `getByLot`               | src/modules/point/repositories/wallet-ledger.repository.ts | Get ledger entries for a specific lot          | `lotId: string`                                                                                   | `Promise<WalletLedgerEntity[]>`                         | `ledgerRepo.getByLot(lotId)`                      |
| `getLastBalanceSnapshot` | src/modules/point/repositories/wallet-ledger.repository.ts | Get user's last balance snapshot               | `userId: string`                                                                                  | `Promise<string \| null>`                               | `ledgerRepo.getLastBalanceSnapshot(userId)`       |

## Billing

### Product Service

| Function/Method      | File                                                | Description                                    | Parameters                                                                          | Return                         | Example                                          |
| -------------------- | --------------------------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------ | ------------------------------------------------ |
| `listProducts`       | src/modules/billing/services/product.service.ts     | List active products (controller method)       | `()`                                                                                | `Promise<ProductEntity[]>`     | `productService.listProducts()`                  |
| `createProduct`      | src/modules/billing/services/product.service.ts     | Create product (controller method, admin)      | `CreateProductDto`                                                                  | `Promise<ProductEntity>`       | `productService.createProduct(dto)`              |
| `getProduct`         | src/modules/billing/services/product.service.ts     | Get product by ID                              | `productId: string`                                                                 | `Promise<ProductEntity>`       | `productService.getProduct(productId)`           |
| `updateProduct`      | src/modules/billing/services/product.service.ts     | Update product (admin)                         | `productId: string`, `data: {name?, defaultPrice?, metadata?, isActive?}`           | `Promise<ProductEntity>`       | `productService.updateProduct(id, data)`         |
| `deactivateProduct`  | src/modules/billing/services/product.service.ts     | Deactivate product (soft delete)               | `productId: string`                                                                 | `Promise<ProductEntity>`       | `productService.deactivateProduct(productId)`    |
| `activateProduct`    | src/modules/billing/services/product.service.ts     | Activate product                               | `productId: string`                                                                 | `Promise<ProductEntity>`       | `productService.activateProduct(productId)`      |

### Order Service

| Function/Method      | File                                                | Description                                    | Parameters                                                                          | Return                                            | Example                                          |
| -------------------- | --------------------------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------ |
| `createOrder`        | src/modules/billing/services/order.service.ts       | Create order (controller method)               | `CreateOrderDto`                                                                    | `Promise<OrderEntity>`                            | `orderService.createOrder(dto)`                  |
| `refundOrder`        | src/modules/billing/services/order.service.ts       | Refund order (controller method)               | `orderId: string`, `RefundOrderDto`                                                 | `Promise<OrderEntity>`                            | `orderService.refundOrder(id, dto)`              |
| `getOrder`           | src/modules/billing/services/order.service.ts       | Get order by ID                                | `orderId: string`                                                                   | `Promise<OrderEntity>`                            | `orderService.getOrder(orderId)`                 |
| `getUserOrders`      | src/modules/billing/services/order.service.ts       | Get user's orders                              | `userId: string`, `limit?: number`, `offset?: number`, `status?: OrderStatus`       | `Promise<{orders: OrderEntity[], total: number}>` | `orderService.getUserOrders(userId, 20, 0)`      |

### Product Repository

| Function/Method  | File                                               | Description                       | Parameters                                                                      | Return                    | Example                                    |
| ---------------- | -------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------- | ------------------------- | ------------------------------------------ |
| `findById`       | src/modules/billing/repositories/product.repository.ts | Find product by ID                | `id: string`                                                                    | `Promise<ProductEntity \| null>` | `productRepo.findById(id)`                 |
| `findByApp`      | src/modules/billing/repositories/product.repository.ts | Find active products by app       | `appId: string`                                                                 | `Promise<ProductEntity[]>` | `productRepo.findByApp(appId)`             |
| `create`         | src/modules/billing/repositories/product.repository.ts | Create new product                | `data: {...}`, `manager?: EntityManager`                                        | `Promise<ProductEntity>`   | `productRepo.create(data, manager)`        |
| `update`         | src/modules/billing/repositories/product.repository.ts | Update product                    | `id: string`, `data: {...}`, `manager?: EntityManager`                          | `Promise<ProductEntity>`   | `productRepo.update(id, data, manager)`    |

### Order Repository

| Function/Method  | File                                             | Description                       | Parameters                                                                      | Return                                            | Example                                    |
| ---------------- | ------------------------------------------------ | --------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------ |
| `findById`       | src/modules/billing/repositories/order.repository.ts | Find order by ID with relations   | `id: string`                                                                    | `Promise<OrderEntity \| null>`                    | `orderRepo.findById(id)`                   |
| `create`         | src/modules/billing/repositories/order.repository.ts | Create new order                  | `data: {...}`, `manager?: EntityManager`                                        | `Promise<OrderEntity>`                            | `orderRepo.create(data, manager)`          |
| `updateStatus`   | src/modules/billing/repositories/order.repository.ts | Update order status               | `id: string`, `status: OrderStatus`, `manager?: EntityManager`                  | `Promise<void>`                                   | `orderRepo.updateStatus(id, status, mgr)`  |
| `getUserOrders`  | src/modules/billing/repositories/order.repository.ts | Get user orders with pagination   | `userId: string`, `options?: {...}`                                             | `Promise<{orders: OrderEntity[], total: number}>` | `orderRepo.getUserOrders(userId, options)` |

## Jobs

| Function/Method      | File                               | Description                            | Parameters                     | Return            | Example                                   |
| -------------------- | ---------------------------------- | -------------------------------------- | ------------------------------ | ----------------- | ----------------------------------------- |
| `createCallbackJob`  | src/modules/job/job.service.ts     | Registers callback HTTP job            | `CreateCallbackJobDto`         | `Promise<never>`* | `jobService.createCallbackJob(dto)`       |
| `runDueJobs`         | src/modules/job/job.service.ts     | Executes due jobs picked by scheduler  | `RunJobsDto`                   | `Promise<never>`* | `jobService.runDueJobs({ limit: 100 })`   |

### Job Repository

| Function/Method       | File                                       | Description                           | Parameters                                                            | Return                    | Example                                        |
| --------------------- | ------------------------------------------ | ------------------------------------- | --------------------------------------------------------------------- | ------------------------- | ---------------------------------------------- |
| `create`              | src/modules/job/repositories/job.repository.ts | Create new job                        | `data: {...}`, `manager?: EntityManager`                              | `Promise<JobEntity>`      | `jobRepo.create(data, manager)`                |
| `findById`            | src/modules/job/repositories/job.repository.ts | Find job by ID                        | `id: string`                                                          | `Promise<JobEntity \| null>` | `jobRepo.findById(id)`                         |
| `getDueJobs`          | src/modules/job/repositories/job.repository.ts | Get due jobs with row-level lock      | `limit?: number`, `manager?: EntityManager`                           | `Promise<JobEntity[]>`    | `jobRepo.getDueJobs(10, manager)`              |
| `updateStatus`        | src/modules/job/repositories/job.repository.ts | Update job status                     | `id: string`, `status: JobStatus`, `lastError?: string`, `manager?: EntityManager` | `Promise<void>`           | `jobRepo.updateStatus(id, status, err, mgr)`   |
| `incrementRetryCount` | src/modules/job/repositories/job.repository.ts | Increment retry count and set next retry | `id: string`, `nextRetryAt: Date`, `lastError: string`, `manager?: EntityManager` | `Promise<void>`           | `jobRepo.incrementRetryCount(id, date, err)`   |

## Admin

| Function/Method      | File                               | Description                            | Parameters                          | Return            | Example                                        |
| -------------------- | ---------------------------------- | -------------------------------------- | ----------------------------------- | ----------------- | ---------------------------------------------- |
| `suspendUser`        | src/modules/admin/admin.service.ts | Suspends user                          | `userId: string`, `SuspendReasonDto`| `Promise<never>`* | `adminService.suspendUser(id, dto)`            |
| `unsuspendUser`      | src/modules/admin/admin.service.ts | Removes suspension                     | `userId: string`                   | `Promise<never>`* | `adminService.unsuspendUser(id)`               |
| `adjustWallet`       | src/modules/admin/admin.service.ts | Adjusts wallet delta with audit        | `AdjustWalletDto`                  | `Promise<never>`* | `adminService.adjustWallet(dto)`               |
| `retryJob`           | src/modules/admin/admin.service.ts | Retries a job                          | `jobId: string`                    | `Promise<never>`* | `adminService.retryJob(id)`                    |
| `deadLetter`         | src/modules/admin/admin.service.ts | Marks job as dead                      | `jobId: string`                    | `Promise<never>`* | `adminService.deadLetter(id)`                  |
| `listJobs`           | src/modules/admin/admin.service.ts | Lists jobs with filters                | `ListJobsQueryDto`                 | `Promise<never>`* | `adminService.listJobs(query)`                 |

## Platform

| Function/Method      | File                                    | Description                         | Parameters                                                                 | Return            | Example                                      |
| -------------------- | --------------------------------------- | ----------------------------------- | -------------------------------------------------------------------------- | ----------------- | -------------------------------------------- |
| `listApps`           | src/modules/platform/platform.service.ts| Lists registered apps               | `()`                                                                       | `Promise<AppEntity[]>` | `platformService.listApps()`                 |
| `getApp`             | src/modules/platform/platform.service.ts| Get app by ID                       | `appId: string`                                                            | `Promise<AppEntity>`   | `platformService.getApp(appId)`              |
| `createApp`          | src/modules/platform/platform.service.ts| Creates a new app                   | `name: string`, `callbackBaseUrl?: string`, `callbackAllowlistPaths?: string[]` | `Promise<AppEntity>` | `platformService.createApp('MyApp')`         |
| `updateApp`          | src/modules/platform/platform.service.ts| Update app configuration            | `appId: string`, `data: { name?, callbackBaseUrl?, callbackAllowlistPaths?, status?, callbackSecretRef? }` | `Promise<AppEntity>` | `platformService.updateApp(appId, data)`     |
| `suspendApp`         | src/modules/platform/platform.service.ts| Suspend app                         | `appId: string`                                                            | `Promise<AppEntity>`   | `platformService.suspendApp(appId)`          |
| `activateApp`        | src/modules/platform/platform.service.ts| Activate app                        | `appId: string`                                                            | `Promise<AppEntity>`   | `platformService.activateApp(appId)`         |
| `updateApp`          | src/modules/platform/platform.service.ts| Updates app callback configuration  | `appId: string`, `UpdateAppDto`  | `Promise<never>`* | `platformService.updateApp(id, dto)`         |

> \*Services currently throw `NotImplementedException` placeholders.
