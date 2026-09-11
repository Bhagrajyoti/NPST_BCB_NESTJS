# Event List Endpoint — TEMPORARY

> ⚠️ **This endpoint is for development only. It must be removed before production.**
> See [How to remove it](#8-how-to-remove-it-before-production) at the bottom.

---

## 1. What is it?

One endpoint:

```
GET /api/v1/admin/events/list
```

It lets you **see the events the app has recorded**, straight from Swagger, without opening MySQL.

It is a plain **GET with no request body**. You don't type anything in — just click Execute.
**Who you are comes from your Bearer token**, which Swagger sends automatically once you have
clicked Authorize.

In Swagger it appears under the heading **"Admin — Events (TEMPORARY)"**.

---

## 2. Why does it exist?

Events run in the background. When you create an authorization rule, the Swagger response looks
exactly the same as before — the event is invisible. The only way to check it was recorded was to
open a terminal and query MySQL.

This endpoint makes that check possible from Swagger during development and testing.

---

## 3. Does it save anything?

**No. This endpoint only reads.** It never creates, changes, sends, or deletes an event.

The events are saved by **other code**, before this endpoint is ever called:

| When this happens | This file saves the event | Event name |
|---|---|---|
| An authorization rule is created, updated or deactivated | `admin/admin-action-audit.listener.ts` | `admin.action.audited` |
| A customer finishes registration | `auth/auth-events-audit.listener.ts` | `auth.user.registered` |
| A failed registration is rolled back and the user disabled | `auth/auth-events-audit.listener.ts` | `auth.user.deactivated` |
| A bill payment ends as SUCCESS or FAILED | `bill-payment/bill-payment-events-audit.listener.ts` | `bill-payment.completed` |

Payments that end as `PENDING` or `TIMEOUT` are **not** recorded, because they are not finished yet.

This endpoint just shows you what those files have saved.

---

## 4. Where is the data stored?

| | |
|---|---|
| **Database** | MySQL, database `db1` |
| **Docker container** | `npst-bcb-mysql` |
| **Table** | `audit_outbox` |
| **Table defined in** | `src/clients/audit-outbox/audit-outbox.entity.ts` |

### What each column means

| Column | Meaning |
|---|---|
| `id` | Unique code for this row |
| `event_type` | Which kind of event (one of the four names above) |
| `payload` | The details of the event, stored as JSON |
| `status` | Has it been sent to the Audit service yet? (see below) |
| `attempts` | How many times sending has been tried |
| `created_at` | When the event was recorded |
| `updated_at` | When the row last changed |

### What `status` means

A timer job (`src/clients/audit-outbox/audit-outbox-relay.job.ts`) runs **every minute** and tries
to send each `PENDING` row to the Audit service.

| Status | Meaning |
|---|---|
| `PENDING` | Recorded, not sent yet |
| `SENT` | Successfully sent to the Audit service |
| `FAILED` | Sending failed 5 times; the job stops trying |

**Today, rows will end up `FAILED` after about 5 minutes.** That is expected: the Audit service is
not set up yet (`AUDIT_SERVICE_URL` is empty in `.env`). The event was still recorded correctly —
only the *sending* failed.

### What is inside `payload`

| Event | Payload fields |
|---|---|
| `admin.action.audited` | `adminUserId` (who did it), `action` (e.g. `AUTHORIZATION_RULE_CREATED`), `targetId` (the rule's id) |
| `auth.user.registered` | `userId`, `mobileNumber` — **masked**, e.g. `98******10` |
| `auth.user.deactivated` | `userId`, `reason` (e.g. `REGISTRATION_ROLLED_BACK`) |
| `bill-payment.completed` | `billPaymentId`, `status` (`SUCCESS` or `FAILED`) |

Mobile numbers are masked before they are saved, so no raw phone number is ever stored in the
audit trail.

---

## 5. Who is allowed to use it?

| Role | Allowed? |
|---|---|
| `BANK_SUPER_ADMIN` (e.g. `test-bank-superadmin`) | ✅ Yes |
| `BANK_ADMIN` (e.g. `docs-bank-admin`) | ❌ No — 403 "Forbidden resource" |
| Everyone else | ❌ No — 403 Forbidden |
| No token | ❌ No — 401 Unauthorized |

**Only the super admin.** The audit trail shows who did what across the whole system, so it gets the
strictest access. This is stricter than authorization rules, where BANK_ADMIN is allowed to read.

The role is checked in **two places**, the same pattern as the rest of the admin module:

1. **At the door** — `@Auth('BANK_SUPER_ADMIN')` in `event-list.controller.ts`
2. **Again inside the worker** — `assertCanView()` in `event-list.service.ts`

---

## 6. How to use it in Swagger

1. Log in with `POST /api/v1/auth/login` as a **BANK_SUPER_ADMIN** user, e.g.
   `{ "username": "test-bank-superadmin", "password": "TestFix@123", "clientId": "admin-web" }`
2. Copy `accessToken`.
3. Click **Authorize** (top right). **If a token is already there, click Logout first.**
   Paste the new token → Authorize → Close. (See the warning below — this step matters.)
4. Open **Admin — Events (TEMPORARY)** → `GET /api/v1/admin/events/list` → **Try it out**.
5. Leave every box empty and click **Execute**. That's it.

> ⚠️ **Why "Logout first" matters.** Swagger remembers the token in the Authorize box, even after
> a page refresh (`persistAuthorization: true` in `main.ts`). Calling `/auth/login` as a
> different user does **not** replace it. If you last authorized as `docs-bank-admin`, Swagger
> keeps sending that BANK_ADMIN token — and you get 403, or 401 once it expires — even though
> you just logged in as super admin. Always Logout in the Authorize box, then paste the new token.
>
> To check which user Swagger is really sending, call `POST /api/v1/auth/me` and look at
> `preferred_username` and `realm_access.roles`.

### Optional filters (query parameters)

Swagger shows three boxes. All are optional — leave them empty to see everything.

| Box | Allowed values | If left empty |
|---|---|---|
| `eventType` | dropdown: `admin.action.audited`, `auth.user.registered`, `auth.user.deactivated`, `bill-payment.completed` | all types |
| `status` | dropdown: `PENDING`, `SENT`, `FAILED` | all statuses |
| `limit` | a whole number from 1 to 200 | 50 |

Without Swagger, the same call is just a URL:

```
GET /api/v1/admin/events/list
GET /api/v1/admin/events/list?eventType=admin.action.audited
GET /api/v1/admin/events/list?status=FAILED&limit=10
```

### What you should see — status 200

```json
{
  "timestamp": "2026-09-11T09:40:12.000Z",
  "success": true,
  "data": [
    {
      "id": "c1d2e3f4-...",
      "eventType": "admin.action.audited",
      "payload": {
        "action": "AUTHORIZATION_RULE_UPDATED",
        "targetId": "0fc7ab19-761d-4025-8e49-8d6d5e3363fd",
        "adminUserId": "7f3c2b1a-9d4e-4c8f-b2a1-6e5d4c3b2a19"
      },
      "status": "PENDING",
      "attempts": 0,
      "createdAt": "2026-09-11T09:40:12.000Z",
      "updatedAt": "2026-09-11T09:40:12.000Z"
    }
  ]
}
```

The events are inside `data`, newest first. An empty `data: []` means no events have been recorded
yet — create an authorization rule and try again.

### Errors you may see

| Status | Why | Fix |
|---|---|---|
| 401 | No token, or the token expired (it lasts 15 minutes) | Log in again, Logout + paste in Authorize |
| 403 | The token belongs to someone who is not BANK_SUPER_ADMIN | Check with `/auth/me`; Logout in Authorize and paste a super admin token |
| 400 | A filter is wrong, e.g. `limit=500` or `limit=abc` | Fix the value, or leave the box empty |

---

## 7. How it works, step by step

```
1. You click Execute in Swagger — it sends GET /admin/events/list + your Bearer token
        ↓
2. The door check: is the token valid? Is the caller BANK_SUPER_ADMIN?
        ↓   (no → 401 or 403)
3. The filter check: are eventType / status / limit valid?   (list-events.dto.ts)
   limit arrives as text ("50") and is turned into a number first
        ↓   (no → 400)
4. EventListController receives it and hands it to EventListService
        ↓
5. EventListService checks the role again, then asks
   AuditOutboxRepository.findRecent() for the rows
        ↓
6. findRecent() reads audit_outbox — newest first, with your filters, at most `limit` rows
        ↓
7. The rows come back to Swagger inside `data`
```

### The files

| File | Job |
|---|---|
| `event-list/event-list.controller.ts` | The front desk — defines the GET URL and the required role |
| `event-list/event-list.service.ts` | The worker — checks the role, applies the default limit, fetches rows |
| `event-list/dto/list-events.dto.ts` | The filters — which query parameters are allowed and their rules |
| `event-list/event-list.service.spec.ts` | 4 tests: BANK_ADMIN blocked, other roles blocked, default limit, filters passed through |
| `src/clients/audit-outbox/audit-outbox.repository.ts` → `findRecent()` | The query that reads the table |

---

## 8. How to remove it before production

1. **Delete this whole folder:** `src/modules/admin/event-list/`
   (this removes the controller, service, DTO, test and this document)

2. **In `src/modules/admin/admin.module.ts`, delete the 5 lines marked `TEMPORARY`:**
   - the comment line `// TEMPORARY — remove these two imports ...`
   - `import { EventListController } from './event-list/event-list.controller';`
   - `import { EventListService } from './event-list/event-list.service';`
   - `EventListController, // TEMPORARY` in `controllers`
   - `EventListService, // TEMPORARY` in `providers`

3. **Optional:** in `src/clients/audit-outbox/audit-outbox.repository.ts`, delete the
   `findRecent()` method. Nothing else uses it. Leaving it is harmless.

4. **Check nothing broke:**
   ```bash
   npx tsc --noEmit    # nothing printed = OK
   npm test            # all tests pass
   ```

Removing the endpoint does **not** stop events being recorded. The listeners keep writing to
`audit_outbox` exactly as before — you just can't see the rows from Swagger any more.

This endpoint was never added to `openapi.json`, so there is nothing to remove there.
