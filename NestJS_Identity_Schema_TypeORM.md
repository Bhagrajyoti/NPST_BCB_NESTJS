# NestJS — `identity` Schema — TypeORM Entities

Module: `modules/auth/`. Every entity below is scoped to the `identity`
Postgres schema (`schema: 'identity'` in the `@Entity` decorator) — nothing
here is ever queried from `bill-payment` or `admin` directly; those modules
only learn about identity data via events on `internal-event-bus`.

Standards applied throughout:
- `uuid` primary keys (`gen_random_uuid()`), not auto-increment integers — avoids leaking sequential IDs, matches IDOR-guard design (opaque IDs are harder to enumerate).
- `created_at`/`updated_at` on every table.
- Enums as native Postgres enums via TypeORM's `enum` column type, not free-text strings.
- No plaintext secrets/OTPs anywhere — only hashes.

**Revised identity model — `keycloakUserId`, not `cif`, is the primary
join key across every table in this schema.** CIF is a *core-banking*
identifier — it only exists once CBS has actually onboarded the customer.
A digital identity (Keycloak account, MPIN, device registration) can
legitimately exist *before* that: NRI onboarding, video-KYC pending
review, or any staged flow where the person registers on the app before
CBS finishes creating their account. If every table keyed off CIF, none of
that pre-CIF state would have anywhere to live.

