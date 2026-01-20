import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  WebhookRequestEntity,
  ProcessingLockEntity,
  TradeLogEntity,
} from "../../database/entities";
import {
  WebhookController,
  WebhookExecutorController,
  BinanceTestController,
} from "./controllers";
import {
  WebhookReceiverService,
  WebhookExecutorService,
  BinanceTestService,
} from "./services";
import {
  WebhookRequestRepository,
  ProcessingLockRepository,
} from "./repositories";
import {
  ProviderAdapterRegistry,
  BinanceAdapter,
  BinanceApiClient,
} from "./adapters";
import { UserModule } from "../user/user.module";
import { JobModule } from "../job/job.module";
import { ExchangeKeysModule } from "../exchange-keys";
import { AuthModule } from "../auth/auth.module";

/**
 * Webhook Module
 * @description TradingView webhook 수신 및 실행 모듈
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      WebhookRequestEntity,
      ProcessingLockEntity,
      TradeLogEntity,
    ]),
    forwardRef(() => UserModule),
    forwardRef(() => JobModule),
    forwardRef(() => ExchangeKeysModule),
    forwardRef(() => AuthModule), // For JwtService
  ],
  controllers: [
    WebhookController,
    WebhookExecutorController,
    BinanceTestController,
  ],
  providers: [
    // Services
    WebhookReceiverService,
    WebhookExecutorService,
    BinanceTestService,
    // Repositories
    WebhookRequestRepository,
    ProcessingLockRepository,
    // Adapters
    ProviderAdapterRegistry,
    BinanceAdapter,
    BinanceApiClient,
  ],
  exports: [
    WebhookReceiverService,
    WebhookExecutorService,
    WebhookRequestRepository,
    ProcessingLockRepository,
    ProviderAdapterRegistry,
  ],
})
export class WebhookModule {}
