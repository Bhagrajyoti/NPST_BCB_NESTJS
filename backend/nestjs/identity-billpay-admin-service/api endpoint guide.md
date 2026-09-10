# Auth Module

API & Technical Documentation

Related guides: [adminservice.md](adminservice.md) (`/admin/*`), [rbacservice.md](rbacservice.md)
(`/employees`, `/roles`, ...), [billpaymentservice.md](billpaymentservice.md) (`/bill-payment/*`),
[mock-testing-guide.md](mock-testing-guide.md) (local/offline testing without a real Keycloak
server).

## 1. Overview

The Auth module provides token issuance (`POST /auth/login`/`/auth/logout`/`/auth/me`), a
five-step resumable customer-onboarding saga (registration → OTP → credentials/Keycloak user →
device → complete), standalone OTP generation/verification, customer MPIN credential management,
device registration, and corporate-hierarchy role linking. Keycloak is the system of record for
login identity; MySQL persists everything else (OTP challenges, MPIN hashes, device profiles,
registration-attempt state).

Module: [src/modules/auth](src/modules/auth) ([auth.module.ts](src/modules/auth/auth.module.ts)).

## 2. API Base URL

```
http://localhost:3000/api/v1
```
Swagger: `http://localhost:3000/api/v1/docs`

Every endpoint in this module is **POST**. Protected routes need:
```
Authorization: Bearer <accessToken>
```
`<accessToken>` is the literal value from `POST /auth/login` (§3) — never invent one. This
service authenticates against the **real** Keycloak server (`AUTH_MOCK_MODE=false`) — you need a
real account's username/password. A fixed set of fake credentials also exists for local/offline
testing when Keycloak isn't reachable — see [mock-testing-guide.md](mock-testing-guide.md) (off
by default; does not apply to the examples in this guide).

Every success response is wrapped:
```json
{ "success": true, "data": { /* shown below */ }, "timestamp": "2026-09-10T..." }
```
Error responses are **not** wrapped:
```json
{ "statusCode": 401, "path": "/api/v1/auth/login", "timestamp": "...", "message": "Invalid user credentials" }
```
A global `ValidationPipe({ whitelist: true, transform: true })` strips unknown body fields and
returns `400` for a missing/invalid required field.

Two Keycloak clients exist — pass the right one as `clientId` on login/logout:
`mobile-app` (retail/corporate customer) or `admin-web` (bank staff, default if omitted).

## 3. Token API

**`POST`** `/auth/login` — Public.

### Request fields
| Field | Type | Required | Description |
|---|---|---|---|
| username | String | Yes | Keycloak login id (not email) |
| password | String | Yes | |
| clientId | String | No | `"admin-web"` (default) or `"mobile-app"` |

### Request
```json
{ "username": "test-bank-superadmin", "password": "TestFix@123", "clientId": "admin-web" }
```

### Success Response
```json
{
  "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJ3SHJhV3R2Tkd3dk5f...",
  "expiresIn": 900,
  "refreshExpiresIn": 1800,
  "refreshToken": "eyJhbGciOiJIUzUxMiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICIxZTQ5OTdiNC03YmYy...",
  "tokenType": "Bearer",
  "scope": "email profile"
}
```
`expiresIn: 900` — the token is valid for **15 minutes** (`access.token.lifespan` set on the
`admin-web`/`mobile-app` Keycloak clients — the realm default is still 5 minutes for any other
client); re-login (or use `refreshToken` against Keycloak directly — this service doesn't expose
a `/auth/refresh` endpoint) once it expires. `refreshToken` itself is valid for
`refreshExpiresIn: 1800` (30 minutes).

**What to use, and where:** `accessToken` → `Authorization: Bearer <accessToken>` on every
protected call below. `refreshToken` → body of `POST /auth/logout`.

**Errors:** `401` bad credentials or Keycloak unreachable.

**`POST`** `/auth/logout` — Bearer required.

### Request fields
| Field | Type | Required | Description |
|---|---|---|---|
| refreshToken | String | Yes | From `login`'s response |
| clientId | String | No | Must match the one used at login |

### Success Response
```json
{ "loggedOut": true }
```
**Errors:** `401` invalid/expired refresh token.

