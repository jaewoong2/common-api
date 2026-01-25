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
  AdminRecoveryController,
  TradeController,
} from "./controllers";
import {
  WebhookReceiverService,
  WebhookExecutorService,
  BinanceTestService,
  AdminRecoveryService,
  TradeService,
} from "./services";
import {
  WebhookRequestRepository,
  ProcessingLockRepository,
} from "./repositories";
import {
  ProviderAdapterRegistry,
  BinanceAdapter,
  BinanceApiClient,
  DiscordAdapter,
} from "./adapters";
import { PROVIDER_ADAPTERS } from "./adapters/provider-adapters.token";
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
    AdminRecoveryController,
    TradeController,
  ],
  providers: [
    // Services
    WebhookReceiverService,
    WebhookExecutorService,
    BinanceTestService,
    AdminRecoveryService,
    TradeService,
    // Repositories
    WebhookRequestRepository,
    ProcessingLockRepository,
    // Adapters (개별 등록)
    BinanceAdapter,
    BinanceApiClient,
    DiscordAdapter,
    // DI Token Factory: 새 adapter 추가 시 여기만 수정
    {
      provide: PROVIDER_ADAPTERS,
      useFactory: (
        binanceAdapter: BinanceAdapter,
        discordAdapter: DiscordAdapter,
      ) => [binanceAdapter, discordAdapter],
      inject: [BinanceAdapter, DiscordAdapter],
    },
    ProviderAdapterRegistry,
  ],
  exports: [
    WebhookReceiverService,
    WebhookExecutorService,
    WebhookRequestRepository,
    ProcessingLockRepository,
    ProviderAdapterRegistry,
    BinanceApiClient,
  ],
})
export class WebhookModule {}
