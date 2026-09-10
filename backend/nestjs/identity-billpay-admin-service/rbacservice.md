# RBAC Module

API & Technical Documentation

Related guides: [api endpoint guide.md](api%20endpoint%20guide.md) (`/auth/*`),
[adminservice.md](adminservice.md) (`/admin/*`),
[billpaymentservice.md](billpaymentservice.md) (`/bill-payment/*`),
[mock-testing-guide.md](mock-testing-guide.md) (local/offline testing).

## 1. Overview

The RBAC module provisions and manages **bank-staff accounts** — permissions, roles (each backed
by a real Keycloak realm role), employees (real Keycloak users), and a role-hierarchy that governs
who may assign which role to whom. It is the write side of the `admin_user` read-model documented
in [adminservice.md](adminservice.md). MySQL is used for local persistence; Keycloak's Admin API
is called directly for role/user provisioning.

Module: [src/modules/rbac](src/modules/rbac) ([rbac.module.ts](src/modules/rbac/rbac.module.ts)).

## 2. API Base URL

```
http://localhost:3000/api/v1
```
Swagger: `http://localhost:3000/api/v1/docs`

This module's controllers mount at the API root, not under `/rbac` — `/permissions/*`, `/roles/*`,
`/employees/*`, `/users/*`.

Every route requires `Authorization: Bearer <accessToken>`. Real, working local values:

| Role needed | Login with | Header |
|---|---|---|
| `BANK_SUPER_ADMIN` | `{"username":"mock-superadmin","password":"Mock@123"}` | `Authorization: Bearer mock-mock-superadmin-token` |
| `BANK_ADMIN` (delegated cases only — see §4) | `{"username":"mock-admin","password":"Mock@123"}` | `Authorization: Bearer mock-mock-admin-token` |

Every success response is wrapped `{ "success": true, "data": {...}, "timestamp": "..." }` — the
JSON blocks below show `data`.

**Two privilege checks stack in this module:**
1. **Coarse** — `/roles/*` and `/permissions/create` require `BANK_SUPER_ADMIN`, enforced by
   [`SuperadminGuard`](src/modules/rbac/guards/superadmin.guard.ts) before the handler runs.
