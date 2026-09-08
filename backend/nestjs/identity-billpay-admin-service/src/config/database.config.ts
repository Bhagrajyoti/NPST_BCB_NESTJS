import { registerAs } from '@nestjs/config';
import { DataSource, DataSourceOptions } from 'typeorm';

function buildDataSourceOptions(): DataSourceOptions {
  return {
    type: 'mysql',
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '3306', 10),
    username: process.env.DB_USERNAME ?? 'bcb_user',
    password: process.env.DB_PASSWORD ?? 'bcb_pass',
    database: process.env.DB_DATABASE ?? 'identity_billpay_admin',
    entities: [
      __dirname + '/../modules/auth/**/*.entity{.ts,.js}',
      __dirname + '/../modules/rbac/**/*.entity{.ts,.js}',
    ],
    migrations: [
      __dirname + '/../modules/auth/migrations/*{.ts,.js}',
      __dirname + '/../modules/rbac/migrations/*{.ts,.js}',
    ],
    synchronize: process.env.DB_SYNCHRONIZE === 'true',
    logging: process.env.DB_LOGGING === 'true',
    charset: 'utf8mb4',
  };
}

export default registerAs('database', buildDataSourceOptions);

export const AppDataSource = new DataSource(buildDataSourceOptions());
