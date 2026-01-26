import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SymbolEntity } from "../../database/entities";
import { SymbolRepository } from "./repositories/symbol.repository";
import { SymbolService } from "./services/symbol.service";
import { SymbolAdminController } from "./controllers/symbol-admin.controller";
import { WebhookModule } from "../webhook/webhook.module";
import { AuthModule } from "../auth/auth.module";

/**
 * Symbol Module
 * @description 심볼/티커 관리 모듈
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([SymbolEntity]),
    forwardRef(() => WebhookModule), // For BinanceApiClient
    forwardRef(() => AuthModule), // For Guards
  ],
  controllers: [SymbolAdminController],
  providers: [SymbolRepository, SymbolService],
  exports: [SymbolService, SymbolRepository],
})
export class SymbolModule {}
