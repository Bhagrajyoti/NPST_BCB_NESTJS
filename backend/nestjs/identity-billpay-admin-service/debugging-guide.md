# API Reference & Debugging Guide

API & Technical Documentation

Related guides: [api endpoint guide.md](api%20endpoint%20guide.md) (`/auth/*` field-level detail),
[rbacservice.md](rbacservice.md) (`/employees`, `/roles`, `/permissions`, `/users`),
[adminservice.md](adminservice.md) (`/admin/*`, audit trail),
[billpaymentservice.md](billpaymentservice.md) (`/bill-payment/*`),
[mock-testing-guide.md](mock-testing-guide.md) (mock data & mock auth).

This file is the "where do I start" doc — a full endpoint catalog in one place, and a concrete,
step-by-step path for debugging any API in this service manually. It doesn't repeat every field
of every DTO (the guides above own that) — it tells you which door to knock on first.

## 1. Full API Catalog

Every route in this service is `POST` unless marked otherwise. Base URL:
`http://localhost:3000/api/v1` locally (or `http://103.209.145.243:9101/identity/api/v1` on the
shared remote deployment — **these are two different databases**, see §5).

### Auth — Token (`api endpoint guide.md §3`)
| Method & Path | Auth | Purpose |
|---|---|---|
| `POST /auth/signup` | Public | Fast-path account creation (username/password only, role `RETAIL_CUSTOMER`) |
| `POST /auth/login` | Public | Exchange username/password for a Keycloak access/refresh token |
| `POST /auth/logout` | Bearer | Revoke a refresh token |
| `POST /auth/me` | Bearer | Decode and return the caller's own JWT claims |

### Auth — Registration saga (`api endpoint guide.md §4`)
| Method & Path | Auth | Purpose |
|---|---|---|
| `POST /auth/registration/create` | Public | Step 1: start a registration attempt from a mobile number, returns `registeredAccounts` (mock CBS lookup) |
| `POST /auth/registration/set-atm-pin` | Public | Set a 4-digit ATM PIN for one of those accounts — do this before `activate-mobile` |
| `POST /auth/registration/verify-atm-pin` | Public | Verify a previously-set ATM PIN |
| `POST /auth/registration/activate-mobile` | Public | Prove debit-card ownership (number+expiry+CVV) for an account |
| `POST /auth/registration/verify-otp` | Public | Step 2: verify OTP, advance to `OTP_VERIFIED` |
| `POST /auth/registration/create-credentials` | Public | Step 3: set login password, provisions the **real** Keycloak user |
| `POST /auth/registration/register-device` | Public | Step 4: link a device to the new Keycloak user |
| `POST /auth/registration/complete` | Public | Step 5: mark the saga `COMPLETED` |
| `POST /auth/registration/resume` | Public | Poll "what's my current step, what's next" — safe after an app crash |
| `POST /auth/registration/list` | Bearer | Admin: list every registration attempt |
| `POST /auth/registration/get` | Bearer | Admin: get one attempt by id |
| `POST /auth/registration/delete` | Bearer | Admin: soft-delete an attempt |

### Auth — OTP
| Method & Path | Auth | Purpose |
|---|---|---|
| `POST /auth/otp/create` | Public | Generate an OTP challenge for a mobile number |
| `POST /auth/otp/verify` | Public | Verify a challenge's OTP |
| `POST /auth/otp/list` / `get` / `delete` | Bearer | Admin visibility/cleanup |

### Mobile — Credential (Customer MPIN)
| Method & Path | Auth | Purpose |
|---|---|---|
| `POST /auth/credential/create` | Bearer (IDOR-guarded) | Set a customer's MPIN, and/or reset their **Keycloak password** via `password` field |
| `POST /auth/credential/get` | Bearer (IDOR-guarded) | Read MPIN metadata (never the MPIN itself) |
| `POST /auth/credential/verify` | Bearer (IDOR-guarded) | Check a submitted MPIN, returns `{ verified: boolean }` |
| `POST /auth/credential/delete` | Bearer (IDOR-guarded) | Soft-delete the MPIN record |
| `POST /auth/credential/list` | Bearer | Admin: list every MPIN record |

IDOR-guarded = you can act on your own `userId` freely; acting on someone else's requires
`BANK_ADMIN`/`BANK_SUPER_ADMIN`.

