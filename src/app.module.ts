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
import { BillingModule } from "./modules/billing/billing.module";
import { JobModule } from "./modules/job/job.module";
import { PointModule } from "./modules/point/point.module";
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
    BillingModule,
    PointModule,
    JobModule,
    AdminModule,
    PlatformModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware, TenantMiddleware).forRoutes("*");
  }
}
