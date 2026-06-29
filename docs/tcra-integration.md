# TCRA Integration — Postal & Courier Monitoring

## Overview

Integration with Tanzania Communications Regulatory Authority (TCRA) for automated data collection and near real-time monitoring of postal and courier services. The system pushes shipment lifecycle events to TCRA's API over an IPSec VPN tunnel.

## Architecture

```
┌─────────────────────────┐     HTTPS/VPN      ┌──────────────────────┐
│     Sifex System        │ ──────────────────→ │  TCRA API Server    │
│                         │   196.32.240.66:8000 │  196.32.240.66:8000 │
│  ┌───────────────────┐  │                     │                      │
│  │  Event Bus        │  │  POST /v1/api/events │                      │
│  │  (lib/events/)    │──│────────────────────→│  Events ingestion    │
│  └────────┬──────────┘  │                     │                      │
│           │             │  POST /v1/api/snapshot                     │
│           ▼             │────────────────────→│  Daily reconciliation │
│  ┌───────────────────┐  │                     │                      │
│  │  TCRA Outbox      │  │  POST /v1/api/callback                     │
│  │  (tcra_outbox DB) │←─│────────────────────│  Missing data request │
│  └───────────────────┘  │                     └──────────────────────┘
│           │             │
│           ▼             │
│  ┌───────────────────┐  │
│  │  Queue Processor  │  │
│  │  (processPending) │──│
│  └───────────────────┘  │
└─────────────────────────┘
```

## Files & Structure

```
lib/tcra/
  ├── types.ts          # TCRA API type definitions (events, snapshot, callback, codes)
  ├── signing.ts        # SHA-256 digital signature for request authentication
  ├── client.ts         # HTTP client sending events to TCRA endpoint
  ├── queue.ts          # Database-backed outbox queue with retry (max 5 attempts)
  ├── events.ts         # Event bus subscription — maps CargoStatus → TCRA op codes
  ├── snapshot.ts       # Daily reconciliation snapshot logic
  └── index.ts          # Public exports

app/api/tcra/
  ├── outbox/route.ts   # GET list / POST retry for monitoring page
  └── callback/route.ts # TCRA requests missing data (POST /api/tcra/callback)

app/workspace/tcra/
  └── page.tsx          # Monitoring dashboard (status, retry, filter)

prisma/schema.prisma    # TcraOutbox + TcraSnapshotLog models
```

## Status Mapping

| Sifex CargoStatus | TCRA OperationCode | TCRA Status       |
|-------------------|--------------------|-------------------|
| ACCEPTED          | OT01 (Acceptance)  | accepted          |
| RCS               | OT02 (Dispatch)    | dispatched        |
| DELIVERED         | OT04 (Delivered)   | delivered         |
| (snapshot)        | OT06 (Snapshot)    | —                 |

## What's Built

- [x] `lib/tcra/types.ts` — Full TCRA API types (events, snapshot, callback, operation codes, response codes, status codes, charges)
- [x] `lib/tcra/signing.ts` — Digital signature creation & verification using Node crypto (SHA-256)
- [x] `lib/tcra/client.ts` — HTTP client with POST to TCRA API + auth header + timeout
- [x] `lib/tcra/queue.ts` — Outbox pattern: events queued in `tcra_outbox` DB table, processed via `processPendingEvents()` with max 5 retries
- [x] `lib/tcra/events.ts` — Event bus subscription: maps `SHIPMENT_STATUS_CHANGED` events to TCRA events, enqueues to outbox
- [x] `lib/tcra/snapshot.ts` — Daily snapshot/reconciliation query
- [x] `app/api/tcra/outbox/route.ts` — API for monitoring page (GET list, POST retry)
- [x] `app/api/tcra/callback/route.ts` — TCRA callback endpoint with signature verification
- [x] `app/workspace/tcra/page.tsx` — Monitoring dashboard with status filters + retry button
- [x] `prisma/schema.prisma` — `TcraOutbox` and `TcraSnapshotLog` models (pushed to DB)
- [x] `.env` — `TCRA_API_URL`, `TCRA_PRIVATE_KEY`, `TCRA_PUBLIC_KEY` variables
- [x] `config/modules.ts` — TCRA Monitor module with `tcra.view` permission
- [x] `config/permissions.ts` — `tcra.view`, `tcra.retry` permissions
- [x] `scripts/seed.ts` — TCRA permissions in seed data

## What's Pending / Need to Implement

### 1. Initialize Event Subscription at Startup

`subscribeToEvents()` must be called once when the app starts. Create a `lib/instrumentation.ts`:

```ts
// lib/instrumentation.ts
import { subscribeToEvents } from "@/lib/tcra/events";

export async function register() {
  subscribeToEvents();
}
```

