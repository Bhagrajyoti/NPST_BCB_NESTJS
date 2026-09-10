# Admin Portal Backend — Work Summary

**Scope:** `backend/nestjs/identity-billpay-admin-service`, specifically the
`admin/admin-user` and `admin/authorization-rules` modules.

**Branch:** `shreya` (commit `fbdf72a — "changes for the admin user and
authorization rules"`, on top of `004bb61`).

This document explains what was broken, what was built, exactly which files
changed and why, the resulting API surface, and how to run/test it. Written
so it can be used directly to explain the work to a reviewer or teammate.

---

## 1. Starting point — what was actually broken

Before any of this work, `admin-user` and `authorization-rules` were bare
scaffolds generated from the architecture doc, not working code:

- **Wrong database dialect for the tables.** The entities were written with
  `schema: 'admin'` and Postgres-only types (`numeric`, `jsonb`) — leftovers
  from an earlier plan to run one Postgres instance with three schemas
  (`identity`, `billpay`, `admin`). The project had since switched to MySQL
  with a single `db1` database (see `docker-compose.yml`,
  `init-multiple-databases.sh`), but these entities were never updated to
  match. Under MySQL, `schema: 'admin'` means "a different physical
  database called `admin`," which doesn't exist and the app's DB user has
  no grant on.
- **The admin module wasn't wired into the datasource at all.**
  `database.config.ts`'s `entities`/`migrations` globs only listed
  `modules/auth/**` and `modules/rbac/**` — `modules/admin/**` was missing,
  so none of these entities had metadata registered, even before the
  schema mismatch above.
- **No real logic.** The stub `AdminUserService`/`AuthorizationRulesService`
  were plain CRUD with no field validation worth mentioning, no RBAC
  enforcement, and no relationship to the RBAC roles/permissions doc
  (`RBAC_Roles_and_Permissions.md`) at all.
- **A parallel, redundant "admin user" concept already existed.**
  `modules/rbac/controllers/employees.controller.ts` +
  `services/employees.service.ts` already fully implemented "create/manage
  bank staff accounts with a role" (US-20 from the roles doc) — Keycloak
  provisioning, role hierarchy checks, the works. Building `admin-user` out
  as its own independent create/role-assignment system would have
  duplicated and could have drifted from that.
- **Inconsistent with the rest of the app's API style.** Every other
  working module (`auth`, `rbac`) exposes **only POST** endpoints with
  verb-style sub-paths (`/list`, `/get`, `/create`, `/delete`) and does
  soft-deletes via `repository.softDelete()` — the stub `admin-user`/
  `authorization-rules` controllers used RESTful `GET`/`PATCH`, which was
  the odd one out.

---

## 2. Decision made before writing code

Asked and confirmed: **`admin-user` should be a thin, read-only mirror**
of `rbac/employees` — not a second place where accounts get created or
role-assigned. Creation/role-assignment logic and Keycloak provisioning
stay owned by `rbac/employees`; `admin-user` only reflects that data for
the admin portal's own view, kept in sync via the app's internal event bus
(`@nestjs/event-emitter`, wrapped as `InternalEventBusService`) rather than
importing `rbac`'s repositories directly — consistent with the
architecture doc's "each module owns its schema, no cross-module DB
coupling" rule.

`authorization-rules` was built as real, independent CRUD (it has no
equivalent elsewhere), gated by role per the doc: `BANK_SUPER_ADMIN`
configures rules, `BANK_ADMIN` can view only.

---

## 3. Files changed, and why

### Database / app wiring

| File | Change |
|---|---|
| `src/config/database.config.ts` | Added `modules/admin/**/*.entity{.ts,.js}` and `modules/admin/migrations/*{.ts,.js}` to the `entities`/`migrations` arrays — without this, TypeORM never sees any admin-module entity. |
| `src/app.module.ts` | `AdminModule` imported and added to the root module's `imports`. |
| `.env.example` | `KEYCLOAK_ADMIN_PASSWORD` set to a real local value instead of the `change-me` placeholder, so `KeycloakService`'s admin-API calls (used by `roles.service.ts`/`employees.service.ts` to create Keycloak users/roles) actually authenticate locally. |

### `rbac` module — emitting the sync event

| File | Change |
|---|---|
| `src/modules/rbac/events/employee-account-synced.event.ts` **(new)** | Defines `EmployeeAccountSyncedEvent` and the event name constant `rbac.employee-account.synced`. |
| `src/modules/rbac/services/employees.service.ts` | Injects `InternalEventBusService`; `create()` and `updateRole()` now publish `EmployeeAccountSyncedEvent` right before returning, carrying the employee's id, Keycloak id, name fields, role id/name, and active flag. |
| `src/modules/rbac/rbac.module.ts` | Imports `InternalEventBusModule` so `EmployeesService` can inject the event bus. |

### `admin/admin-user` — rebuilt as a read-only mirror

