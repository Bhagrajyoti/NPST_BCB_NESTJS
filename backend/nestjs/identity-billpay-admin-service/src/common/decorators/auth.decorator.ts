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
 */
export function Auth(...roles: string[]) {
  return roles.length > 0
    ? applyDecorators(ApiBearerAuth(), Roles({ roles, mode: RoleMatchingMode.ANY }))
    : applyDecorators(ApiBearerAuth());
}