**`POST`** `/auth/me` — Bearer required, no body.

### Success Response
```json
{ "user": { "sub": "584d3715-75be-4af0-a211-774d0b6b1e89", "preferred_username": "test-bank-superadmin", "realm_access": { "roles": ["default-roles-bharat-banking", "offline_access", "BANK_SUPER_ADMIN", "uma_authorization"] } } }
```
**What to use, and where:** `user.sub` → `userId`/`keycloakUserId` input elsewhere
(`/auth/credential/*`, `/auth/device/*`, `/auth/corporate-hierarchy/*`). `user.realm_access.roles`
→ which UI/actions to show.

## 4. Registration API (Customer Onboarding Saga)

A real, resumable saga — every step persists `RegistrationAttempt.currentStep`. If the app
crashes mid-onboarding, `resume` tells the client exactly which call is next; if a step's external
side effect fails partway, the attempt is compensated and left retryable at the same step.

```
create → verify-otp → create-credentials → register-device → complete
(INIT)   (OTP_VERIFIED)  (KEYCLOAK_USER_CREATED)  (DEVICE_REGISTERED)  (COMPLETED)
```

**`POST`** `/auth/registration/create` — Public.

### Request fields
| Field | Type | Required | Description |
|---|---|---|---|
| mobileNumber | String | Yes | 10-digit Indian mobile number |
| panOrCif | String | Yes | PAN or CIF (not format-validated — both are legal) |

### Success Response
```json
{ "id": "86988822-9349-4101-b836-d4e3c0343fca", "mobileNumber": "9876543210", "panOrCif": "CIF99999", "currentStep": "INIT", "keycloakUserId": null, "deviceProfileId": null, "failureReason": null, "createdAt": "...", "updatedAt": "...", "deletedAt": null }
```
**What to use, and where:** `id` → `attemptId` for every call below.

**`POST`** `/auth/registration/resume` — Public.

### Request
```json
{ "id": "86988822-9349-4101-b836-d4e3c0343fca" }
```

### Success Response
```json
{ "attemptId": "86988822-9349-4101-b836-d4e3c0343fca", "currentStep": "INIT", "nextAction": "POST /auth/otp/create then /auth/registration/verify-otp" }
```
Call this any time — `nextAction` names the exact next endpoint per current `currentStep`.

**`POST`** `/auth/registration/verify-otp` — Public. (Get `challengeId`/`otp` from `POST /auth/otp/create`, §5, first.)

### Request fields
| Field | Type | Required | Description |
|---|---|---|---|
| attemptId | String (UUID) | Yes | |
| challengeId | String (UUID) | Yes | From `/auth/otp/create` |
| otp | String (6 digits) | Yes | |

### Success Response
Attempt row with `currentStep: "OTP_VERIFIED"`.
**Errors:** `404` unknown challenge · `400` wrong/expired OTP, or attempt not at `INIT` · `403`
challenge locked after too many wrong attempts.

**`POST`** `/auth/registration/create-credentials` — Public.

### Request fields
| Field | Type | Required | Description |
|---|---|---|---|
| attemptId | String (UUID) | Yes | |
| password | String (8–128 chars) | Yes | Becomes the customer's real Keycloak login password |

### Success Response
```json
{ "id": "86988822-...", "currentStep": "KEYCLOAK_USER_CREATED", "keycloakUserId": "984de13d-b61a-4ec1-9c0f-7b5b94ddd191", "mobileNumber": "9876543210", "...": "..." }
```
Creates the customer's **real Keycloak account** (username = `mobileNumber`, role
`RETAIL_CUSTOMER`) right here. Verified live end to end, including logging in afterwards with
`username: mobileNumber`, the `password` sent here, and `clientId: "mobile-app"` against the real
Keycloak server.

**Errors:** `400` — attempt not at `OTP_VERIFIED` (or `CREDENTIALS_SET`, meaning "retry a
previously failed attempt" — call this again with the same `attemptId`; a Keycloak failure here
rolls the attempt back to `CREDENTIALS_SET`, not further, so retrying is exactly this same call).

**`POST`** `/auth/registration/register-device` — Public.

### Request fields
| Field | Type | Required | Description |
|---|---|---|---|
| attemptId | String (UUID) | Yes | |
| deviceId | String | Yes | IMEI/UUID |
| deviceModel | String | No | |

