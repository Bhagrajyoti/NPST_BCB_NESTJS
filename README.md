# identity-billpay-admin-service

A single NestJS **modulith** — Auth, Bill Payment, and Admin as isolated
modules inside one deployable service, not three separate microservices.
See [`NestJS_Service_Architecture_FINAL.md`](./NestJS_Service_Architecture_FINAL.md)
for the full rationale, non-negotiables, and open items, and
[`file structure.md`](./file%20structure.md) for the folder layout this
project was scaffolded from.

## What's in this repo

```
├── src/
│   ├── main.ts               # bootstrap: /api/v1 prefix, global pipes/filters/interceptors, Swagger
│   ├── app.module.ts          # wires every domain module + common + internal events
│   ├── modules/
│   │   ├── auth/               # registration, credential, device, corporate-hierarchy, otp, keycloak
│   │   ├── bill-payment/        # biller, payment (BBPS), scheduling
│   │   └── admin/               # admin-user, cif-linking, authorization-rules, reporting
│   ├── clients/                # cbs.client, notification.client, audit-outbox (durable outbox)
│   ├── internal-events/        # in-process event bus — the only way modules talk to each other
│   ├── common/                 # guards, interceptors, filters, decorators, resilience factory, templates
│   └── config/                 # app / database / keycloak config
└── test/
    ├── unit/{auth,bill-payment,admin}/
    ├── e2e/
    └── security/                # OTP brute force, JWT tampering, cross-module isolation, saga resumption
```

Each module (`auth`, `bill-payment`, `admin`) owns its own Postgres
**schema** on one shared instance, and modules never import from each other
directly — cross-module communication only goes through
`internal-event-bus`. This is enforced at lint time by
`eslint-plugin-boundaries` (see `.eslintrc.js`), not just code review.

## Prerequisites

- Node.js 20.x
- npm 10.x
- A running Postgres instance
- A running Keycloak instance (identity provider — see §4 of the
  architecture doc)
- A running RabbitMQ instance (used by the audit outbox relay)

## Install dependencies

```bash
npm install
```

Then copy the environment template and fill in real values for your local
Postgres/Keycloak/RabbitMQ instances:

```bash
cp .env.example .env
```

## Run the service

```bash
# development, with file-watch reload
npm run start:dev

# debug mode (attach a debugger)
npm run start:debug

# plain start, no watch
npm run start

# production build + run
npm run build
npm run start:prod
```

The API is served under the `/api/v1` prefix, e.g.
`http://localhost:3000/api/v1/health`. Swagger/OpenAPI docs are available at
`http://localhost:3000/api/v1/docs` once the service is running.

## Database migrations

```bash
npm run migration:generate   # generate a migration from entity changes
npm run migration:run        # apply pending migrations
```

## Tests

```bash
npm run test        # unit tests
npm run test:watch  # unit tests, watch mode
npm run test:cov    # unit tests with coverage
npm run test:e2e     # e2e + security specs (test/e2e, test/security)
```

## Lint & format

```bash
npm run lint    # eslint --fix, includes the module-isolation boundary rules
npm run format  # prettier --write
```

## Docker

```bash
docker build -t identity-billpay-admin-service .
docker run --env-file .env -p 3000:3000 identity-billpay-admin-service
```

## Reference docs in this folder

- [`NestJS_Service_Architecture_FINAL.md`](./NestJS_Service_Architecture_FINAL.md) —
  architecture decision record: why one modulith instead of three services,
  tooling standard, RBAC via Keycloak, the ten non-negotiables, and the open
  items that still need explicit sign-off before this is considered locked.
- [`file structure.md`](./file%20structure.md) — the annotated folder tree
  this scaffold was generated from.