Keycloak's `sub` claim — a stable, unique, non-reassignable UUID it
generates once and never reuses — is exactly what the OIDC spec designed
for this: an identity-provider-issued subject identifier that every
downstream system references, independent of any business system's own
lifecycle. So:
- `keycloakUserId` (the Keycloak user's UUID / JWT `sub` claim) is present
  and required on every table below the moment a digital identity exists.
- `cif` stays as a **nullable** column — populated later, once CBS confirms
  it, and kept in sync as a convenience/reporting field. Nothing else in
  this schema joins on it.
- The same `cif` value is also written to the Keycloak user as a custom
  attribute (see §2) once known, and mapped into the JWT as a **nullable**
  custom claim via a Keycloak protocol mapper — so every downstream service
  (including the Java side's `JwtCifResolver`) sees the same nullable `cif`
  claim and must handle its absence explicitly, not assume it's always set.

---

## 1. `registration_attempt` — backs the resumable 13-step saga

```ts
// modules/auth/registration/entities/registration-attempt.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum RegistrationStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  ABANDONED = 'ABANDONED',
}

@Entity({ schema: 'identity', name: 'registration_attempt' })
@Index(['mobileNumber'])
@Index(['keycloakUserId'])
export class RegistrationAttempt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'keycloak_user_id', type: 'uuid', nullable: true })
  keycloakUserId: string | null; // set once the Keycloak user is created mid-saga; null before that step

  @Column({ name: 'cif', type: 'varchar', length: 20, nullable: true })
  cif: string | null; // null until CBS confirms/assigns a CIF — may stay null for a while (e.g. NRI, pending KYC)

  @Column({ name: 'mobile_number', type: 'varchar', length: 15 })
  mobileNumber: string; // masked in logs via MaskingUtil, stored plain here (needed for OTP resend)

  @Column({ name: 'current_step', type: 'smallint', default: 1 })
  currentStep: number; // 1–13, drives orchestrator resume logic

  @Column({ type: 'enum', enum: RegistrationStatus, default: RegistrationStatus.IN_PROGRESS })
  status: RegistrationStatus;

  @Column({ name: 'step_data', type: 'jsonb', default: {} })
  stepData: Record<string, unknown>; // intermediate saga state, per-step payload

  @Column({ name: 'failure_reason', type: 'varchar', length: 255, nullable: true })
  failureReason: string | null;

  @Column({ name: 'bank_code', type: 'varchar', length: 20 })
  bankCode: string; // tenant discriminator — required, no default, forces every write to be tenant-aware

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

**Note:** `stepData` as `jsonb` is deliberate — the 13 steps aren't finalized
(PRD open item), so a rigid column-per-step schema would need a migration
every time the flow changes. This trades some query-ability for the
flexibility the open flow design actually needs right now.

---

## 2. `mpin_credential` — MPIN only. Password is NOT stored here.

**Password is owned entirely by Keycloak** — we never store a password
hash in our own DB. `credential.service.ts`'s password operations call
Keycloak's Admin API (`PUT /admin/realms/{realm}/users/{id}/reset-password`)
directly; there is no local password table to keep in sync with it. Storing
it in both places is exactly the kind of duplication that lets the two
systems quietly disagree about which password is actually valid.

**MPIN is the one credential type that legitimately belongs in our schema**
— Keycloak has no native concept of a banking MPIN, so this is genuinely
custom, not a duplicate of something Keycloak already does.

```ts
// modules/auth/credential/entities/mpin-credential.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity({ schema: 'identity', name: 'mpin_credential' })
@Index(['keycloakUserId'], { unique: true })
export class MpinCredential {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'keycloak_user_id', type: 'uuid' })
  keycloakUserId: string; // primary join key — required, MPIN always belongs to an existing digital identity

  @Column({ type: 'varchar', length: 20, nullable: true })
  cif: string | null; // convenience/reporting field, kept in sync — never joined on

  @Column({ name: 'hashed_value', type: 'varchar', length: 255 })
  hashedValue: string; // argon2id output — never the raw MPIN, ever

  @Column({ type: 'varchar', length: 20, default: 'argon2id' })
  algorithm: string; // explicit, so a future algorithm migration is traceable per-record

  @Column({ name: 'failed_attempt_count', type: 'smallint', default: 0 })
  failedAttemptCount: number;

  @Column({ name: 'locked_until', type: 'timestamptz', nullable: true })
  lockedUntil: Date | null;

  @Column({ name: 'last_changed_at', type: 'timestamptz' })
  lastChangedAt: Date;

  @Column({ name: 'bank_code', type: 'varchar', length: 20 })
  bankCode: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

**Where CIF lives, and how it gets populated later:** not a separate
mapping table — that would be a second source of truth to keep in sync.
Instead, **CIF is stored as a custom attribute on the Keycloak user
record itself**, written by `keycloak.service.ts` the moment it's known
(sometimes at registration, sometimes later once CBS confirms it). Looking
up a Keycloak user by CIF is a single Admin API search call
(`GET /admin/realms/{realm}/users?q=cif:{cif}`), not a local join.

**When CBS assigns/confirms a CIF after the fact** (the NRI/staged-onboarding
case): a `CifAssignedEvent` fires on `internal-event-bus` from wherever the
CBS confirmation arrives, and a small `CifSyncService` in the `auth` module
updates the Keycloak user attribute plus the `cif` column on
`registration_attempt`/`mpin_credential`/`device_profile` for that
`keycloakUserId`. This keeps `cif` as a denormalized, eventually-consistent
convenience field — the only fact that's ever authoritative is
`keycloakUserId`.

**Open product question, not just a technical one:** what can a user with
a Keycloak identity but no `cif` yet actually *do*? Presumably limited to
onboarding/document-upload/status-check endpoints, nothing account-related.
Worth getting an explicit answer from whoever owns the onboarding flow
before `roles.guard.ts`/route design assumes CIF is always present.

---

## 3. `device_profile`

```ts
// modules/auth/device/entities/device-profile.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum OsType {
  ANDROID = 'ANDROID',
  IOS = 'IOS',
}

@Entity({ schema: 'identity', name: 'device_profile' })
@Index(['keycloakUserId'])
@Index(['deviceId'], { unique: true })
export class DeviceProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'keycloak_user_id', type: 'uuid' })
  keycloakUserId: string; // primary join key

  @Column({ type: 'varchar', length: 20, nullable: true })
  cif: string | null; // convenience/reporting field, kept in sync — never joined on

  @Column({ name: 'device_id', type: 'varchar', length: 128 })
  deviceId: string; // hardware/app-instance identifier from the mobile client

  @Column({ name: 'device_model', type: 'varchar', length: 100, nullable: true })
  deviceModel: string | null;

  @Column({ name: 'os_type', type: 'enum', enum: OsType })
  osType: OsType;

  @Column({ name: 'os_version', type: 'varchar', length: 20, nullable: true })
  osVersion: string | null;

  @Column({ name: 'app_version', type: 'varchar', length: 20, nullable: true })
  appVersion: string | null;

  @Column({ name: 'push_token', type: 'varchar', length: 255, nullable: true })
  pushToken: string | null;

  @Column({ name: 'is_trusted', type: 'boolean', default: false })
  isTrusted: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'registered_at', type: 'timestamptz' })
  registeredAt: Date;

  @Column({ name: 'last_used_at', type: 'timestamptz', nullable: true })
  lastUsedAt: Date | null;

  @Column({ name: 'bank_code', type: 'varchar', length: 20 })
  bankCode: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

---

## 4. `corporate_hierarchy` — US-03 base hierarchy

```ts
// modules/auth/corporate-hierarchy/entities/corporate-hierarchy.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum CorporateRole {
  INITIATOR = 'INITIATOR',
  APPROVER = 'APPROVER',
  VIEWER = 'VIEWER',
  ADMIN = 'ADMIN',
}