### Auth — Device / Corporate Hierarchy
| Method & Path | Auth | Purpose |
|---|---|---|
| `POST /auth/device/create` / `list` / `get` / `delete` | Bearer | Trusted-device profile CRUD |
| `POST /auth/corporate-hierarchy/create` / `list` / `get` / `delete` | Bearer | Links a Keycloak user to a corporate `cif` + role (maker/checker) |

### Customers (mock CBS data)
| Method & Path | Auth | Purpose |
|---|---|---|
| `POST /customer/list` | **Public, no body** | Every mock `bank_account` row on file, in full (no CVV, ever) — see `mock-testing-guide.md §7.3` |

### RBAC (`rbacservice.md`)
| Method & Path | Auth | Purpose |
|---|---|---|
| `POST /permissions/list` | **Public, no body** | Every permission in the 159-code catalogue |
| `POST /permissions/create` | `BANK_SUPER_ADMIN` | Add a permission to the local catalogue |
| `POST /roles/create` | `BANK_SUPER_ADMIN` | Create/adopt a Keycloak realm role + local metadata |
| `POST /roles/update` | `BANK_SUPER_ADMIN` | Update role metadata/delegations |
| `POST /roles/map-permissions` | `BANK_SUPER_ADMIN` | Replace a role's permission set |
| `POST /employees/create` | superadmin or delegated `BANK_ADMIN` | Provision a real bank-staff Keycloak user + assign a role |
| `POST /employees/update-role` | superadmin or delegated `BANK_ADMIN` | Change an employee's role |
| `POST /users/fetch-access-details` | Bearer | Resolve a Keycloak user's effective roles/permissions |

### Admin (`adminservice.md`)
| Method & Path | Auth | Purpose |
|---|---|---|
| `POST /admin/admin-user/list` | `BANK_SUPER_ADMIN` only | Every admin-portal account (read-model, mirrors RBAC employees) |
| `POST /admin/admin-user/get` | `BANK_SUPER_ADMIN`/`BANK_ADMIN` | One admin-portal account |
| `POST /admin/authorization-rules/create` / `update` / `deactivate` | `BANK_SUPER_ADMIN` | Per-CIF monetary approval thresholds, versioned |
| `POST /admin/authorization-rules/list` / `get` / `history` | `BANK_SUPER_ADMIN`/`BANK_ADMIN` | Read access |
| `GET /admin/reporting` | Bearer | **Stub** — always returns `[]`, no real logic behind it |

### Bill Payment (`billpaymentservice.md`)
| Method & Path | Auth | Purpose |
|---|---|---|
| `POST /bill-payment/bill/fetch` | Bearer | Look up a bill (real tables, falls back to `demo_bbps_data` mock) |
| `POST /bill-payment/payment` | Bearer | Pay a bill via the mock BBPS adapter |
| `POST /bill-payment/payment/retry` | Bearer | Re-dispatch a non-final payment |
| `GET /bill-payment/biller` / `POST` / `GET /{id}` | Bearer | Biller registration CRUD |
| `GET /bill-payment/payment` / `GET /{id}` | Bearer | Payment history lookup |

### Health
| Method & Path | Auth | Purpose |
|---|---|---|
| `POST /health/check` | Public | Liveness check |

---

## 2. How every response is shaped

**Success** (any 2xx):
```json
{ "success": true, "data": { /* the actual payload */ }, "timestamp": "..." }
```
**Error** (anything else) — deliberately **not** wrapped the same way:
```json
{ "statusCode": 400, "path": "/api/v1/...", "timestamp": "...", "message": "..." }
```
`message` is either a string or (for class-validator failures) `{ message: string[], error, statusCode }`.
First thing to check when debugging: is the body actually shaped like this? If it isn't, the
request never reached this app's own exception filter (a gateway/proxy in front of it returned
its own error page instead) — see §5.

## 3. The debugging path — follow in order

### Step 1 — Read the error exactly, don't guess from the status code alone
`statusCode` + `path` + `message` together almost always name the exact cause. `message` is
never generic in this codebase — every `ForbiddenException`/`BadRequestException`/`NotFoundException`
thrown here carries a specific human sentence (e.g. `"Only bank super admin users can list admin
users"`, not just `"Forbidden"`). Read it before doing anything else.

