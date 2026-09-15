import { NotFoundException, UnauthorizedException } from '@nestjs/common';

import {
  BBPS_PAYMENT_BANK_READ_ROLES,
  extractRealmRoles,
  hasAnyRealmRole,
} from '../../rbac/constants/rbac.constants';

export function requireActorSub(actor: Record<string, unknown> | undefined): string {
  const sub = actor?.sub;
  if (typeof sub !== 'string' || !sub) {
    throw new UnauthorizedException('Keycloak access token is required');
  }
  return sub;
}

export function canViewAllBillPayments(actor: Record<string, unknown> | undefined): boolean {
  return hasAnyRealmRole(actor, BBPS_PAYMENT_BANK_READ_ROLES);
}

export function assertPaymentOwnedByActor(
  payment: { keycloakUserId: string | null },
  actor: Record<string, unknown> | undefined,
): void {
  if (canViewAllBillPayments(actor)) {
    return;
  }
  const sub = requireActorSub(actor);
  if (!payment.keycloakUserId || payment.keycloakUserId !== sub) {
    throw new NotFoundException({
      code: 'PAYMENT_NOT_FOUND',
      message: 'Bill payment not found',
    });
  }
}

export function assertScheduleOwnedByActor(
  schedule: { keycloakUserId: string | null },
  actor: Record<string, unknown> | undefined,
): void {
  const sub = requireActorSub(actor);
  if (!schedule.keycloakUserId || schedule.keycloakUserId !== sub) {
    throw new NotFoundException({
      code: 'SCHEDULE_NOT_FOUND',
      message: 'Bill schedule not found',
    });
  }
}

export function assertIdempotentPaymentOwnedByActor(
  payment: { keycloakUserId: string | null },
  actor: Record<string, unknown> | undefined,
): void {
  if (!payment.keycloakUserId) {
    return;
  }
  const sub = requireActorSub(actor);
  if (payment.keycloakUserId !== sub) {
    throw new NotFoundException({
      code: 'PAYMENT_NOT_FOUND',
      message: 'Bill payment not found',
    });
  }
}
