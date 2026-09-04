import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  globalPrefix: process.env.API_GLOBAL_PREFIX ?? 'api/v1',
  env: process.env.NODE_ENV ?? 'development',
}));
