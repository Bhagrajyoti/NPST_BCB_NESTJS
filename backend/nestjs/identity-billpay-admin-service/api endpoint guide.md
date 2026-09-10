# Auth Service — API Endpoint Guide

Base URL: `http://<host>:<port>/api/v1` (global prefix set in [main.ts](src/main.ts)).
Swagger UI: `http://<host>:<port>/api/v1/docs`.

Every endpoint in this guide is **POST**, accepts a JSON body, and is validated by a global
`ValidationPipe({ whitelist: true, transform: true })` — unknown fields are stripped, and a
missing/invalid required field returns `400 Bad Request`.

## 0. Conventions used below

- **Auth** column: `Public` = no token needed. `Bearer` = needs `Authorization: Bearer <accessToken>`
  from `POST /auth/login`. `Bearer + role` = needs a token whose Keycloak realm roles include one
  of the listed roles (enforced by the global AuthGuard/RoleGuard via the
  [`@Auth()`](src/common/decorators/auth.decorator.ts) decorator).
- **Success responses** are returned as-is from the controller (the global
  [`ResponseTransformInterceptor`](src/common/interceptors/response-transform.interceptor.ts) is a
  pass-through) — no `{ data: ... }` envelope.
- **Error responses** (any thrown `HttpException`) are normalized by the global
  [`HttpExceptionFilter`](src/common/filters/http-exception.filter.ts) to:
  ```json
  { "statusCode": 401, "path": "/api/v1/auth/login", "timestamp": "2026-09-10T...", "message": "Invalid credentials" }
  ```
- Two Keycloak clients exist — pass the right one as `clientId` on login/logout:
  - `mobile-app` — retail/corporate **customer** mobile app.
  - `admin-web` — bank staff **admin portal** (default if `clientId` is omitted).
- In Swagger's Authorize dialog, paste only the raw `accessToken` value (no `Bearer ` prefix) —
  the [`normalizeBearerMiddleware`](src/common/middleware/normalize-bearer.middleware.ts) will
  strip a duplicated `Bearer` if you paste it anyway, but a raw token is what the docs expect.

---

## 1. The two end-to-end flows

### Flow A — Existing user login (admin staff or an already-onboarded customer)

```
POST /auth/login  →  { accessToken, refreshToken, ... }
        │
        ▼ (Authorization: Bearer <accessToken> on every call below)
POST /auth/me  →  decoded JWT claims (sub, roles, etc.)
        │
        ▼ use `sub` as the userId/keycloakUserId input to other endpoints
POST /auth/credential/get | /auth/device/list | /auth/corporate-hierarchy/list  ...
        │
        ▼ when finished
POST /auth/logout  (send back the refreshToken from step 1)
```

### Flow B — New customer onboarding (mobile app)

```
POST /auth/registration/create   (Public)
   in:  mobileNumber, panOrCif
   out: { id, mobileNumber, panOrCif, currentStep: "INIT", ... }
        │  keep `id` as attemptId for the rest of onboarding
        ▼
POST /auth/otp/create             (Public)
   in:  mobileNumber
   out: { id, mobileNumber, otpHash, expiresAt, otp, ... }
        │  `id` = challengeId, `otp` = the code to show/send to the customer (dev-only field)
        ▼  (OTP verification against Keycloak/user-creation is not yet wired to a route —
        ▼   see §2.2 note. Once verified, an admin/back-office flow creates the Keycloak user.)
POST /auth/credential/create      (Bearer — see note below)
   in:  userId (Keycloak sub of the new user), mpin and/or password
   out: { keycloakUserId, passwordUpdated, mpin: { id, hasMpin, lastRotatedAt, ... } }
        │
        ▼
POST /auth/device/create          (Bearer)
   in:  userId, deviceId, deviceModel?
   out: { id, userId, deviceId, deviceModel, trusted: false, ... }
        │
        ▼  from here on the customer behaves like Flow A:
POST /auth/login  (clientId: "mobile-app")  →  POST /auth/me  →  ... →  POST /auth/logout
```

> **Note on `/auth/credential/*` and `/auth/otp/*`:** the DTOs `VerifyOtpDto`
> ([verify-otp.dto.ts](src/modules/auth/otp/dto/verify-otp.dto.ts)) and `CreateCredentialsDto`
> ([create-credentials.dto.ts](src/modules/auth/registration/dto/create-credentials.dto.ts)) exist
> in the codebase but are **not currently bound to any controller route** — the registration saga
> (`RegistrationStep` enum in
> [registration-orchestrator.service.ts](src/modules/auth/registration/registration-orchestrator.service.ts))
> defines `OTP_VERIFIED` / `CREDENTIALS_SET` / `DEVICE_REGISTERED` / `KEYCLOAK_USER_CREATED` steps
> that aren't yet reachable over HTTP. Today, `/auth/credential/create` is called directly once a
> Keycloak user already exists (e.g. created by an admin) and requires a Bearer token.

