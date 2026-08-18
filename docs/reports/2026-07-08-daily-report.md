# Daily Report — 2026-07-08

## Summary
Fixed export-to-import pipeline, warehouse actions, and export detail page gating.

## Changes

### 1. Export → Import Pipeline (DEPARTED + IN_TRANSIT flow)
**Files:** `lib/workflow-engine/types.ts`, `lib/workflow-engine/definitions.ts`, `lib/workflow-engine/index.ts`

- Reverted `CARGO_STATUS_MAP`: `DISPATCHED → DEPARTED` (was incorrectly `IN_TRANSIT`)
- Added `IN_TRANSIT` to `ExportWorkflowStatus` enum
- Added `CARGO_STATUS_MAP` entry: `IN_TRANSIT → IN_TRANSIT`
- Added `STATUS_TO_WORKFLOW_STAGE` entry: `IN_TRANSIT → WorkflowStage.IMPORT` — so MAWB leaves export scope and appears in import scope
- Added transition `DISPATCHED → IN_TRANSIT` via action `MARK_IN_TRANSIT`
- Changed cross-module `RECEIVE_SHIPMENT` from `DISPATCHED → RECEIVED` to `IN_TRANSIT → RECEIVED`, kept backward-compatible `DISPATCHED → RECEIVED` for existing records
- Added quick actions for `IN_TRANSIT` status (TRACK_FLIGHT, VIEW_TIMELINE)

**Flow:**
```
DISPATCHED (cargo: DEPARTED, stage: EXPORT)
  → MARK_IN_TRANSIT
  → IN_TRANSIT (cargo: IN_TRANSIT, stage: IMPORT)
  → RECEIVE_SHIPMENT
  → RECEIVED (stage: IMPORT)
```

### 2. Import Page — RECEIVE_SHIPMENT button not working
**Files:** `app/workspace/import/page.tsx`, `app/api/master-awbs/route.ts`

- Added `IN_TRANSIT` alongside `DISPATCHED` in the import page condition for showing "Receive Shipment" button
- Added `IN_TRANSIT` to the MasterAWB list API import scope

### 3. Warehouse — Assign Shelf not working
**Files:** `lib/workflow-engine/definitions.ts`, `app/workspace/warehouse/page.tsx`

- Added `WAREHOUSE_RECEIVING → STORED` transition with `ASSIGN_SHELF` action (shipments arrive with `WAREHOUSE_RECEIVING` status from import)
- Updated awaiting storage filter to show both `WAREHOUSE_RECEIVING` and `AWAITING_STORAGE` shipments

### 4. Warehouse — View Shipment / View Customer buttons not clickable
**File:** `app/workspace/warehouse/page.tsx`

- Added `onClick` handlers: View Shipment → `/workspace/export/${id}`, View Customer → `/workspace/customers`

### 5. Auto Invoice Generation not working
**File:** `lib/workflow-engine/index.ts`

- `autoGenerateInvoice()` only handled `HouseAWB` entity type — added `MasterAWB` support (iterates all houseAWBs, creates billing records for each)
- Implemented `executeAutoTransitions()` — after every main transition, the engine now chains through `autoTrigger: true` transitions. After `ASSIGN_SHELF` (→ `STORED`), the chain fires: `STORED → INVOICE_GENERATED → WAITING_PAYMENT`, generating invoices at the billing stage.

### 6. Export Detail Page — stale UI for non-export records
**File:** `app/workspace/export/[id]/page.tsx`

- Added `isExportScope` check (`workflowStage === 'EXPORT'`)
- "Status Transition" section hidden when not in export scope
- Blue banner shown directing user to Import Operations
- "Move to HKG" button in `HawbRow` hidden when not in export scope
- "Add House AWB" form hidden when not in export scope

## Verification
- `npx tsc --noEmit` — zero errors
