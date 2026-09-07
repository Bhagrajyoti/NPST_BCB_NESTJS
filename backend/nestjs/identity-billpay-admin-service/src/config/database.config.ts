import { registerAs } from '@nestjs/config';
import { DataSource, DataSourceOptions } from 'typeorm';

// Single Postgres instance, three logical schemas: identity, billpay, admin.
const options: DataSourceOptions = {
  type: 'mysql',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '3306', 10),
  username: process.env.DB_USERNAME ?? 'root',
  password: process.env.DB_PASSWORD ?? 'supersecretrootpassword',
  database: process.env.DB_DATABASE ?? 'identity_billpay_admin',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../**/migrations/*{.ts,.js}'],
  synchronize: process.env.DB_SYNCHRONIZE === 'true',
  logging: process.env.DB_LOGGING === 'true',
};

export default registerAs('database', () => options);

export const AppDataSource = new DataSource(options);