@Entity({ schema: 'identity', name: 'corporate_hierarchy' })
@Index(['corporateCif'])
@Index(['userKeycloakId', 'corporateCif'], { unique: true })
export class CorporateHierarchy {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'corporate_cif', type: 'varchar', length: 20 })
  corporateCif: string; // the corporate's own CBS CIF — required; a corporate must already have a CBS relationship for hierarchy assignment to be meaningful

  @Column({ name: 'user_keycloak_id', type: 'uuid' })
  userKeycloakId: string; // the individual staff member's digital identity — primary join key

  @Column({ name: 'user_cif', type: 'varchar', length: 20, nullable: true })
  userCif: string | null; // the individual's own personal CIF, if any — nullable; a corporate signatory doesn't always have a personal retail relationship

  @Column({ type: 'enum', enum: CorporateRole })
  role: CorporateRole;

  @Column({ name: 'approval_limit', type: 'numeric', precision: 18, scale: 2, nullable: true })
  approvalLimit: string | null; // numeric as string — never use JS float for money

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'created_by', type: 'varchar', length: 20 })
  createdBy: string; // CIF or admin user id who granted this role

  @Column({ name: 'bank_code', type: 'varchar', length: 20 })
  bankCode: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

---

## 5. `otp_challenge` — with real rate-limit fields, not just a table name

```ts
// modules/auth/otp/entities/otp-challenge.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum OtpPurpose {
  REGISTRATION = 'REGISTRATION',
  LOGIN = 'LOGIN',
  TRANSACTION = 'TRANSACTION',
  MPIN_RESET = 'MPIN_RESET',
}

export enum OtpStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  EXPIRED = 'EXPIRED',
  LOCKED = 'LOCKED',
}

@Entity({ schema: 'identity', name: 'otp_challenge' })
@Index(['referenceId'], { unique: true })
@Index(['keycloakUserId'])
export class OtpChallenge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'reference_id', type: 'varchar', length: 64 })
  referenceId: string; // client-facing OTP session reference, never the OTP itself

  @Column({ name: 'keycloak_user_id', type: 'uuid', nullable: true })
  keycloakUserId: string | null; // nullable — mobile-verification OTP often happens BEFORE the Keycloak user exists

  @Column({ type: 'varchar', length: 20, nullable: true })
  cif: string | null; // nullable — same reasoning, and CIF may not exist yet regardless

  @Column({ name: 'mobile_number', type: 'varchar', length: 15 })
  mobileNumber: string;

  @Column({ type: 'enum', enum: OtpPurpose })
  purpose: OtpPurpose;

  @Column({ name: 'otp_hash', type: 'varchar', length: 255 })
  otpHash: string; // hashed, never plaintext, even at rest

  @Column({ name: 'attempt_count', type: 'smallint', default: 0 })
  attemptCount: number;

  @Column({ name: 'max_attempts', type: 'smallint', default: 3 })
  maxAttempts: number;

  @Column({ name: 'locked_until', type: 'timestamptz', nullable: true })
  lockedUntil: Date | null;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ name: 'verified_at', type: 'timestamptz', nullable: true })
  verifiedAt: Date | null;

  @Column({ type: 'enum', enum: OtpStatus, default: OtpStatus.PENDING })
  status: OtpStatus;

  @Column({ name: 'bank_code', type: 'varchar', length: 20 })
  bankCode: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
```

**This is the table `otp-rate-limit.guard.ts` reads/writes** — `attemptCount`
vs `maxAttempts` and `lockedUntil` are exactly the fields flagged as
missing in the earlier review. They're real columns now, not aspirational.

---

## 6 & 7. `notification_template` + `notification_template_history`

```ts
// common/templates/entities/notification-template.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum NotificationChannel {
  SMS = 'SMS',
  EMAIL = 'EMAIL',
}

@Entity({ schema: 'identity', name: 'notification_template' })
@Index(['templateKey', 'channel', 'locale'], { unique: true })
export class NotificationTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'template_key', type: 'varchar', length: 100 })
  templateKey: string;

  @Column({ type: 'enum', enum: NotificationChannel })
  channel: NotificationChannel;

  @Column({ type: 'varchar', length: 10, default: 'en' })
  locale: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  subject: string | null; // email only

  @Column({ type: 'text' })
  body: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'updated_by', type: 'varchar', length: 50 })
  updatedBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

```ts
// common/templates/entities/notification-template-history.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity({ schema: 'identity', name: 'notification_template_history' })
@Index(['templateId'])
export class NotificationTemplateHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'template_id', type: 'uuid' })
  templateId: string; // logical reference to notification_template.id — no FK constraint across module lifecycle changes

  @Column({ name: 'version_number', type: 'int' })
  versionNumber: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  subject: string | null;

  @Column({ type: 'text' })
  body: string; // snapshot at time of change

  @Column({ name: 'changed_by', type: 'varchar', length: 50 })
  changedBy: string;

  @CreateDateColumn({ name: 'changed_at' })
  changedAt: Date;
}
```

**Append-only, on purpose** — every update to `notification_template`
writes a row here first (or via a DB trigger, your call), so "what did this
say on the day it was sent to 50,000 customers" is always answerable.

---

## 8. `idempotency_record` — scoped per schema, not shared globally

```ts
// common/idempotency/entities/idempotency-record.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum IdempotencyStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

