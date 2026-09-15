import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { RolesGuard } from './roles.guard';

function contextWith(request: Record<string, unknown>): ExecutionContext {
  return {
    getClass: () => ({}),
    getHandler: () => ({}),
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard (AUTH_MOCK_MODE)', () => {
  let reflector: { getAllAndOverride: jest.Mock };
  let guard: RolesGuard;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    guard = new RolesGuard(reflector as any);
  });

  it('allows any authenticated caller when no roles are required', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const ctx = contextWith({ user: { realm_access: { roles: [] } } });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('rejects a caller missing every required role (ANY mode)', () => {
    reflector.getAllAndOverride.mockReturnValue({ roles: ['BANK_SUPER_ADMIN'], mode: 'any' });
    const ctx = contextWith({ user: { realm_access: { roles: ['BANK_ADMIN'] } } });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('allows a caller holding at least one required role (ANY mode, default)', () => {
    reflector.getAllAndOverride.mockReturnValue({ roles: ['BANK_SUPER_ADMIN', 'BANK_ADMIN'] });
    const ctx = contextWith({ user: { realm_access: { roles: ['BANK_ADMIN'] } } });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('requires every role in ALL mode', () => {
    reflector.getAllAndOverride.mockReturnValue({
      roles: ['BANK_ADMIN', 'CORPORATE_MAKER'],
      mode: 'all',
    });
    const ctx = contextWith({ user: { realm_access: { roles: ['BANK_ADMIN'] } } });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('treats a missing request.user as having no roles (rejected, not crashed)', () => {
    reflector.getAllAndOverride.mockReturnValue({ roles: ['BANK_ADMIN'] });
    const ctx = contextWith({});
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });
});
