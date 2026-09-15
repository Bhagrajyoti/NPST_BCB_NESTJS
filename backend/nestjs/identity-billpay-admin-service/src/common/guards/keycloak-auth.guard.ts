import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { findMockUserByToken } from '../../modules/auth/keycloak/mock-users.const';

// Metadata key nest-keycloak-connect's `@Public()` decorator sets (from
// `nest-keycloak-connect/dist/decorators/public.decorator.js`: META_UNPROTECTED = 'unprotected').
// Duplicated here as a literal instead of importing package internals.
const META_UNPROTECTED = 'unprotected';

/**
 * Stand-in for nest-keycloak-connect's `AuthGuard`, used only when AUTH_MOCK_MODE=true
 * (see app.module.ts). Instead of verifying a real Keycloak JWT, it accepts the fixed
 * `mock-<username>-token` bearer tokens issued by `KeycloakService.mockLogin` and attaches
 * the same `request.user` shape (`sub`, `preferred_username`, `realm_access.roles`) a real
 * token would carry, so `@AuthenticatedUser()` / `POST /auth/me` work unchanged.
 */
@Injectable()
export class KeycloakAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(META_UNPROTECTED, [
      context.getClass(),
      context.getHandler(),
    ]);

    const request = context.switchToHttp().getRequest();
    const authHeader: string | undefined = request.headers?.authorization;
    const token =
      authHeader && authHeader.toLowerCase().startsWith('bearer ')
        ? authHeader.slice(7).trim()
        : undefined;
    const mockUser = token ? findMockUserByToken(token) : undefined;

    if (mockUser) {
      request.user = {
        sub: mockUser.sub,
        preferred_username: mockUser.username,
        realm_access: { roles: mockUser.roles },
      };
      return true;
    }

    if (isPublic) {
      return true;
    }

    throw new UnauthorizedException(
      'Invalid or missing mock bearer token — call POST /auth/login with a mock-* user first',
    );
  }
}
