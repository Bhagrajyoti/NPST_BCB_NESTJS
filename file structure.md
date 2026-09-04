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