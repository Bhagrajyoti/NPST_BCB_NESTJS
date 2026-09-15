import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { IdorGuard } from './idor.guard';

function contextWith(request: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('IdorGuard', () => {
  let guard: IdorGuard;

  beforeEach(() => {
    guard = new IdorGuard();
  });

  it('rejects when there is no authenticated user on the request', () => {
    const ctx = contextWith({ body: { userId: 'other-user' } });
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('allows a request with no userId in the body (self-implied)', () => {
    const ctx = contextWith({ body: {}, user: { sub: 'me', realm_access: { roles: [] } } });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('allows a caller acting on their own userId', () => {
    const ctx = contextWith({
      body: { userId: 'me' },
      user: { sub: 'me', realm_access: { roles: [] } },
    });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('rejects a plain customer acting on a different userId (IDOR)', () => {
    const ctx = contextWith({
      body: { userId: 'someone-else' },
      user: { sub: 'me', realm_access: { roles: ['RETAIL_CUSTOMER'] } },
    });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('allows BANK_ADMIN to act on a different userId', () => {
    const ctx = contextWith({
      body: { userId: 'someone-else' },
      user: { sub: 'me', realm_access: { roles: ['BANK_ADMIN'] } },
    });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('allows BANK_SUPER_ADMIN to act on a different userId', () => {
    const ctx = contextWith({
      body: { userId: 'someone-else' },
      user: { sub: 'me', realm_access: { roles: ['BANK_SUPER_ADMIN'] } },
    });
    expect(guard.canActivate(ctx)).toBe(true);
  });
});
