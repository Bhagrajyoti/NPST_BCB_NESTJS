# Bill Payment Module

API & Technical Documentation

Related guides: [api endpoint guide.md](api%20endpoint%20guide.md) (`/auth/*`),
[adminservice.md](adminservice.md) (`/admin/*`), [rbacservice.md](rbacservice.md) (`/employees`,
`/roles`, ...), [mock-testing-guide.md](mock-testing-guide.md) (local/offline testing without a
real Keycloak server).

## 1. Overview

The Bill Payment module provides APIs for biller registration, bill fetching, bill payment, BBPS
outcome simulation, payment persistence, and duplicate-payment protection using idempotency keys.
MySQL is used for persistence and a Mock BBPS Adapter is used for simulation — see §9.

Module: [src/modules/bill-payment](src/modules/bill-payment)
([bill-payment.module.ts](src/modules/bill-payment/bill-payment.module.ts)).

## 2. API Base URL

```
http://localhost:3000/api/v1
```
Swagger: `http://localhost:3000/api/v1/docs`

Every route in this module requires:
```
Authorization: Bearer <accessToken>
```
(`<accessToken>` from `POST /auth/login` — see [api endpoint guide.md](api%20endpoint%20guide.md).
Locally, `Authorization: Bearer mock-mock-admin-token` works — see
[mock-testing-guide.md](mock-testing-guide.md).)

Every success response is wrapped:
```json
{ "success": true, "data": { /* shown below */ }, "timestamp": "2026-09-10T05:32:18.757Z" }
```
The JSON blocks below show `data`'s contents. Error responses are **not** wrapped:
```json
{ "statusCode": 404, "path": "/api/v1/bill-payment/bill/fetch", "timestamp": "...", "message": {"code":"BILL_NOT_FOUND","message":"Bill not found"} }
```

## 3. Biller API

**`POST`** `/bill-payment/biller`

### Request fields
| Field | Type | Required | Description |
|---|---|---|---|
| billerCode | String | Yes | Unique biller identifier |
| billerName | String | Yes | Biller display name |
| category | String | Yes | Free-text category (e.g. `ELECTRICITY`, `WATER`, `GAS`) |

### Request
```json
{
  "billerCode": "DOCTEST-ELEC-01",
  "billerName": "Doctest Electricity",
  "category": "ELECTRICITY"
}
```

### Success Response
```json
{
  "billerCode": "DOCTEST-ELEC-01",
  "billerName": "Doctest Electricity",
  "category": "ELECTRICITY",
  "id": "65ea7155-fd91-4fef-990a-9cb32b6a4824",
  "active": true,
  "createdAt": "2026-09-10T00:02:24.726Z",
  "updatedAt": "2026-09-10T00:02:24.726Z"
}
```

**`GET`** `/bill-payment/biller` — returns all billers (active and inactive).
**`GET`** `/bill-payment/biller/{id}` — returns one biller by its `id` (not `billerCode`); `404` if unknown.

> Registering a biller alone does not create a matching `mock_bill` row — `bill/fetch`/`payment`
> also need a bill for that `billerCode`+`consumerNumber` to exist (§7). Nothing in this API
> creates `mock_bill` rows directly; use the built-in `demo_bbps_data` fixtures (§7) for testing
> unless you're deliberately populating the DB by hand.

## 4. Bill Fetch API

**`POST`** `/bill-payment/bill/fetch`

### Request fields
| Field | Type | Required | Description |
|---|---|---|---|
| billerCode | String | Yes | Unique biller identifier |
| consumerNumber | String | Yes | 12-digit consumer number |
| registeredMobile | String | Yes | 10-digit registered mobile number |

### Request
```json
{
  "billerCode": "DEMO-ELEC-001",
  "consumerNumber": "100000000001",
  "registeredMobile": "9000000001"
}
```

### Success Response
```json
{
  "billerCode": "DEMO-ELEC-001",
  "billerName": "Demo Electricity Board",
  "consumerNumber": "100000000001",
  "billNumber": "DEMO-BILL-ELEC-001",
  "customerName": "Demo Customer One",
  "registeredMobile": "9000000001",
  "amount": "1250.50",
  "dueDate": "2026-12-31",
  "status": "UNPAID"
}
```

**Errors:** `BILL_NOT_FOUND` (`404`) — no biller/bill in either data source (§7) matches all three
fields exactly. There is no separate `BILLER_NOT_FOUND` response from this endpoint in the current
implementation — a missing biller and a missing bill both surface as `BILL_NOT_FOUND`.

## 5. Bill Payment API

**`POST`** `/bill-payment/payment`

### Request fields
| Field | Type | Required | Description |
|---|---|---|---|
| billerCode | String | Yes | Unique biller identifier |
| consumerNumber | String | Yes | Customer consumer number |
| amount | String | Yes | Amount to be paid — must exactly equal the bill's stored amount |
| idempotencyKey | String | Yes | Unique key for the payment request (see §6) |

### Request
```json
{
  "billerCode": "DEMO-WATER-001",
  "consumerNumber": "100000000002",
  "amount": "480.00",
  "idempotencyKey": "docverify-001"
}
```

