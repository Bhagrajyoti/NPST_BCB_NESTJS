import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  globalPrefix: process.env.API_GLOBAL_PREFIX ?? 'api/v1',
  // External gateway base URL (e.g. http://host:9101/identity) — used by Swagger only.
  publicBaseUrl: process.env.APP_PUBLIC_BASE_URL,
  env: process.env.NODE_ENV ?? 'development',
  // When 'true', auth is served by a fixed set of fake users (see mock-users.const.ts)
  // instead of the real Keycloak server — see .env.example for details.
  authMockMode: process.env.AUTH_MOCK_MODE ?? 'false',
  // Shared HMAC secret for ChecksumGuard/ChecksumSigningInterceptor (inbound/outbound
  // Spring Boot service-to-service calls). Unset until the Java side confirms the contract
  // (see NestJS_Service_Architecture_FINAL.md §6) — both guard and interceptor are inert
  // without it.
  checksumSharedSecret: process.env.CHECKSUM_SHARED_SECRET,
}));