@Entity({ schema: 'identity', name: 'idempotency_record' })
@Index(['idempotencyKey'], { unique: true })
export class IdempotencyRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'idempotency_key', type: 'varchar', length: 128 })
  idempotencyKey: string; // client-generated, per A2.3 in the frontend doc

  @Column({ name: 'request_hash', type: 'varchar', length: 64 })
  requestHash: string; // sha256 of the request body — detects same-key-different-payload misuse

  @Column({ name: 'response_body', type: 'jsonb', nullable: true })
  responseBody: Record<string, unknown> | null;

  @Column({ type: 'enum', enum: IdempotencyStatus, default: IdempotencyStatus.IN_PROGRESS })
  status: IdempotencyStatus;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date; // TTL — 24–48h is typical, cleaned up by a scheduled job

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
```

**Note the schema-per-module rule applies here too** — `billpay` and
`admin` get their own separate `idempotency_record` table each, not a
shared one. Same reasoning as everywhere else: no cross-module table
dependency, ever.

---

## 9. `audit_outbox_event` — the real outbox, not a synchronous call

```ts
// clients/audit-outbox/audit-outbox.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum OutboxStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
}

@Entity({ schema: 'identity', name: 'audit_outbox_event' })
@Index(['status'])
export class AuditOutboxEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'event_type', type: 'varchar', length: 100 })
  eventType: string; // e.g. 'USER_REGISTERED', 'CREDENTIAL_CHANGED'

  @Column({ type: 'jsonb' })
  payload: Record<string, unknown>;

  @Column({ type: 'enum', enum: OutboxStatus, default: OutboxStatus.PENDING })
  status: OutboxStatus;

  @Column({ name: 'retry_count', type: 'smallint', default: 0 })
  retryCount: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'sent_at', type: 'timestamptz', nullable: true })
  sentAt: Date | null;
}
```

`audit-outbox-relay.job.ts` polls this table for `PENDING` rows, posts to
the Audit service, and flips status to `SENT`/`FAILED` with backoff on
retry — this is what makes it an actual outbox, not the misleadingly-named
synchronous call flagged in an earlier review.

---

## Standing questions before this schema is final

1. **`bank_code` on every table** — confirm this is the right tenant
   discriminator (vs. a separate `tenant_id` UUID referencing a
   `bank_config` table). If multi-bank onboarding ever needs more than a
   code (e.g. per-bank feature flags, CIF format regex), a proper
   `bank_config` table is worth adding now rather than retrofitting.
2. **`corporate_hierarchy.approvalLimit` as `numeric` string** — confirm
   this is precise enough, or if it should be `bigint` in minor units
   (paise) instead, matching whatever convention the Java side uses for
   money columns, so the two stacks don't drift on rounding behavior.
3. **MPIN/OTP retention** — how long do we keep expired/verified OTP rows
   and old MPIN-change history? Worth a data-retention policy before this
   table grows unbounded in production.
4. **Confirm the Keycloak realm actually supports a custom `cif` user
   attribute, that it's searchable/indexed, and that a protocol mapper
   projects it into the JWT as a nullable claim** — this is load-bearing
   for every lookup-by-CIF flow across the whole platform, not just
   registration. Verify this with whoever owns the Keycloak realm config
   before building against the assumption.
5. **What does `registration-orchestrator.service.ts` do if Keycloak
   user-creation succeeds but a later saga step fails permanently?** This
   ties directly to the compensation/rollback design flagged as an open
   item elsewhere — a Keycloak user that exists but never gets a CIF (or
   never finishes registration) is exactly the "orphaned account" scenario
   to design against up front. Note this is now a *legitimate long-term
   state* (NRI/pending-KYC), not only a failure mode — the compensation
   logic needs to distinguish "still legitimately pending" from "actually
   abandoned and should be cleaned up."
6. **Java side must be told the `cif` JWT claim is nullable.** `JwtCifResolver`
   and `IdorGuard` on the Spring Boot services currently assume CIF is
   always present on an authenticated request. Confirm with the Java pod
   what happens today if it's missing — this needs an explicit, tested
   answer (likely: reject with a clear "onboarding not complete" error),
   not an untested null-pointer waiting to happen.
7. **What's actually accessible to a "digital identity exists, CIF doesn't
   yet" user?** A product decision, not just a technical one — get this
   from whoever owns the onboarding flow before route-level RBAC is built
   assuming CIF is always available.

Next: `billpay` schema, then `admin` schema — say the word and I'll do the
same pass for those.
