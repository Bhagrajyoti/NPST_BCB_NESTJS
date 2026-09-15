import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import * as supertest from 'supertest';
import { KeycloakService } from '../../../src/modules/auth/keycloak/keycloak.service';
import { LoggingInterceptor } from '../../../src/common/interceptors/logging.interceptor';
import { ResponseTransformInterceptor } from '../../../src/common/interceptors/response-transform.interceptor';
import { RolesGuard } from '../../../src/common/guards/roles.guard';
import { E2eTestAuthGuard } from './e2e-test-auth.guard';
import { TestAppModule } from './test-app.module';

export const TEST_SUPERADMIN = {
  sub: '11111111-1111-1111-1111-111111111111',
  realm_access: { roles: ['BANK_SUPER_ADMIN'] },
};

export const TEST_BANK_ADMIN = {
  sub: '22222222-2222-2222-2222-222222222222',
  realm_access: { roles: ['BANK_ADMIN'] },
};

export const TEST_RETAIL_CUSTOMER = {
  sub: '77777777-7777-7777-7777-777777777777',
  realm_access: { roles: ['RETAIL_CUSTOMER'] },
};

export const TEST_RETAIL_CUSTOMER_B = {
  sub: '88888888-8888-8888-8888-888888888888',
  realm_access: { roles: ['RETAIL_CUSTOMER'] },
};

export const TEST_CORPORATE_MAKER = {
  sub: '55555555-5555-5555-5555-555555555555',
  realm_access: { roles: ['CORPORATE_MAKER'] },
};

export const TEST_CORPORATE_VIEWER = {
  sub: '66666666-6666-6666-6666-666666666666',
  realm_access: { roles: ['CORPORATE_VIEWER'] },
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
  signup: jest.fn().mockImplementation(async (dto: { username: string }) => ({
    keycloakUserId: randomUUID(),
    username: dto.username,
  })),
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
  actor: Record<string, unknown> | null = TEST_SUPERADMIN,
): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [TestAppModule],
    providers: [
      {
        provide: APP_GUARD,
        useFactory: (reflector: Reflector) => new E2eTestAuthGuard(reflector, actor),
        inject: [Reflector],
      },
      { provide: APP_GUARD, useClass: RolesGuard },
    ],
  })
    .overrideProvider(KeycloakService)
    .useValue(mockKeycloakService)
    .overrideProvider('BBPS_ADAPTER')
    .useValue(mockBbpsAdapter)
    .compile();

  const app = moduleFixture.createNestApplication();
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalInterceptors(new LoggingInterceptor(), new ResponseTransformInterceptor());

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
