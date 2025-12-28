import 'reflect-metadata';
import { DataSource } from 'typeorm';

/**
 * Standalone TypeORM DataSource for CLI migrations.
 * Keep in sync with runtime configuration in buildTypeOrmOptions.
 */
export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'app',
  synchronize: false,
  logging: process.env.NODE_ENV === 'local',
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/core/database/migrations/*.ts'],
});

export default AppDataSource;
