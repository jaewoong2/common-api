import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { AppEntity } from '../../database/entities/app.entity';
import { UserEntity } from '../../database/entities/user.entity';
import { RefreshTokenEntity } from '../../database/entities/refresh-token.entity';
import { MagicLinkTokenEntity } from '../../database/entities/magic-link-token.entity';
import { WalletLotEntity } from '../../database/entities/wallet-lot.entity';
import { WalletLedgerEntity } from '../../database/entities/wallet-ledger.entity';
import { ProductEntity } from '../../database/entities/product.entity';
import { OrderEntity } from '../../database/entities/order.entity';
import { JobEntity } from '../../database/entities/job.entity';
import { IdempotencyKeyEntity } from '../../database/entities/idempotency-key.entity';

/**
 * Builds TypeORM connection options from the ConfigService.
 */
export const buildTypeOrmOptions = (
  configService: ConfigService,
): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: configService.get<string>('DB_HOST'),
  port: configService.get<number>('DB_PORT'),
  username: configService.get<string>('DB_USER'),
  password: configService.get<string>('DB_PASS'),
  database: configService.get<string>('DB_NAME'),
  schema: configService.get<string>('DB_SCHEMA', 'common'),
  entities: [
    AppEntity,
    UserEntity,
    RefreshTokenEntity,
    MagicLinkTokenEntity,
    WalletLotEntity,
    WalletLedgerEntity,
    ProductEntity,
    OrderEntity,
    JobEntity,
    IdempotencyKeyEntity,
  ],
  synchronize: configService.get<string>('NODE_ENV') === 'local', // Auto-sync only in local dev
  logging: configService.get<string>('NODE_ENV') === 'local',
  poolSize: configService.get<string>('PLATFORM') === 'lambda' ? 2 : 10,
  extra: {
    connectionTimeoutMillis: 3000,
    idleTimeoutMillis: 10000,
  },
});
