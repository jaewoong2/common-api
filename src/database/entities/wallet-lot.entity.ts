import {
  Entity,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '../../core/database/base.entity';
import { UserEntity } from './user.entity';
import { WalletLedgerEntity } from './wallet-ledger.entity';

/**
 * Wallet Lot Entity
 * @description Represents a batch of points with expiration tracking
 * @note Used for FIFO deduction and expiration management
 */
@Entity({ name: 'wallet_lots', schema: 'common' })
@Index(['appId', 'userId'])
@Index(['expiresAt'])
@Index(['remainingAmount'])
export class WalletLotEntity extends BaseEntity {
  /**
   * App ID for multi-tenancy
   */
  @Column({ name: 'app_id', type: 'uuid' })
  appId: string;

  /**
   * User who owns this lot
   */
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => UserEntity, (user) => user.walletLots)
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  /**
   * Initial amount when lot was created
   */
  @Column({ name: 'initial_amount', type: 'bigint' })
  initialAmount: string;

  /**
   * Remaining amount (decreases with debits)
   */
  @Column({ name: 'remaining_amount', type: 'bigint' })
  remainingAmount: string;

  /**
   * Expiration timestamp
   * @note NULL = no expiration (default behavior)
   */
  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  // Relations
  @OneToMany(() => WalletLedgerEntity, (ledger) => ledger.lot)
  ledgerEntries: WalletLedgerEntity[];
}
