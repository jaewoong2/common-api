import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobController } from './job.controller';
import { JobService } from './job.service';
import { JobRepository } from './repositories/job.repository';
import { MessageProcessorService } from './services/message-processor.service';
import { JobEntity } from '../../database/entities/job.entity';
import { PlatformModule } from '../platform/platform.module';

@Module({
  imports: [TypeOrmModule.forFeature([JobEntity]), PlatformModule],
  controllers: [JobController],
  providers: [JobService, JobRepository, MessageProcessorService],
  exports: [JobService, JobRepository, MessageProcessorService],
})
export class JobModule {}