| File | Change |
|---|---|
| `entities/admin-user.entity.ts` | Rewritten: dropped `schema: 'admin'`; added `employeeId`, `keycloakUserId` (unique), `firstName`, `lastName`, `roleId`, `roleName`, `isActive`, `lastSyncedAt` — this is now a denormalized read-model, not a source-of-truth table. |
| `admin-user-sync.listener.ts` **(new)** | Subscribes to `rbac.employee-account.synced` on `onModuleInit()`; on every event, upserts a row into `admin_user` **only if** the role is one of `BANK_SUPER_ADMIN`/`BANK_ADMIN`/`BANK_MAKER`/`BANK_CHECKER` (corporate/retail role assignments are ignored — this table is specifically the admin-portal view). |
| `dto/list-admin-users.dto.ts` **(new)** | Optional `role` (must be one of the four admin-portal roles) and `search` (substring match) filters. |
| `dto/create-admin-user.dto.ts` **(deleted)** | No longer needed — this module doesn't create accounts. |
| `admin-user.service.ts` | `findAll(query, actor)` / `findOne(id, actor)` — both gated to `BANK_SUPER_ADMIN`/`BANK_ADMIN` via `extractRealmRoles(actor)`. `findAll` builds a query with optional role-equality and username/email `LIKE` filtering. |
| `admin-user.controller.ts` | Converted to all-POST: `POST list`, `POST get` (using the shared `IdRequestDto` body, matching the `auth` module's convention). No create/update/delete endpoints — those belong to `rbac/employees`. |

### `admin/authorization-rules` — real CRUD, RBAC-gated

| File | Change |
|---|---|
| `entities/authorization-rule.entity.ts` | Rewritten: dropped `schema: 'admin'`; `numeric` → `decimal(18,2)` (MySQL-valid); now **extends `SoftDeleteEntity`** (`common/entities/soft-delete.entity.ts`) to get `id`/`createdAt`/`updatedAt`/`deletedAt` for free, enabling soft-delete. Kept `ruleName`, `cif`, `threshold`, `version`, `createdByKeycloakUserId`, `updatedByKeycloakUserId`. |
| `entities/authorization-rule-history.entity.ts` | Rewritten: dropped `schema: 'admin'`; `jsonb` → `json` (MySQL-valid); dropped the `updatedAt` column — history rows are append-only and never updated. |
| `dto/create-authorization-rule.dto.ts` | `ruleName`/`cif` length-capped; `threshold` validated as a numeric string (up to 2 decimals) via `@Matches`. |
| `dto/update-authorization-rule.dto.ts` **(new)** | Carries `id` (since the route no longer takes `:id` as a URL param), optional `ruleName`/`threshold`, and an optional `changeReason` recorded into the history snapshot. |
| `authorization-rules.service.ts` | `findAll`/`findOne`/`findHistory` gated to `BANK_SUPER_ADMIN`/`BANK_ADMIN` (view). `create`/`update`/`deactivate` gated to `BANK_SUPER_ADMIN` only (`isSuperadmin`). `create` starts at `version: 1` and writes an initial history row. `update` increments `version`, updates fields, writes a history row (including `changeReason` if given). `deactivate` (**new**) writes a final history row marking `deactivated: true`, then calls `repository.softDelete(id)` — a real soft-delete, not a hard delete. |
| `authorization-rules.controller.ts` | Converted to all-POST: `list`, `get`, `history`, `create`, `update`, `deactivate` — `get`/`history`/`deactivate` take the shared `IdRequestDto`; `update` takes `id` inside its own DTO body. |

### Removed

| File(s) | Why |
|---|---|
| `admin/cif-linking/**` **(entire folder deleted)** | Confirmed via `grep` that nothing outside its own folder referenced it — genuinely unused stub. Its `@Controller` also had no `@ApiTags`, which is why it showed up bucketed under Swagger's `default` tag; removing it fixed both problems. `admin.module.ts` updated to drop its imports/wiring accordingly. |

### Migration

| File | Change |
|---|---|
| `modules/admin/migrations/1788856000000-CreateAdminModuleTables.ts` **(new)** | Raw-SQL `CREATE TABLE` for `admin_user`, `authorization_rule` (including `deleted_at`), and `authorization_rule_history`, matching the final entity shapes. Since `.env` has `DB_SYNCHRONIZE=true`, TypeORM auto-syncs these in local dev regardless — this migration matters once synchronize is off (e.g. a shared/staging DB). |

### Tests (new)

| File | Coverage |
|---|---|
| `admin-user/admin-user.service.spec.ts` | 8 tests — view-role gating on `findAll`/`findOne`, role/search filter query-building, not-found handling. |
| `authorization-rules/authorization-rules.service.spec.ts` | 13 tests — view-role gating, superadmin-only gating on `create`/`update`/`deactivate`, version incrementing, history rows written correctly, soft-delete actually invoked. |

Both colocated next to their source files as `*.spec.ts` — this repo's
Jest config (`rootDir: "src"`) only discovers specs inside `src/`, so the
pre-existing empty `test/unit/admin/` folders are effectively dead and
were not used.

**Result:** 21/21 tests passing, `tsc --noEmit` clean, confirmed live
against a running server connected to MySQL.

### One bug found and fixed after first boot

`AuthorizationRule.updatedByKeycloakUserId` was declared as
`string | null` without an explicit `type: 'varchar'` on its `@Column()`.
TypeScript's reflected type for a union like `string | null` is `Object`,
not `String`, and TypeORM can't map `Object` to a MySQL column type without
an explicit `type` — this crashed the app at boot with
`DataTypeNotSupportedError`, retried the DB connection nine times, then
gave up. Fixed by adding `type: 'varchar'` explicitly, matching how every
other nullable string column in this codebase already does it
(`role.entity.ts`, `employee.entity.ts`, `permission.entity.ts`).

---

## 4. Resulting API surface

All endpoints are POST, live under `/api/v1`, and require a Keycloak
Bearer token (obtained via `POST /auth/login`) except where noted:

```
POST /admin/admin-user/list         BANK_SUPER_ADMIN, BANK_ADMIN
POST /admin/admin-user/get          BANK_SUPER_ADMIN, BANK_ADMIN

POST /admin/authorization-rules/list        BANK_SUPER_ADMIN, BANK_ADMIN
POST /admin/authorization-rules/get         BANK_SUPER_ADMIN, BANK_ADMIN
POST /admin/authorization-rules/history     BANK_SUPER_ADMIN, BANK_ADMIN
POST /admin/authorization-rules/create      BANK_SUPER_ADMIN only
POST /admin/authorization-rules/update      BANK_SUPER_ADMIN only
POST /admin/authorization-rules/deactivate  BANK_SUPER_ADMIN only (soft-delete)
```

`admin_user` rows only appear after someone is created via the existing
`POST /employees/create` (or has their role changed via
`POST /employees/update-role`) — this module never creates accounts itself.

---

## 5. How to run and verify it

```bash
# 1. Start MySQL
cd "NPST_BCB_NESTJS"
docker compose up -d mysql-db

# 2. Start the app
cd backend/nestjs/identity-billpay-admin-service
cp .env.example .env      # first time only
npm install                # first time only
npm run migration:run
npm run start:dev
```

Then open `http://localhost:3000/api/v1/docs`:

1. `POST /auth/login` with a Keycloak user + `clientId: "admin-web"` →
   copy `accessToken` → **Authorize** in Swagger.
2. Confirm your token's roles via `POST /auth/session/me` (check
   `realm_access.roles`).
