# Module Map

| Module        | Path                                      | Responsibility                                             | Dependencies                                       | Exports                    |
| ------------- | ----------------------------------------- | ---------------------------------------------------------- | -------------------------------------------------- | -------------------------- |
| AppModule     | src/app.module.ts                         | Root wiring of config, database, logger, feature modules, global middleware | ConfigModule, DatabaseModule, LoggerModule, feature modules | -                          |
| DatabaseModule| src/core/database/database.module.ts      | TypeORM connection config and registration                 | ConfigModule                                       | TypeOrmModule              |
| LoggerModule  | src/core/logger/logger.module.ts          | Provides AppLogger                                         | -                                                  | AppLogger                  |
| AuthModule    | src/modules/auth/auth.module.ts           | Auth flows (magic link, OAuth, refresh, profile)           | -                                                  | -                          |
| UserModule    | src/modules/user/user.module.ts           | User feature placeholder                                   | -                                                  | -                          |
| BillingModule | src/modules/billing/billing.module.ts     | Products and orders                                        | -                                                  | -                          |
| PointModule   | src/modules/point/point.module.ts         | Wallet credit/debit/balance/ledger                         | -                                                  | -                          |
| JobModule     | src/modules/job/job.module.ts             | Callback jobs creation and runner                          | -                                                  | -                          |
| AdminModule   | src/modules/admin/admin.module.ts         | Admin actions (user suspend, wallet adjust, job ops)       | -                                                  | -                          |
| PlatformModule| src/modules/platform/platform.module.ts   | Platform super-admin app management                        | -                                                  | -                          |
