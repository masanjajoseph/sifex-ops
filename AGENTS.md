<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:anchored-summary -->
## Goal
Complete the export workflow with full HAWB creation, MAWB billing, status inheritance, and Hong Kong transfer capabilities.

## Constraints & Preferences
- All data from server API/database — no client-side hardcoded arrays.
- TypeScript must compile cleanly (`tsc --noEmit` zero errors).
- Forms must auto-save to localStorage and survive page refresh.
- Invoice follows Sifex pattern: line items with `rate × chargeableWeight`, dual currency (USD + TZS), status flow: unpaid → paid/credited.
- HAWB status inherits from MAWB status automatically.
- Hong Kong MAWB auto-created when HAWB is transferred, with updated type/rate.
- MAWB extraction and invoice generation happen automatically at RELEASED status.

## Progress
### Done
- **Departure date/time** added to Step 0 of New Export form (defaults to today + `12:00`).
- **Unique constraint** `[flightNumber, airlineId, departureTime]` added to Flight model.
- **MAWB totals recalculation** — `POST /api/house-awbs` and `POST /api/parcels` now cascade totals up to parent MAWB.
- **Existing data backfill** — SQL scripts run to fix MAWB `awbPieces`/`awbWeight` and HAWB `pieces`/`weight` from child records.
- **MAWB GET detail endpoint** (`/api/master-awbs/[id]`) — auto-recalculates and updates stale totals on read, returns `billingRecords` alongside MAWB data.
- **Full "Add House AWB" form** on MAWB detail page — shipper/receiver (6 fields each), shipment details, parcels/items, freight, draft save to localStorage with amber Resume/Discard banner, saving indicator, and error display.
- **Draft resume bug fixed** — save effect no longer overwrites existing draft when form opens.
- **HAWB error handling** — `try/catch` with error display banner.
- **MAWB status → HAWB cascade** — `PATCH /api/master-awbs/[id]` updates all child HAWB `cargoStatus` when MAWB status changes.
- **HAWB detail page** at `/workspace/house-awb/[id]` — shipment overview, shipper/receiver, parcels, Master AWB link, "Move to HKG" button.
- **House AWB list page** — clickable rows navigating to `/workspace/house-awb/[id]`.
- **MAWB detail page — HAWB rows** — linkable, show `shipmentType`, HKG transfer button (hidden when already HKG).
- **Transfer API** (`POST /api/house-awbs/[id]/transfer`) — finds/creates Hong Kong MAWB, updates type/rate/totals.
- **Auto-invoicing at RELEASED** — `PATCH /api/master-awbs/[id]` creates billing records per HAWB with `AIRLINE_FREIGHT` charge.
- **Billing detail page** (`/workspace/billing/[id]`) — rewritten to match Sifex Django template:
  - Invoice header with ID, status badge
  - Customer info (name, phone, email, address)
  - Line items table: #, Service, AWB, Rate, Origin, Weight, Amount TZS, Amount USD
  - Totals in both USD and TZS
  - Payment marking form (if unpaid): select status (paid/credited) + payment method (cash/bank/mobile)
  - Payment history section
  - Summary sidebar with exchange rate
  - No more custom charge types (AIRLINE_FREIGHT/HANDLING/CUSTOMS etc.)
- **Billing list page** (`/workspace/billing`) — Sifex-style columns: Invoice#, Customer, Amount, Date, Status. Status labels simplified to Paid/Unpaid/Credited.
- **Billing API** (`/api/billing/[id]`) — GET includes customer, houseAWB (shipper, masterAWB with originStation), exchangeRate from `ExchangeRateSnapshot`. POST uses Sifex payment flow (status + paymentMethod).
- **Parcels page** (`/workspace/parcels`) — real parcel list (replaced placeholder).

### In Progress
- (none)

### Blocked
- (none)