---

## 2. Endpoint reference

### 2.1 Token — [auth.controller.ts](src/modules/auth/token/auth.controller.ts) (`/auth`)

#### `POST /auth/login`
| | |
|---|---|
| Auth | Public |
| Input (`LoginDto`) | `username` (string, required) — Keycloak login, not email.<br>`password` (string, required).<br>`clientId` (`"admin-web"` \| `"mobile-app"`, optional, default `admin-web`). |
| Output (`TokenResponseDto`) | `accessToken`, `expiresIn` (sec), `refreshExpiresIn` (sec), `refreshToken`, `tokenType` (`Bearer`), `scope`. |
| Where the output goes | `accessToken` → `Authorization: Bearer <accessToken>` header on every subsequent protected call (`/auth/me`, `/auth/credential/*`, `/auth/device/*`, `/auth/corporate-hierarchy/*`, `/auth/logout` uses the refresh token instead). `refreshToken` → body of `POST /auth/logout`. Nothing else consumes `expiresIn`/`refreshExpiresIn`/`scope` server-side; they're informational for the caller (e.g. to know when to re-login). |
| Example request | `{ "username": "corp-maker-01", "password": "corp-maker-01", "clientId": "admin-web" }` |
| Errors | `401` — bad credentials or Keycloak unreachable. |

Under the hood: [`KeycloakService.login`](src/modules/auth/keycloak/keycloak.service.ts) POSTs a
`grant_type=password` request to Keycloak's `/realms/<realm>/protocol/openid-connect/token`.

#### `POST /auth/logout`
| | |
|---|---|
| Auth | Bearer |
| Input (`LogoutDto`) | `refreshToken` (string, required) — the `refreshToken` from login.<br>`clientId` (optional, must match the one used at login). |
| Output | `{ "loggedOut": true }` |
| Where the input comes from | `refreshToken` is the value saved from the `POST /auth/login` response — nowhere else. |
| Errors | `401` — invalid/expired refresh token. |

Calls Keycloak's `/protocol/openid-connect/logout` to revoke the refresh token (ends the SSO session).

#### `POST /auth/me`
| | |
|---|---|
| Auth | Bearer |
| Input | none (identity comes entirely from the Bearer token). |
| Output | `{ "user": { sub, preferred_username, realm_access: { roles: [...] }, ... } }` — the decoded JWT claims. |
| Where the output goes | `user.sub` is the Keycloak **user ID** used as `userId` / `keycloakUserId` input elsewhere: `SetCredentialDto.userId`, `GetCredentialDto.userId`, `RegisterDeviceDto.userId`, `SetHierarchyRoleDto.userId`. `user.realm_access.roles` tells the client which UI/actions to show (e.g. whether the user is `CORPORATE_MAKER` vs `CORPORATE_CHECKER`). |
| Errors | `401` — missing/invalid token. |

---

### 2.2 Registration — [registration.controller.ts](src/modules/auth/registration/registration.controller.ts) (`/auth/registration`)

#### `POST /auth/registration/create`
| | |
|---|---|
| Auth | Public — first call in customer onboarding, before any account exists. |
| Input (`InitRegistrationDto`) | `mobileNumber` (string, required), `panOrCif` (string, required). |
| Output | The saved `RegistrationAttempt` row: `{ id, mobileNumber, panOrCif, currentStep: "INIT", createdAt, updatedAt, deletedAt, failureReason }`. |
| Where the output goes | `id` is the **registration attempt ID** — hold onto it client-side to resume/reference this onboarding attempt (e.g. for admin lookup via `/auth/registration/get`). |

#### `POST /auth/registration/get`
| Auth | Bearer (admin portal — review tool). |
| Input (`IdRequestDto`) | `id` (UUID) — the attempt ID from `create`. |
| Output | The full `RegistrationAttempt` row, or `404` if not found. |

#### `POST /auth/registration/list`
| Auth | Bearer (admin portal). |
| Input | none. |
| Output | Array of all (non-deleted) `RegistrationAttempt` rows. |

