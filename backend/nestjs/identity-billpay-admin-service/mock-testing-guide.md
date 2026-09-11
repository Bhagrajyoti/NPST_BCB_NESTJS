# Mock Auth & Mock BBPS Data

API & Technical Documentation

Related guides: [api endpoint guide.md](api%20endpoint%20guide.md) (`/auth/*`),
[adminservice.md](adminservice.md) (`/admin/*`), [rbacservice.md](rbacservice.md)
(`/employees`, `/roles`, ...), [billpaymentservice.md](billpaymentservice.md) (`/bill-payment/*`).

## 1. Overview

**Current state of this environment: `AUTH_MOCK_MODE=false`.** Login and every role check run
against the **real** Keycloak server — see [api endpoint guide.md](api%20endpoint%20guide.md),
[adminservice.md](adminservice.md), and [rbacservice.md](rbacservice.md) for real, working
account credentials. This file documents `AUTH_MOCK_MODE`, an **optional** switch you can still
turn on if Keycloak becomes unreachable — it is not the active mode right now, and nothing below
reflects the current default. The one thing that stays mocked regardless of this flag is the BBPS
payment simulation itself (§6) — that's a separate, always-on mock (there is no real BBPS
integration yet), unrelated to `AUTH_MOCK_MODE`.

## 2. Why This Exists

Every `@Auth()` route is enforced by a global Keycloak `AuthGuard`+`RoleGuard`
([app.module.ts](src/app.module.ts)). A `401` there is never specific to one module — it means no
valid `accessToken` was ever obtained from `POST /auth/login`, or it wasn't sent as
`Authorization: Bearer <accessToken>`.

`POST /auth/login` talks to a **real, remote Keycloak server**
(`KEYCLOAK_AUTH_SERVER_URL` in `.env`). Neither Swagger's `corp-maker-01` example nor the e2e
suite's `api-test-user` are real Keycloak accounts — the e2e suite replaces `KeycloakService`
with a mock entirely (see [test/e2e/helpers/test-app.ts](test/e2e/helpers/test-app.ts)). Manual
testing against real Keycloak was a dead end without a working account before real credentials
were available — hence this mode existed and remains here for future offline use (e.g. Keycloak
outage, CI without network access).

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

`KeycloakService.createUser`/`assignRealmRoleToUser`/`disableUser`/`signup`/etc. are **not**
mocked — they always hit the real Keycloak Admin API, even with `AUTH_MOCK_MODE=true` (this is
what lets the registration saga, `/employees/create`, and `POST /auth/signup` provision real,
loggable-in accounts during mock-mode testing — see §9). Only the `login`/`logout` grant flow is
stubbed — so an account created via `POST /auth/signup` while mock mode is on is a **real**
Keycloak account, but you can't actually log into it with `POST /auth/login` until you turn mock
mode back off (mock `login` only recognizes the fixed usernames in §5).

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

## 7. Mock Bank Account Data

`POST /auth/registration/create` now takes **only `mobileNumber`** — it no longer asks for a
PAN/CIF. Instead, it looks up every bank account on file for that mobile number and returns them
as `registeredAccounts` alongside the new registration attempt, standing in for a real CBS "list
accounts by mobile number" call. Backed by
[`bank_account`](src/modules/auth/bank-account/entities/bank-account.entity.ts), a small fixed set
of rows re-seeded idempotently on every boot by
[`BankAccountSeeder`](src/modules/auth/bank-account/bank-account.seeder.ts) — same pattern as
`DemoBbpsDataSeeder` (§6), no manual step needed. Boot log confirms it:
```
[BankAccountSeeder] bank_account ready (3 fixed rows)
```

| mobileNumber | bankName | accountType | accountNumber | ifscCode | debitCardNumber | expiry | cvv |
|---|---|---|---|---|---|---|---|
| `9876543210` | ICICI Bank | SAVINGS | `10023456789012` | `ICIC0001234` | `4111111111111111` | `09/28` | `123` |
| `9876543210` | HDFC Bank | CURRENT | `20034567890123` | `HDFC0000123` | `5500005555555559` | `03/27` | `456` |
| `9000000001` | State Bank of India | SAVINGS | `30045678901234` | `SBIN0001234` | `4012888888881881` | `11/29` | `789` |

(`cvv` above is only ever an *input* you send to `activate-mobile`, §7.2 below — no endpoint ever
returns it.)

Any other mobile number returns `registeredAccounts: []` — that's a normal response (a brand-new
customer with no accounts yet), not an error.

**`POST`** `/auth/registration/create`

### Request
```json
{ "mobileNumber": "9876543210" }
```

