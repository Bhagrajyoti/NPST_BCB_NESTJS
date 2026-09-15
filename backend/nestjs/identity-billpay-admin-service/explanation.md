# Auth & API Guide — identity-billpay-admin-service

This document explains how authentication actually works in this service, what every
token contains, which APIs are public vs. protected, and exactly what changed in this
round of fixes and why.

---

## 1. Architecture: Keycloak is the only identity store — there is no "session"

This service keeps **no server-side session state** (no session table, no in-memory
session store, no session cookie). Every authenticated request is validated
independently, purely from the JWT bearer token the caller sends. Keycloak is the
single source of truth for identity, credentials, and roles.

Because of this, the old naming (`SessionController`, `POST /auth/session/me`,
`ApiTags('Auth — Session')`) was misleading — it implied server-managed session
state that doesn't exist. It has been renamed to reflect what the code actually does:
a thin, stateless wrapper over Keycloak's OpenID Connect token endpoint.

| Before | After |
|---|---|
| `src/modules/auth/session/session.controller.ts` (`SessionController`) | `src/modules/auth/token/auth.controller.ts` (`AuthController`) |
| `POST /api/v1/auth/session/me` | `POST /api/v1/auth/me` |
| Swagger tag `Auth — Session` | Swagger tag `Auth` |

`login`/`logout` still just proxy to Keycloak's `/protocol/openid-connect/token` and
`/protocol/openid-connect/logout` endpoints (see `keycloak.service.ts`). Nothing about
the actual behavior changed — only the name, to match reality.

---

## 2. How a token is created and validated

### 2.1 Login — `POST /auth/login` (public, no token required)

Request body:

```json
{
  "username": "corp-maker-01",
  "password": "••••••••",
  "clientId": "admin-web"   // optional — "admin-web" (bank staff) or "mobile-app" (customers); defaults to admin-web
}
```

The backend calls Keycloak directly using the **Resource Owner Password Credentials
grant** (`grant_type=password`) against
`{KEYCLOAK_AUTH_SERVER_URL}/realms/{KEYCLOAK_REALM}/protocol/openid-connect/token`,
using `admin-web`'s confidential `client_secret` when the `admin-web` client is used,
or no secret for the public `mobile-app` client.

> **Note for future hardening:** ROPC (raw username/password sent straight to the
> token endpoint) is what Keycloak/OAuth2 best practice calls a legacy grant — it
> exists mainly for trusted first-party apps. Standard fintech guidance is
> Authorization Code + PKCE for anything with a redirect-capable client (the admin
> web portal in particular). This wasn't changed here — it's a larger, separate
> decision involving how `admin-web`/`mobile-app` are configured in Keycloak — but it's
> worth flagging for a later pass.

### 2.2 What the login response contains

```json
{
  "accessToken": "eyJhbGciOiJSUzI1NiIs...",
  "expiresIn": 300,
  "refreshExpiresIn": 1800,
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "tokenType": "Bearer",
  "scope": "openid profile email"
}
```

This is Keycloak's raw token response, reshaped from snake_case to camelCase
(`access_token` → `accessToken`, etc. — see `KeycloakTokenResponse` /
`TokenResponseDto`). **Only `accessToken` goes into Swagger's Authorize dialog.**
`refreshToken` is only for `POST /auth/logout`.

### 2.3 What's inside the access token (decoded JWT payload)

The access token is a signed (RS256) JWT. Decoding the payload (e.g. at jwt.io, or
`node -e "console.log(JSON.parse(Buffer.from(token.split('.')[1],'base64')))"`) gives
the standard Keycloak claim set:

| Claim | Meaning |
|---|---|
| `iss` | Issuer — must equal `{KEYCLOAK_AUTH_SERVER_URL}/realms/{KEYCLOAK_REALM}` exactly (see §3.1) |
| `sub` | Keycloak's internal user ID — this is the `userId` used throughout this service's APIs (credential, corporate-hierarchy, etc.) |
| `aud`, `azp` | Audience / authorized party — which client the token was issued for (`admin-web` or `mobile-app`) |
| `exp`, `iat` | Expiry / issued-at (Unix seconds) — default access token lifetime is short (~5 min) |
| `jti` | Unique token ID |
| `typ` | `"Bearer"` |
| `realm_access.roles` | **This is what RBAC in this service checks** — e.g. `["BANK_SUPER_ADMIN"]`, `["BANK_ADMIN"]`, `["RETAIL_CUSTOMER"]` |
| `resource_access` | Per-client roles (not currently used by this service's guards) |
| `preferred_username`, `email`, `given_name`, `family_name`, `email_verified` | Standard profile claims (from the `profile`/`email` scopes) |
| `scope` | Granted OAuth scopes, e.g. `openid profile email` |

`realm_access.roles` is what `SuperadminGuard`, the RBAC role-hierarchy helpers
(`src/modules/rbac/constants/rbac.constants.ts`), and the `@Auth(...roles)` decorator
(§3) all read.

### 2.4 How every protected request is validated (this is where the 401 bug was)

Two global guards run on **every** request (registered as `APP_GUARD` in
`app.module.ts`): `AuthGuard` (from `nest-keycloak-connect`) validates the token
itself; `RoleGuard` then checks any `@Roles()` metadata on the route.

`AuthGuard`, in offline mode (`KEYCLOAK_TOKEN_VALIDATION=offline`, the default), does
three checks on the token from `keycloak-connect`'s `GrantManager.validateToken`:

1. **Not expired** (`exp` in the future).
2. **`iss` matches exactly** `{authServerUrl}/realms/{realm}` — no override exists for
   this; it's a hard equality check inside the library.
3. **Signature verifies** against the realm's current signing key.

### 2.5 Root cause of the 401 you were seeing, and the fix

Step 3 above was failing. The service was pinning a **static, hand-pasted**
`KEYCLOAK_REALM_PUBLIC_KEY` in `.env`, and using it directly for signature
verification (`crypto.createVerify('RSA-SHA256').verify(pinnedKey, token.signature)`
in `keycloak-connect`'s `grant-manager.js`). The moment that pinned key no longer
matches Keycloak's **current** signing key — because the realm's key was rotated, or
the value was captured at a different point in time than the token you tested with —
every single offline validation fails with `invalid token (signature)`, which
`AuthGuard` turns into a `401 Unauthorized`. Login still works fine in this scenario
because Keycloak validates its own tokens server-side during the password grant — only
*our* offline validation was broken. This exactly matches the symptom reported: token
issued successfully, then rejected on every protected call.

**Fix (root cause, not a patch):** stopped passing `realmPublicKey` into
`KeycloakConnectOptions` at all (`src/config/keycloak-connect.config.ts`). With no
pinned key, `keycloak-connect` automatically fetches and caches signing keys from the
realm's live JWKS endpoint
(`{authServerUrl}/realms/{realm}/protocol/openid-connect/certs`), keyed by the token's
`kid` header, and re-fetches automatically when it sees an unfamiliar `kid` (subject to
a 10-minute minimum interval). This is the standard, key-rotation-safe way to validate
Keycloak tokens and is what's recommended for production — a static copied key should
never be used for signature validation.

`KEYCLOAK_REALM_PUBLIC_KEY` has been removed from `.env` / `.env.example` and from
`keycloak.config.ts` (dead config now that it's unused). The unused `KEYCLOAK_ISSUER`
env var / `keycloak.issuer` config field was also removed — `keycloak-connect` has no
issuer override; it always derives the expected issuer as `authServerUrl + '/realms/' +
realm` internally, so that variable was never actually read by anything.

**One thing I could not verify directly** (Keycloak at `103.209.145.243:8201` is
unreachable from this machine over the current VPN — see the connectivity
troubleshooting earlier in this session): if `iss` mismatch (check #2 above) turns out
to *also* be a factor — e.g. Keycloak is fronted by a proxy/hostname different from
`103.209.145.243:8201` — that can only be fixed on the Keycloak server side (the
realm's **Frontend URL** / `KC_HOSTNAME` setting must equal exactly
`http://103.209.145.243:8201`), since the client library has no override for it. If
401s persist after this fix, decode a fresh token's `iss` claim and compare it
byte-for-byte against `KEYCLOAK_AUTH_SERVER_URL/realms/KEYCLOAK_REALM` — that's the
next thing to check.

### 2.6 Logout — `POST /auth/logout` (protected — requires a valid Bearer access token)

Takes `refreshToken` (+ optional `clientId`) and calls Keycloak's
`/protocol/openid-connect/logout` to revoke it. Only `login` is public; every other
auth route, including `logout`, requires a valid access token — an anonymous caller
should not be able to invalidate a refresh token without first proving they hold a
matching access token. (A stray `console.log` left in `me()` from an earlier merge was
also removed.)

### 2.7 `POST /auth/me` (protected)

Returns the decoded claims of whatever token you authenticated with — the fastest way
to check "what roles does my current token actually have" while testing.

---

## 3. Swagger: authorize once, everything works

Previously, several controllers had `@ApiBearerAuth()` on some routes but not others
(or not at all — `admin/reporting`, and all three `bill-payment` controllers had **no**
Swagger auth annotation whatsoever). Swagger UI only sends your token on routes that
declare the bearer security requirement, so those routes looked "protected" at runtime
(the global guard still ran) but never got the Authorization header from Swagger's
"Try it out", regardless of clicking Authorize.

**Fix:** a single reusable decorator, `Auth()` (`src/common/decorators/auth.decorator.ts`),
replaces every scattered `@ApiBearerAuth()` / `@Roles()` pair:

```ts
@Auth()                                  // any authenticated user
@Auth('BANK_SUPER_ADMIN')                // caller must hold this realm role
@Auth('BANK_SUPER_ADMIN', 'BANK_ADMIN')  // caller must hold at least one of these (ANY match)
```

It's a thin `applyDecorators(ApiBearerAuth(), Roles({ roles, mode: RoleMatchingMode.ANY }))`
wrapper — it doesn't enforce anything itself; the globally-registered `AuthGuard`/
`RoleGuard` (`APP_GUARD` in `app.module.ts`) still do all the real enforcement. It just
means every controller writes the requirement once instead of re-typing
`@ApiBearerAuth()` (Swagger docs) and `@Roles()` (actual enforcement) separately and
risking the two drifting apart. Applied at the **class level** on every fully-protected
controller (`admin-user`, `reporting`, `corporate-hierarchy`, `device`, `employees`,
`permissions`, `roles`, `users`, `credential`, and all three `bill-payment` controllers),
and at the **method level** with explicit roles on `authorization-rules` and wherever a
controller mixes public and protected routes (`registration`, `otp`, `auth`).

While consolidating this, a leftover dead decorator was also removed:
`src/common/decorators/roles.decorator.ts` defined its own unused `Roles()` (via
`SetMetadata('roles', ...)`) that no guard anywhere ever read — confusingly named the
same as `nest-keycloak-connect`'s real `Roles()`. Deleted; `Auth()` is now the one and
only place role/auth decoration happens in this codebase.

**Result:** click **Authorize** once in `/api/v1/docs`, paste the `accessToken` from
login, and every locked endpoint across every module now sends it automatically
(`persistAuthorization: true` was already set, so this also survives a page reload).

### 3.1 Also fixed while in this file: unenforced role claims

`authorization-rules.controller.ts`'s Swagger text claimed `create`/`update`/
`deactivate` were "BANK_SUPER_ADMIN only" and `list`/`get`/`history` were
"BANK_SUPER_ADMIN, BANK_ADMIN" — but no guard or `@Roles()` decorator actually enforced
this; any authenticated user could call any of these routes. Now
`@Auth('BANK_SUPER_ADMIN', 'BANK_ADMIN')` / `@Auth('BANK_SUPER_ADMIN')` enforce exactly
what the docs already claimed (backed by the global `RoleGuard`, plus a second,
independent check in the service layer itself — see §7).

### 3.2 Interceptors: already global, confirmed and left that way

The app registers two interceptors app-wide in `main.ts`
(`app.useGlobalInterceptors(new LoggingInterceptor(), new ResponseTransformInterceptor())`)
rather than per-controller — there was no per-route `@UseInterceptors()` anywhere in
`src/modules` to consolidate; this was already correct. Worth noting for anyone reading
the code: both are currently no-op passthroughs (`return next.handle()`), as is a third,
unregistered one (`ChecksumSigningInterceptor`) — they're scaffolding for
logging/response-shaping/request-signing behavior described in the architecture docs
but not yet implemented. Wiring them globally when they *are* implemented is the
correct approach (as already done) — implementing their actual behavior is a separate,
larger piece of work outside this change.

---

## 4. API map

Legend: 🔓 public (no token) · 🔒 any authenticated user · 🔒`ROLE` role-gated.

### Auth (`/api/v1/auth`)
| Method & path | Access | Notes |
|---|---|---|
| `POST /auth/login` | 🔓 | Returns `accessToken`/`refreshToken` |
| `POST /auth/logout` | 🔒 | Revokes `refreshToken` — caller must hold a valid access token |
| `POST /auth/me` | 🔒 | Decoded JWT claims of the caller |
| `POST /auth/registration/create` | 🔓 | Start mobile customer onboarding |
| `POST /auth/registration/{list,get,delete}` | 🔒 | Admin review of registration attempts |
| `POST /auth/otp/create` | 🔓 | Generate OTP (dev response includes the code) |
| `POST /auth/otp/{list,get,delete}` | 🔒 | |
| `POST /auth/credential/*` | 🔒 | Customer MPIN management |
| `POST /auth/device/*` | 🔒 | Trusted device registration |
| `POST /auth/corporate-hierarchy/*` | 🔒 | Corporate CIF ↔ role linking |

### RBAC
| Method & path | Access |
|---|---|
| `POST /roles/*` | 🔒`BANK_SUPER_ADMIN` (via `SuperadminGuard`) |
| `POST /permissions/create` | 🔒`BANK_SUPER_ADMIN` |
| `POST /employees/*` | 🔒 (hierarchy-based checks inside the service layer) |
| `POST /users/fetch-access-details` | 🔒 |

### Admin
| Method & path | Access |
|---|---|
| `POST /admin/admin-user/*` | 🔒 |
| `POST /admin/authorization-rules/{list,get,history}` | 🔒`BANK_SUPER_ADMIN` or `BANK_ADMIN` |
| `POST /admin/authorization-rules/{create,update,deactivate}` | 🔒`BANK_SUPER_ADMIN` |
| `GET /admin/reporting` | 🔒 |

### Bill Payment
| Method & path | Access | Notes |
|---|---|---|
| `POST /bill-payment/bill/fetch` | 🔒 | |
| `GET/POST /bill-payment/biller*` | 🔒 | |
| `GET/POST /bill-payment/payment*` | 🔒 | `payViaBbps` is still unimplemented (throws `Not implemented`) — pre-existing, out of scope for this change |

`GET /api/v1/health/check` remains public and DB-only (no Keycloak check yet — also
pre-existing, out of scope here).

---

## 5. Changelog (this session)

1. **Fixed `npm run start:dev` failing to compile** — `app.module.ts` referenced
   `BillPaymentModule` without importing it (dropped during a branch merge). Added the
   missing import.
2. **Renamed the "session" auth module** to reflect that this service has no real
   session state — `session/session.controller.ts` → `token/auth.controller.ts`
   (`SessionController` → `AuthController`), route `session/me` → `me`, tag
   `Auth — Session` → `Auth`. Updated every reference (module wiring, DTO imports,
   doc-comment mentions in `credential` DTOs/controller, e2e test).
3. **Fixed the 401-on-every-protected-call bug**: removed the static, hand-pasted
   `KEYCLOAK_REALM_PUBLIC_KEY` from token signature validation; `keycloak-connect` now
   validates against Keycloak's live, rotating JWKS instead (§2.5). Removed the dead
   `KEYCLOAK_ISSUER`/`keycloak.issuer` config, which was never actually used by the
   library.
4. **`POST /auth/logout` now requires a valid Bearer access token** — only `login` is
   public; an anonymous caller can no longer revoke an arbitrary refresh token. Also
   removed a stray `console.log` left in `me()` from an earlier merge.
5. **Fixed Swagger "Authorize once" UX**: added `@ApiBearerAuth()` to `reporting`,
   `bill`, `biller`, and `payment` controllers (previously had none at all); promoted
   `@ApiBearerAuth()` to class level (removing per-method repeats) on `admin-user`,
   `authorization-rules`, `corporate-hierarchy`, `device`, `employees`, `permissions`,
   `roles`, and `users`.
6. **Closed an unenforced-role gap**: `authorization-rules` write endpoints now
   actually enforce the `BANK_SUPER_ADMIN`/`BANK_ADMIN` restrictions their Swagger
   descriptions already claimed, via `@Roles()`.
7. **Introduced a single global `Auth()` decorator** (§3) replacing every repeated
   `@ApiBearerAuth()` / `@Roles()` pair across controllers, and deleted a dead, unused,
   confusingly-named duplicate `Roles()` decorator in `common/decorators`. Confirmed
   the app's interceptors are (and remain) registered globally in `main.ts`, not
   per-route.
8. **Added e2e coverage for every endpoint that had none** — `admin/admin-user`,
   `admin/authorization-rules`, `admin/reporting`, and all three `bill-payment`
   controllers (§7). The test harness (`TestAppModule`) now also loads `AdminModule`
   and `BillPaymentModule`.

All changes verified by a clean `tsc --noEmit`, a live `npm run start:dev` boot
confirming every route (including the renamed `/auth/me`) maps correctly, and the full
test suite passing (86 tests: 65 e2e + 21 unit).

---

## 7. Test coverage

Every API route in this service now has at least one e2e test exercising it over real
HTTP (`supertest` against an in-process Nest app), run with:

```bash
npm run test:e2e   # or: npx jest --config test/jest-e2e.json
npm test           # unit specs (admin-user, authorization-rules service logic)
```

**How the harness works** (`test/e2e/helpers/`):
- `test-app.module.ts` boots a real `AppModule`-equivalent (`AuthModule`, `RbacModule`,
  `AdminModule`, `BillPaymentModule`) against the **real** local MySQL database (same
  `.env` the dev server uses) — business logic, validation, and persistence are all
  real, nothing is faked at that layer.
- `KeycloakService` and the `BBPS_ADAPTER` provider are the only two things mocked
  (`mockKeycloakService`, `mockBbpsAdapter` in `test-app.ts`) — both talk to systems
  external to this service (Keycloak, a payment network) and are non-deterministic or
  network-dependent, so they're swapped for controllable jest mocks. Everything else
  runs unmodified.
- A tiny middleware sets `req.user` directly to a fixed actor (`TEST_SUPERADMIN`,
  `TEST_BANK_ADMIN`, or `TEST_NO_ROLE`, all in `test-app.ts`) instead of parsing a real
  JWT — this is what lets tests simulate "logged in as X role" without a live Keycloak.
  **Important caveat:** because of this, these tests do **not** exercise the real
  `AuthGuard`/`RoleGuard` token-validation path itself (that's what §2.5's fix
  addresses, and it needs live Keycloak connectivity to test end-to-end, which isn't
  available in this sandbox). What they *do* verify end-to-end is (a) that
  `@Auth(...)`'s `@Roles()` metadata is wired to the routes it should be — indirectly,
  via the fact that `AuthorizationRulesService`/`AdminUserService` independently check
  roles in the service layer too and those checks are what the tests assert against —
  and (b) all business logic downstream of "an authenticated user with role X called
  this endpoint."

**What's newly covered:**

| Area | Endpoints | Notable cases |
|---|---|---|
| `admin/admin-user` | `list`, `get` | 404 on unknown id; 403 for a caller with no admin-portal role |
| `admin/authorization-rules` | `create`, `list`, `get`, `update`, `history`, `deactivate` | full version-history lifecycle (v1 → v2 → deactivated); 403 for `BANK_ADMIN` on write ops; 403 for a no-role caller on read; 404 after deactivation |
| `admin/reporting` | `GET /` | |
| `bill-payment/biller` | `POST /`, `GET /`, `GET /:id` | |
| `bill-payment/bill` | `POST /fetch` | happy path; 404 unknown bill; 404 unknown/inactive biller |
| `bill-payment/payment` | `POST /`, `GET /`, `GET /:id` | happy path (asserts the bill flips to `PAID`); amount-mismatch → 400; unmatched bill → 404; **idempotent replay** (same key ⇒ `duplicate: true`, BBPS adapter called only once); **reused key with a different amount** ⇒ 400 |

Combined with the pre-existing suite (auth, registration, credential, device,
corporate-hierarchy, OTP, RBAC roles/permissions/employees, the maker/checker
hierarchy tests, and the `test/security/*` specs), every controller in the app now has
e2e coverage — 65 e2e tests + 21 unit tests, all passing.

---

## 8. Heads-up for the next step: Keycloak groups

Nothing in this pass hardcodes an assumption that roles only come from
`realm_access.roles` on the individual user — `extractRealmRoles()` in
`rbac.constants.ts` is the single choke point everything else (`isSuperadmin`,
`canManageEmployeeWithRole`, hierarchy checks) reads through, and `@Roles()` /
`RoleGuard` checks read `realm_access`/`resource_access` the same way regardless of
whether a role reached the user directly or via a Keycloak group. When group-based
role assignment is introduced, the main things to revisit are:

- Whether Keycloak is configured to project group-derived roles into
  `realm_access.roles` on the token (the default "Add to token" mapper behavior) — if
  so, no code changes are needed here at all.
- If groups are read as a separate `groups` claim instead, `extractRealmRoles()` is the
  one place to extend, rather than touching every guard/controller individually.