### Success Response
Attempt row with `currentStep: "DEVICE_REGISTERED"`. **Errors:** `400` — attempt not at
`KEYCLOAK_USER_CREATED`.

**`POST`** `/auth/registration/complete` — Public.

### Request
```json
{ "id": "86988822-9349-4101-b836-d4e3c0343fca" }
```

### Success Response
```json
{ "attemptId": "86988822-9349-4101-b836-d4e3c0343fca", "keycloakUserId": "984de13d-b61a-4ec1-9c0f-7b5b94ddd191", "status": "COMPLETED" }
```
**Errors:** `400` — attempt not at `DEVICE_REGISTERED`.

**`POST`** `/auth/registration/list` / **`get`** / **`delete`** — Bearer (admin review). `get`/`delete`
take `{ "id": "<attemptId>" }`; `delete` soft-deletes (`{ id, deleted: true }`).

## 5. OTP API

**`POST`** `/auth/otp/create` — Public **and requires an `Idempotency-Key` header** (any unique
client-generated string — prevents a client retry from sending a second SMS for the same request).

### Request fields
| Field | Type | Required | Description |
|---|---|---|---|
| mobileNumber | String | Yes | 10-digit Indian mobile number |

### Success Response
```json
{ "id": "bdf158ef-16b2-4b53-afd1-e473adb4c577", "mobileNumber": "9876543210", "otpHash": "fdee68...", "attemptCount": 0, "lockedUntil": null, "expiresAt": "2026-09-10T04:59:43.715Z", "otp": "916778", "createdAt": "...", "updatedAt": "...", "deletedAt": null }
```
`otp` is the plaintext 6-digit code (dev-only — in production this would be sent via SMS and
never returned here).

**What to use, and where:** `id` (as `challengeId`) + `otp` → `POST /auth/otp/verify` or
`POST /auth/registration/verify-otp`.

**Errors:** `400` missing `Idempotency-Key` header or invalid `mobileNumber` · `409`
`Idempotency-Key` reused with a different `mobileNumber`.

**`POST`** `/auth/otp/verify` — Public (this is how identity is proven *before* any token exists).

### Request fields
| Field | Type | Required | Description |
|---|---|---|---|
| challengeId | String (UUID) | Yes | |
| otp | String (6 digits) | Yes | |

### Success Response
```json
{ "verified": true, "mobileNumber": "9876543210" }
```
One-time use — a correct code invalidates the challenge; replaying `challengeId` afterwards
returns `404`/`400`.

**Errors:** `404` unknown challenge · `400` invalid/expired OTP · `403` too many wrong attempts
(`OTP_MAX_ATTEMPTS` in `.env`, default 5 — challenge then locked for `OTP_LOCK_MINUTES`, default
15).

**`POST`** `/auth/otp/list` / **`get`** / **`delete`** — Bearer (admin/support). Same
`{ id }` → row/array/`{ id, deleted: true }` pattern.

## 6. Credential API (Customer MPIN)

All routes require Bearer. `create`/`get`/`verify`/`delete` also run an ownership check: if the
body's `userId` differs from the caller's own token `sub`, the caller must hold
`BANK_ADMIN`/`BANK_SUPER_ADMIN`, else `403`. Omitting `userId` always means "myself."

**`POST`** `/auth/credential/create`

### Request fields
| Field | Type | Required | Description |
|---|---|---|---|
| userId | String (UUID) | Yes | Customer's Keycloak `sub` |
| password | String (8–128) | One of password/mpin | Written to **Keycloak only** |
| mpin | String (4–6) | One of password/mpin | Hashed (scrypt) and stored **locally only**, never in Keycloak |

### Success Response
```json
{ "keycloakUserId": "984de13d-...", "passwordUpdated": true, "mpin": { "id": "...", "keycloakUserId": "...", "hasMpin": true, "lastRotatedAt": "...", "createdAt": "...", "updatedAt": "..." } }
```
(`mpin` is `null` if only `password` was set.)

**`POST`** `/auth/credential/verify`

### Request fields
| Field | Type | Required | Description |
|---|---|---|---|
| userId | String (UUID) | No | Defaults to caller's own `sub` |
| mpin | String (4–6) | Yes | |