### Success Response
```json
{
  "id": "c7cd9d8b-168f-4f4a-917c-7a982389fba0",
  "mobileNumber": "9876543210",
  "currentStep": "INIT",
  "failureReason": null,
  "keycloakUserId": null,
  "deviceProfileId": null,
  "createdAt": "...",
  "updatedAt": "...",
  "deletedAt": null,
  "registeredAccounts": [
    {
      "accountNumber": "10023456789012",
      "accountHolderName": "Ravi Kumar",
      "accountType": "SAVINGS",
      "bankName": "ICICI Bank",
      "branchName": "MG Road, Bengaluru",
      "ifscCode": "ICIC0001234",
      "debitCardNumber": "4111111111111111",
      "debitCardExpiry": "09/28",
      "status": "ACTIVE"
    },
    {
      "accountNumber": "20034567890123",
      "accountHolderName": "Ravi Kumar",
      "accountType": "CURRENT",
      "bankName": "HDFC Bank",
      "branchName": "Koramangala, Bengaluru",
      "ifscCode": "HDFC0000123",
      "debitCardNumber": "5500005555555559",
      "debitCardExpiry": "03/27",
      "status": "ACTIVE"
    }
  ]
}
```

`accountNumber`/`debitCardNumber` are returned in full (not masked) — `BankAccountService`
doesn't mask anything it returns. `debitCardCvv` is stored on the row but **never** returned by
any endpoint; there's no code path that serializes it into a response. That's deliberate: it's
what `activate-mobile` below checks the caller actually knows, so returning it here would make
that check pointless.

### 7.1 Activating a mobile number against an account

**`POST`** `/auth/registration/activate-mobile` — same controller/route group as `create` above.
Send the `mobileNumber` back with one `accountNumber` from `registeredAccounts` plus the debit
card details for that account (number, expiry, CVV — CVV is never given to you by any endpoint,
you're expected to already know it, same as with a real card). If everything matches the row in
`bank_account`, and that row actually belongs to `mobileNumber`, you get back a success message —
this is the mock equivalent of "verify you hold the card before linking the account."

### Request
```json
{
  "mobileNumber": "9876543210",
  "accountNumber": "10023456789012",
  "debitCardNumber": "4111111111111111",
  "debitCardExpiry": "09/28",
  "debitCardCvv": "123"
}
```

### Success Response
```json
{
  "success": true,
  "message": "Successfully connected",
  "account": {
    "accountNumber": "10023456789012",
    "accountHolderName": "Ravi Kumar",
    "accountType": "SAVINGS",
    "bankName": "ICICI Bank",
    "branchName": "MG Road, Bengaluru",
    "ifscCode": "ICIC0001234",
    "debitCardNumber": "4111111111111111",
    "debitCardExpiry": "09/28",
    "status": "ACTIVE"
  }
}
```

**Errors:** `404` — no `bank_account` row for that `mobileNumber` + `accountNumber` pair ·
`400` — the row exists but `debitCardNumber`/`debitCardExpiry`/`debitCardCvv` don't all match it
exactly (e.g. right card, wrong mobile number — or right mobile number, wrong/mistyped card).
Try `accountNumber: "20034567890123"` (HDFC) with the ICICI card above to see the `400` case, or
any valid pair with `debitCardCvv: "000"` to see a wrong-CVV `400`.

To add more mock accounts (e.g. to test a mobile number with 3+ accounts), add rows to
`DEMO_ROWS` in [bank-account.seeder.ts](src/modules/auth/bank-account/bank-account.seeder.ts) and
restart — the seeder inserts only rows that don't already exist (matched on
`mobileNumber` + `accountNumber`), so it's safe to add to the list without duplicating existing
rows.

## 8. Worked Example — Full Flow

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

## 9. Testing Scenarios

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
| `registration/create` with `9876543210` (2 accounts on file) | `registeredAccounts` has 2 entries, masked numbers, no CVV | ✅ live |
| `registration/create` with `9000000001` (1 account on file) | `registeredAccounts` has 1 entry | ✅ live |
| `registration/create` with an unseeded mobile number | `registeredAccounts: []`, still `201` | ✅ live |
| `registration/create` with an invalid mobile number (e.g. `123`) | `400`, no `panOrCif` field accepted/required anymore | ✅ live |
| `activate-mobile` with the right mobile + accountNumber + matching card/expiry/CVV | `201`, `success: true`, `"Successfully connected"` | ✅ live |
| `activate-mobile` with a mobile/accountNumber pair that doesn't exist | `404` | ✅ live |
| `activate-mobile` with a real accountNumber but someone else's card, or a right card with wrong CVV/expiry | `400` | ✅ live |

## 10. Frontend Integration Note

Mock mode is a **local/CI-only** switch — never point a real mobile app or admin portal build at
a service with `AUTH_MOCK_MODE=true`. When writing integration code against this API, always test
against real Keycloak (`AUTH_MOCK_MODE=false`) before shipping, since `login`/`logout` payload
shapes match but token *values* and lifetimes differ (mock tokens live 24h/48h; real Keycloak
tokens live 5min/30min by default).