### Success Response
```json
{
  "paymentId": "ae0ab688-0a04-424e-93c9-18401bf3af9b",
  "billerCode": "DEMO-WATER-001",
  "consumerNumber": "100000000002",
  "amount": 480,
  "status": "FAILED",
  "bbpsReferenceId": "BBPS-1789018338769"
}
```
`status` is one of `SUCCESS`, `FAILED`, `PENDING`, `TIMEOUT` — decided randomly by the Mock BBPS
Adapter (§9), not by anything in the request. Only `SUCCESS` marks the bill `PAID`.

## 6. Payment Retry API

**`POST`** `/bill-payment/payment/retry`

### Request fields
| Field | Type | Required | Description |
|---|---|---|---|
| id | String (UUID) | Yes | `paymentId` from a `payment` (or earlier `retry`) response |

### Request
```json
{ "id": "ae0ab688-0a04-424e-93c9-18401bf3af9b" }
```

### Success Response
```json
{
  "id": "ae0ab688-0a04-424e-93c9-18401bf3af9b",
  "billerCode": "DEMO-WATER-001",
  "consumerNumber": "100000000002",
  "amount": "480.00",
  "status": "FAILED",
  "idempotencyKey": "docverify-001",
  "bbpsReferenceId": "BBPS-1789018338788",
  "createdAt": "2026-09-10T00:02:18.770Z",
  "updatedAt": "2026-09-10T00:02:18.000Z"
}
```
Re-dispatches a non-`SUCCESS` payment to BBPS (using the `billerCode`/`consumerNumber`/`amount`
already stored on the payment — nothing else is sent) and updates `status`/`bbpsReferenceId`. A
payment already at `SUCCESS` is returned unchanged (safe to call speculatively). Note the field is
`id` here, not `paymentId` — this reads back through `findOne`, not `payment`'s own response shape.

## 7. Payment APIs

**`GET`** `/bill-payment/payment` — returns all payment transactions.
**`GET`** `/bill-payment/payment/{id}` — returns a payment transaction by payment ID; `404` if unknown.

## 8. Idempotency

The frontend/mobile client generates a unique UUID as `idempotencyKey` for each **new** payment
attempt. For a retry caused by a timeout or network failure (i.e. the client doesn't know if the
first request landed), the **same** `idempotencyKey` must be reused — the backend returns the
existing payment and does **not** invoke BBPS again. The `idempotency_key` column is `NOT NULL`
and `UNIQUE`.

```
First request              → BBPS called     → Payment created
Retry with same key + same billerCode/consumerNumber/amount
                            → Existing payment returned, "duplicate": true → BBPS NOT called
Same key + different billerCode/consumerNumber/amount
                            → 400 IDEMPOTENCY_KEY_REUSED
```

