import { Module, Global } from '@nestjs/common';
import { EmailService } from './email.service';

/**
 * Email Module
 * @description Global module for email services
 */
@Global()
@Module({
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
