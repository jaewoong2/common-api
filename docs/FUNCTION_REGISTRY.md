# Function Registry

## Application Bootstrap

| Function                 | File               | Description                                    | Parameters                              | Return              | Example                                      |
| ------------------------ | ------------------ | ---------------------------------------------- | --------------------------------------- | ------------------- | -------------------------------------------- |
| `bootstrap`              | src/main.ts        | Starts Nest + Fastify server for ECS/Fargate   | `()`                                    | `Promise<void>`     | `node dist/main.js`                          |
| `configureHttp`          | src/main.ts        | Applies logger, validation, filters, and interceptors for Fastify | `app: NestFastifyApplication`          | `void`              | `configureHttp(app)`                         |
| `setupSwaggerDocs`       | src/main.ts        | Registers Swagger document and UI route        | `app: NestFastifyApplication`           | `void`              | `setupSwaggerDocs(app)`                      |
| `enableHotReload`        | src/main.ts        | Closes server during HMR reload to prevent port conflicts | `app: NestFastifyApplication`  | `void`              | `enableHotReload(app)`                       |
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
| `catch`                  | src/common/filters/http-exception.filter.ts| Normalizes errors into `{success:false, error{code,message,details?}, request_id, timestamp}` | `exception: unknown`, `host: ArgumentsHost` | `void`             | Used as a global filter                                        |
| `intercept`              | src/common/interceptors/response.interceptor.ts| Wraps successful responses with `success`, `data`, `request_id`, `timestamp` | `context: ExecutionContext`, `next: CallHandler` | `Observable<any>` | Used as a global interceptor                                   |
| `use`                    | src/core/logger/request-id.middleware.ts   | Ensures `X-Request-Id` header and sets `req.id`    | `req`, `res`, `next`                        | `void`             | Registered for all routes                                      |
| `FastifyPassportGuard`   | src/common/guards/fastify-passport.guard.ts| Returns Passport guard compatible with Fastify responses | `strategy?: string \| string[]`         | `Type<IAuthGuard>` | `@UseGuards(FastifyPassportGuard('google'))`                   |
| `JwtAuthGuard`           | src/common/guards/jwt-auth.guard.ts        | Global guard enforcing bearer JWT unless `@Public` | `context: ExecutionContext`                 | `boolean \| Promise<boolean>` | Provided globally via `APP_GUARD`                              |
| `canActivate`            | src/common/guards/roles.guard.ts           | Global role check guard (honors `@Roles`)          | `context: ExecutionContext`                 | `boolean`          | Provided globally; set roles via `@Roles(...)`                 |
| `Roles` decorator        | src/common/decorators/roles.decorator.ts   | Sets route metadata for required roles             | `...roles: string[]`                        | `CustomDecorator`   | `@Roles('ADMIN')`                                              |
| `Auth` decorator         | src/common/decorators/auth.decorator.ts    | Adds `JwtAuthGuard` + Swagger bearer auth metadata | `()`                                        | `ClassDecorator & MethodDecorator` | `@Auth()`                                                      |

## Common Exceptions

| Function/Method | File                                        | Description                                         | Parameters                                                                                  | Return          | Example                                                                                  |
| --------------- | ------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------- | --------------- | ---------------------------------------------------------------------------------------- |
| `AppException`  | src/common/exceptions/app.exception.ts      | Base HTTP exception with stable `code` and details  | `code: ErrorCode \| string`, `message: string`, `status: HttpStatus`, `details?: Record<string, unknown>` | `AppException`  | `throw new AppException(ERROR_CODE.INTERNAL_ERROR, "Internal error", HttpStatus.INTERNAL_SERVER_ERROR)` |
| `ERROR_CODE` map| src/common/exceptions/error-codes.ts        | Enum-like map of reusable error codes               | `-`                                                                                         | `Record<string, string>` | `ERROR_CODE.OAUTH_EMAIL_REQUIRED`                                                         |

## Auth & User

### Auth Service (Controller Methods)

