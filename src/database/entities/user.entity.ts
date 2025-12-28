import {
  Entity,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '../../core/database/base.entity';
import { UserStatus, UserRole } from '../../common/enums';
import { AppEntity } from './app.entity';
import { RefreshTokenEntity } from './refresh-token.entity';
import { WalletLotEntity } from './wallet-lot.entity';
import { WalletLedgerEntity } from './wallet-ledger.entity';
import { OrderEntity } from './order.entity';

/**
 * User Entity
 * @description Represents a user account in the multi-tenant system
 * @note NO password field - Only OAuth and Magic Link authentication
 */
@Entity({ name: 'users', schema: 'common' })
@Index(['appId', 'email'], { unique: true }) // Unique email per app
@Index(['status'])
@Index(['role'])
export class UserEntity extends BaseEntity {
  /**
   * App (tenant) this user belongs to
   */
  @Column({ name: 'app_id', type: 'uuid' })
  appId: string;

  @ManyToOne(() => AppEntity)
  @JoinColumn({ name: 'app_id' })
  app: AppEntity;

  /**
   * User's email address (unique per app)
   */
  @Column({ type: 'varchar', length: 255 })
  email: string;

  /**
   * User account status
   */
  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ACTIVE,
  })
  status: UserStatus;

  /**
   * User profile data (JSON: nickname, avatar, preferences, etc.)
   */
  @Column({ type: 'jsonb', nullable: true })
  profile: Record<string, any> | null;

  /**
   * User role for RBAC
   */
  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  // Relations
  @OneToMany(() => RefreshTokenEntity, (token) => token.user)
  refreshTokens: RefreshTokenEntity[];

  @OneToMany(() => WalletLotEntity, (lot) => lot.user)
  walletLots: WalletLotEntity[];

  @OneToMany(() => WalletLedgerEntity, (ledger) => ledger.user)
  walletLedger: WalletLedgerEntity[];

  @OneToMany(() => OrderEntity, (order) => order.user)
  orders: OrderEntity[];
}
