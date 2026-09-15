import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { KeycloakAuthGuard } from './keycloak-auth.guard';
import { MOCK_USERS } from '../../modules/auth/keycloak/mock-users.const';

function contextWith(request: Record<string, unknown>): ExecutionContext {
  return {
    getClass: () => ({}),
    getHandler: () => ({}),
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('KeycloakAuthGuard (AUTH_MOCK_MODE)', () => {
  const admin = MOCK_USERS.find((u) => u.username === 'mock-admin')!;
  let reflector: { getAllAndOverride: jest.Mock };
  let guard: KeycloakAuthGuard;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn().mockReturnValue(false) };
    guard = new KeycloakAuthGuard(reflector as any);
  });

  it('rejects a request with no Authorization header on a protected route', () => {
    const ctx = contextWith({ headers: {} });
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('rejects an invalid/unknown bearer token on a protected route', () => {
    const ctx = contextWith({ headers: { authorization: 'Bearer not-a-real-token' } });
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('allows a missing token through on a @Public() route', () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const ctx = contextWith({ headers: {} });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('accepts a valid mock token and populates request.user with sub/roles', () => {
    const request: Record<string, unknown> = {
      headers: { authorization: `Bearer mock-${admin.username}-token` },
    };
    const ctx = contextWith(request);
    expect(guard.canActivate(ctx)).toBe(true);
    expect(request.user).toEqual({
      sub: admin.sub,
      preferred_username: admin.username,
      realm_access: { roles: admin.roles },
    });
  });

  it('is case-insensitive on the Bearer scheme', () => {
    const request: Record<string, unknown> = {
      headers: { authorization: `bearer mock-${admin.username}-token` },
    };
    const ctx = contextWith(request);
    expect(guard.canActivate(ctx)).toBe(true);
  });
});