| Function/Method          | File                                   | Description                                    | Parameters                       | Return                                       | Example                               |
| ------------------------ | -------------------------------------- | ---------------------------------------------- | -------------------------------- | -------------------------------------------- | ------------------------------------- |
| `requestMagicLink`       | src/modules/auth/auth.service.ts       | Sends magic link email (generates token + code) | `appId: string`, `RequestMagicLinkDto`            | `Promise<{message: string, code?: string}>`  | `authService.requestMagicLink(appId, dto)`   |
| `verifyMagicLink`        | src/modules/auth/auth.service.ts       | Verifies magic link token and issues JWT tokens | `VerifyMagicLinkDto`             | `Promise<{access_token, refresh_token, user}>` | `authService.verifyMagicLink(dto)`    |
| `oauthStart`             | src/modules/auth/auth.service.ts       | Starts OAuth flow (handled by Passport guards) | `provider: string`, `req: AppRequest`   | `Promise<void>`                              | `authService.oauthStart('google', req)` |
| `oauthCallback`          | src/modules/auth/auth.service.ts       | Handles OAuth callback and generates JWT tokens | `provider: string`, `req: AppRequest`   | `Promise<{access_token, refresh_token, user}>` | `authService.oauthCallback('google', req)` |
| `validateOAuthUser`      | src/modules/auth/auth.service.ts       | Validates OAuth user and creates/links account | `provider: string`, `profile: OAuthProfile`, `appId?: string` | `Promise<UserEntity>`                        | `authService.validateOAuthUser('google', profile, appId)` |
| `refresh`                | src/modules/auth/auth.service.ts       | Issues new access token from refresh token     | `RefreshTokenDto`                | `Promise<{access_token: string}>`            | `authService.refresh(dto)`            |
| `logout`                 | src/modules/auth/auth.service.ts       | Revokes refresh token                          | `LogoutDto`                      | `Promise<{message: string}>`                 | `authService.logout(dto)`             |
| `getMe`                  | src/modules/auth/auth.service.ts       | Retrieves current user profile                 | `user: AuthenticatedUser`                      | `Promise<UserEntity>`                        | `authService.getMe(req.user)`         |
| `updateMe`               | src/modules/auth/auth.service.ts       | Updates current user profile                   | `user: AuthenticatedUser`, `UpdateProfileDto`  | `Promise<UserEntity>`                        | `authService.updateMe(req.user, dto)` |
| `deleteMe`               | src/modules/auth/auth.service.ts       | Soft-deletes current user                      | `user: AuthenticatedUser`                      | `Promise<{message: string}>`                 | `authService.deleteMe(req.user)`      |

### Auth Service (Core Methods)

| Function/Method          | File                                   | Description                                    | Parameters                                                        | Return                                       | Example                                            |
| ------------------------ | -------------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------- | -------------------------------------------- | -------------------------------------------------- |
| `verifyMagicLinkByToken` | src/modules/auth/auth.service.ts       | Verifies magic link by URL token               | `token: string`                                                   | `Promise<{access_token, refresh_token, user}>` | `authService.verifyMagicLinkByToken(token)`        |
| `verifyMagicLinkByCode`  | src/modules/auth/auth.service.ts       | Verifies magic link by 6-digit code            | `appId: string`, `email: string`, `code: string`                  | `Promise<{access_token, refresh_token, user}>` | `authService.verifyMagicLinkByCode(appId, email, code)` |
| `refreshAccessToken`     | src/modules/auth/auth.service.ts       | Refresh access token using refresh token       | `refreshToken: string`                                            | `Promise<{access_token: string}>`            | `authService.refreshAccessToken(token)`            |
| `getCurrentUser`         | src/modules/auth/auth.service.ts       | Get user by ID                                 | `userId: string`                                                  | `Promise<UserEntity>`                        | `authService.getCurrentUser(userId)`               |
| `updateProfile`          | src/modules/auth/auth.service.ts       | Update user profile                            | `userId: string`, `profile: JsonObject`                  | `Promise<UserEntity>`                        | `authService.updateProfile(userId, profile)`       |
| `deleteAccount`          | src/modules/auth/auth.service.ts       | Soft delete user account                       | `userId: string`                                                  | `Promise<{message: string}>`                 | `authService.deleteAccount(userId)`                |

### JWT Strategy

| Function/Method | File                                        | Description                                      | Parameters                      | Return                        | Example                               |
| --------------- | ------------------------------------------- | ------------------------------------------------ | ------------------------------- | ----------------------------- | ------------------------------------- |
| `validate`      | src/modules/auth/strategies/jwt.strategy.ts | Maps JWT payload to `AuthenticatedUser` for req   | `payload: JwtPayload`           | `Promise<AuthenticatedUser>`  | `jwtStrategy.validate(payload)`       |

### OAuth Profile Utilities (Kakao)