This is a **body field**, distinct from `POST /auth/otp/create`'s `Idempotency-Key` **header**
(see [api endpoint guide.md §5](api%20endpoint%20guide.md#5-otp-api)) — different
mechanism, same purpose.

## 9. Database Tables

**`biller_registration`** — biller/master information.
| Field | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| biller_code | VARCHAR | Biller identifier |
| biller_name | VARCHAR | Biller name |
| category | VARCHAR | Biller category (free text) |
| active | BOOLEAN | Active/inactive status |
| created_at | DATETIME | Creation timestamp |
| updated_at | DATETIME | Last update timestamp |

No fixed sample exists in this table — it's populated by `POST /bill-payment/biller` and by the
e2e test suite (which leaves randomly-named rows behind on every run). For a reliable, always-
present sample, use `demo_bbps_data` below instead.

**`mock_bill`** — mock customer bill information.
| Field | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| biller_code | VARCHAR | Biller identifier |
| consumer_number | VARCHAR | Customer consumer number |
| bill_number | VARCHAR | Bill number |
| registered_mobile | VARCHAR | Registered mobile |
| customer_name | VARCHAR | Customer name |
| amount | DECIMAL(12,2) | Bill amount |
| due_date | DATE | Bill due date |
| status | VARCHAR | `UNPAID` / `PAID` |
| created_at | DATETIME | Creation timestamp |
| updated_at | DATETIME | Last update timestamp |

Same caveat as `biller_registration` — no fixed sample; see `demo_bbps_data`.

**`bill_payment`** — payment transaction information.
| Field | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| biller_code | VARCHAR | Biller identifier |
| consumer_number | VARCHAR | Consumer number |
| amount | DECIMAL(12,2) | Payment amount |
| status | VARCHAR | `SUCCESS` / `FAILED` / `PENDING` / `TIMEOUT` |
| idempotency_key | VARCHAR, `NOT NULL UNIQUE` | Duplicate request protection |
| bbps_reference_id | VARCHAR, nullable | BBPS transaction reference (`null` on `TIMEOUT`) |
| created_at | DATETIME | Creation timestamp |
| updated_at | DATETIME | Last update timestamp |

**`demo_bbps_data`** — separate, fixed, always-present sample data for manual/local testing
(seeded automatically on every app boot by
[`DemoBbpsDataSeeder`](src/modules/bill-payment/demo/demo-bbps-data.seeder.ts); see
[mock-testing-guide.md §6](mock-testing-guide.md#6-mock-bbps-data) for the full rationale). Same
columns as `biller_registration` + `mock_bill` combined into one row. `bill/fetch` and `payment`
check `biller_registration`/`mock_bill` first and fall back to this table.

| billerCode | billerName | category | consumerNumber | registeredMobile | amount | status |
|---|---|---|---|---|---|---|
| `DEMO-ELEC-001` | Demo Electricity Board | ELECTRICITY | `100000000001` | `9000000001` | 1250.50 | UNPAID |
| `DEMO-WATER-001` | Demo Water Board | WATER | `100000000002` | `9000000002` | 480.00 | UNPAID |
| `DEMO-GAS-001` | Demo Gas Agency | GAS | `100000000003` | `9000000003` | 900.00 | UNPAID |

## 10. Payment Processing Flow

```
Frontend / Mobile App
        │
        ▼
Payment API → Idempotency Check (idempotencyKey unique?)
        │
        ▼
Find Bill (biller_registration+mock_bill, fall back to demo_bbps_data)
        │
        ▼
Check UNPAID → Validate Amount matches exactly
        │
        ▼
Mock BBPS Adapter (§11)
        │
        ▼
SUCCESS / FAILED / PENDING / TIMEOUT
        │
        ▼
Save Payment (bill_payment row)
        │
        ▼
SUCCESS → bill.status = PAID
```

## 11. Mock BBPS Adapter

[`MockBbpsAdapter`](src/modules/bill-payment/payment/adapter/mock-bbps.adapter.ts) — random
outcomes, used for development and testing. Injected behind the `BbpsAdapter` interface
([bbps.adapter.ts](src/modules/bill-payment/payment/adapter/bbps.adapter.ts)), so a real
implementation can be swapped in later without touching `PaymentService` (see §14).

| Random Number (0–19) | Response |
|---|---|
| 0–4 | `SUCCESS` |
| 5–9 | `FAILED` |
| 10–14 | `PENDING` |
| 15–19 | `TIMEOUT` |

## 12. Validation & Error Handling

The flow validates: active biller, existing consumer bill, `UNPAID` bill status, matching payment
amount, and idempotency. Reusing an idempotency key for a different payment request is rejected.

| Code | Status | Where |
|---|---|---|
| `BILL_NOT_FOUND` | 404 | `bill/fetch`, `payment` |
| `BILL_NOT_PAYABLE` | 400 | `payment` — bill already `PAID` |
| `AMOUNT_MISMATCH` | 400 | `payment` — `amount` ≠ bill's stored amount |
| `IDEMPOTENCY_KEY_REUSED` | 400 | `payment` — same key, different `billerCode`/`consumerNumber`/`amount` |
| `PAYMENT_NOT_FOUND` | 404 | `payment/retry` — unknown `id` |

## 13. Testing Scenarios

| Scenario | Expected Result | Verified |
|---|---|---|
| Valid bill fetch | Bill details returned | ✅ live, §4 |
| Unknown biller/consumer combination | `BILL_NOT_FOUND` | ✅ |
| Correct payment | Payment processed, one of the four statuses | ✅ live, §5 |
| Amount mismatch | `AMOUNT_MISMATCH` | ✅ |
| Already-paid bill | `BILL_NOT_PAYABLE` | ✅ |
| BBPS success | `SUCCESS` + bill marked `PAID` | ✅ (see registration-saga live test in [api endpoint guide.md](api%20endpoint%20guide.md)) |
| BBPS failure / pending / timeout | `FAILED` / `PENDING` / `TIMEOUT`, bill stays `UNPAID` | ✅ |
| Same request retry (same key, same body) | Existing payment returned, `"duplicate": true`, BBPS not re-called | ✅ |
| Same key + different payment | `IDEMPOTENCY_KEY_REUSED` | ✅ |
| Retry a non-final payment | `POST /payment/retry` re-dispatches, may flip to `PAID` | ✅ live, §6 |
| Retry an already-`SUCCESS` payment | No-op, row returned unchanged | by design, see `PaymentService.payViaBbps` |

## 14. Future Real BBPS Integration

```
PaymentService
      │
      ▼
  BbpsAdapter (interface)
      ├── MockBbpsAdapter   (current — random outcomes)
      └── RealBbpsAdapter   (future)
              │
              ▼
        Actual BBPS network switch
```
Swap the `'BBPS_ADAPTER'` provider in
[bill-payment.module.ts](src/modules/bill-payment/bill-payment.module.ts) from
`MockBbpsAdapter` to a real implementation of the same `BbpsAdapter` interface — no other file
needs to change.

## 15. Frontend Integration Note

Generate a unique UUID as `idempotencyKey` for every **new** payment attempt. For a retry of the
same payment (timeout, dropped connection), reuse the **same** `idempotencyKey` — do not generate
a new key for a retry of the same logical payment.