### Success Response
```json
{ "verified": true }
```

**`POST`** `/auth/credential/get` — `{ userId? }` → MPIN metadata (`404` if none exists).
**`POST`** `/auth/credential/delete` — `{ userId? }` → `{ keycloakUserId, deleted: true }` (local
MPIN row only; does not touch the Keycloak password).
**`POST`** `/auth/credential/list` — Bearer, admin/support — array of all customers' MPIN metadata
(no secrets returned).

## 7. Device API

All routes require Bearer.

**`POST`** `/auth/device/create`

### Request fields
| Field | Type | Required | Description |
|---|---|---|---|
| userId | String | Yes | Keycloak `sub` of the owning user |
| deviceId | String | Yes | IMEI/UUID |
| deviceModel | String | No | e.g. `"Samsung Galaxy S24"` |

### Success Response
```json
{ "id": "c7c7b651-9afa-45e9-aa36-2b1049f3fb90", "userId": "...", "deviceId": "device-abc-999", "deviceModel": "Pixel 9", "trusted": false, "createdAt": "...", "updatedAt": "..." }
```
New devices always start `trusted: false`.

**`POST`** `/auth/device/list` / **`get`** / **`delete`** — same `{ id }` pattern as other modules.

## 8. Corporate Hierarchy API

All routes require Bearer. Links a corporate customer's Keycloak user to a maker/checker role for
a specific CIF.

**`POST`** `/auth/corporate-hierarchy/create`

### Request fields
| Field | Type | Required | Description |
|---|---|---|---|
| userId | String | Yes | Keycloak user id |
| cif | String | Yes | Corporate CIF |
| role | String | Yes | One of `CORPORATE_IT_ADMIN`, `CORPORATE_MAKER`, `CORPORATE_CHECKER`, `CORPORATE_VIEWER`, `BANK_SUPER_ADMIN`, `BANK_ADMIN`, `BANK_MAKER`, `BANK_CHECKER`, `RETAIL_CUSTOMER` |

### Success Response
```json
{ "id": "...", "userId": "...", "cif": "CIF12345", "role": "CORPORATE_MAKER", "approvalLimit": null, "createdAt": "...", "updatedAt": "..." }
```
`role` appears in the user's `realm_access.roles` on their **next** login. `approvalLimit` is
reserved for future use — no endpoint currently sets it.

**`POST`** `/auth/corporate-hierarchy/list` / **`get`** / **`delete`** — same `{ id }` pattern.

## 9. Database Tables

**`registration_attempt`**
| Field | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| mobile_number | VARCHAR | |
| pan_or_cif | VARCHAR | |
| current_step | VARCHAR, default `INIT` | Saga state machine position |
| failure_reason | VARCHAR(500), nullable | Set by `RegistrationOrchestratorService.fail()` |
| keycloak_user_id | VARCHAR(36), nullable | Set once `create-credentials` succeeds |
| device_profile_id | VARCHAR(36), nullable | Set once `register-device` succeeds |
| created_at / updated_at / deleted_at | TIMESTAMP | |

**`otp_challenge`**
| Field | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| mobile_number | VARCHAR | |
| otp_hash | VARCHAR | SHA-256 of the code, never the plaintext |
| attempt_count | INT, default 0 | |
| locked_until | TIMESTAMP, nullable | Set once `attempt_count` ≥ `OTP_MAX_ATTEMPTS` |
| expires_at | TIMESTAMP | |
| created_at / updated_at / deleted_at | TIMESTAMP | |

**`credential`**
| Field | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| user_id | VARCHAR | Keycloak `sub` (column name; entity property `keycloakUserId`) |
| password_hash | VARCHAR | scrypt hash of the **MPIN** (column name; entity property `hashedMpin` — login passwords are never stored here, only in Keycloak) |
| last_rotated_at | TIMESTAMP, nullable | |
| created_at / updated_at / deleted_at | TIMESTAMP | |

**`device_profile`**
| Field | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| user_id | VARCHAR | |
| device_id | VARCHAR | |
| device_model | VARCHAR, nullable | |
| trusted | BOOLEAN, default false | |
| created_at / updated_at / deleted_at | TIMESTAMP | |

