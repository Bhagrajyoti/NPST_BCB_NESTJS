import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';

// Roles allowed to act on another user's resource (bank/support staff) — everyone else
// may only touch their own.
const ELEVATED_ROLES = ['BANK_SUPER_ADMIN', 'BANK_ADMIN'];

/**
 * Generic ownership check: if the request body carries a `userId` field and it differs
 * from the caller's own Keycloak `sub`, the caller must hold one of ELEVATED_ROLES —
 * otherwise this is exactly the IDOR pattern (customer A passing customer B's userId to
 * read/modify B's resource). Applied to routes where the resource is genuinely owned by a
 * single user (e.g. credential.controller.ts's get/verify/delete) — NOT to admin resources
 * like authorization_rule that have no per-caller owner field, where role-gating via
 * `@Auth(...)` is already the correct (and sufficient) control.
 */
@Injectable()
export class IdorGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as { sub?: string; realm_access?: { roles?: string[] } } | undefined;

    if (!user?.sub) {
      throw new UnauthorizedException('Keycloak access token is required');
    }

    const targetUserId: string | undefined = request.body?.userId;
    if (!targetUserId || targetUserId === user.sub) {
      return true;
    }

    const roles = user.realm_access?.roles ?? [];
    if (roles.some((role) => ELEVATED_ROLES.includes(role))) {
      return true;
    }

    throw new ForbiddenException('Cannot access another user\'s resource');
  }
}
