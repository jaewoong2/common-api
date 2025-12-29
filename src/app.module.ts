import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import configuration from "./config/configuration";
import validationSchema from "./config/validation";
import { DatabaseModule } from "./core/database/database.module";
import { LoggerModule } from "./core/logger/logger.module";
import { RequestIdMiddleware } from "./core/logger/request-id.middleware";
import { TenantMiddleware } from "./common/middleware/tenant.middleware";
import { CommonModule } from "./common/common.module";
import { EmailModule } from "./infra/email/email.module";
import { AuthModule } from "./modules/auth/auth.module";
import { UserModule } from "./modules/user/user.module";
import { BillingModule } from "./modules/billing/billing.module";
import { JobModule } from "./modules/job/job.module";
import { PointModule } from "./modules/point/point.module";
import { WalletModule } from "./modules/wallet/wallet";
import { AdminModule } from "./modules/admin/admin.module";
import { PlatformModule } from "./modules/platform/platform.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
    }),
    DatabaseModule,
    LoggerModule,
    CommonModule,
    EmailModule,
    AuthModule,
    UserModule,
    BillingModule,
    PointModule,
    WalletModule,
    JobModule,
    AdminModule,
    PlatformModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestIdMiddleware, TenantMiddleware)
      .exclude(
        "/v1/auth/oauth/google/start",
        "/v1/auth/oauth/google/callback",
        "/v1/auth/oauth/kakao/start",
        "/v1/auth/oauth/kakao/callback"
      )
      .forRoutes("*");
  }
}