| Function/Method              | File                                                       | Description                                       | Parameters                    | Return                      | Example                                                     |
| ---------------------------- | ---------------------------------------------------------- | ------------------------------------------------- | ----------------------------- | --------------------------- | ----------------------------------------------------------- |
| `isKakaoProfile`             | src/modules/auth/interfaces/kakao-profile.interface.ts     | Type guard for Kakao profile                      | `profile: unknown`            | `profile is KakaoOAuthProfile` | `if (isKakaoProfile(profile)) { ... }`                      |
| `extractKakaoEmail`          | src/modules/auth/interfaces/kakao-profile.interface.ts     | Extract email from Kakao profile                  | `profile: KakaoOAuthProfile`  | `string \| undefined`       | `extractKakaoEmail(profile)`                                |
| `extractKakaoProfileImage`   | src/modules/auth/interfaces/kakao-profile.interface.ts     | Extract profile image URL                         | `profile: KakaoOAuthProfile`  | `string \| undefined`       | `extractKakaoProfileImage(profile)`                         |
| `extractKakaoThumbnail`      | src/modules/auth/interfaces/kakao-profile.interface.ts     | Extract thumbnail image URL                       | `profile: KakaoOAuthProfile`  | `string \| undefined`       | `extractKakaoThumbnail(profile)`                            |
| `extractKakaoNickname`       | src/modules/auth/interfaces/kakao-profile.interface.ts     | Extract nickname (never undefined)                | `profile: KakaoOAuthProfile`  | `string`                    | `extractKakaoNickname(profile)`                             |
| `buildKakaoUserProfile`      | src/modules/auth/interfaces/kakao-profile.interface.ts     | Build complete user profile object                | `profile: KakaoOAuthProfile`  | `KakaoUserProfileData`      | `buildKakaoUserProfile(profile)`                            |

### OAuth Profile Utilities (Google)

| Function/Method              | File                                                       | Description                                       | Parameters                    | Return                      | Example                                                     |
| ---------------------------- | ---------------------------------------------------------- | ------------------------------------------------- | ----------------------------- | --------------------------- | ----------------------------------------------------------- |
| `isGoogleProfile`            | src/modules/auth/interfaces/google-profile.interface.ts    | Type guard for Google profile                     | `profile: unknown`            | `profile is GoogleOAuthProfile` | `if (isGoogleProfile(profile)) { ... }`                     |
| `extractGoogleEmail`         | src/modules/auth/interfaces/google-profile.interface.ts    | Extract email from Google profile                 | `profile: GoogleOAuthProfile` | `string \| undefined`       | `extractGoogleEmail(profile)`                               |
| `extractGoogleVerifiedEmail` | src/modules/auth/interfaces/google-profile.interface.ts    | Extract verified email only                       | `profile: GoogleOAuthProfile` | `string \| undefined`       | `extractGoogleVerifiedEmail(profile)`                       |
| `extractGooglePhoto`         | src/modules/auth/interfaces/google-profile.interface.ts    | Extract profile photo URL                         | `profile: GoogleOAuthProfile` | `string \| undefined`       | `extractGooglePhoto(profile)`                               |
| `extractGoogleDisplayName`   | src/modules/auth/interfaces/google-profile.interface.ts    | Extract display name (never undefined)            | `profile: GoogleOAuthProfile` | `string`                    | `extractGoogleDisplayName(profile)`                         |
| `buildGoogleUserProfile`     | src/modules/auth/interfaces/google-profile.interface.ts    | Build complete user profile object                | `profile: GoogleOAuthProfile` | `GoogleUserProfileData`     | `buildGoogleUserProfile(profile)`                           |

### OAuth Profile Utilities (Generic)

| Function/Method              | File                                                       | Description                                       | Parameters                    | Return                      | Example                                                     |
| ---------------------------- | ---------------------------------------------------------- | ------------------------------------------------- | ----------------------------- | --------------------------- | ----------------------------------------------------------- |
| `getOAuthProvider`           | src/modules/auth/interfaces/oauth-profile.interface.ts     | Get provider type from profile                    | `profile: OAuthProfile`       | `OAuthProviderType`         | `getOAuthProvider(profile)`                                 |
| `extractOAuthUserId`         | src/modules/auth/interfaces/oauth-profile.interface.ts     | Extract provider user ID (normalized to string)   | `profile: OAuthProfile`       | `string`                    | `extractOAuthUserId(profile)`                               |

### Auth Exceptions

