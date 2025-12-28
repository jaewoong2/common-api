import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { AppDomain } from './app-domain.entity';

@Entity('apps')
export class App {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'ACTIVE',
  })
  status: 'ACTIVE' | 'SUSPENDED';

  @Column({ name: 'callback_base_url', length: 512, nullable: true })
  callbackBaseUrl: string;

  @Column({ name: 'callback_allowlist_paths', type: 'jsonb', nullable: true })
  callbackAllowlistPaths: string[];

  @Column({ name: 'callback_secret_ref', length: 512, nullable: true })
  callbackSecretRef: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => AppDomain, (domain) => domain.app)
  domains: AppDomain[];
}