## Key Decisions
- Invoice follows **Sifex pattern**: line items with `rate × chargeableWeight`, amounts in USD + TZS.
- Status flow: **unpaid → paid/credited** (simplified from DRAFT/INVOICED/PARTIAL_PAID).
- Payment methods: **cash, bank, mobile** (matching Django Sifex).
- Exchange rate fetched from `ExchangeRateSnapshot` (defaults to 2500 TZS/USD).
- No custom charge types — only the main freight line item (additional items can be added as extra line items).
- **MAWB extraction** happens automatically when `cargoStatus` reaches `RELEASED`.
- **Hong Kong MAWB** auto-created matching source MAWB's flight details.
- **HAWB status inherits from MAWB** — all child HAWBs updated via `updateMany`.
- Billing records are per-HAWB, each representing a different customer/shipper.

## Next Steps
- Add **PDF generation** endpoint for invoices (matching Sifex PDF layout with logo, watermark, payment instructions).
- Add **Invoice history/audit trail** for changes to invoices.
- Explore adding **due date** field to BillingRecord schema.

## Critical Context
- TypeScript compiles with `tsc --noEmit` — zero errors.
- Dev server restart required after adding/removing page directories.
- Cookie names in next-auth v5 beta (`@auth/core`) — `authjs.session-token` (http) / `__Secure-authjs.session-token` (https). The old v4 name `next-auth.session-token` is NOT used.
- Client-side `signOut({ callbackUrl })` does not work in next-auth v5 — the client passes `callbackUrl` but the server reads `redirectTo`. Use `/api/signout` custom route instead.
- Schema pushed with `prisma db push` (no migrations).
- `BillingRecord` has no direct Prisma relation to `HouseAWB` (houseAWBId is not unique); data fetched via separate query.
- `BillingRecord.customer` IS a proper Prisma relation — usable in `include`.
- `ExchangeRateSnapshot` model exists for exchange rate data.
- Hong Kong station ID: `d6d35225-96dc-46fb-b3dc-2a3a0efbad4b` (HKG).
- Guangzhou station ID: `680393ef-79f6-475d-b1db-703033d4c41e` (CAN).
- TCRA integration: `lib/tcra/` — outbox pattern with `tcra_outbox` DB table. Events automatically queued via event bus when cargo status changes (ACCEPTED → OT01, RCS → OT02, DELIVERED → OT04). Process pending events with `processPendingEvents()`. TCRA endpoint: `196.32.240.66:8000`. Our callback endpoint: `POST /api/tcra/callback`.
- TCRA event bus subscription (`subscribeToEvents()`) must be called at app startup — e.g. in a `lib/instrumentation.ts` or in the root layout import.

## Relevant Files
- `app/workspace/billing/[id]/page.tsx`: Sifex-pattern invoice detail with line items table, dual currency, payment marking.
- `app/workspace/billing/page.tsx`: Sifex-style invoice list with Customer/Amount/Date/Status columns.
- `app/api/billing/[id]/route.ts`: GET returns customer/houseAWB/exchangeRate; POST handles paid/credited + payment method.
- `app/api/billing/route.ts`: List endpoint includes customer info.
- `app/api/master-awbs/[id]/route.ts`: Auto-recalculate totals on GET, cascade status + auto-generate invoices at RELEASED.
- `app/workspace/export/[id]/page.tsx`: Full "Add House AWB" form with draft save, HawbRow with HKG transfer.
- `app/workspace/house-awb/[id]/page.tsx`: HAWB detail with billing section, Move to HKG.
- `app/api/house-awbs/[id]/transfer/route.ts`: Transfer HAWB to HKG MAWB.
- `prisma/schema.prisma`: Flight unique constraint, ExchangeRateSnapshot model, BillingRecord model.
- `types/cargo-domain.ts`: CargoStatus, ShipmentType, BillingStatus enums.
- `lib/tcra/`: TCRA integration module (types, client, signing, queue, events, snapshot).
- `lib/tcra/events.ts`: Subscribes to event bus, maps Sifex statuses → TCRA operation codes.
- `lib/tcra/queue.ts`: Outbox pattern with `tcra_outbox` DB table for reliable delivery.
- `app/api/tcra/callback/route.ts`: TCRA callback endpoint for missing data requests.
- `prisma/schema.prisma`: Added `TcraOutbox` and `TcraSnapshotLog` models.
<!-- END:anchored-summary -->
