# Mock Auth & Mock BBPS Data

API & Technical Documentation

Related guides: [api endpoint guide.md](api%20endpoint%20guide.md) (`/auth/*`),
[adminservice.md](adminservice.md) (`/admin/*`), [rbacservice.md](rbacservice.md)
(`/employees`, `/roles`, ...), [billpaymentservice.md](billpaymentservice.md) (`/bill-payment/*`).

## 1. Overview

`AUTH_MOCK_MODE` lets every endpoint in this service be exercised **without a reachable Keycloak
server** — a fixed set of fake users stands in for real login, while every guard/role-check still
runs exactly as it would in production. A separate, always-populated `demo_bbps_data` table gives
`bill-payment` endpoints clean, fixed sample data independent of whatever the e2e test suite has
left behind. Neither mechanism touches production behavior when left off (the default).

## 2. Why This Exists

Every `@Auth()` route is enforced by a global Keycloak `AuthGuard`+`RoleGuard`
([app.module.ts](src/app.module.ts)). A `401` there is never specific to one module — it means no
valid `accessToken` was ever obtained from `POST /auth/login`, or it wasn't sent as
`Authorization: Bearer <accessToken>`.

`POST /auth/login` talks to a **real, remote Keycloak server**
(`KEYCLOAK_AUTH_SERVER_URL` in `.env`). Neither Swagger's `corp-maker-01` example nor the e2e
suite's `api-test-user` are real Keycloak accounts — the e2e suite replaces `KeycloakService`
with a mock entirely (see [test/e2e/helpers/test-app.ts](test/e2e/helpers/test-app.ts)). Manual
testing against real Keycloak was a dead end without a working account, hence this mode.

## 3. Turning On Mock Auth

In [.env](.env):
```
AUTH_MOCK_MODE=true
```
Restart the app (`npm run start:dev`). Boot log confirms it seeded:
```
[DemoBbpsDataSeeder] demo_bbps_data ready (3 fixed rows)
```
Default is `false` in [.env.example](.env.example) — **never set `true` outside local dev**, it
accepts hardcoded passwords for anyone.

## 4. How It Works

| Component | Role |
|---|---|
| [mock-users.const.ts](src/modules/auth/keycloak/mock-users.const.ts) | Fixed list of fake users (§5) |
| [`KeycloakService.login`/`.logout`](src/modules/auth/keycloak/keycloak.service.ts) | Checks username/password against the fixed list instead of calling Keycloak when mock mode is on; issues a `mock-<username>-token` |
| [`KeycloakAuthGuard`](src/common/guards/keycloak-auth.guard.ts) | Replaces nest-keycloak-connect's `AuthGuard` — parses the mock bearer token, attaches `request.user` in the same shape a real Keycloak JWT would |
| [`RolesGuard`](src/common/guards/roles.guard.ts) | Replaces nest-keycloak-connect's `RoleGuard` — enforces `@Auth('SOME_ROLE')` against the mock user's roles identically to production |

`KeycloakService.createUser`/`assignRealmRoleToUser`/`disableUser`/etc. are **not** mocked — they
always hit the real Keycloak Admin API, even with `AUTH_MOCK_MODE=true` (this is what lets the
registration saga and `/employees/create` provision real, loggable-in accounts during mock-mode
testing — see §7). Only the `login`/`logout` grant flow is stubbed.

## 5. Mock Users

All passwords are `Mock@123`.

| username | role |
|---|---|
| `mock-superadmin` | `BANK_SUPER_ADMIN` |
| `mock-admin` | `BANK_ADMIN` |
| `mock-bank-maker` | `BANK_MAKER` |
| `mock-bank-checker` | `BANK_CHECKER` |
| `mock-corporate-maker` | `CORPORATE_MAKER` |
| `mock-corporate-checker` | `CORPORATE_CHECKER` |
| `mock-customer` | `RETAIL_CUSTOMER` |

**`POST`** `/auth/login`

### Request
```json
{ "username": "mock-admin", "password": "Mock@123" }
```

### Success Response
```json
{ "success": true, "data": { "accessToken": "mock-mock-admin-token", "expiresIn": 86400, "refreshExpiresIn": 172800, "refreshToken": "mock-mock-admin-refresh", "tokenType": "Bearer", "scope": "openid profile email" }, "timestamp": "..." }
```

**`POST`** `/auth/me`

### Header
```
Authorization: Bearer mock-mock-admin-token
```

### Success Response
```json
{ "success": true, "data": { "user": { "sub": "00000000-0000-0000-0000-000000000002", "preferred_username": "mock-admin", "realm_access": { "roles": ["BANK_ADMIN"] } } }, "timestamp": "..." }
```