| Function/Method                      | File                                                | Description                                       | Parameters          | Return                                  | Example                                                     |
| ------------------------------------ | --------------------------------------------------- | ------------------------------------------------- | ------------------- | --------------------------------------- | ----------------------------------------------------------- |
| `OAuthEmailRequiredException`        | src/modules/auth/exceptions/oauth.exceptions.ts     | Thrown when OAuth provider omits an email address | `provider: string`  | `OAuthEmailRequiredException`           | `throw new OAuthEmailRequiredException("google")`           |
| `OAuthProviderConfigMissingException`| src/modules/auth/exceptions/oauth.exceptions.ts     | Thrown when required OAuth client config is absent| `provider: string`  | `OAuthProviderConfigMissingException`   | `throw new OAuthProviderConfigMissingException("kakao")`    |

### User Service

| Function/Method  | File                                       | Description                       | Parameters                                        | Return                            | Example                                    |
| ---------------- | ------------------------------------------ | --------------------------------- | ------------------------------------------------- | --------------------------------- | ------------------------------------------ |
| `findAll`        | src/modules/user/user.service.ts           | List all users for app            | `appId: string`                                   | `Promise<UserResponseDto[]>`      | `userService.findAll(appId)`               |
| `findOne`        | src/modules/user/user.service.ts           | Find user by ID                   | `userId: string`                                  | `Promise<UserResponseDto>`        | `userService.findOne(userId)`              |
| `create`         | src/modules/user/user.service.ts           | Create new user                   | `appId: string`, `CreateUserDto`                  | `Promise<UserResponseDto>`        | `userService.create(appId, dto)`           |
| `update`         | src/modules/user/user.service.ts           | Update user                       | `userId: string`, `UpdateUserDto`                 | `Promise<UserResponseDto>`        | `userService.update(userId, dto)`          |
| `remove`         | src/modules/user/user.service.ts           | Soft delete user                  | `userId: string`                                  | `Promise<void>`                   | `userService.remove(userId)`               |

### User Repository

| Function/Method  | File                                       | Description                       | Parameters                                        | Return                            | Example                                    |
| ---------------- | ------------------------------------------ | --------------------------------- | ------------------------------------------------- | --------------------------------- | ------------------------------------------ |
| `findById`       | src/modules/user/repositories/user.repository.ts | Find user by ID                   | `id: string`                                      | `Promise<UserEntity \| null>`     | `userRepo.findById(id)`                    |
| `findByIdWithDto` | src/modules/user/repositories/user.repository.ts | Find user by ID and return DTO   | `id: string`                                      | `Promise<UserResponseDto \| null>`| `userRepo.findByIdWithDto(id)`             |
| `findByEmail`    | src/modules/user/repositories/user.repository.ts | Find user by email within app     | `appId: string`, `email: string`                  | `Promise<UserEntity \| null>`     | `userRepo.findByEmail(appId, email)`       |
| `findAllByApp`   | src/modules/user/repositories/user.repository.ts | Find all users for app            | `appId: string`                                   | `Promise<UserResponseDto[]>`      | `userRepo.findAllByApp(appId)`             |
| `create`         | src/modules/user/repositories/user.repository.ts | Create new user                   | `data: {appId, email, profile?, role?}`           | `Promise<UserEntity>`             | `userRepo.create(data)`                    |
| `update`         | src/modules/user/repositories/user.repository.ts | Update user                       | `userId: string`, `data: Partial<{...}>`          | `Promise<UserResponseDto>`        | `userRepo.update(userId, data)`            |
| `updateProfile`  | src/modules/user/repositories/user.repository.ts | Update user profile               | `userId: string`, `profile: JsonObject`  | `Promise<UserEntity>`             | `userRepo.updateProfile(userId, profile)`  |
| `updateStatus`   | src/modules/user/repositories/user.repository.ts | Update user status                | `userId: string`, `status: UserStatus`            | `Promise<void>`                   | `userRepo.updateStatus(userId, status)`    |
| `softDelete`     | src/modules/user/repositories/user.repository.ts | Soft delete user (set to DELETED) | `userId: string`                                  | `Promise<void>`                   | `userRepo.softDelete(userId)`              |

### OAuth Provider Repository