Or import it in the root layout (`app/layout.tsx`) so it runs eagerly:

```ts
import "@/lib/tcra/events"; // side-effect: calls subscribeToEvents()
```

### 2. Configure Digital Signature Keys

Set `TCRA_PRIVATE_KEY` and `TCRA_PUBLIC_KEY` in `.env` with the actual keys exchanged with TCRA. The `initTcraKeys()` function must be called before any signing:

```ts
import { initTcraKeys } from "@/lib/tcra/signing";

initTcraKeys(
  process.env.TCRA_PRIVATE_KEY!,
  process.env.TCRA_PUBLIC_KEY!
);
```

### 3. Integrate TCRA Trigger into Cargo Status Changes

The `triggerTcraEvent()` function needs to be called whenever cargo status changes. Add calls in:

- `POST /api/house-awbs` — new HAWB created
- `PATCH /api/house-awbs/[id]` — HAWB status changes
- `PATCH /api/master-awbs/[id]` — MAWB status cascades to HAWBs

Example integration point:
```ts
import { triggerTcraEvent } from "@/lib/tcra/events";

// in PATCH handler after status update:
if (newStatus === CargoStatus.ACCEPTED || newStatus === CargoStatus.DELIVERED) {
  await triggerTcraEvent(orgId, hawbId, trackingNumber, newStatus, {
    postedBranch: branch,
    postedRegion: region,
    destinationBranch: destBranch,
    destinationRegion: destRegion,
    locality: "international_outgoing",
    serviceCode: "S01",
    serviceTypeCode: "ST01",
    charges: [{ chargeType: "fee", currency: "TZS", amount: "0" }],
  });
}
```

### 4. Database Values for Regions/Branches/Localities

The TCRA schema requires `postedBranch`, `postedRegion`, `destinationBranch`, `destinationRegion`, `locality`, `serviceCode`, `serviceTypeCode`. These need to be mapped from Sifex's internal data:

- **Branch/Region** → Map from station/city fields on HAWB or organization
- **Locality** → Determine from origin/destination countries: same country = `local`, different = `international_outgoing`/`international_incoming`
- **Service Code / Service Type Code** → Map from `shipmentType` or package type

### 5. Set Up Cron Job for Daily Snapshot & Queue Processing

Create a cron job or scheduled task that runs:

```ts
// Daily at midnight
import { sendDailySnapshot } from "@/lib/tcra/snapshot";

const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
const endOfDay = new Date(yesterday);
endOfDay.setHours(23, 59, 59, 999);
const startOfDay = new Date(yesterday);
startOfDay.setHours(0, 0, 0, 0);

await sendDailySnapshot(startOfDay, endOfDay);
```

```ts
// Every 5 minutes
import { processPendingEvents } from "@/lib/tcra/queue";
await processPendingEvents();
```

### 6. VPN & Network Configuration

From the TCRA documentation:

| Item | Value |
|------|-------|
| TCRA API Endpoint | `196.32.240.66:8000` |
| VPN Peer | `104.248.245.68` (TCRA-DC) |
| Our VPN Device | Ubuntu 24.04 LTS (strongSwan) |
| Our Peer IP | `10.114.0.4/32` |
| Encryption Domain | `196.32.240.66` |
| IKEv2 | Group 14, AES256, SHA256 |
| ESP | AES256, SHA256 |
| Pre-shared Key | Exchanged via SMS |

### 7. Firewall Rule

```
Source: 10.114.0.3/32
Destination: 196.32.240.66
Port: 8000
Service: TCP/8000
```

## TCRA API Endpoints

### Events (POST → TCRA)
```
POST /v1/api/events
Content-Type: application/json
Authorization: Signature <base64-encoded-sha256-signature>
```

### Snapshot (POST → TCRA)
```
POST /v1/api/snapshot
Content-Type: application/json
Authorization: Signature <base64-encoded-sha256-signature>
```

### Callback (TCRA → POST to us)
```
POST /api/tcra/callback
Content-Type: application/json
Authorization: Signature <base64-encoded-sha256-signature>
```

## Operation Codes

| Code | Operation     | Trigger                     |
|------|--------------|-----------------------------|
| OT01 | Acceptance    | HAWB status → ACCEPTED      |
| OT02 | Dispatch     | HAWB status → RCS           |
| OT03 | Delivery Rec | — (not yet mapped)          |
| OT04 | Delivered    | HAWB status → DELIVERED     |
| OT05 | Revenue      | — (not yet implemented)     |
| OT06 | Snapshot     | Daily reconciliation         |

## Response Codes

| Code | Meaning        |
|------|----------------|
| RC00 | OK             |
| RC01 | General Error  |
| RC02 | Invalid Format |
