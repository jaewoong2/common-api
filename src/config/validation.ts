import * as Joi from 'joi';

const validationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('local', 'dev', 'stage', 'prod', 'test').default('local'),
  PLATFORM: Joi.string().valid('ecs', 'lambda').default('ecs'),
  PORT: Joi.number().default(3000),
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().default(5432),
  DB_USER: Joi.string().default('postgres'),
  DB_PASS: Joi.string().allow('').default(''),
  DB_NAME: Joi.string().default('app'),
});

export default validationSchema;
