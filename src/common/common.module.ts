import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IdempotencyKeyRepository } from './repositories/idempotency-key.repository';
import { IdempotencyGuard } from './guards/idempotency.guard';
import { IdempotencyKeyEntity } from '../database/entities/idempotency-key.entity';
import { RolesGuard } from './guards/roles.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

/**
 * Common Module
 * @description Global module for shared utilities, guards, and repositories
 */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([IdempotencyKeyEntity])],
  providers: [IdempotencyKeyRepository, IdempotencyGuard, RolesGuard, JwtAuthGuard],
  exports: [IdempotencyKeyRepository, IdempotencyGuard, RolesGuard, JwtAuthGuard],
})
export class CommonModule {}