**`corporate_hierarchy`**
| Field | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| user_id | VARCHAR | |
| cif | VARCHAR | |
| role | VARCHAR | |
| approval_limit | DECIMAL(18,2), nullable | Reserved, unused |
| created_at / updated_at / deleted_at | TIMESTAMP | |

**`idempotency_record`** — backs the `Idempotency-Key` header on `POST /auth/otp/create`.
| Field | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| idempotency_key | VARCHAR, indexed | |
| route | VARCHAR | e.g. `"POST /api/v1/auth/otp/create"` |
| request_hash | VARCHAR | SHA-256 of the request body |
| created_at | TIMESTAMP | |
| — | unique on (`idempotency_key`, `route`) | |

## 10. Registration Saga Flow

```
POST /auth/registration/create           (INIT)
        │
        ▼
POST /auth/otp/create  →  POST /auth/registration/verify-otp   (OTP_VERIFIED)
        │
        ▼
POST /auth/registration/create-credentials
        │   creates real Keycloak user + role RETAIL_CUSTOMER   (KEYCLOAK_USER_CREATED)
        │   failure → rolled back to CREDENTIALS_SET, retryable with the same call
        ▼
POST /auth/registration/register-device   (DEVICE_REGISTERED)
        │
        ▼
POST /auth/registration/complete          (COMPLETED)
        │
        ▼
POST /auth/login  (clientId: "mobile-app", username: mobileNumber, password from create-credentials)
```

## 11. Validation & Error Handling

| Code / status | Where | Meaning |
|---|---|---|
| `401` | any protected route | missing/invalid Bearer token, or bad login credentials |
| `403` | credential `*` | IDOR — `userId` differs from caller and caller isn't `BANK_ADMIN`/`BANK_SUPER_ADMIN` |
| `403` | `otp/verify`, `registration/verify-otp` | challenge locked after too many wrong attempts |
| `404` | `otp/*`, `registration/*`, `device/*`, `corporate-hierarchy/*` gets | unknown `id`/`challengeId` |
| `400` | `otp/create` | missing `Idempotency-Key` header |
| `409` | `otp/create` | `Idempotency-Key` reused with a different `mobileNumber` |
| `400` | `registration/verify-otp\|create-credentials\|register-device\|complete` | wrong OTP, or attempt not at the required step |

## 12. Testing Scenarios

| Scenario | Expected Result | Verified |
|---|---|---|
| Valid login | `accessToken`/`refreshToken` returned | ✅ live |
| Wrong password | `401` | ✅ live |
| Full registration saga, step by step | Ends `COMPLETED`, real Keycloak user created | ✅ live end-to-end |
| Log in as the customer created by the saga | `201`, real Keycloak-issued JWT | ✅ live, against real Keycloak |
| `create-credentials` called out of order (before `verify-otp`) | `400` | ✅ (e2e test) |
| `create-credentials` fails (Keycloak error injected) | `500`, attempt left at `CREDENTIALS_SET` with `failureReason` set, `keycloakUserId` still `null` | ✅ (e2e test) |
| Retry `create-credentials` after the above failure | `201`, succeeds, advances to `KEYCLOAK_USER_CREATED` | ✅ (e2e test) |
| OTP: correct code | `{ verified: true }`, challenge invalidated | ✅ (unit test) |
| OTP: wrong code repeated past `OTP_MAX_ATTEMPTS` | `403`, locked for `OTP_LOCK_MINUTES` | ✅ (unit test) |
| OTP: expired challenge | `400` even with the correct code | ✅ (unit test) |
| `otp/create` without `Idempotency-Key` | `400` | ✅ (e2e test) |
| Customer passes another customer's `userId` to `credential/get` | `403` (unless caller is `BANK_ADMIN`/`BANK_SUPER_ADMIN`) | ✅ (unit test) |

## 13. Frontend Integration Note

Generate a fresh `Idempotency-Key` per **new** `POST /auth/otp/create` request; reuse it only for
a retry of that exact same request (dropped connection, timeout) — not for a new OTP send.
Persist `attemptId` client-side through the whole registration saga; on app relaunch, call
`POST /auth/registration/resume` with it before assuming onboarding needs to restart from scratch.
