import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ExchangeKeyEntity } from "../../database/entities";
import { ExchangeKeysController } from "./exchange-keys.controller";
import { ExchangeKeyService } from "./exchange-keys.service";
import { ExchangeKeyRepository } from "./repositories";
import { KmsService } from "./kms.service";

/**
 * Exchange Keys Module
 * @description 거래소 API 키 관리 모듈
 */
@Module({
  imports: [TypeOrmModule.forFeature([ExchangeKeyEntity])],
  controllers: [ExchangeKeysController],
  providers: [ExchangeKeyService, ExchangeKeyRepository, KmsService],
  exports: [ExchangeKeyService, KmsService],
})
export class ExchangeKeysModule {}
