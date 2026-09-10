# Admin Module

API & Technical Documentation

Related guides: [api endpoint guide.md](api%20endpoint%20guide.md) (`/auth/*`),
[rbacservice.md](rbacservice.md) (`/employees`, `/roles`, ...),
[billpaymentservice.md](billpaymentservice.md) (`/bill-payment/*`),
[mock-testing-guide.md](mock-testing-guide.md) (local/offline testing).

## 1. Overview

The Admin module provides read-only visibility into bank-portal accounts (`admin_user` — a
mirror, not the source of truth: accounts are actually created by the RBAC module, see
[rbacservice.md §3](rbacservice.md)), a versioned per-CIF authorization-rule catalogue (monetary
approval thresholds), and a reporting endpoint. MySQL is used for persistence.

Module: [src/modules/admin](src/modules/admin) ([admin.module.ts](src/modules/admin/admin.module.ts)).

## 2. API Base URL

```
http://localhost:3000/api/v1/admin
```
Swagger: `http://localhost:3000/api/v1/docs`

Every route requires `Authorization: Bearer <accessToken>` — no public routes in this module.
Get `<accessToken>` from `POST /auth/login` against the **real** Keycloak server
(`AUTH_MOCK_MODE=false` — see [api endpoint guide.md §3](api%20endpoint%20guide.md#3-token-api)).
Real accounts verified live for this guide:

| Role needed | Login with |
|---|---|
| `BANK_SUPER_ADMIN` | `{"username":"test-bank-superadmin","password":"TestFix@123","clientId":"admin-web"}` |
| `BANK_ADMIN` (view-only) | `{"username":"docs-bank-admin","password":"DocsAdmin@123","clientId":"admin-web"}` |

(`docs-bank-admin` was created for this guide via the Keycloak Admin API, holding only the
`BANK_ADMIN` realm role — see [rbacservice.md §5](rbacservice.md#5-employees-api) for how a real
`BANK_ADMIN`-level employee would normally be provisioned instead.)

Every success response is wrapped `{ "success": true, "data": {...}, "timestamp": "..." }` — the
JSON blocks below show `data`. Errors are unwrapped: `{ "statusCode", "path", "timestamp", "message" }`.

## 3. Admin Users API

Read-only. `POST /admin/admin-user/*` never creates an account — see §7 for how one actually
gets created and synced into this table.

**`POST`** `/admin/admin-user/list`

### Request fields
| Field | Type | Required | Description |
|---|---|---|---|
| role | String | No | One of `BANK_SUPER_ADMIN`, `BANK_ADMIN`, `BANK_MAKER`, `BANK_CHECKER` |
| search | String | No | Matched against `username` OR `email` with `LIKE %search%` |

### Request
```json
{ "role": "BANK_ADMIN" }
```

### Success Response
```json
[
  {
    "id": "3f979075-4e70-4b7c-b675-2b6736e92d83",
    "employeeId": "6abf0f64-46d9-42c0-a5d2-fe8a4f6a7541",
    "keycloakUserId": "511ca19c-3572-4a21-82c0-63515919d024",
    "username": "admin.user.1789017749619",
    "email": "admin.user.1789017749619@test.example.com",
    "firstName": "Admin",
    "lastName": "User",
    "roleId": "2ee38c08-531b-46c9-a488-7f356b148783",
    "roleName": "BANK_ADMIN",
    "isActive": true,
    "lastSyncedAt": "2026-09-10T05:22:30.000Z",
    "createdAt": "2026-09-09T23:52:29.622Z",
    "updatedAt": "2026-09-09T23:52:29.622Z"
  }
]
```

**Auth:** `BANK_SUPER_ADMIN` or `BANK_ADMIN` — anything else → `403`.

**What to use, and where:** `keycloakUserId` is the same value used as `userId` elsewhere in this
API (`/auth/credential/*`, `/auth/device/*`, `/auth/corporate-hierarchy/*`) — it IS that person's
Keycloak `sub`. `isActive: false` means the account was disabled — don't show it as usable.

**`POST`** `/admin/admin-user/get`

### Request fields
| Field | Type | Required | Description |
|---|---|---|---|
| id | String (UUID) | Yes | `admin_user.id` (local id — not `keycloakUserId`) |

### Request
```json
{ "id": "3f979075-4e70-4b7c-b675-2b6736e92d83" }
```

### Success Response
One `admin_user` row, same shape as a `list` array element.

**Errors:** `404` if `id` doesn't exist.

## 4. Authorization Rules API

A per-CIF monetary threshold — payments over `threshold` for that `cif` require a second
approval elsewhere in the platform. Every write is versioned: `create`/`update`/`deactivate` each
append a row to `authorization_rule_history` (§8), so nothing is silently overwritten.

**`POST`** `/admin/authorization-rules/create`

### Request fields
| Field | Type | Required | Description |
|---|---|---|---|
| ruleName | String (≤150) | Yes | e.g. `"High-value transfer approval"` |
| cif | String (≤20) | Yes | Corporate CIF this threshold applies to |
| threshold | String | Yes | Positive number, up to 2 decimals — regex `^\d+(\.\d{1,2})?$` |

### Request
```json
{
  "ruleName": "Real login test rule",
  "cif": "CIF12345",
  "threshold": "500000.00"
}
```

### Success Response
```json
{
  "ruleName": "Real login test rule",
  "cif": "CIF12345",
  "threshold": "500000.00",
  "version": 1,
  "createdByKeycloakUserId": "584d3715-75be-4af0-a211-774d0b6b1e89",
  "updatedByKeycloakUserId": null,
  "id": "bd71b111-1cf3-47e0-9e98-ae9afe7dc263",
  "createdAt": "2026-09-10T00:45:25.136Z",
  "updatedAt": "2026-09-10T00:45:25.136Z",
  "deletedAt": null
}
```
(`createdByKeycloakUserId` is `test-bank-superadmin`'s own `sub` — the caller's identity from the
Bearer token, not something you send.)

**Auth:** `BANK_SUPER_ADMIN` only — a `BANK_ADMIN` token gets `403` here (verified: see §9).

**What to use, and where:** `id` → every later `get`/`history`/`update`/`deactivate` call on this
rule.

**`POST`** `/admin/authorization-rules/update`

### Request fields
| Field | Type | Required | Description |
|---|---|---|---|
| id | String (UUID) | Yes | Rule to update |
| ruleName | String (≤150) | No | Leave out to keep unchanged |
| threshold | String | No | Same format as `create` |
| changeReason | String (≤255) | No | Stored only in the history snapshot for this version, not on the rule itself |

### Request
```json
{ "id": "bd71b111-1cf3-47e0-9e98-ae9afe7dc263", "threshold": "750000.00", "changeReason": "Policy update" }
```

### Success Response
```json
{
  "id": "bd71b111-1cf3-47e0-9e98-ae9afe7dc263",
  "createdAt": "2026-09-10T00:45:25.136Z",
  "updatedAt": "2026-09-10T00:48:08.000Z",
  "deletedAt": null,
  "ruleName": "Real login test rule",
  "cif": "CIF12345",
  "threshold": "750000.00",
  "version": 2,
  "createdByKeycloakUserId": "584d3715-75be-4af0-a211-774d0b6b1e89",
  "updatedByKeycloakUserId": "584d3715-75be-4af0-a211-774d0b6b1e89"
}
```
`version` increments by exactly 1 on every update — compare against your cached value to confirm
the write landed.

**Auth:** `BANK_SUPER_ADMIN` only.

**`POST`** `/admin/authorization-rules/get` / **`POST`** `/admin/authorization-rules/list`

`get` — `{ "id": "<rule uuid>" }` → one rule row, or `404`.
`list` — no body → array of all rules, newest first.
**Auth (both):** `BANK_SUPER_ADMIN` or `BANK_ADMIN`.

**`POST`** `/admin/authorization-rules/history`

### Request
```json
{ "id": "bd71b111-1cf3-47e0-9e98-ae9afe7dc263" }
```

### Success Response
```json
[
  {
    "id": "1a1e1d53-e754-4108-804f-2399d0d601ce",
    "ruleId": "bd71b111-1cf3-47e0-9e98-ae9afe7dc263",
    "snapshot": { "cif": "CIF12345", "ruleName": "Real login test rule", "threshold": "750000.00", "changeReason": "Policy update" },
    "version": 2,
    "changedByKeycloakUserId": "584d3715-75be-4af0-a211-774d0b6b1e89",
    "createdAt": "2026-09-10T00:48:08.320Z"
  },
  {
    "id": "e1e14e72-2bd8-4f1a-ac0e-51d7f48c00b2",
    "ruleId": "bd71b111-1cf3-47e0-9e98-ae9afe7dc263",
    "snapshot": { "cif": "CIF12345", "ruleName": "Real login test rule", "threshold": "500000.00" },
    "version": 1,
    "changedByKeycloakUserId": "584d3715-75be-4af0-a211-774d0b6b1e89",
    "createdAt": "2026-09-10T00:45:25.154Z"
  }
]
```
**Auth:** `BANK_SUPER_ADMIN` or `BANK_ADMIN`.

**What to use, and where:** `snapshot` is the full rule state *at that version* — render it
directly as a timeline entry next to `changedByKeycloakUserId`/`createdAt`; no client-side diffing
needed. The `deactivate` history row (below) additionally has `snapshot.deactivated: true`.

**`POST`** `/admin/authorization-rules/deactivate`

### Request
```json
{ "id": "bd71b111-1cf3-47e0-9e98-ae9afe7dc263" }
```

### Success Response
```json
{ "id": "bd71b111-1cf3-47e0-9e98-ae9afe7dc263", "deactivated": true }
```
Soft-deletes the rule (`deletedAt` set) — it drops out of `list`/`get` (`404` afterwards on
`get`), but the row and its full `history` are retained.

**Auth:** `BANK_SUPER_ADMIN` only.

## 5. Reporting API

**`GET`** `/admin/reporting?fromDate=<date>&toDate=<date>`

### Query fields
| Field | Type | Required | Description |
|---|---|---|---|
| fromDate | String | No | Accepted but not validated as a date, and not applied to anything |
| toDate | String | No | Same |

### Success Response
```json
[]
```
**Auth:** any authenticated user.

> **This is a stub.** [`ReportingService.query()`](src/modules/admin/reporting/reporting.service.ts)
> is `async query(_filters) { return []; }` — wired, authenticated, correctly wrapped/shaped, but
> there is no real reporting logic behind it, and the date filters do nothing. Confirmed live —
> see §9. Don't build against this expecting real rows.

## 6. Database Tables

**`admin_user`** — read-model mirror of bank-portal accounts (see §7 for how rows get here).
| Field | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| employee_id | UUID | FK to `rbac_employee.id` |
| keycloak_user_id | VARCHAR(36), unique | Keycloak `sub` |
| username | VARCHAR(100) | Keycloak login id |
| email | VARCHAR(255) | |
| first_name / last_name | VARCHAR(100) | |
| role_id | UUID | FK to `rbac_role.id` |
| role_name | VARCHAR(100) | One of `BANK_SUPER_ADMIN`/`BANK_ADMIN`/`BANK_MAKER`/`BANK_CHECKER` |
| is_active | BOOLEAN | |
| last_synced_at | TIMESTAMP | Last time the sync listener wrote this row |
| created_at / updated_at | TIMESTAMP | |

**`authorization_rule`** — soft-deletable, versioned.
| Field | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| rule_name | VARCHAR(150) | |
| cif | VARCHAR(20), indexed | |
| threshold | DECIMAL(18,2) | |
| version | INT, default 1 | |
| created_by_keycloak_user_id | VARCHAR(36) | |
| updated_by_keycloak_user_id | VARCHAR(36), nullable | |
| created_at / updated_at / deleted_at | TIMESTAMP | soft-delete via `deleted_at` |

**`authorization_rule_history`** — append-only.
| Field | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| rule_id | UUID, indexed | FK to `authorization_rule.id` |
| snapshot | JSON | Full rule state at this version |
| version | INT | |
| changed_by_keycloak_user_id | VARCHAR(36) | |
| created_at | TIMESTAMP | |

## 7. How `admin_user` Rows Are Created

```
POST /employees/create  (rbacservice.md §3)
        │
        ▼
Real Keycloak user + rbac_employee + rbac_employee_user_role rows saved
        │
        ▼
EMPLOYEE_ACCOUNT_SYNCED_EVENT published (internal event bus, in-process only)
        │
        ▼
AdminUserSyncListener.onModuleInit() picks it up
        │
        ▼
role ∈ {BANK_SUPER_ADMIN, BANK_ADMIN, BANK_MAKER, BANK_CHECKER}?
   │ yes                              │ no (CORPORATE_*/RETAIL_CUSTOMER)
   ▼                                  ▼
admin_user row saved/updated      ignored — no admin_user row
```
Nothing in the Admin module itself writes to `admin_user` — it is purely the read side of this
pipeline.

## 8. Validation & Error Handling

| Code / status | Where | Meaning |
|---|---|---|
| `401` | any route | missing/invalid Bearer token |
| `403` | `admin-user/*` | caller lacks `BANK_SUPER_ADMIN`/`BANK_ADMIN` |
| `403` | `authorization-rules/create\|update\|deactivate` | caller isn't `BANK_SUPER_ADMIN` |
| `404` | `admin-user/get`, `authorization-rules/get\|history\|update\|deactivate` | unknown `id` |

## 9. Testing Scenarios

| Scenario | Expected Result | Verified |
|---|---|---|
| `BANK_SUPER_ADMIN` creates a rule | `201`, `version: 1` | ✅ live |
| `BANK_ADMIN` tries to create a rule | `403 "Forbidden resource"` | ✅ live (`docs-bank-admin`) |
| `BANK_ADMIN` lists/gets/views history | `200`, same data a superadmin would see | ✅ live |
| Update a rule | `version` becomes 2, history gains a row with `changeReason` | ✅ live |
| Deactivate a rule | `{ deactivated: true }`, later `get` → `404` | ✅ live |
| `admin-user/list` with `role` filter | Only matching `roleName` rows returned | ✅ live |
| `GET /admin/reporting` with query params | Always `[]`, params ignored | ✅ live — confirms it's a stub |

## 10. Frontend Integration Note

Treat `GET /admin/reporting` as **not implemented** in any UI you build — don't wire a chart or
table to it yet. For everything else in this module, `id` fields returned from `create`/`list` are
what every subsequent call in the same resource needs; there is no separate "code" identifier to
track alongside them.