Every success response is wrapped this way — see
[api endpoint guide.md §2](api%20endpoint%20guide.md#2-api-base-url). Errors are unwrapped
(`{ statusCode, path, timestamp, message }`).

## 6. Mock BBPS Data

`biller_registration`/`mock_bill` fill with randomly-named rows on every `npm run test:e2e` run,
making them unreliable for manual testing. `demo_bbps_data`
([entity](src/modules/bill-payment/demo/entities/demo-bbps-data.entity.ts)) is a separate table
with a small, fixed set of clean rows, re-seeded idempotently on every boot by
[`DemoBbpsDataSeeder`](src/modules/bill-payment/demo/demo-bbps-data.seeder.ts) — no manual step
needed. `BillService.fetchBill`/`PaymentService.create` check the real tables first (unchanged
behavior) and fall back to `demo_bbps_data` only when nothing matches.

| billerCode | billerName | category | consumerNumber | registeredMobile | amount | status |
|---|---|---|---|---|---|---|
| `DEMO-ELEC-001` | Demo Electricity Board | ELECTRICITY | `100000000001` | `9000000001` | 1250.50 | UNPAID |
| `DEMO-WATER-001` | Demo Water Board | WATER | `100000000002` | `9000000002` | 480.00 | UNPAID |
| `DEMO-GAS-001` | Demo Gas Agency | GAS | `100000000003` | `9000000003` | 900.00 | UNPAID |

A successful payment flips the matching row to `PAID` directly in `demo_bbps_data` (same as the
real flow does in `mock_bill`) — a restart won't reset it (the seeder only inserts missing rows).
To reset: `UPDATE demo_bbps_data SET status='UNPAID' WHERE biller_code='...'` in MySQL.

Full API details for these fields: [billpaymentservice.md](billpaymentservice.md).

## 7. Worked Example — Full Flow

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"mock-admin","password":"Mock@123"}' | grep -oP '"accessToken":"\K[^"]+')

curl -X POST http://localhost:3000/api/v1/bill-payment/bill/fetch \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"billerCode":"DEMO-ELEC-001","consumerNumber":"100000000001","registeredMobile":"9000000001"}'
# -> data.amount "1250.50", data.status "UNPAID"

curl -X POST http://localhost:3000/api/v1/bill-payment/payment \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"billerCode":"DEMO-ELEC-001","consumerNumber":"100000000001","amount":"1250.5","idempotencyKey":"any-unique-string"}'
# -> data.status one of SUCCESS/FAILED/PENDING/TIMEOUT — see billpaymentservice.md §11 for the odds

# Non-final status? Retry:
curl -X POST http://localhost:3000/api/v1/bill-payment/payment/retry \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"id":"<paymentId from above>"}'
```

`POST /auth/otp/create` requires an `Idempotency-Key` **header** (distinct from `payment`'s
`idempotencyKey` **body field** — see [api endpoint guide.md §5](api%20endpoint%20guide.md#5-otp-api)):
```bash
curl -X POST http://localhost:3000/api/v1/auth/otp/create \
  -H "Content-Type: application/json" -H "Idempotency-Key: any-unique-string" \
  -d '{"mobileNumber":"9000000009"}'
# omit the header -> 400
```

## 8. Testing Scenarios

| Scenario | Expected Result | Verified |
|---|---|---|
| Mock login with correct credentials | `200`, mock token issued | ✅ live |
| Mock login with wrong password | `401` | ✅ live |
| `/auth/me` with mock token | Correct `sub`/role for that mock user | ✅ live |
| Protected route with no token | `401` | ✅ live |
| Role-gated route (`/roles/create`, needs `BANK_SUPER_ADMIN`) with `mock-admin` (`BANK_ADMIN`) | `403` | ✅ live |
| Same route with `mock-superadmin` | passes the guard (reaches handler) | ✅ live |
| `bill/fetch` → `payment` → `payment/retry` against `demo_bbps_data` | Eventually `SUCCESS`, bill flips to `PAID` | ✅ live, full loop |
| Full registration saga under mock mode | Real Keycloak user created (mock mode doesn't stub `createUser`) | ✅ live, incl. real login afterwards |

## 9. Frontend Integration Note

Mock mode is a **local/CI-only** switch — never point a real mobile app or admin portal build at
a service with `AUTH_MOCK_MODE=true`. When writing integration code against this API, always test
against real Keycloak (`AUTH_MOCK_MODE=false`) before shipping, since `login`/`logout` payload
shapes match but token *values* and lifetimes differ (mock tokens live 24h/48h; real Keycloak
tokens live 5min/30min by default).
