# NestJS Service Architecture — `identity-billpay-admin-service` (Final)

**Audience:** NestJS team.
**Status:** Single source of truth for this service. Read alongside the
separate "NestJS Team — Getting Started" kickoff guide, which tells you the
*order* to work through this in; this doc is the reference itself.

---

## 1. The core decision: one modulith, not three microservices

**We are building one deployable service, not three.** Auth, Bill Payment,
and Admin are isolated *modules* inside a single NestJS app — not three
separately deployed services.

**Why:**
- All three domains are owned by one team. The usual reason to split into
  microservices — different teams needing independent release cadence — 
  doesn't apply here.
- None of the three individually carries the complexity or scale profile
  that justifies its own deployment pipeline, health checks, and network
  boundary. Compare this to the Spring Boot side, where Funds Transfer
  alone is large and complex enough to earn that treatment on its own.
- Splitting into three services means paying an integration tax between
  them too — checksum signing/validation, resilience wrapping, auth
  propagation — for calls that can otherwise be a function call within one
  process.
- The team is new to this stack and to microservices generally. Fewer
  deployables means fewer places a misconfiguration or a partial-failure
  network boundary can silently break something.

**What we keep from the microservices mindset anyway, so splitting later
stays possible without a rewrite:**
- Each module (`auth`, `bill-payment`, `admin`) has its **own DB schema** —
  same Postgres instance today, but nothing writes across schema
  boundaries.
- Modules **never import from each other directly.** All cross-module
  communication goes through an in-process event bus.
- If load or team structure ever changes, splitting one module out later is
  a deployment and config change, not a redesign.

**Open item — flag to whoever owns PRD sign-off:** the PRD's Phase-1
Definition of Done states "every backend domain is a separately deployable
microservice." This modulith approach satisfies the *intent* behind that
line (no cross-service DB coupling, independent-split option preserved)
but not its literal wording. Get explicit sign-off on this deviation before
treating it as settled — this is a scope conversation, not something to
resolve unilaterally.

---

## 2. Tooling standard

