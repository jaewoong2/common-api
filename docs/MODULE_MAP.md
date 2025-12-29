# Module Map

| Module        | Path                                      | Responsibility                                             | Dependencies                                       | Exports                    |
| ------------- | ----------------------------------------- | ---------------------------------------------------------- | -------------------------------------------------- | -------------------------- |
| AppModule     | src/app.module.ts                         | Root wiring of config, database, logger, feature modules, global middleware | ConfigModule, DatabaseModule, LoggerModule, CommonModule, EmailModule, AuthModule, UserModule, BillingModule, PointModule, WalletModule, JobModule, AdminModule, PlatformModule | -                          |
| DatabaseModule| src/core/database/database.module.ts      | TypeORM connection config and registration                 | ConfigModule                                       | TypeOrmModule              |
| LoggerModule  | src/core/logger/logger.module.ts          | Provides AppLogger                                         | -                                                  | AppLogger                  |
| CommonModule  | src/common/common.module.ts               | Shared providers (guards, repositories)                    | TypeOrmModule                                      | IdempotencyKeyRepository, IdempotencyGuard, RolesGuard |
| EmailModule   | src/infra/email/email.module.ts           | Email delivery adapters                                    | -                                                  | EmailService               |
| AuthModule    | src/modules/auth/auth.module.ts           | Auth flows (magic link, OAuth, refresh, profile)           | TypeOrmModule, PassportModule, JwtModule, UserModule | AuthService, RefreshTokenRepository, MagicLinkTokenRepository |
| UserModule    | src/modules/user/user.module.ts           | User CRUD operations                                       | TypeOrmModule                                      | UserService, UserRepository |
| BillingModule | src/modules/billing/billing.module.ts     | Products and orders (NOTE: handles product CRUD)           | TypeOrmModule, PointModule                         | ProductService, OrderService, ProductRepository, OrderRepository |
| PointModule   | src/modules/point/point.module.ts         | Wallet credit/debit/balance/ledger (lot-based point system) | TypeOrmModule, CommonModule                       | PointService, WalletLotRepository, WalletLedgerRepository |
| WalletModule  | src/modules/wallet/wallet.ts              | Wallet HTTP endpoints (delegates to PointService)          | PointModule                                        | WalletService              |
| JobModule     | src/modules/job/job.module.ts             | Callback jobs creation and runner                          | TypeOrmModule, PlatformModule                      | JobService, JobRepository  |
| AdminModule   | src/modules/admin/admin.module.ts         | Admin actions (user suspend, wallet adjust, job ops)       | AuthModule, PointModule, JobModule                 | AdminService               |
| PlatformModule| src/modules/platform/platform.module.ts   | Platform super-admin app management                        | TypeOrmModule                                      | PlatformService, AppRepository |
