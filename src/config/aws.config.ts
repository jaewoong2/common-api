import { registerAs } from "@nestjs/config";

/**
 * AWS Configuration
 * @description AWS service configurations (SQS, Lambda, Scheduler, SES)
 */
export default registerAs("aws", () => ({
  /** Default AWS region */
  region: process.env.AWS_DEFAULT_REGION || "ap-northeast-2",

  /** AWS SES (Simple Email Service) */
  ses: {
    fromEmail: process.env.AWS_SES_FROM_EMAIL || "noreply@biizbiiz.com",
    region:
      process.env.AWS_SES_REGION ||
      process.env.AWS_DEFAULT_REGION ||
      "ap-northeast-2",
  },

  /** AWS SQS (Simple Queue Service) */
  sqs: {
    queueUrl: process.env.AWS_SQS_QUEUE_URL || "",
    region:
      process.env.AWS_SQS_REGION ||
      process.env.AWS_DEFAULT_REGION ||
      "ap-northeast-2",

    /** Source queues for multi-queue bridging */
    sourceQueues: {
      crypto: {
        queueUrl: process.env.AWS_SQS_CRYPTO_QUEUE_URL || "",
        maxMessages: 4,
        visibilityTimeout: 120,
        enabled: true,
      },
      ox: {
        queueUrl: process.env.AWS_SQS_OX_QUEUE_URL || "",
        maxMessages: 9,
        visibilityTimeout: 120,
        enabled: true,
      },
    },
  },

  /** AWS Lambda */
  lambda: {
    region:
      process.env.AWS_LAMBDA_REGION ||
      process.env.AWS_DEFAULT_REGION ||
      "ap-northeast-2",
  },

  /** AWS EventBridge Scheduler */
  scheduler: {
    region:
      process.env.AWS_SCHEDULER_REGION ||
      process.env.AWS_DEFAULT_REGION ||
      "ap-northeast-2",
    roleArn: process.env.AWS_SCHEDULER_ROLE_ARN || "",
    targetUrl: process.env.AWS_SCHEDULER_TARGET_URL || "",
  },

  /** Internal JWT tokens for Lambda function URL calls */
  internalJwt: {
    defaultToken: process.env.INTERNAL_JWT_TOKEN || "",
  },
}));
