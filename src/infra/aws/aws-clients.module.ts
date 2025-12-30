import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SQSClient } from '@aws-sdk/client-sqs';
import { LambdaClient } from '@aws-sdk/client-lambda';
import { SchedulerClient } from '@aws-sdk/client-scheduler';
import { SESClient } from '@aws-sdk/client-ses';

/**
 * AWS SDK Client Tokens
 * @description Injection tokens for AWS clients
 */
export const AWS_SQS_CLIENT = 'AWS_SQS_CLIENT';
export const AWS_LAMBDA_CLIENT = 'AWS_LAMBDA_CLIENT';
export const AWS_SCHEDULER_CLIENT = 'AWS_SCHEDULER_CLIENT';
export const AWS_SES_CLIENT = 'AWS_SES_CLIENT';

/**
 * AWS Clients Module
 * @description Global module providing AWS SDK clients for dependency injection
 * @note All clients use IAM role credentials in AWS environments (Lambda/ECS)
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: AWS_SQS_CLIENT,
      useFactory: (configService: ConfigService) => {
        return new SQSClient({
          region: configService.get<string>('aws.sqs.region'),
        });
      },
      inject: [ConfigService],
    },
    {
      provide: AWS_LAMBDA_CLIENT,
      useFactory: (configService: ConfigService) => {
        return new LambdaClient({
          region: configService.get<string>('aws.lambda.region'),
        });
      },
      inject: [ConfigService],
    },
    {
      provide: AWS_SCHEDULER_CLIENT,
      useFactory: (configService: ConfigService) => {
        return new SchedulerClient({
          region: configService.get<string>('aws.scheduler.region'),
        });
      },
      inject: [ConfigService],
    },
    {
      provide: AWS_SES_CLIENT,
      useFactory: (configService: ConfigService) => {
        return new SESClient({
          region: configService.get<string>('aws.ses.region'),
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: [
    AWS_SQS_CLIENT,
    AWS_LAMBDA_CLIENT,
    AWS_SCHEDULER_CLIENT,
    AWS_SES_CLIENT,
  ],
})
export class AwsClientsModule {}