### Step 2 — Map the status code to where to look
| Status | Typical cause in this codebase | Where to look |
|---|---|---|
| `400` | class-validator DTO failure, or a business-rule check (wrong OTP, amount mismatch, maker+checker conflict, ATM PIN not set yet) | The `message` array names the exact field/rule |
| `401` | Missing/expired/malformed Bearer token, or (mock mode) unrecognized mock token | §3.1 below |
| `403` | Caller's realm role doesn't satisfy `@Auth(...)`/`assertRole`/`IdorGuard` | Check the caller's `realm_access.roles` via `POST /auth/me`, compare against the endpoint's documented required role |
| `404` | Record genuinely doesn't exist — wrong id, or you're querying the wrong database (§5) | Query the table directly (§4) before assuming the API is broken |
| `409` | Uniqueness conflict (duplicate `username`/`code`/`name`, idempotency key reused) | Usually means "this already exists," not a bug |
| `500` | Unhandled exception — Keycloak unreachable, a downstream call throwing, a real bug | §3.2 below; check server logs for the stack trace |

### 3.1 — Debugging a `401`
1. Is `AUTH_MOCK_MODE` what you think it is? `grep AUTH_MOCK_MODE .env`. Mock mode only accepts
   `mock-<username>-token` strings from `mock-users.const.ts`; real mode only accepts real
   Keycloak JWTs. Mixing them up is the #1 cause of unexpected 401s.
2. Get a fresh token and confirm it actually works: `POST /auth/login`, then immediately
   `POST /auth/me` with it. If `/auth/me` 401s too, the token itself is bad (typo'd, expired,
   missing `Bearer ` prefix) — check `access.token.lifespan` hasn't reverted (currently 24h on
   `admin-web`/`mobile-app`, capped by the realm's `ssoSessionMaxLifespan`).
3. Is Keycloak itself reachable? `curl -o /dev/null -w "%{http_code}\n" $KEYCLOAK_AUTH_SERVER_URL/realms/bharat-banking/.well-known/openid-configuration` — non-200 means the whole auth chain is dead upstream of this app, not an app bug.

### 3.2 — Debugging a `500`
1. Check the running app's log output — `[Nest] ... ERROR [ExceptionsHandler] <message>` names
   the real thrown error, often with a stack trace right below it. If running via
   `npm run start:dev`, this prints straight to the terminal.
2. Common root causes already hit in this codebase:
   - **Keycloak Admin API call failing** — `getAdminAccessToken()` uses `KEYCLOAK_ADMIN_USERNAME`/`_PASSWORD` (password grant against the `master` realm), not `KEYCLOAK_CLIENT_SECRET`. If admin credentials are wrong/expired, every role/employee/user-provisioning endpoint 500s.
   - **Keycloak resource already exists** — `POST /roles/create` used to 500 on a realm role
     Keycloak already had (409 from Keycloak, uncaught). Fixed to adopt-if-exists, but the same
     failure mode can resurface anywhere else that calls a Keycloak POST without checking first.
   - **A dependency wasn't wired into the DI graph** — `UnknownDependenciesException` at boot
     (not per-request) means a service constructor asks for something no imported module
     provides. Fix: import the providing module (or mark it `@Global()` — see `AuditOutboxModule`).
3. If it's reproducible, add a temporary `console.log`/breakpoint right before the failing call —
   this codebase has no swallowed exceptions by design (see `AuditOutboxService.record()`'s
   comment on *why* audit logging specifically is allowed to swallow errors — everything else
   should not).

## 4. Querying the database directly (bypass the API entirely)

Fastest way to tell "is this an API bug" from "there's genuinely no data here."

```bash
# list every table
docker exec npst-bcb-mysql mysql -ubcb_user -pbcb_pass db1 -e "SHOW TABLES;"

# one-shot query (no -it — that's only for the interactive prompt, see below)
docker exec npst-bcb-mysql mysql -ubcb_user -pbcb_pass db1 -e "SELECT * FROM bank_account\G"

# interactive shell
docker exec -it npst-bcb-mysql mysql -ubcb_user -pbcb_pass db1
```
`-it` (interactive + TTY) only works from a real interactive terminal — running it from a script
or a non-TTY context fails with `the input device is not a TTY`; drop `-it` for one-shot `-e`
queries.

