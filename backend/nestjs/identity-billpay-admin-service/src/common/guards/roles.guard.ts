import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

// Metadata key nest-keycloak-connect's `Roles()` decorator sets (from
// `nest-keycloak-connect/dist/decorators/roles.decorator.js`: META_ROLES = 'roles'), which is
// what the `Auth('SOME_ROLE')` decorator (src/common/decorators/auth.decorator.ts) applies.
// Duplicated here as a literal instead of importing package internals.
const META_ROLES = 'roles';

interface RoleMetadata {
  roles: string[];
  mode?: 'any' | 'all';
}

/**
 * Stand-in for nest-keycloak-connect's `RoleGuard`, used only when AUTH_MOCK_MODE=true
 * (see app.module.ts). Runs after `KeycloakAuthGuard` has populated `request.user` from a
 * mock token, and checks its roles against `@Auth(...roles)` the same way the real guard does.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roleMetadata = this.reflector.getAllAndOverride<RoleMetadata>(META_ROLES, [
      context.getClass(),
      context.getHandler(),
    ]);

    if (!roleMetadata || roleMetadata.roles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userRoles: string[] = request.user?.realm_access?.roles ?? [];

    const granted =
      roleMetadata.mode === 'all'
        ? roleMetadata.roles.every((role) => userRoles.includes(role))
        : roleMetadata.roles.some((role) => userRoles.includes(role));

    if (!granted) {
      throw new ForbiddenException('Mock user does not have the required role');
    }

    return true;
  }
}
