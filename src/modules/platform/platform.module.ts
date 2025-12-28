import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlatformController } from './platform.controller';
import { PlatformService } from './platform.service';
import { AppRepository } from './repositories/app.repository';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AppEntity } from '../../database/entities/app.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AppEntity])],
  controllers: [PlatformController],
  providers: [PlatformService, AppRepository, RolesGuard],
  exports: [PlatformService, AppRepository],
})
export class PlatformModule {}