#### `POST /auth/registration/delete`
| Auth | Bearer (admin portal). |
| Input (`IdRequestDto`) | `id`. |
| Output | `{ id, deleted: true }` — soft delete (`deletedAt` set; row retained). |

---

### 2.3 OTP — [otp.controller.ts](src/modules/auth/otp/otp.controller.ts) (`/auth/otp`)

#### `POST /auth/otp/create`
| | |
|---|---|
| Auth | Public. |
| Input (`GenerateOtpDto`) | `mobileNumber` (string, required). |
| Output | `{ id, mobileNumber, otpHash, attemptCount: 0, expiresAt, otp, createdAt, ... }` — `otp` is the **plaintext 6-digit code** (dev-only; the comment in the controller flags this should be removed/sent via SMS instead of returned in production). |
| Where the output goes | `id` (as `challengeId`) and the `otp` value are what a real client would pass to an OTP-verification step. As noted in §1, that verification route isn't wired yet — today the plaintext `otp` in the response is the only way to know the code (normally it would be sent by SMS and never returned in the API response). `otpHash` is what's persisted for server-side comparison once verification exists. |

#### `POST /auth/otp/get`
| Auth | Bearer (admin/support). |
| Input (`IdRequestDto`) | `id`. |
| Output | The `OtpChallenge` row (includes `otpHash`, not the plaintext code). |

#### `POST /auth/otp/list`
| Auth | Bearer (admin/support). |
| Output | Array of all `OtpChallenge` rows. |

#### `POST /auth/otp/delete`
| Auth | Bearer. |
| Input (`IdRequestDto`) | `id`. |
| Output | `{ id, deleted: true }`. |

---

### 2.4 Credential (customer MPIN) — [credential.controller.ts](src/modules/auth/credential/credential.controller.ts) (`/auth/credential`)

All routes require Bearer (the whole controller is decorated `@Auth()`).

#### `POST /auth/credential/create`
| | |
|---|---|
| Input (`SetCredentialDto`) | `userId` (UUID, required) — the customer's Keycloak `sub` (from `/auth/me`).<br>`password` (string, 8–128 chars) — required only if `mpin` is omitted; written to **Keycloak only**.<br>`mpin` (string, 4–6 chars) — required only if `password` is omitted; hashed with [`hashMpin`](src/modules/auth/credential/utils/mpin-hash.util.ts) and stored **locally only**, never in Keycloak. |
| Output | `{ keycloakUserId, passwordUpdated: boolean, mpin: { id, keycloakUserId, hasMpin: true, lastRotatedAt, createdAt, updatedAt } | null }`. |
| Where input/output connect | `userId` normally comes from `POST /auth/me`'s `sub` for the currently-onboarding customer. If `password` is set, it flows straight into [`KeycloakService.resetUserPassword`](src/modules/auth/keycloak/keycloak.service.ts) (used to log in later via `/auth/login`). The returned `mpin.id` is the local credential record ID surfaced back to admin tooling (e.g. `/auth/credential/list`); the raw MPIN is never returned. |

#### `POST /auth/credential/get`
| Input (`GetCredentialDto`) | `userId` (UUID, optional) — if omitted, uses the caller's own `sub` from the Bearer token. |
| Output | The public view of that user's MPIN record (same shape as `create`'s `mpin` field), or `404` if none exists. |
| Where it's used | Mobile app calls this with no body (self) to check "does this device's user already have an MPIN set" before showing a setup vs. unlock screen. |

#### `POST /auth/credential/list`
| Auth | Bearer (intended for admin/support use — not exposed to customers in the mobile app). |
| Output | Array of all customers' MPIN metadata (no secrets — `hashedMpin` is never returned). |

#### `POST /auth/credential/delete`
| Input (`GetCredentialDto`) | `userId` (optional, defaults to caller's own `sub`). |
| Output | `{ keycloakUserId, deleted: true }` — soft-deletes the local MPIN row only; does **not** touch the Keycloak password. Used for a mobile app "forgot MPIN, set a new one" flow (delete then `create` again).

---

### 2.5 Device — [device.controller.ts](src/modules/auth/device/device.controller.ts) (`/auth/device`)

All routes require Bearer.

#### `POST /auth/device/create`
| Input (`RegisterDeviceDto`) | `userId` (string, required) — Keycloak `sub` of the owning user.<br>`deviceId` (string, required) — IMEI/UUID identifying the physical device.<br>`deviceModel` (string, optional) — e.g. `"Samsung Galaxy S24"`. |
| Output | The saved `DeviceProfile` row: `{ id, userId, deviceId, deviceModel, trusted: false, createdAt, ... }`. New devices always start `trusted: false`. |
| Where it's used | Called once per device during mobile onboarding/first login. Later requests from the app can be cross-checked against `deviceId` for trusted-device / step-up-auth decisions (that check isn't implemented in this controller — it only stores the profile). |

