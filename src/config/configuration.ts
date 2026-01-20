import awsConfig from "./aws.config";
import loggerConfig from "./logger.config";

export default () => ({
  env: process.env.NODE_ENV || "local",
  platform: process.env.PLATFORM || "ecs",
  app: {
    port: Number(process.env.PORT) || 8000,
  },
  database: {
    host: process.env.DATABASE_HOST || "localhost",
    port: Number(process.env.DATABASE_PORT) || 5432,
    username: process.env.DATABASE_USERNAME || "postgres",
    password: (process.env.DATABASE_PASSWORD || "").replace(/^['"]|['"]$/g, ""),
    name: process.env.DATABASE_DBNAME || "app",
    poolSize: process.env.PLATFORM === "lambda" ? 2 : 10,
  },
  jwt: {
    secret: process.env.JWT_SECRET_KEY || "your-secret-key",
    algorithm: process.env.JWT_ALGORITHM || "HS256",
    expiresIn: Number(process.env.JWT_EXPIRE_MINUTES) || 15,
  },
  oauth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      callbackUrl:
        process.env.GOOGLE_CALLBACK_URL ||
        "http://localhost:8000/v1/auth/oauth/google/callback",
    },
    kakao: {
      clientId: process.env.KAKAO_REST_API_KEY || "",
      clientSecret: process.env.KAKAO_CLIENT_SECRET || "",
      callbackUrl:
        process.env.KAKAO_REDIRECT_URI ||
        "http://localhost:8000/v1/auth/oauth/kakao/callback",
    },
  },
  webhook: {
    sqsQueueUrl: process.env.WEBHOOK_SQS_QUEUE_URL || "",
    targetLambdaName:
      process.env.WEBHOOK_TARGET_LAMBDA_NAME || "common-api-nestjs",
    defaultAppId:
      process.env.DEFAULT_WEBHOOK_APP_ID ||
      "eb3fcbb2-7bb3-4ac7-aa38-1cb4bf00e405",
    lockTtlSeconds: Number(process.env.WEBHOOK_LOCK_TTL_SECONDS) || 180,
  },
  kms: {
    keyId: process.env.AWS_KMS_KEY_ID || "",
  },
  aws: awsConfig(),
  logger: loggerConfig(),
});
