import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import * as supertest from 'supertest';
import { KeycloakService } from '../../../src/modules/auth/keycloak/keycloak.service';
import { LoggingInterceptor } from '../../../src/common/interceptors/logging.interceptor';
import { ResponseTransformInterceptor } from '../../../src/common/interceptors/response-transform.interceptor';
import { TestAppModule } from './test-app.module';

export const TEST_SUPERADMIN = {
  sub: '11111111-1111-1111-1111-111111111111',
  realm_access: { roles: ['BANK_SUPER_ADMIN'] },
};

export const TEST_BANK_ADMIN = {
  sub: '22222222-2222-2222-2222-222222222222',
  realm_access: { roles: ['BANK_ADMIN'] },
};

export const TEST_NO_ROLE = {
  sub: '33333333-3333-3333-3333-333333333333',
  realm_access: { roles: [] as string[] },
};

export const mockBbpsAdapter = {
  pay: jest.fn().mockResolvedValue({ status: 'SUCCESS', referenceId: 'TEST-BBPS-REF' }),
};

export const mockKeycloakService = {
  login: jest.fn().mockResolvedValue({
    accessToken: 'test-access-token',
    expiresIn: 300,
    refreshExpiresIn: 1800,
    refreshToken: 'test-refresh-token',
    tokenType: 'Bearer',
    scope: 'email profile',
  }),
  logout: jest.fn().mockResolvedValue({ loggedOut: true }),
  createRealmRole: jest.fn().mockImplementation(async (payload: { name: string }) => ({
    id: '22222222-2222-2222-2222-222222222222',
    name: payload.name,
  })),
  updateRealmRole: jest.fn().mockResolvedValue(undefined),
  createUser: jest.fn().mockImplementation(async () => ({ id: randomUUID() })),
  assignRealmRoleToUser: jest.fn().mockResolvedValue(undefined),
  removeRealmRoleFromUser: jest.fn().mockResolvedValue(undefined),
  getUserRealmRoles: jest.fn().mockResolvedValue([]),
  findUsers: jest.fn().mockResolvedValue([]),
  findUsersByUsername: jest.fn().mockResolvedValue([]),
  disableUser: jest.fn().mockResolvedValue(undefined),
  forceLogout: jest.fn().mockResolvedValue(undefined),
  resetUserPassword: jest.fn().mockResolvedValue(undefined),
};

export async function createTestApp(
  actor: Record<string, unknown> = TEST_SUPERADMIN,
): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [TestAppModule],
  })
    .overrideProvider(KeycloakService)
    .useValue(mockKeycloakService)
    .overrideProvider('BBPS_ADAPTER')
    .useValue(mockBbpsAdapter)
    .compile();

  const app = moduleFixture.createNestApplication();
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  // Matches main.ts — every success response comes back as { success, data, ... }.
  app.useGlobalInterceptors(new LoggingInterceptor(), new ResponseTransformInterceptor());

  app.use((req: { user?: unknown }, _res: unknown, next: () => void) => {
    req.user = actor;
    next();
  });

  await app.init();
  return app;
}

export function authedRequest(app: INestApplication) {
  const server = supertest(app.getHttpServer());
  return {
    post: (path: string) => server.post(path).set('Authorization', 'Bearer test-access-token'),
    get: (path: string) => server.get(path).set('Authorization', 'Bearer test-access-token'),
  };
}

export function publicRequest(app: INestApplication) {
  return supertest(app.getHttpServer());
}
