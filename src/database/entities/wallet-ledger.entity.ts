import {
  Entity,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../core/database/base.entity';
import { WalletDirection, WalletReason } from '../../common/enums';
import { UserEntity } from './user.entity';
import { WalletLotEntity } from './wallet-lot.entity';

/**
 * Wallet Ledger Entity
 * @description Append-only transaction log for all wallet operations
 * @note Never update or delete entries - only insert
 */
@Entity({ name: 'wallet_ledger', schema: 'common' })
@Index(['appId', 'userId', 'createdAt']) // For user transaction history
@Index(['refType', 'refId']) // For traceability
@Index(['direction'])
export class WalletLedgerEntity extends BaseEntity {
  /**
   * App ID for multi-tenancy
   */
  @Column({ name: 'app_id', type: 'uuid' })
  appId: string;

  /**
   * User who performed this transaction
   */
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => UserEntity, (user) => user.walletLedger)
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  /**
   * Lot this transaction affected
   * @note NULL for initial credits
   */
  @Column({ name: 'lot_id', type: 'uuid', nullable: true })
  lotId: string | null;

  @ManyToOne(() => WalletLotEntity, (lot) => lot.ledgerEntries)
  @JoinColumn({ name: 'lot_id' })
  lot: WalletLotEntity | null;

  /**
   * Transaction direction (CREDIT or DEBIT)
   */
  @Column({
    type: 'enum',
    enum: WalletDirection,
  })
  direction: WalletDirection;

  /**
   * Amount of points transacted
   */
  @Column({ type: 'bigint' })
  amount: string;

  /**
   * Reason for transaction
   */
  @Column({
    type: 'enum',
    enum: WalletReason,
  })
  reason: WalletReason;

  /**
   * Reference type for traceability (e.g., "order", "attendance")
   */
  @Column({ name: 'ref_type', type: 'varchar', length: 100 })
  refType: string;

  /**
   * Reference ID for traceability (e.g., "order:123")
   */
  @Column({ name: 'ref_id', type: 'varchar', length: 255 })
  refId: string;

  /**
   * Snapshot of user's total balance after this transaction
   * @note Useful for balance verification and auditing
   */
  @Column({ name: 'balance_snapshot', type: 'bigint' })
  balanceSnapshot: string;
}