NestJS 10+ · TypeORM or Prisma (pick one, don't mix) with **one schema per
module** · `@nestjs/config` for environment config · `@nestjs/swagger` for
OpenAPI · `@nestjs/terminus` for health checks · `@nestjs/event-emitter`
(or equivalent) for the internal event bus · Keycloak as the identity
provider, validated as an OAuth2 resource server (`nestjs-keycloak-connect`
or a manual `passport` strategy) · Jest for unit/e2e tests ·
`eslint-plugin-boundaries` to enforce module isolation at lint/CI time.

---

## 3. Folder structure

```
identity-billpay-admin-service/
├── package.json
├── nest-cli.json
├── tsconfig.json
├── Dockerfile
├── .env.example
│
├── src/
│   ├── main.ts                              # bootstrap; global prefix /api/v1; global pipes/filters/interceptors
│   ├── app.module.ts                        # imports all domain modules + CommonModule + InternalEventsModule
│   │
│   ├── modules/
│   │   │
│   │   ├── auth/
│   │   │   ├── auth.module.ts
│   │   │   ├── registration/
│   │   │   │   ├── registration.controller.ts
│   │   │   │   ├── registration.service.ts
│   │   │   │   ├── registration-orchestrator.service.ts     # resumable saga, current_step
│   │   │   │   ├── registration-compensation.service.ts     # rollback per step on hard failure
│   │   │   │   ├── dto/
│   │   │   │   │   ├── init-registration.dto.ts
│   │   │   │   │   └── create-credentials.dto.ts
│   │   │   │   └── entities/registration-attempt.entity.ts
│   │   │   ├── credential/
│   │   │   │   ├── credential.controller.ts
│   │   │   │   ├── credential.service.ts
│   │   │   │   ├── dto/set-credential.dto.ts
│   │   │   │   └── entities/credential.entity.ts
│   │   │   ├── device/
│   │   │   │   ├── device.controller.ts
│   │   │   │   ├── device.service.ts
│   │   │   │   ├── dto/register-device.dto.ts
│   │   │   │   └── entities/device-profile.entity.ts
│   │   │   ├── corporate-hierarchy/
│   │   │   │   ├── corporate-hierarchy.controller.ts
│   │   │   │   ├── corporate-hierarchy.service.ts
│   │   │   │   ├── dto/set-hierarchy-role.dto.ts
│   │   │   │   └── entities/corporate-hierarchy.entity.ts
│   │   │   ├── otp/
│   │   │   │   ├── otp.controller.ts
│   │   │   │   ├── otp.service.ts
│   │   │   │   ├── dto/
│   │   │   │   │   ├── generate-otp.dto.ts
│   │   │   │   │   └── verify-otp.dto.ts
│   │   │   │   └── entities/otp-challenge.entity.ts         # attempt_count, locked_until
│   │   │   ├── keycloak/
│   │   │   │   ├── keycloak.service.ts                      # admin API: create/disable user, force logout
│   │   │   │   └── keycloak.config.ts
│   │   │   ├── events/
│   │   │   │   ├── user-registered.event.ts
│   │   │   │   └── user-deactivated.event.ts
│   │   │   └── migrations/                                  # schema: identity
│   │   │
│   │   ├── bill-payment/
│   │   │   ├── bill-payment.module.ts
│   │   │   ├── biller/
│   │   │   │   ├── biller.controller.ts
│   │   │   │   ├── biller.service.ts
│   │   │   │   ├── dto/
│   │   │   │   └── entities/biller-registration.entity.ts
│   │   │   ├── payment/
│   │   │   │   ├── payment.controller.ts
│   │   │   │   ├── payment.service.ts                       # BBPS integration
│   │   │   │   ├── dto/
│   │   │   │   └── entities/bill-payment.entity.ts
│   │   │   ├── scheduling/
│   │   │   │   ├── bill-schedule.service.ts
│   │   │   │   └── entities/bill-schedule.entity.ts
│   │   │   ├── events/bill-payment-completed.event.ts
│   │   │   └── migrations/                                  # schema: billpay
│   │   │
│   │   └── admin/
│   │       ├── admin.module.ts
│   │       ├── admin-user/
│   │       │   ├── admin-user.controller.ts
│   │       │   ├── admin-user.service.ts
│   │       │   ├── dto/
│   │       │   └── entities/admin-user.entity.ts
│   │       ├── cif-linking/
│   │       │   ├── cif-linking.controller.ts
│   │       │   ├── cif-linking.service.ts
│   │       │   ├── dto/
│   │       │   └── entities/cif-link.entity.ts
│   │       ├── authorization-rules/
│   │       │   ├── authorization-rules.controller.ts
│   │       │   ├── authorization-rules.service.ts
│   │       │   ├── dto/
│   │       │   └── entities/
│   │       │       ├── authorization-rule.entity.ts
│   │       │       └── authorization-rule-history.entity.ts # append-only versions
│   │       ├── reporting/
│   │       │   ├── reporting.controller.ts
│   │       │   ├── reporting.service.ts                     # reads read-models, never other modules' tables
│   │       │   └── dto/
│   │       ├── events/admin-action-audited.event.ts
│   │       └── migrations/                                  # schema: admin
│   │
│   ├── clients/
│   │   ├── cbs.client.ts                     # wrapped via resilience factory
│   │   ├── notification.client.ts            # wrapped via resilience factory
│   │   └── audit-outbox/
│   │       ├── audit-outbox.module.ts
│   │       ├── audit-outbox.entity.ts        # local durable store — this is what makes it a real outbox
│   │       ├── audit-outbox.repository.ts
│   │       └── audit-outbox-relay.job.ts     # async relay to the Audit service
│   │
│   ├── internal-events/
│   │   ├── internal-event-bus.module.ts      # wraps @nestjs/event-emitter
│   │   ├── internal-event-bus.service.ts     # publish()/on(), in-process only
│   │   └── event-log.entity.ts               # optional persisted log for debug/replay
│   │
│   ├── common/
│   │   ├── constants/
│   │   │   ├── error-codes.constant.ts
│   │   │   ├── notification-template-keys.constant.ts
│   │   │   └── regex.constant.ts
│   │   ├── decorators/
│   │   │   ├── current-user.decorator.ts
│   │   │   ├── roles.decorator.ts
│   │   │   └── idempotency-key.decorator.ts
│   │   ├── dto/
│   │   │   ├── base-response.dto.ts
│   │   │   └── pagination.dto.ts
│   │   ├── filters/http-exception.filter.ts
│   │   ├── guards/
│   │   │   ├── keycloak-auth.guard.ts        # registered globally via APP_GUARD
│   │   │   ├── roles.guard.ts                # registered globally via APP_GUARD
│   │   │   ├── idempotency.guard.ts
│   │   │   ├── idor.guard.ts
│   │   │   └── checksum.guard.ts             # validates inbound calls from Spring services
│   │   ├── interceptors/
│   │   │   ├── logging.interceptor.ts        # masking enforced automatically, applied globally
│   │   │   ├── response-transform.interceptor.ts
│   │   │   └── checksum-signing.interceptor.ts   # signs outbound calls to Spring services
│   │   ├── interfaces/
│   │   ├── pipes/validation.pipe.ts
│   │   ├── resilience/resilient-http-client.factory.ts   # timeout+retry+circuit breaker, all clients use it
│   │   ├── tenant/
│   │   │   ├── tenant-context.middleware.ts
│   │   │   └── bank-config.service.ts
│   │   ├── templates/
│   │   │   ├── templates.module.ts
│   │   │   ├── templates.service.ts
│   │   │   ├── templates.controller.ts
│   │   │   ├── entities/
│   │   │   │   ├── notification-template.entity.ts
│   │   │   │   └── notification-template-history.entity.ts  # append-only version history
│   │   │   ├── defaults/{sms,email}/
│   │   │   └── dto/
│   │   ├── health/
│   │   │   └── health.controller.ts          # @nestjs/terminus — DB, Keycloak, RabbitMQ checks
│   │   └── utils/
│   │       ├── date.util.ts
│   │       └── masking.util.ts
│   │
│   └── config/
│       ├── database.config.ts                # 3 schema configs, one Postgres instance
│       ├── keycloak.config.ts
│       └── app.config.ts
│
└── test/
    ├── unit/{auth,bill-payment,admin}/
    ├── e2e/
    └── security/
        ├── otp-brute-force.e2e-spec.ts
        ├── jwt-tampering.e2e-spec.ts
        ├── cross-module-isolation.e2e-spec.ts
        └── registration-saga-resumption.e2e-spec.ts
```

---

## 4. RBAC via Keycloak — how it actually works here

- Keycloak issues the JWT, roles live in `realm_access.roles` and/or
  `resource_access.{client}.roles` — confirm which, for our specific realm
  config, before writing anything that reads it.
- `keycloak-auth.guard.ts` validates the token (signature, issuer, expiry).
  `roles.guard.ts` reads the roles off that already-validated token and
  checks them against `@Roles()` on the handler.
- Both guards are registered **globally** via `APP_GUARD` in
  `app.module.ts` — a brand-new controller with no `@Roles()` decorator
  should fail closed by default, not be silently open.
- No service manages its own user/role store. Keycloak is the single
  source of truth for identity and roles across the whole platform,
  including the Spring Boot services.
- `keycloak.service.ts` (inside `auth/keycloak/`) handles admin-API
  operations — create/disable user, force logout — this is the only place
  that talks to Keycloak's admin API.

---

## 5. Non-negotiables

1. **No import across `modules/auth`, `modules/bill-payment`,
   `modules/admin`.** Cross-module communication only through
   `internal-event-bus`. Enforced by `eslint-plugin-boundaries`, not review
   alone.
2. **Each module owns its own DB schema.** No module writes to another
   module's tables. `admin/reporting` reads via read-models built from
   events, never a live join into another module's schema.
3. **RBAC is always `@Roles()` + the global guard**, never a manual
   `if (user.role === ...)` check inside a service method.
4. **Every mutation-style endpoint accepts and stores an idempotency key.**
   This is what lets a retried request (network blip, double-click,
   refresh-then-retry on the frontend) return the original result instead
   of re-executing the action.
5. **Any endpoint taking a resource ID goes through `idor.guard.ts`.**
   Non-negotiable specifically for `admin/cif-linking` and
   `admin/authorization-rules` — that's where IDOR does the most damage.
6. **Masking is automatic, not opt-in.** `logging.interceptor.ts` enforces
   it globally — no new `Logger.log()` call should ever carry a raw mobile
   number, CIF, or token, "just for debugging" or otherwise.
7. **Every outbound client call goes through the resilience factory.** No
   raw `axios`/`fetch` call to CBS, Notification, or anything external,
   ever — including "temporary" calls added for quick testing.
8. **`audit-outbox` is a real outbox** — local durable store + async relay
   job — never a synchronous call dressed up with the word "outbox" in its
   name.
9. **`/api/v1/` prefix set globally from the first commit.** API versioning
   isn't something to add later.
10. **Template changes are versioned**, via
    `notification-template-history.entity.ts` — never a single mutable row
    with just `updated_by`/`updated_at`.

---

## 6. Open items — confirm before this is fully locked

| Item | Depends on | Status |
|---|---|---|
| PRD DoD wording ("separately deployable microservice") vs. modulith approach | Whoever owns PRD sign-off | **Needs explicit sign-off, not silent deviation** |
| Checksum contract (secret scoping, header names, which routes are `/internal/**`) | Java/Spring Boot pod | **Must match exactly on both sides** |
| Keycloak role claim location (`realm_access` vs `resource_access.{client}`) for this realm | Platform/IAM owner | **Confirm before writing `roles.guard.ts`** |
| Registration saga compensation design (which steps roll back, which are terminal) | Team design session before coding starts | **Design first, on a whiteboard, before implementation** |

---

## 7. Definition of done — before this connects to the Spring Boot services or a real frontend

- [ ] Module isolation enforced by `eslint-plugin-boundaries` in CI, proven with a deliberately-wrong import
- [ ] `internal-event-bus` proven end to end with a real event before any module depends on it
- [ ] Global `keycloak-auth.guard` + `roles.guard` proven to fail closed on an unprotected route
- [ ] `resilient-http-client.factory` proven to actually trip its circuit breaker under a simulated failure
- [ ] `audit-outbox` proven to be async and durable, not a synchronous call
- [ ] Per-module schema separation in place from the first migration
- [ ] Idempotency key accepted and stored on every mutation endpoint
- [ ] IDOR guard applied to every resource-ID-taking endpoint, especially `admin/cif-linking` and `admin/authorization-rules`
- [ ] Masking interceptor covers every log call, confirmed by a deliberate test with a raw PII value
- [ ] Checksum contract confirmed and tested against the Java side
- [ ] PRD DoD deviation explicitly signed off, not assumed