2. **Fine (hierarchy)** — `/employees/*` has no such guard; `EmployeesService` checks in code
   whether the caller outranks the role being assigned/managed (§5's hierarchy table), rejecting
   with a `403` whose message names which rule was violated.

## 3. Permissions API

**`POST`** `/permissions/create`

### Request fields
| Field | Type | Required | Description |
|---|---|---|---|
| code | String (≤100) | Yes | Globally unique, e.g. `"BILL_PAYMENT_VIEW"` |
| name | String (≤150) | Yes | e.g. `"View Bill Payments"` |
| description | String | No | |
| module | String (≤80) | Yes | Grouping label, e.g. `"BILL_PAYMENT"` |
| action | String (≤80) | Yes | e.g. `"READ"` |

### Request
```json
{ "code": "BILL_PAYMENT_VIEW", "name": "View Bill Payments", "module": "BILL_PAYMENT", "action": "READ" }
```

### Success Response
```json
{
  "id": "ef7ffd89-12bf-4737-967d-d1a395d97bcb",
  "code": "BILL_PAYMENT_VIEW",
  "name": "View Bill Payments",
  "description": null,
  "module": "BILL_PAYMENT",
  "action": "READ",
  "isActive": true,
  "createdAt": "2026-09-10T00:01:04.733Z",
  "updatedAt": "2026-09-10T00:01:04.733Z"
}
```

**Auth:** `BANK_SUPER_ADMIN` only. **Errors:** `409` if `code` is already taken.

**What to use, and where:** `id` → `permissionIds` in `POST /roles/map-permissions` (§4). Purely a
local catalogue entry — no Keycloak call.

## 4. Roles API

A role is both a **real Keycloak realm role** (created via the Keycloak Admin API) and a local
`rbac_role` row carrying extra metadata (duty type, permission mappings, delegation list).

**`POST`** `/roles/create`

### Request fields
| Field | Type | Required | Description |
|---|---|---|---|
| name | String (≤100) | Yes | Unique; becomes the literal Keycloak realm role name, e.g. `"BANK_CHECKER_DOCTEST"` |
| displayName | String (≤150) | Yes | Human label |
| description | String | No | |
| delegatedAdminKeycloakUserIds | String[] | No | `BANK_ADMIN` Keycloak `sub`s allowed to assign this specific role (see below) |

`delegatedAdminKeycloakUserIds` — normally only `BANK_SUPER_ADMIN` can assign a role to an
employee. Listing a `BANK_ADMIN`'s Keycloak `sub` here lets *that admin* assign *this role*
without becoming superadmin. Get the `sub` from `POST /auth/me` or `admin_user.keycloakUserId`
([adminservice.md](adminservice.md)).

### Request
```json
{ "name": "BANK_CHECKER_DOCTEST", "displayName": "Bank Checker (doctest)" }
```

### Success Response
```json
{
  "id": "c0e1e98c-2e7d-4abd-835d-f26ce7ab1184",
  "name": "BANK_CHECKER_DOCTEST",
  "displayName": "Bank Checker (doctest)",
  "description": null,
  "keycloakRoleId": "2b5f093a-574c-4546-8e5b-3aac5d364fdb",
  "keycloakRoleName": "BANK_CHECKER_DOCTEST",
  "dutyType": "CHECKER",
  "isActive": true,
  "permissions": [],
  "delegatedAdminKeycloakUserIds": [],
  "createdAt": "2026-09-10T00:01:05.132Z",
  "updatedAt": "2026-09-10T00:01:05.132Z"
}
```
`dutyType` is auto-derived from `name`: contains `"MAKER"` → `MAKER`; contains `"CHECKER"` →
`CHECKER` (both case-insensitive); else `OTHER`.

**Auth:** `BANK_SUPER_ADMIN` only. **Errors:** `409` if `name` is already taken.

**What to use, and where:** `id` (the **local** role id) → `roleId` in `map-permissions` and in
`POST /employees/create`/`update-role`. `keycloakRoleId`/`keycloakRoleName` are only needed if
calling the Keycloak Admin API directly yourself.

**`POST`** `/roles/update`

### Request fields
| Field | Type | Required | Description |
|---|---|---|---|
| roleId | String (UUID) | Yes | |
| displayName | String (≤150) | No | |
| description | String | No | Also pushed to Keycloak |
| isActive | Boolean | No | |
| delegatedAdminKeycloakUserIds | String[] | No | **Replaces** the entire list — send every id you want kept |

### Success Response
Same shape as `create`'s response, reflecting the changes. Does **not** touch any employee's
current assignment — use `POST /employees/update-role` (§5) for that.

**Auth:** `BANK_SUPER_ADMIN` only.

**`POST`** `/roles/map-permissions`

### Request fields
| Field | Type | Required | Description |
|---|---|---|---|
| roleId | String (UUID) | Yes | |
| permissionIds | String[] (UUID) | Yes | **Replaces** the role's entire permission set (not additive) |

### Request
```json
{ "roleId": "c0e1e98c-2e7d-4abd-835d-f26ce7ab1184", "permissionIds": ["ef7ffd89-12bf-4737-967d-d1a395d97bcb"] }
```

### Success Response
```json
{
  "id": "c0e1e98c-2e7d-4abd-835d-f26ce7ab1184",
  "name": "BANK_CHECKER_DOCTEST",
  "displayName": "Bank Checker (doctest)",
  "description": null,
  "keycloakRoleId": "2b5f093a-574c-4546-8e5b-3aac5d364fdb",
  "keycloakRoleName": "BANK_CHECKER_DOCTEST",
  "dutyType": "CHECKER",
  "isActive": true,
  "permissions": [
    { "id": "ef7ffd89-12bf-4737-967d-d1a395d97bcb", "code": "BILL_PAYMENT_VIEW", "name": "View Bill Payments", "module": "BILL_PAYMENT", "action": "READ" }
  ],
  "delegatedAdminKeycloakUserIds": [],
  "createdAt": "2026-09-10T00:01:05.132Z",
  "updatedAt": "2026-09-10T00:01:05.132Z"
}
```

**Auth:** `BANK_SUPER_ADMIN` only. **Errors:** `400` if any `permissionIds` entry doesn't exist or
is inactive.

**What to use, and where:** `data.permissions` is what a caller checks client-side to decide which
UI actions to show — this module does not itself enforce permissions on protected actions
elsewhere; that's each guarded endpoint's own job.

## 5. Employees API

Where a **bank-staff Keycloak account actually gets created** — the internal-staff sibling of the
customer-onboarding saga in [api endpoint guide.md](api%20endpoint%20guide.md), done in one call.

**Role hierarchy** ([rbac.constants.ts](src/modules/rbac/constants/rbac.constants.ts)) — governs
who `create`/`update-role` can act on, and which role they can assign:

| Role | Level |
|---|---|
| `BANK_SUPER_ADMIN` | 100 |
| `BANK_ADMIN` | 80 |
| `BANK_MAKER` / `BANK_CHECKER` | 50 |
| `CORPORATE_IT_ADMIN` | 40 |
| `CORPORATE_MAKER` / `CORPORATE_CHECKER` | 30 |
| `CORPORATE_VIEWER` | 20 |
| `RETAIL_CUSTOMER` / unrecognized | 10 |

`BANK_SUPER_ADMIN` can do anything. Anyone else needs a **strictly higher** level than the role
being assigned, and — for `update-role` — than the employee's *current* role too. This stacks on
top of the `delegatedAdminKeycloakUserIds` check from §4 (a `BANK_ADMIN` must also be a listed
delegate for that specific role).

**`POST`** `/employees/create`

### Request fields
| Field | Type | Required | Description |
|---|---|---|---|
| username | String (≤100) | Yes | Unique; Keycloak login id |
| email | String (email, ≤255) | Yes | |
| firstName / lastName | String (≤100) | Yes | |
| password | String (≥8) | Yes | Written straight to Keycloak |
| roleId | String (UUID) | Yes | Local role id from §4 |
| employeeCode | String (≤50) | No | |

### Request
```json
{
  "username": "demo.checker.doctest",
  "email": "demo.checker.doctest@bank.example.com",
  "firstName": "Demo",
  "lastName": "Checker",
  "password": "DemoPass@123",
  "roleId": "c0e1e98c-2e7d-4abd-835d-f26ce7ab1184"
}
```

### Success Response
```json
{
  "employee": {
    "id": "a49da071-302d-4082-96fe-c0767d7b6d28",
    "keycloakUserId": "764f7d16-602f-4409-bdb6-331471841994",
    "username": "demo.checker.doctest",
    "email": "demo.checker.doctest@bank.example.com",
    "firstName": "Demo",
    "lastName": "Checker",
    "employeeCode": null,
    "isActive": true,
    "createdAt": "2026-09-10T00:01:12.515Z"
  },
  "roleAssignment": {
    "id": "0c16657e-f335-4fd1-a62c-97115c7b5760",
    "roleId": "c0e1e98c-2e7d-4abd-835d-f26ce7ab1184",
    "assignedAt": "2026-09-10T00:01:12.529Z"
  },
  "role": { "id": "c0e1e98c-2e7d-4abd-835d-f26ce7ab1184", "name": "BANK_CHECKER_DOCTEST", "...": "full role object, same shape as §4" },
  "keycloakRealmRoles": [
    { "id": "2b5f093a-574c-4546-8e5b-3aac5d364fdb", "name": "BANK_CHECKER_DOCTEST", "composite": false, "clientRole": false, "containerId": "3ba5540c-337b-46c4-ab6e-7987dc5f2d87" },
    { "id": "1c87b378-23b8-4623-a044-359d5834c8dc", "name": "default-roles-bharat-banking", "composite": true, "clientRole": false, "containerId": "3ba5540c-337b-46c4-ab6e-7987dc5f2d87" }
  ]
}
```

**Auth:** `BANK_SUPER_ADMIN`, or a delegated `BANK_ADMIN` (§4) who outranks `roleId`.

**What to use, and where:** `employee.keycloakUserId` → `userId` anywhere else in this API that
takes a Keycloak user id; it's also what shows up as `admin_user.keycloakUserId`
([adminservice.md](adminservice.md)) after the sync listener runs (§6). `employee.id` →
`employeeId` on `update-role`. The new employee logs in with `POST /auth/login`
(`username`/`password`, `clientId: "admin-web"`).

**Errors:** `409` username taken · `404` role not found · `403` hierarchy/delegation violation ·
`400` maker+checker conflict (§5 note below).

**`POST`** `/employees/update-role`

### Request fields
| Field | Type | Required | Description |
|---|---|---|---|
| employeeId | String (UUID) | Yes | Local employee id |
| roleId | String (UUID) | Yes | New local role id |

### Success Response
Same shape as `create`'s response, plus `roleAssignment.updatedByKeycloakUserId`.

**Auth:** Same hierarchy rule as `create`, checked against **both** the employee's current role
and the new one. **Errors:** `404` employee not found · `409` already has that role · `403`
insufficient hierarchy on either side.

**Maker/checker segregation** (both endpoints): rejects (`400`) assigning a `MAKER`-duty role to
anyone who'd also end up holding a `CHECKER`-duty role, and vice versa — this only inspects the
role being assigned in the current request, not the employee's other existing roles.

## 6. Users (Access Lookup) API

**`POST`** `/users/fetch-access-details`

### Request fields
| Field | Type | Required | Description |
|---|---|---|---|
| employeeId | String (UUID) | No | Checked first |
| roleId | String (UUID) | No | Checked 2nd — every employee holding that role |
| keycloakUserId | String | No | Checked 3rd |
| username | String | No | Checked 4th, exact match |
| email | String | No | Checked 5th, exact match |

Only the **first** field present is used; the rest are ignored. All omitted → 100 most-recently-
created employees.

### Request
```json
{ "keycloakUserId": "764f7d16-602f-4409-bdb6-331471841994" }
```

### Success Response
```json
{
  "count": 1,
  "users": [
    {
      "employee": { "id": "a49da071-...", "keycloakUserId": "764f7d16-...", "username": "demo.checker.doctest", "email": "...", "firstName": "Demo", "lastName": "Checker", "employeeCode": null, "isActive": true },
      "keycloakProfile": { "id": "764f7d16-...", "username": "demo.checker.doctest", "email": "...", "firstName": "Demo", "lastName": "Checker", "enabled": true },
      "keycloakRealmRoles": [ { "name": "BANK_CHECKER_DOCTEST", "...": "..." } ],
      "roles": [ { "id": "c0e1e98c-...", "name": "BANK_CHECKER_DOCTEST", "displayName": "Bank Checker (doctest)", "keycloakRoleId": "...", "keycloakRoleName": "BANK_CHECKER_DOCTEST", "dutyType": "CHECKER" } ],
      "permissions": [ { "id": "ef7ffd89-...", "code": "BILL_PAYMENT_VIEW", "name": "View Bill Payments", "module": "BILL_PAYMENT", "action": "READ", "roleId": "c0e1e98c-..." } ]
    }
  ]
}
```

**Auth:** any authenticated user.

**Fallback path:** if the filter matched no local `rbac_employee` row but you searched by
`username`/`email`/`keycloakUserId`, this queries Keycloak directly instead and returns
`keycloakProfile`-only entries with `employee: null` — for looking up someone who exists in
Keycloak but was never provisioned via `POST /employees/create`.

**What to use, and where:** `roles[].id` → usable as `roleId` elsewhere in this module.
`permissions[]` → same client-side authorization-display use as `map-permissions`'s output.
`keycloakRealmRoles` is the ground truth for what that user's *next* login JWT contains
(`realm_access.roles`) — `roles`/`permissions` are the local mirror and can theoretically drift.

## 7. How `admin_user` Gets Synced

```
POST /employees/create or /employees/update-role
        │
        ▼
EMPLOYEE_ACCOUNT_SYNCED_EVENT published (internal event bus, in-process only)
        │
        ▼
AdminUserSyncListener (admin module) — see adminservice.md §7
```

## 8. Validation & Error Handling

| Code / status | Where | Meaning |
|---|---|---|
| `401` | any route | missing/invalid Bearer token |
| `403` | `roles/*`, `permissions/create` | caller isn't `BANK_SUPER_ADMIN` (`SuperadminGuard`) |
| `403` | `employees/*` | hierarchy or delegation violation |
| `404` | `roles/update\|map-permissions`, `employees/update-role` | unknown `roleId`/`employeeId` |
| `409` | `permissions/create`, `roles/create`, `employees/create`, `employees/update-role` | duplicate `code`/`name`/`username`, or role already assigned |
| `400` | `roles/map-permissions`, `employees/create\|update-role` | invalid permission id, or maker+checker conflict |

## 9. Testing Scenarios

| Scenario | Expected Result | Verified |
|---|---|---|
| `BANK_SUPER_ADMIN` creates a permission | `201`, `id` returned | ✅ live |
| `BANK_SUPER_ADMIN` creates a role | `201`, real Keycloak realm role created (`keycloakRoleId` populated) | ✅ live |
| Map permissions to a role | Role's `permissions[]` reflects the mapping | ✅ live |
| Create an employee | Real Keycloak user created, `admin_user` synced (if role qualifies) | ✅ live, end to end incl. login |
| Employee logs in with issued credentials | `POST /auth/login` succeeds | ✅ live (real Keycloak, `AUTH_MOCK_MODE=false`) |
| `BANK_ADMIN` (not delegated) creates an employee with a `BANK_ADMIN`-level role | `403` | design-verified (hierarchy check: 80 is not > 80) |
| Assign both a `MAKER` and `CHECKER` role to the same request | `400` | design-verified (`assertMakerCheckerCompatibility`) |
| `fetch-access-details` by `keycloakUserId` | Employee + Keycloak profile + roles + permissions | ✅ live |
| `fetch-access-details` for a Keycloak-only user | `employee: null`, `keycloakProfile` populated via fallback | design-verified |

## 10. Frontend Integration Note

Always use the **local** `id` (role/employee/permission) as the identifier you pass back into this
module's own endpoints — `keycloakRoleId`/`keycloakUserId` are for cross-referencing against
Keycloak or other modules (`/auth/*`), never as a substitute for the local `id` in RBAC calls
themselves.