| Function/Method               | File                                              | Description                              | Parameters                                                          | Return                                   | Example                                           |
| ----------------------------- | ------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------- |
| `findByAppProviderAndUserId`  | src/modules/auth/repositories/oauth-provider.repository.ts | Find OAuth provider by app + provider + provider user ID | `appId: string`, `provider: string`, `providerUserId: string`                        | `Promise<OAuthProviderEntity \| null>`   | `oauthRepo.findByAppProviderAndUserId(appId, 'google', '123')` |
| `findByUserId`                | src/modules/auth/repositories/oauth-provider.repository.ts | Find all OAuth providers for user        | `userId: string`                                                    | `Promise<OAuthProviderEntity[]>`         | `oauthRepo.findByUserId(userId)`                  |
| `create`                      | src/modules/auth/repositories/oauth-provider.repository.ts | Create OAuth provider link               | `data: {appId, userId, provider, providerUserId, email?, profile: JsonObject}`        | `Promise<OAuthProviderEntity>`           | `oauthRepo.create(data)`                          |

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

| Function/Method | File                                   | Description                                  | Parameters                                 | Return                                  | Example                          |
| --------------- | -------------------------------------- | -------------------------------------------- | ------------------------------------------ | --------------------------------------- | -------------------------------- |
| `credit`        | src/modules/wallet/wallet.service.ts   | Credit wallet (delegates to PointService)    | `CreditWalletDto`                          | `Promise<WalletLedgerEntity>`           | `walletService.credit(dto)`      |
| `debit`         | src/modules/wallet/wallet.service.ts   | Debit wallet (delegates to PointService)     | `DebitWalletDto`                           | `Promise<WalletLedgerEntity[]>`         | `walletService.debit(dto)`       |
| `getBalance`    | src/modules/wallet/wallet.service.ts   | Get wallet balance (delegates to PointService) | `WalletBalanceQueryDto`                  | `Promise<{balance: string, balanceNumber: number}>` | `walletService.getBalance(q)`   |
| `getLedger`     | src/modules/wallet/wallet.service.ts   | Get wallet ledger (delegates to PointService) | `WalletLedgerQueryDto`                   | `Promise<{entries: WalletLedgerEntity[], total: number}>` | `walletService.getLedger(q)`    |

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

### Job Service (Legacy Methods)

| Function/Method      | File                               | Description                            | Parameters                     | Return            | Example                                   |
| -------------------- | ---------------------------------- | -------------------------------------- | ------------------------------ | ----------------- | ----------------------------------------- |
| `createCallbackJob`  | src/modules/job/job.service.ts     | [Legacy] Registers callback HTTP job   | `appId: string`, `payload: {...}`, `idempotencyKey?: string` | `Promise<JobEntity>` | `jobService.createCallbackJob(appId, payload)` |
| `runDueJobs`         | src/modules/job/job.service.ts     | [Legacy] Executes due jobs from DB     | `limit?: number`               | `Promise<number>` | `jobService.runDueJobs(100)`              |
| `getJob`             | src/modules/job/job.service.ts     | Get job by ID                          | `jobId: string`                | `Promise<JobEntity>` | `jobService.getJob(jobId)`                |
| `retryJob`           | src/modules/job/job.service.ts     | Retry failed job (admin operation)     | `jobId: string`                | `Promise<JobEntity>` | `jobService.retryJob(jobId)`              |
| `deadletterJob`      | src/modules/job/job.service.ts     | Mark job as dead letter                | `jobId: string`                | `Promise<JobEntity>` | `jobService.deadletterJob(jobId)`         |

### Job Service (Unified Job System)

| Function/Method           | File                               | Description                                        | Parameters                     | Return                      | Example                                          |
| ------------------------- | ---------------------------------- | -------------------------------------------------- | ------------------------------ | --------------------------- | ------------------------------------------------ |
| `createUnifiedJob`        | src/modules/job/job.service.ts     | Create unified job (mode: db\|sqs\|both)           | `CreateUnifiedJobDto`          | `Promise<JobEntity \| null>` | `jobService.createUnifiedJob(dto)`               |
| `pollAndProcessSqs`       | src/modules/job/job.service.ts     | Poll SQS and process messages                      | `limit?: number`               | `Promise<number>`           | `jobService.pollAndProcessSqs(10)`               |
| `runDueDbJobs`            | src/modules/job/job.service.ts     | Run due DB jobs with retry logic                   | `limit?: number`               | `Promise<number>`           | `jobService.runDueDbJobs(100)`                   |
| `processScheduledMessage` | src/modules/job/job.service.ts     | Process EventBridge scheduled message              | `UnifiedJobMessageDto`         | `Promise<void>`             | `jobService.processScheduledMessage(msg)`        |

