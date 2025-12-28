import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PointService } from './point.service';
import { WalletLotRepository } from './repositories/wallet-lot.repository';
import { WalletLedgerRepository } from './repositories/wallet-ledger.repository';
import { WalletLotEntity } from '../../database/entities/wallet-lot.entity';
import { WalletLedgerEntity } from '../../database/entities/wallet-ledger.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([WalletLotEntity, WalletLedgerEntity]),
  ],
  providers: [PointService, WalletLotRepository, WalletLedgerRepository],
  exports: [PointService, WalletLotRepository, WalletLedgerRepository],
})
export class PointModule {}
