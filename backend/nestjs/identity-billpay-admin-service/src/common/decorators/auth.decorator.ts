import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Roles, RoleMatchingMode } from 'nest-keycloak-connect';

/**
 * Single source of truth for "this route/controller requires a valid Keycloak
 * Bearer token", optionally restricted to specific realm roles.
 *
 * `@Auth()` — any authenticated user.
 * `@Auth('BANK_SUPER_ADMIN')` / `@Auth('BANK_SUPER_ADMIN', 'BANK_ADMIN')` — caller
 * must hold at least one of the given realm roles.
 *
 * Bundles the Swagger `@ApiBearerAuth()` annotation with the `@Roles()` metadata
 * the globally-registered AuthGuard/RoleGuard (see app.module.ts) already reads —
 * so every protected controller applies one decorator instead of repeating
 * `@ApiBearerAuth()` (+ `@Roles()`) individually. This decorator does not enforce
 * anything by itself; AuthGuard/RoleGuard do, app-wide.
 *
 * Role names are prefixed `realm:` here because keycloak-connect's `Token#hasRole()`
 * (which the real RoleGuard calls) treats an unprefixed name as a *client* role
 * (`resource_access.<clientId>.roles`), not a realm role — without the prefix, every
 * role-restricted route silently 403s for every real user regardless of their actual
 * realm roles (verified live against the real Keycloak server: `test-bank-superadmin`,
 * holding `BANK_SUPER_ADMIN` in `realm_access.roles`, still got 403 on
 * `@Auth('BANK_SUPER_ADMIN')` before this fix). Mock mode's RolesGuard
 * (src/common/guards/roles.guard.ts) strips this same prefix, so both paths agree.
 */
export function Auth(...roles: string[]) {
  return roles.length > 0
    ? applyDecorators(
        ApiBearerAuth(),
        Roles({ roles: roles.map((role) => `realm:${role}`), mode: RoleMatchingMode.ANY }),
      )
    : applyDecorators(ApiBearerAuth());
}