3. Bootstrap data if the tables are empty: `POST /roles/create` → copy the
   returned role `id` → `POST /employees/create` with that `roleId`. This
   is what triggers the sync into `admin_user`.
4. Exercise the new endpoints from the list above.

Automated checks:
```bash
npm run test        # 21/21 passing, includes the two new spec files
npx tsc --noEmit -p tsconfig.json   # clean
```

---

## 6. Proper git workflow for this repo

This is a shared repo (`Bhagrajyoti/NPST_BCB_NESTJS`) with at least three
branches already in play (`main`, `bhagra`, `shreya`). The correct flow for
any change here:

1. **Start from an up-to-date `main`:**
   ```bash
   git checkout main
   git pull origin main
   ```
2. **Branch per piece of work** (not one long-lived personal branch for
   everything): `git checkout -b <short-description>`, e.g.
   `admin-user-authorization-rules`.
3. **Commit in small, reviewable chunks** as you go, with messages that say
   *why*, not just *what* (e.g. "Sync admin_user read-model via internal
   event bus instead of duplicating rbac/employees" rather than "update
   files").
4. **Push the branch and open a Pull Request against `main`** — don't push
   directly to `main`, and don't merge your own PR without review if this
   team expects review (worth confirming with whoever owns the repo).
   ```bash
   git push -u origin <branch-name>
   gh pr create --base main --title "..." --body "..."
   ```
5. **Address review comments as new commits** on the same branch (they'll
   show up in the same PR) rather than force-pushing over history, unless
   the team's convention is explicitly to squash/rebase before merge.
6. **After merge, delete the branch** (`git branch -d <branch-name>`,
   `git push origin --delete <branch-name>`) and pull `main` again before
   starting the next piece of work.

**On the specific 403 you hit:** that means the GitHub account
`shreya-sinha-26` doesn't have write access to
`Bhagrajyoti/NPST_BCB_NESTJS`. Two ways to resolve it, and only the repo
owner can act on the first:
- Ask **Bhagrajyoti** (the repo owner) to add `shreya-sinha-26` as a
  collaborator with write access (GitHub repo → Settings → Collaborators).
- Or, if collaborator access isn't given, fork the repo into your own
  account, push your branch there, and open the Pull Request from your
  fork back to `Bhagrajyoti/NPST_BCB_NESTJS` — this only needs *read*
  access to the upstream repo.

Separately from the workflow question: **rotate the exposed token now**
(see the top of this conversation / ask if you need the exact steps again)
before pushing anything else from this machine.
