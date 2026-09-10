# RBAC in This Project — A Complete Beginner's Guide

**Who this is for:** you, before your next code review.
**What it covers:** what NestJS is doing, what every file in the RBAC module does, where endpoints live, what decorators mean, what tokens do, where IDs come from, what Swagger is showing you, and how to debug.

Read it top to bottom once. Then keep sections 12 and 13 open during the review — they are the "answer sheet".

---

## Table of contents

1. [The 30-second version (say this first in the review)](#1-the-30-second-version)
2. [What is NestJS, in plain words](#2-what-is-nestjs-in-plain-words)
3. [The journey of one HTTP request](#3-the-journey-of-one-http-request)
4. [Decorators — the `@` things everywhere](#4-decorators--the--things-everywhere)
5. [The three-layer pattern: Controller → Service → Repository](#5-the-three-layer-pattern)
6. [Tokens: what they are, where they come from, what they do](#6-tokens)
7. [Keycloak — what it is and why it exists here](#7-keycloak)
8. [IDs — where every ID in this project is born](#8-ids--where-every-id-is-born)
9. [The RBAC module, file by file](#9-the-rbac-module-file-by-file)
10. [The database tables RBAC owns](#10-the-database-tables-rbac-owns)
11. [The permission rules — who can do what](#11-the-permission-rules)
12. [Swagger UI — what you are actually looking at](#12-swagger-ui)
13. [Walkthroughs: four flows end to end](#13-walkthroughs)
14. [How to run and debug this project](#14-how-to-run-and-debug)
15. [Vocabulary cheat sheet](#15-vocabulary-cheat-sheet)
16. [Likely review questions with short answers](#16-likely-review-questions)

---

## 1. The 30-second version

> This is a NestJS backend service called `identity-billpay-admin-service`. It handles identity, bill payment and admin functions for a banking platform.
>
> My part is **RBAC — Role Based Access Control**. RBAC answers one question: *"is this logged-in person allowed to do this action?"*
>
> We do **not** store passwords ourselves. **Keycloak** (an external identity server) stores users and passwords and issues JWT tokens. Our database stores the *business meaning* of roles: which permissions a role has, which employee holds which role, and which admin was delegated the right to hand out which role.
>
> So every role lives in two places, kept in sync: in Keycloak (so it appears inside the user's token) and in our MySQL DB (so we can attach permissions and audit trails to it).

That paragraph alone answers most of "what does your part do".

---

## 2. What is NestJS, in plain words

NestJS is a framework for writing backend servers in TypeScript. Think of it as an organised way to write "when a request comes to this URL, run this function".

Under the hood it uses **Express** (the classic Node.js web server). NestJS just adds structure on top.

Nest has five words you must know:

| Word | What it is | Real example in this project |
|---|---|---|
| **Module** | A box that groups related code together | `RbacModule` in [src/modules/rbac/rbac.module.ts](src/modules/rbac/rbac.module.ts) |
| **Controller** | Defines the URLs (endpoints) and receives requests | `RolesController` |
| **Service** | Contains the actual business logic and DB calls | `RolesService` |
| **Entity** | A TypeScript class that maps to a database table | `Role` → table `rbac_role` |
| **DTO** | "Data Transfer Object" — describes and validates the JSON body | `CreateRoleDto` |

And two extras that matter a lot for you:

| Word | What it is | Example |
|---|---|---|
| **Guard** | A bouncer. Runs *before* the controller. Returns true (let in) or throws (reject) | `SuperadminGuard` |
| **Decorator** | The `@Something()` syntax that attaches meaning to a class/method/parameter | `@Post('create')` |

### The module system

A module is basically a declaration form. Look at [src/modules/rbac/rbac.module.ts](src/modules/rbac/rbac.module.ts):

```ts
@Module({
  imports: [ AuthModule, InternalEventBusModule, TypeOrmModule.forFeature([...]) ],
  controllers: [ RolesController, PermissionsController, EmployeesController, UsersController ],
  providers: [ RolesService, PermissionsService, EmployeesService, UsersAccessService, SuperadminGuard ],
})
export class RbacModule {}
```

Reading it in English:

- **`imports`** — "I need things from other boxes."
  - `AuthModule` → because it exports `KeycloakService`, and RBAC needs to talk to Keycloak.
  - `InternalEventBusModule` → so RBAC can announce "an employee was created".
  - `TypeOrmModule.forFeature([Role, Permission, ...])` → "give me database repositories for these six tables."
- **`controllers`** — "these classes own URLs."
- **`providers`** — "these classes can be injected into other classes."

Then `RbacModule` itself is listed in `imports` of [src/app.module.ts](src/app.module.ts), which is the root module. That is how the whole app knows RBAC exists.

### Dependency injection (the thing that looks like magic)

You will see this constantly:

```ts
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}
}
```

You never write `new RolesService(...)`. Nest does it for you. At startup Nest reads the `providers` list, creates one instance of each (a *singleton*), and passes it into every constructor that asks for it by type.

This is called **dependency injection (DI)**. The benefit: in tests you can swap the real `KeycloakService` for a fake one without changing the service code — which is exactly what [test/e2e/helpers/test-app.ts](test/e2e/helpers/test-app.ts) does with `mockKeycloakService`.

**If asked "why constructor injection?"** → "So classes don't build their own dependencies. That makes them testable and lets Nest manage one shared instance."

---

## 3. The journey of one HTTP request

This is the single most valuable thing to memorise. When someone calls `POST /api/v1/roles/create`, this happens **in this order**:

```
   Postman / Swagger sends the request
                │
                ▼
 1. Express receives it on port 3000
                │
                ▼
 2. helmet()                     ← security headers        (main.ts:18-27)
                │
                ▼
 3. CORS                         ← allow browser calls     (main.ts:28)
                │
                ▼
 4. normalizeBearerMiddleware    ← cleans the Authorization header (main.ts:29)
                │
                ▼
 5. Route matching: /api/v1 + /roles + /create → RolesController.create
                │
                ▼
 6. GLOBAL GUARDS  (app.module.ts:46-47)
      a) AuthGuard  (nest-keycloak-connect)
         • reads the Bearer token
         • verifies the signature
         • decodes it and puts the claims on request.user
         • no valid token → 401 Unauthorized, stop here
      b) RoleGuard  (nest-keycloak-connect)
                │
                ▼
 7. ROUTE GUARD    @UseGuards(SuperadminGuard)
         • reads request.user
         • is BANK_SUPER_ADMIN present? no → 403 Forbidden, stop here
                │
                ▼
 8. GLOBAL PIPE: ValidationPipe   (main.ts:31)
         • takes the raw JSON body
         • turns it into a CreateRoleDto instance
         • runs the class-validator rules (@IsNotEmpty, @MaxLength ...)
         • strips unknown fields (whitelist: true)
         • invalid → 400 Bad Request, stop here
                │
                ▼
 9. INTERCEPTORS (before)  (main.ts:33)
                │
                ▼
10. ✅ THE CONTROLLER METHOD FINALLY RUNS
        RolesController.create(dto, user)
              → calls RolesService.create(dto, user.sub)
                    → calls KeycloakService.createRealmRole()   (HTTP to Keycloak)
                    → calls this.roles.save(...)                (INSERT into MySQL)
                │
                ▼
11. INTERCEPTORS (after)
                │
                ▼
12. If anything threw → HttpExceptionFilter formats the error (main.ts:32)
                │
                ▼
13. JSON response goes back
```

**Memorise the order:** *middleware → guards → pipes → interceptor → controller → service → repository → DB.*

Guards run **before** validation. That means a request with a bad token is rejected before we even look at the body. That's deliberate — don't waste work on unauthenticated callers.

### The four pieces registered globally in `main.ts`

Look at [src/main.ts](src/main.ts):

| Line | Code | What it does |
|---|---|---|
| 14 | `app.setGlobalPrefix('api/v1')` | Every URL gets `/api/v1` in front. That's why the endpoint is `/api/v1/roles/create` and not `/roles/create`. |
| 29 | `app.use(normalizeBearerMiddleware)` | Fixes `Bearer Bearer <token>` when people paste wrong in Swagger. See [normalize-bearer.middleware.ts](src/common/middleware/normalize-bearer.middleware.ts). |
| 31 | `useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))` | Validates every DTO. `whitelist` deletes fields you didn't declare; `transform` converts the plain JSON into the actual DTO class. |
| 32 | `useGlobalFilters(new HttpExceptionFilter())` | Catches every thrown error and returns a consistent JSON shape. |

**Important detail about `ValidationPipe`:** without `whitelist: true`, if someone posted `{"name": "X", "isSuperUser": true}` the extra field would sit in your object. With it, unknown fields are silently dropped. That is a security feature, not a convenience.

---

## 4. Decorators — the `@` things everywhere

A decorator is a function that attaches **metadata** to a class, method, or parameter. It does not run your code; it labels it, and NestJS reads those labels at startup.

Analogy: decorators are sticky notes on a form. The form is your class. Nest reads the notes and decides what to do.

### 4a. Class-level decorators

```ts
@ApiTags('RBAC — Roles')   // Swagger: group these endpoints under this heading
@Controller('roles')       // Nest: every route in this class starts with /roles
export class RolesController { ... }
```

```ts
@Injectable()              // Nest: this class can be injected into others
export class RolesService { ... }
```

```ts
@Entity({ name: 'rbac_role' })   // TypeORM: this class maps to the table rbac_role
export class Role extends SoftDeleteEntity { ... }
```

### 4b. Method-level decorators

From [src/modules/rbac/controllers/roles.controller.ts:13-21](src/modules/rbac/controllers/roles.controller.ts#L13-L21):

```ts
@Post('create')                     // ① the endpoint: POST /api/v1/roles/create
@ApiBearerAuth()                    // ② Swagger: show a padlock, send the token
@UseGuards(SuperadminGuard)         // ③ run this guard before the method
@ApiOperation({ summary: '...' })   // ④ Swagger: title + description text
@ApiResponse({ status: 201, ... })  // ⑤ Swagger: document the success response
create(...) { ... }
```

Only ① and ③ change behaviour. ②, ④, ⑤ are **documentation only** — they change what Swagger shows, nothing else.

> **This is a very common review question.** "Does `@ApiBearerAuth()` protect the endpoint?" → **No.** It only makes Swagger send the token. The actual protection is the global `AuthGuard` plus `@UseGuards(SuperadminGuard)`.

### 4c. Parameter decorators

```ts
create(
  @Body() dto: CreateRoleDto,                        // give me the JSON body, as a validated DTO
  @AuthenticatedUser() user: Record<string, unknown> // give me the decoded token claims
) { ... }
```

- `@Body()` — Nest hands you `request.body`, run through the ValidationPipe.
- `@AuthenticatedUser()` — from the `nest-keycloak-connect` library. Hands you `request.user`, i.e. the decoded JWT payload that `AuthGuard` put there.
- `@Req()` — the raw Express request (used in `SessionController.me`).

There is also a **custom** parameter decorator in this repo, [src/common/decorators/current-user.decorator.ts](src/common/decorators/current-user.decorator.ts):

```ts
export const CurrentUser = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return request.user;
});
```

That is literally the whole thing — it reads `request.user` and returns it. It does the same job as `@AuthenticatedUser()`. Knowing this is useful: **you can now explain how a parameter decorator is built, not just used.**

### 4d. Validation decorators (on DTOs)

From [src/modules/rbac/dto/role.dto.ts](src/modules/rbac/dto/role.dto.ts):

```ts
export class CreateRoleDto {
  @ApiProperty({ example: 'BANK_MAKER' })  // Swagger: show this example
  @IsNotEmpty()                            // class-validator: reject empty
  @IsString()                              // class-validator: must be a string
  @MaxLength(100)                          // class-validator: max 100 chars
  name: string;
}
```

Two different libraries are at work:
- `@ApiProperty` / `@ApiPropertyOptional` → **`@nestjs/swagger`** → affects the docs page only.
- `@IsNotEmpty` / `@IsString` / `@IsUUID` / `@IsEmail` → **`class-validator`** → actually rejects bad input with 400.

`@IsUUID()` matters in this project: `roleId`, `employeeId`, `permissionIds` must be real UUIDs, so a typo gets a 400 rather than a confusing 404 later.

### 4e. TypeORM decorators (on entities)

From [src/modules/rbac/entities/role.entity.ts](src/modules/rbac/entities/role.entity.ts):

| Decorator | Meaning |
|---|---|
| `@Entity({ name: 'rbac_role' })` | This class = this table |
| `@Column({ length: 100 })` | A normal column |
| `@Column({ name: 'display_name' })` | Property `displayName` maps to column `display_name` |
| `@PrimaryGeneratedColumn('uuid')` | Primary key, auto-generated UUID |
| `@Index({ unique: true })` | Add a unique index on that column |
| `@OneToMany(...)` / `@ManyToOne(...)` | Table relationships (foreign keys) |
| `@CreateDateColumn` / `@UpdateDateColumn` / `@DeleteDateColumn` | Auto-managed timestamps |

**In one line:** *"Decorators are metadata. Nest, TypeORM, class-validator and Swagger each read the ones they care about at startup and wire up behaviour accordingly."*

---

## 5. The three-layer pattern

Every feature in this project follows the same shape. Once you see it once, you can read any file here.

```
Controller  →  "I own the URL. I take the request apart and hand it over."
    │           No business logic. No SQL. Usually 1-3 lines per method.
    ▼
Service     →  "I am the brain. I check rules, call Keycloak, call the DB, build the response."
    │           All decisions happen here.
    ▼
Repository  →  "I am TypeORM. I turn method calls into SQL."
    │           You never write this class — TypeORM provides it.
    ▼
MySQL
```

Concrete example — creating a role:

**Controller** ([roles.controller.ts:22-27](src/modules/rbac/controllers/roles.controller.ts#L22-L27)):
```ts
create(@Body() dto: CreateRoleDto, @AuthenticatedUser() user: Record<string, unknown>) {
  return this.rolesService.create(dto, user.sub as string);
}
```
That's it. One line. It pulls `sub` (the Keycloak user id of the caller) out of the token and passes it down so the service can record *who* did this.

**Service** ([roles.service.ts:32-60](src/modules/rbac/services/roles.service.ts#L32-L60)): checks for duplicates, calls Keycloak, saves to DB, saves delegations, returns the full role.

**Repository**: injected in the constructor —

```ts
constructor(
  @InjectRepository(Role) private readonly roles: Repository<Role>,
  ...
) {}
```

`@InjectRepository(Role)` says "give me TypeORM's repository for the `Role` entity". This works **only because** `Role` is listed in `TypeOrmModule.forFeature([...])` in `rbac.module.ts`. If you ever see the error *"Repository not found / can't resolve dependency"*, that's the cause: you forgot to add the entity to `forFeature`.

The repository methods you'll see in RBAC:

| Method | SQL equivalent |
|---|---|
| `this.roles.findOne({ where: { id } })` | `SELECT ... WHERE id = ? LIMIT 1` |
| `this.roles.find({ where: { id: In([...]) } })` | `SELECT ... WHERE id IN (...)` |
| `this.roles.create({...})` | Builds an object in memory — **does not touch the DB** |
| `this.roles.save(entity)` | `INSERT` (or `UPDATE` if the id exists) |
| `this.rolePermissions.delete({ roleId })` | `DELETE ... WHERE role_id = ?` |
| `{ relations: ['permission'] }` | adds a `JOIN` to fetch the related row |

> **Watch out:** `create()` does **not** save. `create()` then `save()` is the standard pair, and you'll see it everywhere in these services.

---

## 6. Tokens

This is the part you said you couldn't explain. Here it is completely.

### What a JWT is

A **JWT** (JSON Web Token) is a long string with three parts separated by dots:

```
eyJhbGciOiJSUzI1NiIs...  .  eyJzdWIiOiI3ZjNjMmIxYS0...  .  QW5kVGhlU2ln...
        HEADER                        PAYLOAD                  SIGNATURE
```

- **Header** — which algorithm signed it (`RS256` here).
- **Payload** — the actual data, called **claims**. This is base64 — *anyone can read it*. It is **not encrypted**.
- **Signature** — proof that Keycloak issued it and nobody edited it.

Key insight: **a JWT is not secret, it is tamper-proof.** If an attacker changes `"roles": ["BANK_MAKER"]` to `"roles": ["BANK_SUPER_ADMIN"]`, the signature no longer matches and our `AuthGuard` rejects it with 401.

### The claims we actually use

Decode a token from this system and the payload looks roughly like:

```json
{
  "exp": 1736412345,
  "iat": 1736412045,
  "iss": "http://103.209.145.243:8201/realms/bharat-banking",
  "sub": "7f3c2b1a-9d4e-4c8f-b2a1-6e5d4c3b2a19",
  "preferred_username": "bank.superadmin",
  "email": "superadmin@bank.example.com",
  "realm_access": {
    "roles": ["BANK_SUPER_ADMIN", "offline_access"]
  }
}
```

The two claims **your RBAC code depends on**:

| Claim | Meaning | Where the code uses it |
|---|---|---|
| **`sub`** | Subject — the caller's **Keycloak user ID** (a UUID) | `user.sub as string` in every controller; stored as `createdByKeycloakUserId`, `assignedByKeycloakUserId`, `mappedByKeycloakUserId`, `grantedByKeycloakUserId` |
| **`realm_access.roles`** | Array of realm role names the user holds | `extractRealmRoles()` in [rbac.constants.ts:41-54](src/modules/rbac/constants/rbac.constants.ts#L41-L54) |

Look at `extractRealmRoles` — it reads `user.realm_access.roles`, and falls back to `user.roles` if that's missing (so tests can pass a simpler object).

Everything RBAC decides — superadmin or not, hierarchy level, can-assign-this-role — comes from `realm_access.roles`. **That is why roles must exist in Keycloak, not just in our DB.** If a role only existed in MySQL, it would never appear in a token, and no guard could see it.

### Access token vs refresh token

`POST /api/v1/auth/login` returns both ([token-response.dto.ts](src/modules/auth/session/dto/token-response.dto.ts), built in [keycloak.service.ts:72-79](src/modules/auth/keycloak/keycloak.service.ts#L72-L79)):

| | **accessToken** | **refreshToken** |
|---|---|---|
| Purpose | Prove who you are on every API call | Get a new accessToken when the old one expires |
| Sent as | `Authorization: Bearer <accessToken>` | Only sent to Keycloak, never to our endpoints |
| Lifetime | Short — `expiresIn`, typically 5 min | Longer — `refreshExpiresIn`, ~30 min |
| Used by | Our `AuthGuard` | `POST /auth/logout` (see [session.controller.ts:43-45](src/modules/auth/session/session.controller.ts#L43-L45)) |

> **Classic mistake:** pasting the `refreshToken` into Swagger's Authorize box. It will fail. The Swagger description in [main.ts:54-55](src/main.ts#L54-L55) even warns about it.

### The three different tokens in this system

This trips people up. There are **three**, and mixing them up is a great way to fail a review:

1. **The caller's user token** — obtained by `POST /auth/login`, held by the human using Swagger/Postman. Identifies *who is making the request*. Sent as `Authorization: Bearer ...`.

2. **The admin-cli service token** — obtained inside our backend by `getAdminAccessToken()` ([keycloak.service.ts:124-145](src/modules/auth/keycloak/keycloak.service.ts#L124-L145)). It logs into the Keycloak **master** realm with `KEYCLOAK_ADMIN_USERNAME` / `KEYCLOAK_ADMIN_PASSWORD` from `.env`, using client `admin-cli`. This token lets our service **manage** Keycloak — create roles, create users, assign role mappings. The end user never sees it.

3. **The realm public key** — not a token. It's how `AuthGuard` verifies signature #1 offline (`KEYCLOAK_TOKEN_VALIDATION=offline`).

**Say it like this in the review:** *"The user's token proves who the caller is. A separate service-account token, fetched from Keycloak's master realm using admin credentials in the .env, is what lets our backend create roles and users inside Keycloak."*

Notice that `getAdminAccessToken()` is called at the top of **every** admin method — `createRealmRole`, `createUser`, `assignRealmRoleToUser`, etc. There's no caching, so each admin operation does an extra round-trip to Keycloak. (That's a fine thing to point out as a known trade-off if anyone asks about performance.)

### How the token gets validated: `AuthGuard`

In [src/app.module.ts:45-48](src/app.module.ts#L45-L48):

```ts
providers: [
  { provide: APP_GUARD, useClass: AuthGuard },
  { provide: APP_GUARD, useClass: RoleGuard },
],
```

`APP_GUARD` is a special Nest token meaning "register this guard globally, for every route in the app". So **every endpoint requires a valid token by default**. That's a safe default: you have to opt *out*, not opt *in*.

The opt-out is `@Public()` — used on `/auth/login` and `/auth/logout` in [session.controller.ts:19,33](src/modules/auth/session/session.controller.ts#L19). Obviously login can't require a token; you don't have one yet.

Config for these guards is in [src/config/keycloak-connect.config.ts](src/config/keycloak-connect.config.ts):

| Setting | Value | Meaning |
|---|---|---|
| `bearerOnly: true` | | We're an API, not a website. Never redirect to a login page; just 401. |
| `tokenValidation` | `OFFLINE` | Verify the signature locally using the realm public key. Fast — no call to Keycloak per request. Trade-off: a token revoked at Keycloak still works until it expires. |
| `policyEnforcement` | `PERMISSIVE` | Endpoints without an explicit policy are allowed through (auth still required). `ENFORCING` would deny anything undeclared. |
| `verifyTokenAudience: false` | | Don't check the `aud` claim — because two clients (`admin-web`, `mobile-app`) share this API. |

---

## 7. Keycloak

**Keycloak is an open-source identity server.** It stores users, passwords, roles and sessions, and issues JWTs. It runs at `http://103.209.145.243:8201` (see `.env`), on realm **`bharat-banking`**.

Terms:

| Keycloak term | Meaning |
|---|---|
| **Realm** | An isolated tenant — its own users, roles, clients. Ours is `bharat-banking`. `master` is Keycloak's own admin realm. |
| **Client** | An application allowed to request tokens. Here: `admin-web` (bank staff portal) and `mobile-app` (customers). |
| **Realm role** | A role defined at realm level, e.g. `BANK_MAKER`. These are what land in `realm_access.roles`. |
| **Role mapping** | The link between a user and a role. |
| **Service account / admin-cli** | The technical account our backend uses to administer Keycloak. |

### Why do we have roles in BOTH Keycloak and MySQL?

**This is the #1 question you will be asked.** The answer:

| Keycloak stores | Our MySQL stores |
|---|---|
| That the role **exists** | The role's `displayName`, `description`, `dutyType` (MAKER/CHECKER) |
| That user X **holds** the role | Which **permissions** the role grants (`rbac_role_permission`) |
| Puts the role name in the **token** | Which **admins are delegated** the right to assign it (`rbac_delegated_role`) |
| | **Who** assigned what, and **when** (audit columns) |

Keycloak has no concept of "the BANK_MAKER role includes the EMPLOYEE_CREATE permission" in the way our business needs, and no place to record maker-checker segregation or delegation. So Keycloak is the **authentication + token** source of truth, and our DB is the **business authorization** source of truth.

The link between them is stored on the `Role` entity as **two columns**: `keycloak_role_id` and `keycloak_role_name` ([role.entity.ts:20-26](src/modules/rbac/entities/role.entity.ts#L20-L26)).

### Keycloak Admin REST calls this service makes

All in [src/modules/auth/keycloak/keycloak.service.ts](src/modules/auth/keycloak/keycloak.service.ts):

| Method | HTTP call to Keycloak | Used by |
|---|---|---|
| `login()` | `POST /realms/{realm}/protocol/openid-connect/token` | `/auth/login` |
| `logout()` | `POST /realms/{realm}/protocol/openid-connect/logout` | `/auth/logout` |
| `createRealmRole()` | `POST /admin/realms/{realm}/roles` then `GET .../roles/{name}` | `/roles/create` |
| `updateRealmRole()` | `GET` then `PUT /admin/realms/{realm}/roles/{name}` | `/roles/update` |
| `createUser()` | `POST /admin/realms/{realm}/users` + `PUT .../reset-password` | `/employees/create` |
| `assignRealmRoleToUser()` | `GET .../roles/{name}` then `POST .../users/{id}/role-mappings/realm` | `/employees/create`, `/employees/update-role` |
| `removeRealmRoleFromUser()` | `DELETE .../users/{id}/role-mappings/realm` | `/employees/update-role` |
| `getUserRealmRoles()` | `GET .../users/{id}/role-mappings/realm` | responses + `/users/fetch-access-details` |
| `findUsers()` | `GET .../users?username=&email=` or `GET .../users/{id}` | `/users/fetch-access-details` |

One nice detail worth mentioning: `createRealmRole` uses `validateStatus: (s) => s < 500` and then explicitly tolerates **409 Conflict** ([keycloak.service.ts:164-171](src/modules/auth/keycloak/keycloak.service.ts#L164-L171)). Reason given in the comment: the role may have been pre-seeded in Keycloak; we don't want a duplicate, we just want its id. So it creates-or-ignores, then always `GET`s the role to read the real id.

---

## 8. IDs — where every ID is born

Another question you got stuck on. There are **two families of IDs**, and telling them apart is the whole answer.

### Family 1: Keycloak user IDs (created by Keycloak)

When we call `POST /admin/realms/{realm}/users`, Keycloak creates the user and returns **201 with no body**. The new user's ID is in the **`Location` response header**:

```
Location: http://.../admin/realms/bharat-banking/users/7f3c2b1a-9d4e-4c8f-b2a1-6e5d4c3b2a19
```

Our code extracts it in [keycloak.service.ts:239-252](src/modules/auth/keycloak/keycloak.service.ts):

```ts
const location = createResponse.headers.location as string | undefined;
const userId = location?.split('/').pop();
if (!userId) {
  const users = await this.findUsersByUsername(payload.username);  // fallback
  ...
}
```

So: **split the Location header on `/` and take the last segment.** If the header is missing (some proxies strip it), it falls back to searching by username. That fallback is a genuinely good detail to mention — it shows defensive coding.

That UUID is then stored in our DB as `Employee.keycloakUserId`, and it is the same value that later appears as `sub` in that user's token.

### Family 2: Our own IDs (created by MySQL/TypeORM)

Every RBAC table's primary key comes from:

```ts
@PrimaryGeneratedColumn('uuid')
id: string;
```

For `Role`, `Permission` and `Employee` this is inherited from [SoftDeleteEntity](src/common/entities/soft-delete.entity.ts), which also gives every one of them `createdAt`, `updatedAt` and `deletedAt`. The join tables (`RolePermission`, `EmployeeUserRole`, `DelegatedRole`) declare their own `@PrimaryGeneratedColumn('uuid')`.

The UUID is generated when you call `.save()`.

### Putting it together

| ID | Looks like | Created by | Lives in | Also appears as |
|---|---|---|---|---|
| **Keycloak user ID** | UUID | Keycloak, returned in `Location` header | `rbac_employee.keycloak_user_id` | the `sub` claim in that user's JWT |
| **Keycloak role ID** | UUID | Keycloak, read back via `GET /roles/{name}` | `rbac_role.keycloak_role_id` | — |
| **Local role ID** | UUID | TypeORM on `roles.save()` | `rbac_role.id` | the `roleId` you pass to `/employees/create` |
| **Local permission ID** | UUID | TypeORM on `permissions.save()` | `rbac_permission.id` | the `permissionIds` in `/roles/map-permissions` |
| **Local employee ID** | UUID | TypeORM on `employees.save()` | `rbac_employee.id` | the `employeeId` in `/employees/update-role` |
| **Actor ID** | UUID | *not created* — copied from `user.sub` | `created_by_...`, `assigned_by_...`, `mapped_by_...`, `granted_by_...` | — |

**The sentence to say:** *"There are two ID families. Keycloak generates the user and role IDs and we read the user ID out of the Location header of the create-user response. Our own tables generate UUID primary keys via TypeORM's `@PrimaryGeneratedColumn('uuid')`. We store the Keycloak IDs alongside our own so the two systems stay linked."*

### Where does the actor ID go?

Every write in RBAC records who did it, taken from `user.sub`:

| Column | Table | Set in |
|---|---|---|
| `created_by_keycloak_user_id` | `rbac_employee` | `EmployeesService.create` |
| `assigned_by_keycloak_user_id` | `rbac_employee_user_role` | `EmployeesService.create` / `updateRole` |
| `mapped_by_keycloak_user_id` | `rbac_role_permission` | `RolesService.mapPermissions` |
| `granted_by_keycloak_user_id` | `rbac_delegated_role` | `RolesService.replaceDelegations` |

That's your audit trail. In a banking system this matters — "who gave this person BANK_CHECKER?" must be answerable.

---

## 9. The RBAC module, file by file

Location: [src/modules/rbac/](src/modules/rbac/)

```
rbac/
├── rbac.module.ts                       ← wiring
├── constants/rbac.constants.ts          ← ⭐ ALL the rules live here
├── controllers/                         ← the endpoints
│   ├── roles.controller.ts
│   ├── permissions.controller.ts
│   ├── employees.controller.ts
│   └── users.controller.ts
├── services/                            ← the logic
│   ├── roles.service.ts
│   ├── permissions.service.ts
│   ├── employees.service.ts
│   └── users-access.service.ts
├── entities/                            ← the 6 tables
│   ├── role.entity.ts
│   ├── permission.entity.ts
│   ├── role-permission.entity.ts
│   ├── employee.entity.ts
│   ├── employee-user-role.entity.ts
│   └── delegated-role.entity.ts
├── dto/                                 ← request shapes + validation
│   ├── role.dto.ts
│   ├── permission.dto.ts
│   ├── employee.dto.ts
│   └── fetch-access-details.dto.ts
├── guards/superadmin.guard.ts           ← the bouncer
└── events/employee-account-synced.event.ts
```

### 9.1 `constants/rbac.constants.ts` — **the most important file in your module**

If you memorise one file, memorise this one. It contains no classes — just constants and pure functions that everything else calls.

**Role name lists:**
```ts
export const SUPERADMIN_ROLES = ['BANK_SUPER_ADMIN', 'SUPERADMIN', 'superadmin'];
export const DELEGATING_ADMIN_ROLES = ['BANK_ADMIN', 'BANK_SUPER_ADMIN'];
```
Three spellings of superadmin are accepted because Keycloak realms in different environments were seeded with different casing.

**The hierarchy ladder:**
```ts
export const ROLE_HIERARCHY_LEVELS = {
  BANK_SUPER_ADMIN: 100,  SUPERADMIN: 100,  superadmin: 100,
  BANK_ADMIN: 80,
  BANK_MAKER: 50,  BANK_CHECKER: 50,
  CORPORATE_IT_ADMIN: 40,
  CORPORATE_MAKER: 30,  CORPORATE_CHECKER: 30,
  CORPORATE_VIEWER: 20,
  RETAIL_CUSTOMER: 10,
};
export const DEFAULT_ROLE_HIERARCHY_LEVEL = 10;
```
Higher number = more powerful. This is what enforces "you can't promote someone to your own level".

**Maker–Checker duty type:**
```ts
export const MAKER_ROLE_PATTERN = /MAKER/i;
export const CHECKER_ROLE_PATTERN = /CHECKER/i;

export enum RoleDutyType { MAKER = 'MAKER', CHECKER = 'CHECKER', OTHER = 'OTHER' }

export function resolveRoleDutyType(roleName: string): RoleDutyType { ... }
```
Any role whose name contains "MAKER" is a MAKER; "CHECKER" → CHECKER; anything else → OTHER. This is computed once at role-creation time and stored in `rbac_role.duty_type`.

*Maker–Checker* is a banking control: the person who **creates** a transaction must not be the person who **approves** it. Segregation of duties.

**The seven functions:**

| Function | What it answers |
|---|---|
| `extractRealmRoles(user)` | "What roles does this token carry?" Reads `realm_access.roles`, falls back to `user.roles`, else `[]`. |
| `isSuperadmin(user)` | "Does this user hold any superadmin role name?" |
| `isEmployeeManager(user)` | "Is this user a superadmin OR a BANK_ADMIN?" — i.e. allowed to touch employees at all. |
| `resolveRoleDutyType(name)` | MAKER / CHECKER / OTHER from the role name. |
| `resolveRoleHierarchyLevel(name)` | Role name → number. Tries exact match, then normalised UPPER_SNAKE, then regex patterns, then defaults to 10. |
| `resolveActorHierarchyLevel(actor)` | Takes the **max** level across all the caller's roles. |
| `canManageEmployeeWithRole(actor, employeeRole)` | Superadmin → always true. Otherwise `actorLevel > employeeLevel` (strictly greater). |
| `canAssignRoleToEmployee(actor, targetRole)` | Same rule, for the role being handed out. |

Note the **strictly greater than** in both:
```ts
return resolveActorHierarchyLevel(actor) > resolveRoleHierarchyLevel(employeeRoleName);
```
A BANK_ADMIN (80) cannot manage another BANK_ADMIN (80), and cannot assign BANK_ADMIN. Only a superadmin (100) can. That's the "no lateral privilege escalation" rule.

`resolveRoleHierarchyLevel` is worth reading in full ([lines 69-92](src/modules/rbac/constants/rbac.constants.ts#L69-L92)) — it's a four-step fallback chain, so a custom role like `"bank admin"` still resolves to 80 via normalisation, and an unknown role resolves to the *lowest* level 10 (fail-safe: unknown = least privilege).

### 9.2 `guards/superadmin.guard.ts`

The whole file ([superadmin.guard.ts](src/modules/rbac/guards/superadmin.guard.ts)):

```ts
@Injectable()
export class SuperadminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user?: Record<string, unknown> }>();
    if (!request.user) {
      throw new UnauthorizedException('Keycloak access token is required');   // 401
    }
    if (!isSuperadmin(request.user)) {
      throw new ForbiddenException('Only superadmin users can perform this operation'); // 403
    }
    return true;
  }
}
```

Things to be able to say about it:
- A guard implements the `CanActivate` interface with one method, `canActivate`.
- `ExecutionContext` is protocol-agnostic; `switchToHttp().getRequest()` narrows it to an HTTP request.
- `request.user` was put there by the **global `AuthGuard`**, which ran earlier. This guard doesn't parse the token itself.
- 401 vs 403: **401 = I don't know who you are. 403 = I know who you are, and you're not allowed.**
- It's applied per-route with `@UseGuards(SuperadminGuard)` — on all three `/roles/*` endpoints and on `/permissions/create`.
- It's listed in `providers` of `RbacModule`, which is what lets Nest inject it.

### 9.3 The four controllers — every endpoint in one table

Remember the global prefix `api/v1`, so the real URL is `/api/v1/<controller>/<method>`. **Everything is POST** in this project, even the reads — that's a deliberate house convention here (all endpoints POST, per the Swagger description in `main.ts`).

| Endpoint | Controller file | Guard | Service method |
|---|---|---|---|
| `POST /api/v1/roles/create` | [roles.controller.ts:13](src/modules/rbac/controllers/roles.controller.ts#L13) | `SuperadminGuard` | `RolesService.create` |
| `POST /api/v1/roles/update` | [roles.controller.ts:29](src/modules/rbac/controllers/roles.controller.ts#L29) | `SuperadminGuard` | `RolesService.update` |
| `POST /api/v1/roles/map-permissions` | [roles.controller.ts:45](src/modules/rbac/controllers/roles.controller.ts#L45) | `SuperadminGuard` | `RolesService.mapPermissions` |
| `POST /api/v1/permissions/create` | [permissions.controller.ts:12](src/modules/rbac/controllers/permissions.controller.ts#L12) | `SuperadminGuard` | `PermissionsService.create` |
| `POST /api/v1/employees/create` | [employees.controller.ts:12](src/modules/rbac/controllers/employees.controller.ts#L12) | *(checked in service)* | `EmployeesService.create` |
| `POST /api/v1/employees/update-role` | [employees.controller.ts:28](src/modules/rbac/controllers/employees.controller.ts#L28) | *(checked in service)* | `EmployeesService.updateRole` |
| `POST /api/v1/users/fetch-access-details` | [users.controller.ts:11](src/modules/rbac/controllers/users.controller.ts#L11) | *(token only)* | `UsersAccessService.fetchAccessDetails` |

**Be ready for this question: "why do roles use a guard but employees don't?"**

Because they need different answers. `/roles/*` is a flat yes/no — superadmin only — which a guard expresses perfectly. `/employees/*` needs to look at the **target** role: which role is being assigned, what role the employee currently holds, whether a delegation row exists. A guard runs before the service and doesn't have that data loaded, so those checks live inside `EmployeesService` (`assertCanManageEmployees`, `assertActorCanAssignRole`, `assertActorCanManageEmployee`) plus `RolesService.assertCanAssignRole`.

That's not sloppiness — it's the right split. Guards for coarse checks, service assertions for data-dependent ones.

**Where is an endpoint written in the code?** Answer for the review:

> An endpoint is two pieces. `@Controller('roles')` on the class gives the path prefix, and `@Post('create')` on the method gives the rest. Nest joins them and prepends the global prefix from `main.ts`, giving `POST /api/v1/roles/create`. The method right underneath the decorator is the handler that runs.

### 9.4 `services/roles.service.ts`

Six methods. Read this file at least once end to end.

**`create(dto, actorKeycloakUserId)`** — [lines 32-60](src/modules/rbac/services/roles.service.ts#L32-L60)
1. `findOne({ where: { name } })` — if it exists → `ConflictException` (409).
2. `keycloakService.createRealmRole(...)` — create in Keycloak **first**, get back `{ id, name }`.
3. `roles.save(roles.create({...}))` — save locally with `keycloakRoleId`, `keycloakRoleName`, and `dutyType: resolveRoleDutyType(dto.name)`.
4. If `delegatedAdminKeycloakUserIds` was supplied → `replaceDelegations(...)`.
5. Return `findRoleWithPermissions(role.id)`.

> **Order matters, and it's a fair review question.** Keycloak first, DB second. If Keycloak fails we never write a local row (good). If the *DB* fails after Keycloak succeeded, we get an orphan role in Keycloak — there's no transaction spanning the two systems. Honest answer: *"There's no distributed transaction here. A Keycloak-success/DB-failure leaves an orphan realm role. It's tolerable because `createRealmRole` treats 409 as success, so a retry is idempotent."* Saying that shows you actually understand the code.

**`update(dto, actor)`** — [lines 62-90](src/modules/rbac/services/roles.service.ts#L62-L90)
Loads the role (404 if missing), pushes `description` to Keycloak if it changed, updates `displayName` / `isActive` locally, optionally replaces delegations.
Note: only `description` is synced to Keycloak. `displayName` and `isActive` are local-only concepts.

**`mapPermissions(dto, actor)`** — [lines 92-117](src/modules/rbac/services/roles.service.ts#L92-L117)
1. Load the role → 404 if missing.
2. Load all permissions where `id IN (...)` **and `isActive: true`**.
3. **If `permissions.length !== dto.permissionIds.length` → 400.** This is the clever bit: it catches both non-existent IDs and inactive ones in a single comparison.
4. `rolePermissions.delete({ roleId })` — wipe all existing mappings.
5. Insert the new ones.

> It's a **replace**, not an append. Send `[]` and the role loses all permissions. The DTO description says so explicitly: *"replaces existing mappings"*.

**`findRoleWithPermissions(roleId)`** — [lines 119-152](src/modules/rbac/services/roles.service.ts#L119-L152)
Assembles the response object: role fields + flattened permissions (via `relations: ['permission']`) + the list of delegated admin user IDs. This is the shape you see in Swagger after any `/roles/*` call.

**`assertMakerCheckerCompatibility(roleIds)`** — [lines 154-163](src/modules/rbac/services/roles.service.ts#L154-L163)
Loads the roles, throws 400 if the set contains both a MAKER and a CHECKER.

> **Be honest if asked:** as called today, it only ever receives a single role id (`[dto.roleId]`), so it can never trip — one role can't be both. It's written for a future where an employee holds multiple roles simultaneously. Knowing that is much better than pretending it does more than it does.

**`assertCanAssignRole(actor, roleId)`** — [lines 165-193](src/modules/rbac/services/roles.service.ts#L165-L193)
This is the **delegation** check, and it's the heart of the design:
1. Load the role where `isActive: true` → 404 if not found.
2. If the actor is a superadmin → return the role immediately. Superadmin bypasses delegation.
3. Otherwise look for a row in `rbac_delegated_role` matching `(roleId, delegateKeycloakUserId = actor.sub)`.
4. No row → `ForbiddenException`: *"You are not authorized to assign this role. Superadmin delegation is required."*

**`replaceDelegations(roleId, delegateIds, grantedBy)`** — private, [lines 195-212](src/modules/rbac/services/roles.service.ts#L195-L212)
Delete all delegations for the role, then insert the new set. Same replace-not-append semantics as permissions.

### 9.5 `services/employees.service.ts`

**`create(dto, actor)`** — [lines 33-117](src/modules/rbac/services/employees.service.ts#L33-L117)

The permission checks run **in this order**, and being able to recite them is impressive:

```ts
this.assertCanManageEmployees(actor);                                  // ① superadmin or BANK_ADMIN?
const role = await this.rolesService.assertCanAssignRole(actor, dto.roleId); // ② delegated for this role?
await this.rolesService.assertMakerCheckerCompatibility([dto.roleId]); // ③ maker/checker clash?
this.assertActorCanAssignRole(actor, role.name);                       // ④ hierarchy: my level > target level?
```

Four independent gates. Then:

5. Duplicate username check → 409.
6. `keycloakService.createUser(...)` → creates the user, sets the password, returns the new Keycloak ID.
7. `keycloakService.assignRealmRoleToUser(keycloakUser.id, role.keycloakRoleName)` → the role now appears in that user's future tokens.
8. `employees.save(...)` → local `rbac_employee` row, recording `createdByKeycloakUserId: actor.sub`.
9. `employeeRoles.save(...)` → local `rbac_employee_user_role` link row.
10. `eventBus.publish(EMPLOYEE_ACCOUNT_SYNCED_EVENT, new EmployeeAccountSyncedEvent(...))`.
11. Return employee + roleAssignment + full role details + live `keycloakRealmRoles` (fetched back from Keycloak as confirmation).

**`updateRole(dto, actor)`** — [lines 119-206](src/modules/rbac/services/employees.service.ts#L119-L206)

Same gates, plus one extra that `create` doesn't need:

```ts
if (currentAssignment?.role) {
  this.assertActorCanManageEmployee(actor, currentAssignment.role.name);  // ⑤
}
```

You must out-rank both the **role you're granting** and the **role the employee currently holds**. Without ⑤, a BANK_ADMIN could demote another BANK_ADMIN. Then:

- If the new role equals the current one → 409 `"Employee already has this role assigned"`.
- Remove the old realm role from the Keycloak user, assign the new one.
- Update the existing `EmployeeUserRole` row in place (or create one if somehow missing), recording the new `assignedByKeycloakUserId`.
- Publish the same sync event.

> Note this is a **replace, one role per employee** model in practice — `updateRole` mutates the single existing assignment row rather than adding a second one.

**The three private assert methods** ([lines 208-230](src/modules/rbac/services/employees.service.ts#L208-L230)) are thin wrappers that call the `rbac.constants.ts` functions and throw `ForbiddenException` with a human-readable message. That's a nice pattern: the *rule* lives in a pure function (easy to unit-test), the *HTTP behaviour* lives in the service.

### 9.6 `services/permissions.service.ts`

The simplest file in the module ([permissions.service.ts](src/modules/rbac/services/permissions.service.ts)): check `code` isn't taken (409 if it is), insert, return. A permission is `code` + `name` + `module` + `action`, e.g. code `EMPLOYEE_CREATE`, module `EMPLOYEE`, action `CREATE`.

### 9.7 `services/users-access.service.ts`

Answers "what access does this person actually have?" — [users-access.service.ts](src/modules/rbac/services/users-access.service.ts).

1. `resolveEmployees(filters)` ([lines 151-185](src/modules/rbac/services/users-access.service.ts#L151-L185)) picks employees using the **first** filter present, in priority order: `employeeId` → `roleId` → `keycloakUserId` → `username` → `email`. No filter at all → the 100 most recent employees.
2. For each employee: fetch the Keycloak profile, fetch live Keycloak realm roles, fetch local role mappings, fetch the permissions of those roles, and assemble one combined object.
3. **Fallback** ([lines 96-146](src/modules/rbac/services/users-access.service.ts#L96-L146)): if nothing matched locally but a username/email/keycloakUserId was given, search Keycloak directly. Those users come back with `employee: null` — they exist in Keycloak but were never created through our `/employees/create` flow (e.g. seeded manually). Their roles are matched by *name* against our `rbac_role` table to still show permissions.
4. Returns `{ count, users: [...] }`.

> **Worth flagging yourself, before a reviewer does:** this loops and issues several queries per employee (N+1). With `take: 100` and two Keycloak round-trips each, an unfiltered call is slow. Saying *"I know this is N+1; it's acceptable because the endpoint is admin-only and capped at 100, but it would need joins or batching to scale"* turns a weakness into a strength.

### 9.8 `events/employee-account-synced.event.ts` and where it goes

RBAC publishes an event whenever an employee is created or their role changes:

```ts
export const EMPLOYEE_ACCOUNT_SYNCED_EVENT = 'rbac.employee-account.synced';
export class EmployeeAccountSyncedEvent {
  constructor(
    public readonly employeeId: string,
    public readonly keycloakUserId: string,
    public readonly username: string, public readonly email: string,
    public readonly firstName: string, public readonly lastName: string,
    public readonly roleId: string, public readonly roleName: string,
    public readonly isActive: boolean,
  ) {}
}
```

The bus is a thin wrapper around `@nestjs/event-emitter` — [internal-event-bus.service.ts](src/internal-events/internal-event-bus.service.ts). Its comment is explicit: *"In-process only — not a message broker."*

The listener is in the **admin** module: [admin-user-sync.listener.ts](src/modules/admin/admin-user/admin-user-sync.listener.ts). It subscribes in `onModuleInit()`, ignores any role not in `['BANK_SUPER_ADMIN','BANK_ADMIN','BANK_MAKER','BANK_CHECKER']`, and upserts a row into `admin_user`.

**Why does this exist?** So the admin portal has a fast, flat, read-only table of admin accounts without having to join four RBAC tables on every page load. That pattern is called a **read model** (or projection), and the comment at the top of [admin-user.controller.ts](src/modules/admin/admin-user/admin-user.controller.ts) says so:

> *"Read-only view over admin-portal accounts. Creation and role assignment stay owned by rbac/employees; this module only mirrors that data via the internal event bus."*

**This is a great thing to volunteer in a review**, because it shows you understand the boundary of your module: *RBAC owns writes; admin-user is a downstream read copy, kept in sync by an in-process event.*

One caveat to be honest about: the listener catches errors and only **logs** them (`.catch(error => this.logger.error(...))`). If the sync fails, the RBAC write still succeeded and the read model is silently stale. Fine for in-process; a real broker with retries would be the upgrade path.

---

## 10. The database tables RBAC owns

Database: **MySQL**, database name `db1` (see `.env`). Six tables:

```
        rbac_permission                         rbac_role                    rbac_delegated_role
        ───────────────                         ─────────                    ───────────────────
        id (uuid, PK)                           id (uuid, PK)                id (uuid, PK)
        code (unique)      ┌──────────────┐     name (unique)         ┌───── role_id (FK)
        name               │              │     display_name          │      delegate_keycloak_user_id
        description        │              │     description           │      granted_by_keycloak_user_id
        module             │              │     keycloak_role_id ◄────┼───── granted_at
        action             │              │     keycloak_role_name    │      UNIQUE(delegate, role_id)
        is_active          │              │     duty_type (enum)      │
        created/updated/   │              │     is_active             │
          deleted_at       │              │     created/updated/      │
              ▲            │              │       deleted_at          │
              │            │              │         ▲   ▲             │
              │            │              │         │   └─────────────┘
              │   rbac_role_permission    │         │
              │   ────────────────────    │         │      rbac_employee_user_role
              │   id (uuid, PK)           │         │      ──────────────────────
              └── permission_id (FK)      │         └───── role_id (FK)
                  role_id (FK) ───────────┘                employee_id (FK) ─────┐
                  mapped_by_keycloak_user_id               assigned_by_keycloak_user_id
                  created_at                               assigned_at           │
                  UNIQUE(role_id, permission_id)           UNIQUE(employee, role)│
                                                                                 │
                                              rbac_employee                      │
                                              ─────────────                      │
                                              id (uuid, PK)  ◄───────────────────┘
                                              keycloak_user_id (unique)
                                              username (unique)
                                              email, first_name, last_name
                                              employee_code (nullable)
                                              created_by_keycloak_user_id
                                              is_active
                                              created/updated/deleted_at
```

Read the relationships as sentences:

- A **Role** has many **Permissions** — through `rbac_role_permission` (a many-to-many join table).
- An **Employee** has **Roles** — through `rbac_employee_user_role` (in practice one, but the schema allows many).
- A **Role** can be **delegated** to admin users — through `rbac_delegated_role`, which lists Keycloak user IDs allowed to assign that role.

### Two schema details worth knowing

**1. Soft delete.** `Role`, `Permission` and `Employee` all `extends SoftDeleteEntity`, which adds `@DeleteDateColumn deleted_at`. When you call `repository.softRemove()`, TypeORM sets `deleted_at` instead of running `DELETE`, and automatically excludes those rows from future `find()` calls. Nothing is truly deleted — important for a banking audit trail. (The join tables don't extend it; they use hard `delete()` because they're replaceable mappings, not records of record.)

**2. Composite unique indexes.**
```ts
@Index(['roleId', 'permissionId'], { unique: true })     // rbac_role_permission
@Index(['employeeId', 'roleId'], { unique: true })       // rbac_employee_user_role
@Index(['delegateKeycloakUserId', 'roleId'], { unique: true })  // rbac_delegated_role
```
These are the database's own guarantee that you can't map the same permission to the same role twice, even if a race condition slips past the application check. Application checks are the friendly error; the unique index is the actual guarantee.

**3. `onDelete: 'CASCADE'`** on the `@ManyToOne` relations — delete a role and its permission mappings, employee mappings and delegations go with it.

### How do the tables get created?

Via `.env`:
```
DB_SYNCHRONIZE=true
```

`synchronize: true` ([database.config.ts:22](src/config/database.config.ts#L22)) tells TypeORM to look at your `@Entity` classes on every startup and reshape the database to match. Convenient for development — **and dangerous in production**, because it can drop columns.

The proper alternative is **migrations** — versioned SQL scripts. `package.json` has the commands:
```
npm run migration:generate
npm run migration:run
```
There's one example in the admin module: `src/modules/admin/migrations/1788856000000-CreateAdminModuleTables.ts`. The RBAC module has **no migrations folder** — it relies entirely on `synchronize`.

> **This will very likely come up.** Correct answer: *"RBAC tables are created by TypeORM's `synchronize: true`, which is fine for dev but must be turned off in production and replaced with migrations. The admin module already has a migration; RBAC doesn't yet."* That's a real, honest, informed answer.

---

## 11. The permission rules

There are **four independent layers** of authorization. This list is your best single answer to "explain your RBAC design".

### Layer 1 — Authentication (do you have a valid token?)
Global `AuthGuard` on every route. No/invalid/expired token → **401**. Opt out with `@Public()`.

### Layer 2 — Coarse role check (are you a superadmin?)
`SuperadminGuard` on `/roles/*` and `/permissions/create`. Not a superadmin → **403**.
For `/employees/*`, the equivalent is `assertCanManageEmployees` in the service: superadmin **or** BANK_ADMIN.

### Layer 3 — Delegation (were you specifically granted this role to hand out?)
`RolesService.assertCanAssignRole`. Superadmins skip it. Everyone else needs a row in `rbac_delegated_role` for that exact `(user, role)` pair.

This is the interesting part of the design: a superadmin doesn't just say "you're an admin" — they say *"you, specifically, may assign the BANK_MAKER role"*, by putting that user's Keycloak ID in `delegatedAdminKeycloakUserIds` when creating or updating the role.

### Layer 4 — Hierarchy (are you senior enough?)
`canAssignRoleToEmployee` and `canManageEmployeeWithRole`, using `ROLE_HIERARCHY_LEVELS`. Strictly greater than. Prevents both privilege escalation (granting a role ≥ your own) and lateral attacks (modifying a peer).

**Plus a business rule:** maker–checker segregation, via `dutyType`.

### Worked example

> **A BANK_ADMIN (level 80) tries to create an employee with the BANK_MAKER role (level 50):**
> - Layer 1: valid token ✅
> - Layer 2: `isEmployeeManager` → BANK_ADMIN is in `DELEGATING_ADMIN_ROLES` ✅
> - Layer 3: is there a `rbac_delegated_role` row for (this admin's `sub`, BANK_MAKER's roleId)? If a superadmin set one up ✅, otherwise **403**
> - Layer 4: 80 > 50 ✅
> → Allowed.
>
> **Same BANK_ADMIN tries to assign BANK_SUPER_ADMIN (level 100):**
> - Layer 4: 80 > 100 is false → **403 "You cannot assign a role at your level or higher in the hierarchy"**
>
> **Same BANK_ADMIN tries to assign BANK_ADMIN (level 80):**
> - Layer 4: 80 > 80 is false → **403**. Only a superadmin can create another BANK_ADMIN.

---

## 12. Swagger UI

### What Swagger actually is

Swagger (OpenAPI) is **auto-generated interactive API documentation**. NestJS reads your decorators at startup, builds a big JSON description of every endpoint, and serves a web page that renders it and lets you fire real requests.

**Nothing in Swagger is written by hand.** Every heading, field name, example and description you see comes from a decorator in the code. That's the key insight — if you can point at the decorator that produced a piece of the UI, you understand Swagger.

### Where it's set up

[src/main.ts:35-62](src/main.ts#L35-L62):

```ts
const swaggerConfig = new DocumentBuilder()
  .setTitle('NPST BCB — Auth Service')
  .setDescription(' ... the auth flow instructions ... ')
  .setVersion('1.0')
  .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: '...' })
  .build();
const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
SwaggerModule.setup('api/v1/docs', app, swaggerDocument, {
  swaggerOptions: { persistAuthorization: true },
});
```

- **`http://localhost:3000/api/v1/docs`** — that's the URL, from `setup('api/v1/docs', ...)`.
- `.addBearerAuth(...)` — creates the **Authorize** button.
- `persistAuthorization: true` — your token survives a page refresh. Without it you'd re-paste constantly.
- `SwaggerModule.createDocument(app, config)` — this is the scan step: it walks every controller and reads the decorators.

### Mapping the screen to the code

| What you see in Swagger | What produced it |
|---|---|
| Page title *"NPST BCB — Auth Service"* | `.setTitle(...)` in main.ts |
| The auth-flow instructions at the top | `.setDescription(...)` in main.ts |
| Green **Authorize** button (top right) | `.addBearerAuth(...)` in main.ts |
| Section heading **"RBAC — Roles"** | `@ApiTags('RBAC — Roles')` on the controller class |
| The row `POST /api/v1/roles/create` | `@Controller('roles')` + `@Post('create')` + global prefix |
| The one-line summary next to it | `@ApiOperation({ summary })` |
| The paragraph when you expand it | `@ApiOperation({ description })` |
| 🔒 padlock icon on the row | `@ApiBearerAuth()` |
| The pre-filled example JSON body | `@ApiProperty({ example: ... })` on each DTO field |
| Field marked `* required` | `@ApiProperty` (vs `@ApiPropertyOptional`) |
| The "Responses" table (201, 403…) | `@ApiResponse({ status, description })` |
| The **Schemas** section at the bottom | Every DTO class Swagger found |

### Using it correctly, step by step

1. Start the app: `npm run start:dev`
2. Open **http://localhost:3000/api/v1/docs**
3. Expand **Auth — Session → POST /api/v1/auth/login**, click **Try it out**
4. Body:
   ```json
   { "username": "bank.superadmin", "password": "yourpassword", "clientId": "admin-web" }
   ```
   `clientId` is `admin-web` for staff, `mobile-app` for customers (see [login.dto.ts](src/modules/auth/session/dto/login.dto.ts)).
5. Execute. From the response copy **`accessToken`** — the value only, **not** `refreshToken`, **not** the word `Bearer`.
6. Click **Authorize** (top right), paste, Authorize, Close.
7. Now the padlocked endpoints will send `Authorization: Bearer <token>` automatically.
8. You have roughly **5 minutes** (`expiresIn` ≈ 300s). After that: 401 → log in again.

> If you accidentally paste `Bearer eyJ...`, the [normalizeBearerMiddleware](src/common/middleware/normalize-bearer.middleware.ts) strips the duplicate prefix for you — its `while` loop removes *every* leading `bearer `, however many you pasted. Nice thing to point out; it shows you read the middleware.

### Verifying your own identity

Call **`POST /api/v1/auth/session/me`** ([session.controller.ts:47-64](src/modules/auth/session/session.controller.ts#L47-L64)). It returns your **decoded token claims** — you'll see `sub`, `preferred_username`, and `realm_access.roles`.

This is your debugging superpower for RBAC. Getting an unexpected 403? Call `/session/me` first and look at `realm_access.roles`. Nine times out of ten the role you assumed you had isn't in the token.

---

## 13. Walkthroughs

Practise saying these out loud. If you can narrate these four, you can handle the review.

### Flow A — Superadmin creates a permission

```
POST /api/v1/permissions/create
{ "code": "EMPLOYEE_CREATE", "name": "Create Employee",
  "module": "EMPLOYEE", "action": "CREATE" }
```

1. `AuthGuard` validates the token, sets `request.user`.
2. `SuperadminGuard` → `isSuperadmin(request.user)` reads `realm_access.roles`; not superadmin → 403.
3. `ValidationPipe` builds a `CreatePermissionDto`, enforces `@IsNotEmpty`, `@MaxLength`.
4. `PermissionsController.create` → `PermissionsService.create`.
5. Service: `findOne({ where: { code } })` → exists? 409.
6. `permissions.save(permissions.create({...}))` → **MySQL generates the UUID here.**
7. Returns the permission including its new `id`. **Copy that `id`** — you need it for `map-permissions`.

### Flow B — Superadmin creates a role and gives it permissions

```
POST /api/v1/roles/create
{ "name": "BANK_MAKER", "displayName": "Bank Maker",
  "description": "Creates banking transactions for approval",
  "delegatedAdminKeycloakUserIds": ["<bank-admin-keycloak-uuid>"] }
```

1. Guards, validation (as above).
2. `RolesService.create`: duplicate name → 409.
3. → Keycloak: `POST /admin/realms/bharat-banking/roles`. Our service first fetches its own admin token via `getAdminAccessToken()` against the **master** realm. A 409 from Keycloak is tolerated.
4. → Keycloak: `GET /roles/BANK_MAKER` to read the real `{ id, name }`.
5. → MySQL: insert into `rbac_role`, storing `keycloak_role_id`, `keycloak_role_name`, and `duty_type = MAKER` (because the name matches `/MAKER/i`).
6. `replaceDelegations(...)` → delete then insert into `rbac_delegated_role`, recording `granted_by_keycloak_user_id = actor.sub`. **That BANK_ADMIN may now assign BANK_MAKER.**
7. Response is `findRoleWithPermissions(...)` — note `permissions: []`, because none are mapped yet.

Then:

```
POST /api/v1/roles/map-permissions
{ "roleId": "<role uuid from step 7>", "permissionIds": ["<permission uuid from Flow A>"] }
```

→ validates every permission exists and is active (400 if not), deletes all existing mappings for the role, inserts the new set with `mapped_by_keycloak_user_id = actor.sub`, returns the role now showing its permissions.

### Flow C — BANK_ADMIN creates an employee ⭐

This is the flow to know cold. It touches everything.

```
POST /api/v1/employees/create
{ "username": "bank.maker.02", "email": "bank.maker.02@bank.example.com",
  "firstName": "Ravi", "lastName": "Sharma", "password": "BankMaker@123",
  "roleId": "<BANK_MAKER local uuid>", "employeeCode": "EMP-00042" }
```

1. `AuthGuard` → `request.user` = decoded claims of the BANK_ADMIN.
2. **No** `SuperadminGuard` on this route — the checks happen in the service.
3. `ValidationPipe` → `CreateEmployeeDto`: `@IsEmail`, `@MinLength(8)` on password, `@IsUUID` on roleId.
4. `EmployeesController.create(dto, user)` → `EmployeesService.create(dto, actor)`.
5. **Gate ①** `assertCanManageEmployees` → `isEmployeeManager(actor)` → BANK_ADMIN ✅
6. **Gate ②** `rolesService.assertCanAssignRole(actor, roleId)` → not superadmin → look up `rbac_delegated_role`. Found (from Flow B step 6) ✅
7. **Gate ③** `assertMakerCheckerCompatibility(['<roleId>'])` → single role, can't clash ✅
8. **Gate ④** `assertActorCanAssignRole(actor, 'BANK_MAKER')` → 80 > 50 ✅
9. Username taken? → 409.
10. **Keycloak `createUser`**: `POST /admin/realms/.../users` → 201 with `Location` header → `location.split('/').pop()` = **the new Keycloak user ID**. Then `PUT .../users/{id}/reset-password` with `temporary: false` sets the password.
11. **Keycloak `assignRealmRoleToUser`**: `GET /roles/BANK_MAKER`, then `POST /users/{id}/role-mappings/realm`. From now on, when Ravi logs in, his token carries `realm_access.roles: ["BANK_MAKER"]`.
12. **MySQL**: insert `rbac_employee` (with `keycloak_user_id` from step 10, `created_by_keycloak_user_id` from `actor.sub`) → gets its own local UUID.
13. **MySQL**: insert `rbac_employee_user_role` linking employee ↔ role, with `assigned_by_keycloak_user_id`.
14. **Event**: publish `rbac.employee-account.synced`. `AdminUserSyncListener` picks it up in-process, sees `BANK_MAKER` is an admin-portal role, and upserts a row in `admin_user`.
15. Response: `{ employee, roleAssignment, role, keycloakRealmRoles }` — the last one fetched live from Keycloak to prove the mapping stuck.

**One-sentence version for the review:** *"Four authorization gates, then create the user in Keycloak and read its new ID from the Location header, assign the realm role there, write the employee and the employee-role link locally, and publish an event so the admin read-model stays in sync."*

### Flow D — Changing an employee's role

```
POST /api/v1/employees/update-role
{ "employeeId": "<local employee uuid>", "roleId": "<new role uuid>" }
```

Gates ①–④ as before, **plus**:
- Load the employee (`isActive: true`) → 404 if not found.
- Load the current assignment with `relations: ['role']`.
- **Gate ⑤** `assertActorCanManageEmployee(actor, currentRole.name)` — you must out-rank their *current* role too.
- Same role as before? → 409.
- Keycloak: remove old realm role, assign the new one.
- MySQL: mutate the existing `rbac_employee_user_role` row (`roleId`, `assignedByKeycloakUserId`).
- Publish the sync event again.

---

## 14. How to run and debug

### 14.1 Getting it running

```bash
cd "backend/nestjs/identity-billpay-admin-service"
npm install
```

Start MySQL (from the repo root, where `docker-compose.yml` lives):
```bash
docker compose up -d mysql-db
docker compose ps                 # confirm it's healthy
```

Check `.env` — the important lines:
```
PORT=3000
DB_HOST=localhost   DB_PORT=3306   DB_DATABASE=db1
DB_SYNCHRONIZE=true     ← creates/updates tables from entities on startup
DB_LOGGING=false        ← flip to true to see every SQL query
KEYCLOAK_AUTH_SERVER_URL=http://103.209.145.243:8201
KEYCLOAK_REALM=bharat-banking
KEYCLOAK_CLIENT_ID=admin-web
KEYCLOAK_TOKEN_VALIDATION=offline
```

Run:

| Command | Use it for |
|---|---|
| `npm run start:dev` | **Daily driver.** Watch mode — restarts on every save. |
| `npm run start:debug` | Watch mode **+ Node inspector on port 9229** (for breakpoints). |
| `npm run start` | One-off run, no watching. |
| `npm run build` | Compile TypeScript to `dist/`. |
| `npm run lint` | ESLint with `--fix`. |
| `npm test` | Jest unit tests (`*.spec.ts` under `src/`). |
| `npm run test:e2e` | End-to-end tests using `test/jest-e2e.json`. |

Then open **http://localhost:3000/api/v1/docs**.

Health check — note it's a **POST** (and `@Public()`, so no token needed), so you can't just open it in a browser ([health.controller.ts](src/common/health/health.controller.ts)):
```bash
curl -X POST http://localhost:3000/api/v1/health/check
```
It pings MySQL via Terminus, so a failure here means your DB connection is the problem, not your code.

### 14.2 Debugging technique 1 — read the startup log

When Nest boots it prints **every route it mapped**:

```
[RoutesResolver] RolesController {/api/v1/roles}:
[RouterExplorer] Mapped {/api/v1/roles/create, POST} route
[RouterExplorer] Mapped {/api/v1/roles/update, POST} route
```

**Use this constantly.** Getting a 404? Look at this list. If your route isn't there, one of three things is true: the controller isn't in the module's `controllers` array; the module isn't imported into `AppModule`; or you used the wrong path/method.

You'll also see `[InstanceLoader] RbacModule dependencies initialized` — if a module fails to load, the error appears right here, before any request is ever made.

### 14.3 Debugging technique 2 — `console.log` (yes, really)

Fastest tool you have. There's already one in the codebase at [session.controller.ts:58-60](src/modules/auth/session/session.controller.ts#L58-L60), logging the decoded user.

Put them at decision points:

```ts
// in employees.service.ts create()
console.log('ACTOR ROLES:', extractRealmRoles(actor));
console.log('ACTOR SUB:', actor.sub);
console.log('ACTOR LEVEL:', resolveActorHierarchyLevel(actor));
console.log('TARGET ROLE:', role.name, 'LEVEL:', resolveRoleHierarchyLevel(role.name));
```

Better than `console.log`, use Nest's logger so output is tagged and timestamped:

```ts
import { Logger } from '@nestjs/common';

export class EmployeesService {
  private readonly logger = new Logger(EmployeesService.name);
  // ...
  this.logger.debug(`Assigning ${role.name} to ${dto.username}`);
}
```

(`AdminUserSyncListener` already does exactly this.)

### 14.4 Debugging technique 3 — real breakpoints in VS Code

1. `npm run start:debug`
2. In VS Code: **Run and Debug** → **Create a launch.json file** → choose **Node.js** → then either use *"Attach to Node Process"* or add this config:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "attach",
      "name": "Attach to NestJS",
      "port": 9229,
      "restart": true,
      "sourceMaps": true
    }
  ]
}
```

3. Click in the gutter next to a line in `employees.service.ts` to set a red breakpoint.
4. Fire the request from Swagger. Execution freezes on that line.
5. Inspect **Variables** in the left panel — expand `actor` to see the whole decoded token. Use **Step Over (F10)**, **Step Into (F11)**, **Continue (F5)**.

The **Debug Console** lets you type expressions live, e.g. `extractRealmRoles(actor)`.

Best breakpoints for RBAC:
- `SuperadminGuard.canActivate` — inspect `request.user`.
- `RolesService.assertCanAssignRole` — see whether the delegation row was found.
- `EmployeesService.create` line 37 — step through all four gates in order.
- `KeycloakService.createUser` after the HTTP call — inspect `createResponse.headers.location`.

### 14.5 Debugging technique 4 — see the SQL

In `.env`:
```
DB_LOGGING=true
```
Restart. Every query TypeORM runs is now printed. This is the way to answer "did it actually save?" and to spot N+1 loops.

Then verify in the DB directly:

```bash
docker exec -it npst-bcb-mysql mysql -ubcb_user -pbcb_pass db1
```
```sql
SHOW TABLES LIKE 'rbac%';
SELECT id, name, keycloak_role_name, duty_type, is_active FROM rbac_role;
SELECT id, username, keycloak_user_id, created_by_keycloak_user_id FROM rbac_employee;
SELECT * FROM rbac_delegated_role;

-- who has which role
SELECT e.username, r.name AS role
FROM rbac_employee_user_role eur
JOIN rbac_employee e ON e.id = eur.employee_id
JOIN rbac_role r     ON r.id = eur.role_id;

-- what a role grants
SELECT r.name AS role, p.code AS permission
FROM rbac_role_permission rp
JOIN rbac_role r       ON r.id = rp.role_id
JOIN rbac_permission p ON p.id = rp.permission_id;
```

### 14.6 Debugging technique 5 — decode the token by hand

Copy your `accessToken` and paste it at **https://jwt.io** — you'll see the claims immediately. Or from a terminal, no network needed:

```bash
TOKEN='eyJhbGciOi...'
echo "$TOKEN" | cut -d. -f2 | base64 -d 2>/dev/null | python3 -m json.tool
```

Look at `sub`, `exp`, and `realm_access.roles`.
`exp` is a Unix timestamp — `date -d @1736412345` converts it. If it's in the past, that's your 401.

Or just call `POST /api/v1/auth/session/me`, which does the same thing through the API.

### 14.7 Debugging technique 6 — the error tells you the layer

The `HttpExceptionFilter` returns this shape for everything:

```json
{ "statusCode": 403, "path": "/api/v1/roles/create",
  "timestamp": "2026-09-09T10:15:30.000Z",
  "message": { "message": "Only superadmin users can perform this operation", ... } }
```

Use the status code to jump straight to the right layer:

| Status | Which layer | First thing to check |
|---|---|---|
| **401** | `AuthGuard` — token missing/invalid/expired | Did you paste `accessToken`? Has it expired? Re-login. |
| **403** | `SuperadminGuard`, or a service `assert*` — the message says which | Call `/auth/session/me`; check `realm_access.roles`; check `rbac_delegated_role`; check hierarchy levels. |
| **400** | `ValidationPipe`, or `mapPermissions` invalid IDs | Response lists the exact failing fields. Check UUID format. |
| **404** | Service `findOne` returned null — **or** the route doesn't exist | Compare with the `[RouterExplorer]` startup log to tell the two apart. |
| **409** | Duplicate — role name, permission code, username, or same-role reassignment | Query the DB for the existing row. |
| **500** | Unhandled — usually DB or Keycloak connectivity | Look at the terminal stack trace. |

### 14.8 The specific problems you'll actually hit

| Symptom | Cause | Fix |
|---|---|---|
| 401 on every call | Token expired (~5 min) | Log in again, re-Authorize |
| 401 straight after logging in | Pasted `refreshToken` instead of `accessToken` | Use `accessToken` |
| 403 "Only superadmin…" | Your user lacks a superadmin realm role | Check `/session/me`; assign the role in the Keycloak admin console |
| 403 "not authorized to assign this role" | No `rbac_delegated_role` row for you + that role | Have a superadmin add your Keycloak `sub` to `delegatedAdminKeycloakUserIds` via `/roles/update` |
| 403 "cannot assign a role at your level or higher" | Hierarchy check | Check `ROLE_HIERARCHY_LEVELS`; needs strictly greater |
| 400 "One or more permission IDs are invalid or inactive" | Wrong UUID, or `is_active = 0` | `SELECT id, code, is_active FROM rbac_permission;` |
| 409 "already exists" | Duplicate name/code/username | Query the DB |
| App won't start: Keycloak not configured | Missing env vars | The explicit error is thrown in [keycloak-connect.config.ts:22-26](src/config/keycloak-connect.config.ts#L22-L26) |
| App won't start: DB connection refused | MySQL container down | `docker compose up -d mysql-db` |
| "Can't resolve dependencies of X" | Entity missing from `forFeature`, or service missing from `providers`, or module not imported | Read the error — Nest names the exact missing dependency |
| Keycloak calls fail / hang | `KEYCLOAK_AUTH_SERVER_URL` unreachable | `curl http://103.209.145.243:8201/realms/bharat-banking` |
| Table not created | `DB_SYNCHRONIZE` not `true`, or entity path not matched | Entity glob is in [database.config.ts:12-16](src/config/database.config.ts#L12-L16) — filename **must** end in `.entity.ts` |

### 14.9 Debugging with tests

[test/e2e/helpers/test-app.ts](test/e2e/helpers/test-app.ts) shows the trick: it overrides `KeycloakService` with `mockKeycloakService` (all `jest.fn()`), and provides fake actors:

```ts
export const TEST_SUPERADMIN = { sub: '1111...', realm_access: { roles: ['BANK_SUPER_ADMIN'] } };
export const TEST_BANK_ADMIN  = { sub: '2222...', realm_access: { roles: ['BANK_ADMIN'] } };
```

So you can test your hierarchy and delegation logic **without a real token and without a real Keycloak**. That's dependency injection paying off — and it's a strong thing to mention in a review.

`npm run test:e2e` runs [test/e2e/all-endpoints.e2e-spec.ts](test/e2e/all-endpoints.e2e-spec.ts).

---

## 15. Vocabulary cheat sheet

| Term | One-line definition |
|---|---|
| **RBAC** | Role Based Access Control — permissions attach to roles, roles attach to users. |
| **Module** | A Nest box grouping controllers, services and entities. |
| **Controller** | Owns URLs; receives requests; delegates to a service. |
| **Service** | Business logic; talks to repositories and Keycloak. |
| **Provider** | Anything Nest can inject (mostly services and guards). |
| **DI** | Dependency Injection — Nest constructs and supplies your dependencies. |
| **Entity** | A class mapped to a DB table by TypeORM. |
| **Repository** | TypeORM's object for querying one entity's table. |
| **DTO** | Class describing + validating a request body. |
| **Decorator** | `@Something()` — metadata that frameworks read at startup. |
| **Guard** | Runs before the handler; returns true or throws 401/403. |
| **Pipe** | Transforms/validates input before the handler (`ValidationPipe`). |
| **Interceptor** | Wraps the handler; can act before and after. |
| **Middleware** | Runs before everything, at the Express level. |
| **Exception filter** | Catches thrown errors and shapes the JSON response. |
| **JWT** | Signed, readable token carrying claims. |
| **Claim** | One field inside a JWT (`sub`, `exp`, `realm_access`). |
| **`sub`** | Subject — the Keycloak user ID of the caller. |
| **Bearer token** | `Authorization: Bearer <jwt>` |
| **Keycloak** | The external identity server: users, passwords, roles, tokens. |
| **Realm** | An isolated Keycloak tenant (`bharat-banking`). |
| **Client** | An app allowed to get tokens (`admin-web`, `mobile-app`). |
| **Realm role** | A Keycloak role that appears in `realm_access.roles`. |
| **Delegation** | A superadmin granting a specific admin the right to assign a specific role. |
| **Hierarchy level** | A number per role; you may only act on strictly lower numbers. |
| **Maker–Checker** | Segregation of duties: the creator of a transaction can't approve it. |
| **Soft delete** | Set `deleted_at` instead of removing the row. |
| **Read model** | A denormalised copy kept for fast reads (`admin_user`). |
| **Event bus** | In-process publish/subscribe (`@nestjs/event-emitter`). |
| **Swagger / OpenAPI** | Auto-generated interactive API docs at `/api/v1/docs`. |
| **Migration** | A versioned script that changes DB schema. |
| **`synchronize`** | TypeORM auto-syncing schema from entities — dev only. |

---

## 16. Likely review questions

**Q: What does your module do?**
Access control. It defines roles and permissions, assigns roles to employees, and enforces who is allowed to do that. Roles live in both Keycloak (for authentication and tokens) and our MySQL DB (for permissions, delegation and audit).

**Q: Where is an endpoint defined?**
`@Controller('roles')` on the class + `@Post('create')` on the method + the `api/v1` global prefix from `main.ts` = `POST /api/v1/roles/create`. The method directly under the decorator is the handler.

**Q: What is a decorator?**
A function that attaches metadata. Nest, TypeORM, class-validator and Swagger each read the ones they care about at startup. `@Post` defines a route, `@Entity` maps a table, `@IsUUID` validates, `@ApiProperty` documents.

**Q: What happens between the request arriving and your code running?**
Middleware → guards → pipes → interceptors → handler. Guards come before validation, so bad tokens are rejected before we parse the body.

**Q: What does the token do?**
It's a JWT signed by Keycloak. `AuthGuard` verifies the signature offline using the realm public key and puts the decoded claims on `request.user`. RBAC reads two claims: `sub` (the caller's Keycloak user ID, stored in every audit column) and `realm_access.roles` (which drives every permission decision).

**Q: Where is the ID created?**
Two families. Keycloak generates user and role IDs — for users we read it from the `Location` header of the create-user response and `.split('/').pop()`. Our own tables generate UUID primary keys via `@PrimaryGeneratedColumn('uuid')` when `.save()` runs. We store the Keycloak IDs on our rows to link the two systems.

**Q: Why roles in both Keycloak and your DB?**
Keycloak owns authentication and puts role names into the token. It has nowhere to express our business rules — which permissions a role grants, maker/checker duty type, delegation, or who assigned what and when. So Keycloak is the token source of truth; our DB is the business authorization source of truth.

**Q: How do you stop privilege escalation?**
Four layers: valid token; superadmin/bank-admin check; per-role delegation rows in `rbac_delegated_role`; and hierarchy levels compared with **strictly greater than** — so a BANK_ADMIN at level 80 cannot assign or manage another level-80 user.

**Q: Why is `/roles/create` guarded but `/employees/create` isn't?**
`/roles/*` is a flat superadmin-only rule, which a guard expresses perfectly. `/employees/*` needs to inspect the target role, the employee's current role and the delegation table — data a guard doesn't have loaded — so those checks are `assert*` methods inside the service.

**Q: What is maker–checker?**
A banking control: whoever creates a transaction must not approve it. We derive `dutyType` from the role name via regex at creation time and store it, and `assertMakerCheckerCompatibility` refuses a set of roles containing both. Today it only ever receives one role id, so it's groundwork for multi-role users.

**Q: What happens after you create an employee?**
We publish `rbac.employee-account.synced` on an in-process event bus. The admin module's listener filters to admin-portal roles and upserts a flat `admin_user` row — a read model, so the portal doesn't join four RBAC tables per page. RBAC owns the writes; admin-user is a downstream copy.

**Q: How do you debug a 403?**
Call `/auth/session/me` to see my actual `realm_access.roles`. Then match the error message to the layer: `SuperadminGuard` vs the delegation check vs the hierarchy check. Then query `rbac_delegated_role`, or set a breakpoint in `assertCanAssignRole` with `npm run start:debug`.

**Q: What would you improve?**
Three honest answers: (1) `synchronize: true` should be replaced with migrations before production. (2) `fetchAccessDetails` is N+1 — it loops per employee with two Keycloak calls each; it should batch or join. (3) Role creation writes to Keycloak then MySQL with no distributed transaction, so a DB failure leaves an orphan realm role — mitigated by `createRealmRole` treating 409 as success, which makes retries idempotent.

---

## Final checklist before the review

- [ ] I can draw the request pipeline: middleware → guards → pipes → interceptors → controller → service → repository → DB
- [ ] I can name all 7 RBAC endpoints and which file each is in
- [ ] I can explain `@Controller` + `@Post` = the URL
- [ ] I can explain the difference between `@ApiBearerAuth()` (docs) and `AuthGuard` (actual protection)
- [ ] I can name the two claims RBAC uses: `sub` and `realm_access.roles`
- [ ] I can explain the three different tokens (user, admin-cli service, realm public key)
- [ ] I can explain where the Keycloak user ID comes from (the `Location` header)
- [ ] I can explain where our UUIDs come from (`@PrimaryGeneratedColumn('uuid')`)
- [ ] I can name the 6 RBAC tables and how they join
- [ ] I can list the 4 authorization layers
- [ ] I can explain why `>` and not `>=` in the hierarchy check
- [ ] I can explain what maker–checker is
- [ ] I can walk through Flow C (create employee) end to end
- [ ] I can log into Swagger and call a protected endpoint without help
- [ ] I can set a breakpoint and inspect `actor`
- [ ] I can name three honest weaknesses in the current code