#### `POST /auth/device/get` / `POST /auth/device/list` / `POST /auth/device/delete`
Same `IdRequestDto` (`{ id }`) → row / array / `{ id, deleted: true }` pattern as registration and OTP above.

---

### 2.6 Corporate Hierarchy — [corporate-hierarchy.controller.ts](src/modules/auth/corporate-hierarchy/corporate-hierarchy.controller.ts) (`/auth/corporate-hierarchy`)

All routes require Bearer. This is an **admin/back-office** endpoint set for wiring a corporate
customer's Keycloak user into a maker-checker role for a specific CIF (corporate account).

#### `POST /auth/corporate-hierarchy/create`
| Input (`SetHierarchyRoleDto`) | `userId` (string, required) — Keycloak user ID being assigned a role.<br>`cif` (string, required) — the corporate CIF this role applies to.<br>`role` (string, required, one of `CORPORATE_IT_ADMIN`, `CORPORATE_MAKER`, `CORPORATE_CHECKER`, `CORPORATE_VIEWER`, `BANK_SUPER_ADMIN`, `BANK_ADMIN`, `BANK_MAKER`, `BANK_CHECKER`, `RETAIL_CUSTOMER`). |
| Output | The saved `CorporateHierarchy` row: `{ id, userId, cif, role, approvalLimit: null, createdAt, ... }`. |
| Where it's used | `userId` typically comes from an existing `/auth/me` lookup (or from `/auth/registration` records) for the customer being provisioned. Once assigned, that `role` string is what shows up inside the user's JWT `realm_access.roles` on their **next** `/auth/login` — and is what `@Auth('CORPORATE_MAKER', 'CORPORATE_CHECKER')`-style route guards check against on other services' controllers. `approvalLimit` is stored for future use (not set by this DTO) but isn't populated by any endpoint yet. |

#### `POST /auth/corporate-hierarchy/get` / `.../list` / `.../delete`
Same `IdRequestDto` pattern as above.

---

## 3. Quick reference table

| Method & Path | Auth | Key input | Key output | Consumed by |
|---|---|---|---|---|
| `POST /auth/login` | Public | `username`, `password`, `clientId?` | `accessToken`, `refreshToken` | `accessToken` → `Authorization` header everywhere below; `refreshToken` → `/auth/logout` |
| `POST /auth/logout` | Bearer | `refreshToken` | `{ loggedOut }` | end of session |
| `POST /auth/me` | Bearer | — | `user.sub`, `user.realm_access.roles` | `sub` → `userId`/`keycloakUserId` on credential/device/hierarchy calls |
| `POST /auth/registration/create` | Public | `mobileNumber`, `panOrCif` | `id` (attemptId), `currentStep` | `id` → `/auth/registration/get` |
| `POST /auth/registration/get\|list\|delete` | Bearer | `id` / — | attempt row(s) | admin review |
| `POST /auth/otp/create` | Public | `mobileNumber` | `id` (challengeId), `otp` | intended for a not-yet-built verify step |
| `POST /auth/otp/get\|list\|delete` | Bearer | `id` / — | challenge row(s) | admin/support |
| `POST /auth/credential/create` | Bearer | `userId`, `password?`, `mpin?` | `mpin.id`, `passwordUpdated` | `password` → Keycloak login; `mpin` → local MPIN unlock |
| `POST /auth/credential/get\|delete` | Bearer | `userId?` | MPIN metadata / `{ deleted }` | mobile app MPIN-set check / reset flow |
| `POST /auth/credential/list` | Bearer | — | all customers' MPIN metadata | admin/support |
| `POST /auth/device/create` | Bearer | `userId`, `deviceId`, `deviceModel?` | device row (`trusted: false`) | trusted-device checks (future) |
| `POST /auth/device/get\|list\|delete` | Bearer | `id` / — | device row(s) | admin/support |
| `POST /auth/corporate-hierarchy/create` | Bearer | `userId`, `cif`, `role` | hierarchy row | `role` appears in the user's next login JWT → drives `@Auth(role)` guards elsewhere |
| `POST /auth/corporate-hierarchy/get\|list\|delete` | Bearer | `id` / — | hierarchy row(s) | admin/support |
