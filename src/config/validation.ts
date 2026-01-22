import * as Joi from "joi";

const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid("local", "dev", "stage", "prod", "test", "production")
    .default("local"),
  PLATFORM: Joi.string().valid("ecs", "lambda").default("ecs"),
  PORT: Joi.number().default(8000),
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().default(5432),
  DB_USER: Joi.string().default("postgres"),
  DB_PASS: Joi.string().allow("").default(""),
  DB_NAME: Joi.string().default("app"),
  // AWS Configuration
  AWS_DEFAULT_REGION: Joi.string().default("ap-northeast-2"),
  AWS_SES_FROM_EMAIL: Joi.string().email().required(),
  // AWS credentials are optional - SDK handles them via env vars or IAM roles
  AWS_ACCESS_KEY_ID: Joi.string().optional(),
  AWS_SECRET_ACCESS_KEY: Joi.string().optional(),
  // Logging Configuration
  LOG_LEVEL: Joi.string().valid("basic", "detailed", "none").default("basic"),
  LOG_MAX_PAYLOAD_SIZE: Joi.number().min(1000).max(100000).default(10000),
  LOG_EXCLUDE_ROUTES: Joi.string().default("/health,/metrics,/api-docs"),
});

export default validationSchema;
