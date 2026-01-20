import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TradeLogEntity } from "../../database/entities";
import { TradeLogsController } from "./trade-logs.controller";
import { TradeLogService } from "./trade-logs.service";
import { TradeLogRepository } from "./repositories";

/**
 * Trade Logs Module
 * @description 거래 이력 조회 모듈
 */
@Module({
  imports: [TypeOrmModule.forFeature([TradeLogEntity])],
  controllers: [TradeLogsController],
  providers: [TradeLogService, TradeLogRepository],
  exports: [TradeLogService, TradeLogRepository],
})
export class TradeLogsModule {}
