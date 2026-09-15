/**
 * One-time backfill: generates `audit_outbox` rows for everything that happened *before* the
 * producer side existed (registrations, role/permission/employee/authorization-rule changes,
 * payments, credential updates). Each row is marked `status: 'SENT'` — not `'PENDING'` — so
 * AuditOutboxRelayJob never tries to relay stale history to the (still unconfigured) Audit
 * service; the original event time is preserved in `payload.occurredAt` (the row's own
 * `created_at` reflects when this backfill actually ran, not when the event happened).
 *
 * Safe to re-run: every historical row it inserts also flags `payload.backfilled: true`, but
 * there's no dedupe key, so running this twice WILL duplicate rows — run it once. New activity
 * going forward is captured live by AuditOutboxService.record() calls in the relevant services,
 * not by this script.
 *
 *   npm run backfill:audit-outbox
 */
import 'dotenv/config';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppModule } from '../app.module';
import { AuditOutboxRepository } from '../clients/audit-outbox/audit-outbox.repository';
import { RegistrationAttempt } from '../modules/auth/registration/entities/registration-attempt.entity';
import { Role } from '../modules/rbac/entities/role.entity';
import { Permission } from '../modules/rbac/entities/permission.entity';
import { Employee } from '../modules/rbac/entities/employee.entity';
import { EmployeeUserRole } from '../modules/rbac/entities/employee-user-role.entity';
import { AuthorizationRule } from '../modules/admin/authorization-rules/entities/authorization-rule.entity';
import { AuthorizationRuleHistory } from '../modules/admin/authorization-rules/entities/authorization-rule-history.entity';
import { BillPayment } from '../modules/bill-payment/payment/entities/bill-payment.entity';
import { Credential } from '../modules/auth/credential/entities/credential.entity';
import { ALL_PERMISSION_CODES } from '../modules/rbac/data/permission-catalogue';

async function run(): Promise<void> {
  const logger = new Logger('BackfillAuditOutbox');
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn', 'log'] });

  try {
    const outbox = app.get(AuditOutboxRepository);
    let total = 0;

    const record = async (eventType: string, payload: Record<string, unknown>): Promise<void> => {
      await outbox.save({ eventType, payload: { ...payload, backfilled: true }, status: 'SENT', attempts: 0 });
      total += 1;
    };

    const attempts = app.get<Repository<RegistrationAttempt>>(getRepositoryToken(RegistrationAttempt));
    for (const a of await attempts.find({ withDeleted: true })) {
      await record('REGISTRATION_STARTED', {
        attemptId: a.id,
        mobileNumber: a.mobileNumber,
        currentStep: a.currentStep,
        occurredAt: a.createdAt,
      });
      if (a.keycloakUserId) {
        await record('REGISTRATION_CREDENTIALS_SET', {
          attemptId: a.id,
          keycloakUserId: a.keycloakUserId,
          occurredAt: a.updatedAt,
        });
      }
    }

    const roles = app.get<Repository<Role>>(getRepositoryToken(Role));
    for (const r of await roles.find({ withDeleted: true })) {
      await record('ROLE_CREATED', {
        roleId: r.id,
        name: r.name,
        dutyType: r.dutyType,
        occurredAt: r.createdAt,
      });
    }

    const permissions = app.get<Repository<Permission>>(getRepositoryToken(Permission));
    const allPermissions = await permissions.find({ withDeleted: true });
    const catalogueCodes = new Set(ALL_PERMISSION_CODES);
    const catalogueRows = allPermissions.filter((p) => catalogueCodes.has(p.code));
    const adHocRows = allPermissions.filter((p) => !catalogueCodes.has(p.code));
    if (catalogueRows.length) {
      await record('PERMISSION_CATALOGUE_SEEDED', { count: catalogueRows.length });
    }
    for (const p of adHocRows) {
      await record('PERMISSION_CREATED', { permissionId: p.id, code: p.code, module: p.module, occurredAt: p.createdAt });
    }

    const employees = app.get<Repository<Employee>>(getRepositoryToken(Employee));
    const employeeRoles = app.get<Repository<EmployeeUserRole>>(getRepositoryToken(EmployeeUserRole));
    for (const e of await employees.find({ withDeleted: true })) {
      const assignment = await employeeRoles.findOne({ where: { employeeId: e.id } });
      await record('EMPLOYEE_CREATED', {
        employeeId: e.id,
        keycloakUserId: e.keycloakUserId,
        username: e.username,
        roleId: assignment?.roleId ?? null,
        occurredAt: e.createdAt,
      });
    }

    const rules = app.get<Repository<AuthorizationRule>>(getRepositoryToken(AuthorizationRule));
    for (const r of await rules.find({ withDeleted: true })) {
      await record('AUTHORIZATION_RULE_CREATED', {
        ruleId: r.id,
        cif: r.cif,
        threshold: r.threshold,
        occurredAt: r.createdAt,
      });
    }

    const ruleHistory = app.get<Repository<AuthorizationRuleHistory>>(getRepositoryToken(AuthorizationRuleHistory));
    for (const h of await ruleHistory.find()) {
      if (h.version <= 1) continue;
      const eventType = (h.snapshot as { deactivated?: boolean })?.deactivated
        ? 'AUTHORIZATION_RULE_DEACTIVATED'
        : 'AUTHORIZATION_RULE_UPDATED';
      await record(eventType, { ruleId: h.ruleId, version: h.version, occurredAt: h.createdAt });
    }

    const payments = app.get<Repository<BillPayment>>(getRepositoryToken(BillPayment));
    for (const p of await payments.find()) {
      await record('PAYMENT_CREATED', {
        paymentId: p.id,
        billerCode: p.billerCode,
        consumerNumber: p.consumerNumber,
        amount: p.amount,
        status: p.status,
        occurredAt: p.createdAt,
      });
    }

    const credentials = app.get<Repository<Credential>>(getRepositoryToken(Credential));
    for (const c of await credentials.find({ withDeleted: true })) {
      await record('CREDENTIAL_UPDATED', { keycloakUserId: c.keycloakUserId, occurredAt: c.createdAt });
    }

    logger.log(`Backfilled ${total} historical audit_outbox row(s).`);
  } finally {
    await app.close();
  }
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error('backfill:audit-outbox failed:', error);
    process.exit(1);
  });