### Job Service (Private Helpers)

| Function/Method       | File                               | Description                                        | Parameters                                      | Return                | Example                                          |
| --------------------- | ---------------------------------- | -------------------------------------------------- | ----------------------------------------------- | --------------------- | ------------------------------------------------ |
| `createJobInDb`       | src/modules/job/job.service.ts     | Save job to database                               | `message: UnifiedJobMessageDto`, `manager?: EntityManager` | `Promise<JobEntity>`  | `createJobInDb(message, manager)`                |
| `sendToSqs`           | src/modules/job/job.service.ts     | Send message to SQS FIFO queue                     | `message: UnifiedJobMessageDto`                 | `Promise<void>`       | `sendToSqs(message)`                             |
| `saveFailedJobToDb`   | src/modules/job/job.service.ts     | Save failed job to DB for retry                    | `message: UnifiedJobMessageDto`, `error: string`| `Promise<void>`       | `saveFailedJobToDb(message, error)`              |
| `dbJobToMessage`      | src/modules/job/job.service.ts     | Convert JobEntity to UnifiedJobMessage             | `job: JobEntity`                                | `UnifiedJobMessageDto`| `dbJobToMessage(job)`                            |
| `calculateNextRetry`  | src/modules/job/job.service.ts     | Calculate exponential backoff (min 2^n*60s, max 24h) | `retryCount: number`                         | `Date`                | `calculateNextRetry(3)`                          |

### Message Processor Service

| Function/Method       | File                                              | Description                                    | Parameters                     | Return          | Example                                       |
| --------------------- | ------------------------------------------------- | ---------------------------------------------- | ------------------------------ | --------------- | --------------------------------------------- |
| `processMessage`      | src/modules/job/services/message-processor.service.ts | Route and execute by execution type            | `UnifiedJobMessageDto`         | `Promise<void>` | `processor.processMessage(message)`           |
| `executeLambdaInvoke` | src/modules/job/services/message-processor.service.ts | Execute Lambda invoke (AWS SDK)                | `UnifiedJobMessageDto`         | `Promise<void>` | `executeLambdaInvoke(message)` (private)      |
| `executeLambdaUrl`    | src/modules/job/services/message-processor.service.ts | Execute Lambda Function URL with SigV4         | `UnifiedJobMessageDto`         | `Promise<void>` | `executeLambdaUrl(message)` (private)         |
| `executeRestApi`      | src/modules/job/services/message-processor.service.ts | Execute REST API call                          | `UnifiedJobMessageDto`         | `Promise<void>` | `executeRestApi(message)` (private)           |
| `executeSchedule`     | src/modules/job/services/message-processor.service.ts | Create EventBridge Schedule                    | `UnifiedJobMessageDto`         | `Promise<void>` | `executeSchedule(message)` (private)        |

### Job Repository

| Function/Method       | File                                       | Description                                    | Parameters                                                            | Return                    | Example                                        |
| --------------------- | ------------------------------------------ | ---------------------------------------------- | --------------------------------------------------------------------- | ------------------------- | ---------------------------------------------- |
| `create`              | src/modules/job/repositories/job.repository.ts | Create job (supports legacy & unified fields)  | `data: {...}`, `manager?: EntityManager`                              | `Promise<JobEntity>`      | `jobRepo.create(data, manager)`                |
| `findById`            | src/modules/job/repositories/job.repository.ts | Find job by ID                                 | `jobId: string`, `manager?: EntityManager`                            | `Promise<JobEntity \| null>` | `jobRepo.findById(id, manager)`                |
| `getDueJobsForUpdate` | src/modules/job/repositories/job.repository.ts | Get due jobs with pessimistic lock (PENDING/RETRYING) | `limit: number`, `manager?: EntityManager`                    | `Promise<JobEntity[]>`    | `jobRepo.getDueJobsForUpdate(10, manager)`     |
| `update`              | src/modules/job/repositories/job.repository.ts | Update job status and fields                   | `jobId: string`, `data: {...}`, `manager?: EntityManager`             | `Promise<void>`           | `jobRepo.update(id, data, manager)`            |
| `findWithFilters`     | src/modules/job/repositories/job.repository.ts | Find jobs with filters (admin)                 | `appId: string`, `filters: {...}`, `manager?: EntityManager`          | `Promise<{jobs, total}>`  | `jobRepo.findWithFilters(appId, filters)`      |

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