Tables worth knowing by name (see each guide's "Database Tables" section for full schemas):
`registration_attempt`, `bank_account`, `otp_challenge`, `credential`, `device_profile`,
`corporate_hierarchy`, `rbac_role`, `rbac_permission`, `rbac_employee`, `rbac_employee_user_role`,
`admin_user`, `authorization_rule(_history)`, `bill_payment`, `mock_bill`, `demo_bbps_data`,
`audit_outbox`.

**Check the audit trail** (`adminservice.md §8`) to see whether an action even reached the point
of writing its event — if `POST /employees/create` returned 500 but an `EMPLOYEE_CREATED` row
exists in `audit_outbox` with a timestamp matching your attempt, the failure happened *after* the
real work succeeded (e.g. in the response-shaping code), which narrows the search a lot:
```bash
docker exec npst-bcb-mysql mysql -ubcb_user -pbcb_pass db1 -e \
  "SELECT event_type, status, payload FROM audit_outbox ORDER BY created_at DESC LIMIT 10;"
```

## 5. "It works locally but not on the deployed server" (or vice versa)

This project runs in at least two places that do **not** share a database:
- Local dev (`localhost:3000`, `docker exec npst-bcb-mysql ...`)
- The remote deployment (`http://103.209.145.243:9101/identity/api/v1`)

They **do** share the same Keycloak (`KEYCLOAK_AUTH_SERVER_URL`), so:
- A `RegistrationAttempt`, `bank_account`, `admin_user`, etc. row that exists on one side will
  **not** exist on the other — `404`/`[]` on one server for data you just created on the other is
  expected, not a bug. Check which server you're actually pointed at.
- A real Keycloak **user or role** exists everywhere, because Keycloak is the one shared piece.
  If you need to find a user regardless of which deployment registered them, search Keycloak
  directly instead of either app database:
  ```bash
  ADMIN_TOKEN=$(curl -s -X POST $KEYCLOAK_AUTH_SERVER_URL/realms/master/protocol/openid-connect/token \
    -d "grant_type=password&client_id=admin-cli&username=$KEYCLOAK_ADMIN_USERNAME&password=$KEYCLOAK_ADMIN_PASSWORD" \
    | python3 -c "import json,sys;print(json.load(sys.stdin)['access_token'])")
  curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
    "$KEYCLOAK_AUTH_SERVER_URL/admin/realms/bharat-banking/users?username=<mobile-or-username>&exact=true"
  ```
- Uncommitted local code changes are, by definition, only running on whichever server you started
  from that working tree — check `git status`/`git log` before assuming a fix is "live" everywhere.

## 6. Manual recovery actions (things you can *do*, not just diagnose)

| Situation | Action |
|---|---|
| Customer/employee forgot their password | `POST /auth/credential/create` with `{ "userId": "<keycloakUserId>", "password": "<new password>" }` as an admin — works against any deployment since Keycloak is shared. Find `keycloakUserId` via `registration/list`/`admin-user/get`, or search Keycloak directly (§5). |
| A `rbac_role` needs its permissions reset to the documented defaults | `npm run seed:role-permissions` — safe to re-run, replaces the role's mappings with `role-matrix.default.ts` (only touches roles that already exist locally; never creates anything in Keycloak) |
| `audit_outbox` is missing history for things that happened before it was wired up | `npm run backfill:audit-outbox` — **run once only**, no dedupe key |
| A demo bill needs to go back to `UNPAID` for re-testing | `UPDATE demo_bbps_data SET status='UNPAID' WHERE biller_code='...'` directly in MySQL |
| Need to test an admin-only flow without real Keycloak | Set `AUTH_MOCK_MODE=true` in `.env`, restart — see `mock-testing-guide.md §3`. **Never** in a real environment. |
| Dev server seems stuck / stale build | Confirm which process holds port 3000 (`lsof -i:3000` or `ss -ltnp \| grep 3000`), kill it, `npm run start:dev` fresh — `nest start --watch` should auto-rebuild on file changes, but a webpack-watch hang does happen occasionally |

## 7. Before you conclude "it's a bug"

Checklist, in order — most false alarms this session were one of these:
1. Wrong deployment/database (§5) — not actually the same data you think it is.
2. `AUTH_MOCK_MODE` mismatch between what you set and what the running process actually loaded (it's read at module-decoration time, before `.env` reload — a restart is required, not just editing the file).
3. A field that's *intentionally* never returned (CVV, ATM PIN, MPIN, permission-check internals) — check `mock-testing-guide.md`/`api endpoint guide.md` for "never returned by design" notes before assuming it's missing by accident.
4. `[]`/`null` meaning "no data exists yet," not "the query is broken" — especially for read-models (`admin_user`) that only ever contain what a specific write path (`/employees/create`) has put there.
5. A stale cache in whatever GUI/tool you're inspecting the DB with (schema tree views often don't auto-refresh on external DDL changes) — re-run the query directly instead of trusting a tree view.

If none of those explain it, then it's a real bug — go to §3.2, get the actual stack trace, and
work backward from there.
