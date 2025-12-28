export default () => ({
  env: process.env.NODE_ENV || 'local',
  platform: process.env.PLATFORM || 'ecs',
  app: {
    port: Number(process.env.PORT) || 3000,
  },
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS || '',
    name: process.env.DB_NAME || 'app',
    poolSize: process.env.PLATFORM === 'lambda' ? 2 : 10,
  },
});
