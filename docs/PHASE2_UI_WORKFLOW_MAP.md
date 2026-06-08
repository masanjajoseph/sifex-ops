# Phase 2 — Operational UX Workflow Map

> **Audience:** UI engineers, product owners, QA
> **Design influence:** Odoo, Flexport, Linear, SAP EWM, modern WMS
> **Core principle:** Minimize taps/clicks per operational action. Every screen should enable a worker to complete their primary task in ≤3 interactions.

---

## Contents

1. [Interaction Patterns (Shared)](#1-interaction-patterns-shared)
2. [Export Operations](#2-export-operations)
3. [Import Operations](#3-import-operations)
4. [Warehouse Operations](#4-warehouse-operations)
5. [Cargo Receiving Flow](#5-cargo-receiving-flow)
6. [Cargo Packing Flow](#6-cargo-packing-flow)
7. [Manifest Workflow UX](#7-manifest-workflow-ux)
8. [Warehouse Scanning UX](#8-warehouse-scanning-ux)
9. [Billing Operations UX](#9-billing-operations-ux)
10. [Rider Delivery Mobile UX](#10-rider-delivery-mobile-ux)
11. [Customer Pickup UX](#11-customer-pickup-ux)
12. [Cargo Tracking Timeline UX](#12-cargo-tracking-timeline-ux)
13. [Cross-Cutting Patterns](#13-cross-cutting-patterns)
14. [Realtime Update Strategy](#14-realtime-update-strategy)

---

## 1. Interaction Patterns (Shared)

These patterns apply across ALL operational screens. Define once, reuse everywhere.

### 1.1 Table Interaction Contract

```
DataTable (existing enhanced component)
├── sortable columns ── click header to sort, shift-click multi-sort
├── column filter ── type-ahead in column header footer
├── row selection ── checkbox column, shift-click range select
├── bulk action bar ── appears on selection, pinned below top nav
├── quick action ── double-click row opens detail slide-over
├── context menu ── right-click row shows contextual actions
├── inline edit ── click cell to edit (optimistic save, undo toast)
└── virtual scroll ── for 10k+ row datasets
```

#### Table density tiers

| Tier | Row height | Use case | Props |
|---|---|---|---|
| `compact` | 40px | High-volume scanning, manifests | `density="compact"` |
| `default` | 52px | General operations | (default) |
| `comfortable` | 64px | Customer-facing, review screens | `density="comfortable"` |

#### Bulk action toolbar

```
┌──────────────────────────────────────────────────────────────┐
│ ■ 12 selected              Print Labels  │  Assign  │  …  │
└──────────────────────────────────────────────────────────────┘
```
- Appears slide-down from top of table area
- Shows count + contextual bulk actions
- "Select all N records" link when all visible rows selected
- Escape deselects all

### 1.2 Scanning Interaction Pattern

```typescript
interface ScanHandler {
  // Hardware scanner (emits keyboard events ending with Enter/Return)
  onScanComplete: (barcode: string) => void;
  
  // Virtual scan input (mobile)
  scanInputProps: {
    autoFocus: boolean;
    placeholder: string;
    onScan: (code: string) => void;
    scanDebounce: number; // 100ms buffer for hardware scanner
  };
  
  // Camera scan (mobile)
  cameraScan: {
    openScanner: () => void;
    onResult: (code: string) => void;
    viewfinder: ReactNode; // overlay component
  };
}
```

**Scanner input behavior:**
- Single text input at top of scanning screens
- Hardware scanner input captured via `keydown` event buffer — accumulate keystrokes, fire `onScanComplete` on `Enter` keyup if buffer < 50ms since last keystroke
- On scan success: play haptic feedback (mobile), flash green border, auto-advance to next field or submit
- On scan failure: red border flash, error toast with code, stay on field
- Scanner input is always present and auto-focused on scanning screens

### 1.3 Loading States

| State | Component | Behavior |
|---|---|---|
| Initial load | `SkeletonTable` (rows = pageSize) | Renders table shell with shimmer |
| Refetch | `SkeletonRows` (overlay) | Subtle pulse on existing rows, no layout shift |
| Mutation | Inline spinner on action button | Button shows spinner, disabled until complete |
| Pagination | Skeleton rows in new page | Old rows stay until new page renders |
| Search/filter | Debounce 300ms, then skeleton rows | No flash if results come back < 300ms |
| Realtime update | Row highlight flash (green=inbound, blue=update, red=delete) | Lasts 800ms, then fades |

### 1.4 Empty States (per domain)

Every operational list needs a domain-relevant empty state:

```typescript
interface DomainEmptyState {
  title: string;
  description: string;
  action: { label: string; onClick: () => void };
  illustration?: "export" | "import" | "warehouse" | "billing" | "delivery";
}
```

Examples:
- Export list: "No export shipments yet" → "Create first export" button
- Warehouse inventory: "Warehouse is empty" → "Receive cargo" button
- Manifest: "No manifest for this flight" → "Generate manifest" button

### 1.5 Offline Interaction

All operational screens follow this offline contract:

```
┌──────────────────────────────────────────────────────────────┐
│  📡 Offline Mode — Changes saved locally (3 pending syncs)  │
│  [Reconnect] [View pending]                                 │
└──────────────────────────────────────────────────────────────┘
```

- Reads served from IndexedDB (idb) cache
- Writes queued to sync queue
- Conflict resolution: last-write-wins with timestamp, server reconcilation on reconnect
- Offline indicator persistent banner
- Mutations show `pending` badge until synced
- Scanning works fully offline (cache MAWB/mapping data)

### 1.6 Keyboard Workflows

| Shortcut | Scope | Action |
|---|---|---|
| `⌘K` | Global | Command palette |
| `⌘F` | List views | Focus search/filter |
| `⌘N` | List views | New record |
| `⌘Enter` | Forms | Submit/save |
| `Escape` | Everywhere | Close slide-over, deselect rows, cancel edit |
| `⌘S` | Forms | Save draft |
| `/` | List views | Focus scanner input |
| `⌘⇧F` | List views | Focus filter bar |
| `g then e` | Global | Go to Export |
| `g then i` | Global | Go to Import |
| `g then w` | Global | Go to Warehouse |

Operational shortcuts are shown in tooltips on hover of action buttons.

---

## 2. Export Operations

### 2.1 Screens

| Screen | Route | Primary Action |
|---|---|---|
| Export List | `/workspace/export` | Browse, filter, create |
| Export Detail | `/workspace/export/{id}` | Full shipment view, status transitions |
| Export Create | `/workspace/export/new` | Multi-step booking form |
| Export Edit | `/workspace/export/{id}/edit` | Amend shipment |
| Export Documents | `/workspace/export/{id}/docs` | Document management |

### 2.2 Desktop Workflow Map

```
┌─────────────────────────────────────────────────────────────┐
│  Export Operations                              [New Export] │
├─────────────────────────────────────────────────────────────┤
│ [Search MAWB/AWB/ref] [Filter by status] [Date range]       │
├─────────────────────────────────────────────────────────────┤
│ ■  □ MAWB#      Origin → Dest   Status    Pieces  Action   │
│ ■  │ 123-4567   JFK → LHR      Booked    12      [→]      │
│    │ 123-4568   JFK → NRT      Checked   8       [→]      │
│    │ 123-4569   LHR → DXB      Manif     24      [→]      │
├─────────────────────────────────────────────────────────────┤
│ Page 1 of 12                              [<] [1] [2] [>] │
└─────────────────────────────────────────────────────────────┘
```

**Workflow steps (create → dispatch):**

```
Draft → Booked → Checked-In → Manifested → Departed → Transferred → Arrived
  │         │         │            │            │           │            │
  └─ Save   └─ Book  └─ Receive   └─ Manifest  └─ DEP     └─ Transfer  └─ POD
```

### 2.3 Mobile Workflow Map

```
┌─────────────────────┐
│ Export Operations   │  ← header with back
├─────────────────────┤
│ 🔍  Search MAWB...  │  ← scan bar auto-focused
├─────────────────────┤
│ 123-4567            │
│ JFK → LHR           │  ← quick action swipe
│ 📦 Booked  │ 12 pcs │
├─────────────────────┤
│ 123-4568            │
│ JFK → NRT           │
│ 📦 Checked │ 8 pcs  │
├─────────────────────┤
│ [+] New Shipment    │  ← FAB
└─────────────────────┘
```

- Swipe left on row → "Delete draft" (only in Draft status)
- Swipe right on row → "Quick status update" (next logical status)
- Long press → Context menu (same as desktop right-click)
- Bottom sheet for filters
- Pull-to-refresh

### 2.4 Table Columns (Export List)

| Column | Width | Type | Notes |
|---|---|---|---|
| Select | 40px | checkbox | |
| MAWB/AWB | 140px | link | Click → detail |
| Origin → Dest | 120px | text | Airport codes |
| Status | 100px | badge | Color-coded |
| Pieces | 60px | number | Total pieces |
| Weight | 80px | number | kg |
| Customer | 120px | text | |
| Created | 100px | date-time | Relative |
| Actions | 80px | menu | Quick actions dropdown |

### 2.5 Operational Shortcuts

| Action | Shortcut | Context |
|---|---|---|
| New export | `⌘N` | List view |
| Save draft | `⌘S` | Create/edit form |
| Submit booking | `⌘Enter` | Create form |
| Quick status | `Space` then type status number | Detail view |
| Copy MAWB | `⌘C` on selected row | List view |
| Print AWB | `⌘P` | Detail view |

### 2.6 Status Transition UX

Status changes are the core operational action. Pattern:

```
┌──────────────────────────────────────────┐
│ Status: Booked                           │
│ ┌──────────────────────────────────────┐ │
│ │ → Check-In    → Cancel    → Draft    │ │
│ └──────────────────────────────────────┘ │
│ Clicking "Check-In" opens prompt:        │
│ ┌──────────────────────────────────────┐ │
│ │ Check-In Shipment #123-4567          │ │
│ │                                       │ │
│ │ Pieces received: [12] ✔               │ │
│ │ Location: [Scan or type bin]          │ │
│ │                                       │ │
│ │ [Cancel]  [Check-In]                  │ │
│ └──────────────────────────────────────┘ │
└──────────────────────────────────────────┘
```

- Status buttons show only valid next transitions
- Each transition may require additional data (pieces, location, etc.)
- Transitions are recorded as audit events with timestamp + user

### 2.7 Realtime Updates

- `export.status.changed` — update status badge, push to top of list if now actionable
- `export.document.uploaded` — show document count update, flash notification
- `export.assigned` — update assigned staff badge
- WebSocket channel: `workspace:export:{id}`

---

## 3. Import Operations

### 3.1 Screens

| Screen | Route | Primary Action |
|---|---|---|
| Import List | `/workspace/import` | Browse inbound shipments |
| Import Detail | `/workspace/import/{id}` | Clearance & processing |
| Import Clearance | `/workspace/import/{id}/clearance` | Customs workflow |
| Import Delivery Order | `/workspace/import/{id}/do` | Generate delivery order |

### 3.2 Desktop Workflow Map

```
┌─────────────────────────────────────────────────────────────┐
│ Import Operations                               [New Record] │
├─────────────────────────────────────────────────────────────┤
│ [MAWB] [Origin] [Status: All ▼] [Date range]               │
├─────────────────────────────────────────────────────────────┤
│ ■  □ MAWB#      Origin  Arrived  Status    DO#    Pickup   │
│ ■  │ 456-7890   NRT     09:45    Clear     DO-001 [→]      │
│    │ 456-7891   LHR     11:20    Hold                     │
│    │ 456-7892   DXB     14:00    Clearance                 │
├─────────────────────────────────────────────────────────────┤
│ Pending clearance: 2 / Total inbound: 12                   │
└─────────────────────────────────────────────────────────────┘
```

**Workflow steps (arrival → delivery):**

```
Pre-alert → Arrived → Documents Received → Customs Clearance → Cleared → DO Issued → Picked Up
  │          │            │                    │                 │         │            │
  └─ Notify  └─ Receive   └─ Scan docs        └─ Submit         └─ Pay    └─ Generate  └─ POD
```

### 3.3 Clearance Workflow UX

The clearance desk is the most interaction-heavy screen in import.

```
┌─────────────────────────────────────────────────────────────┐
│ Clearance: MAWB 456-7890                       [Back]       │
├─────────────────────────────────────────────────────────────┤
│ Shipment Info  │  Documents  │  Customs  │  Charges         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Tab: Customs                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Declaration #: [DC-2024-00123]                       │  │
│  │ Status:        ● In Progress                          │  │
│  │                                                       │  │
│  │ HS Code:       [8471.30]  ▸ Verify                   │  │
│  │ Value (USD):   [$12,500.00]                          │  │
│  │ Duty Rate:     5.0%                                  │  │
│  │ Duty Due:      $625.00                               │  │
│  │                                                       │  │
│  │ Required Docs:  ✓ Commercial Invoice                  │  │
│  │                 ✓ Packing List                        │  │
│  │                 ○ Certificate of Origin               │  │
│  │                 ○ Import Permit                       │  │
│  │                                                       │  │
│  │ [Submit to Customs]  [Request Docs]  [Mark Hold]      │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**Clearance tabs:**

| Tab | Content | Key action |
|---|---|---|
| Shipment Info | MAWB, HAWB, origin, consignee, pieces, weight | Edit if needed |
| Documents | Document checklist with upload/view | Upload missing docs |
| Customs | Declaration, HS code, duty calculation, status | Submit declaration |
| Charges | Storage, handling, clearance fees | Generate invoice |
| Timeline | Full event log | Filter by type |

### 3.4 Mobile Import Workflow

```
┌─────────────────────┐
│ ← Import #456-7890  │
├─────────────────────┤
│ Status: Clearance   │  ← tap to see all statuses
│ ● ○ ○ ○ ○ ○ ○      │  ← progress indicator
├─────────────────────┤
│ Clearance Checklist │
│ ☑ Docs received     │
│ ☑ Customs submitted │
│ ☐ Duty paid         │
│ ☐ DO generated      │
├─────────────────────┤
│ Required: Customs   │
│ duty payment of     │
│ $625.00             │
│                     │
│ [View Payment Link] │
└─────────────────────┘
```

### 3.5 Keyboard Workflows

| Shortcut | Action | Context |
|---|---|---|
| `⌘⇧C` | Open clearance tab | Detail view |
| `⌘⇧D` | Open documents tab | Detail view |
| `⌘Enter` | Submit current form | Any tab |
| `⌘⇧H` | Mark as hold | Detail view |
| `⌘⇧G` | Generate DO | Clearance tab |

---

## 4. Warehouse Operations

### 4.1 Screens

| Screen | Route | Primary Action |
|---|---|---|
| Warehouse Dashboard | `/workspace/warehouse` | Overview, alerts |
| Inventory | `/workspace/warehouse/inventory` | Browse stock |
| Location View | `/workspace/warehouse/locations` | Zone/bin view |
| Receive | `/workspace/warehouse/receive` | Cargo receiving flow |
| Pack | `/workspace/warehouse/pack` | Cargo packing flow |
| Transfer | `/workspace/warehouse/transfer` | Location transfer |
| Cycle Count | `/workspace/warehouse/count` | Inventory counting |

### 4.2 Warehouse Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│ Warehouse Operations                             [Receive]  │
├─────────────────────────────────────────────────────────────┤
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐               │
│ │ 1,234  │ │ 56     │ │ 12     │ │ 8      │               │
│ │ Total  │ │ Inbound│ │ Outbd  │ │ Alerts │               │
│ │ Pieces │ │ Today  │ │ Today  │ │        │               │
│ └────────┘ └────────┘ └────────┘ └────────┘               │
├─────────────────────────────────────────────────────────────┤
│ Recent Activity                    │ Zone Utilization        │
│ ┌─────────────────────────────┐   │ ┌─────────────────────┐ │
│ │ 09:45 MAWB 123-4567 recv'd │   │ │ Cold Storage  78%   │ │
│ │ 09:30 MAWB 789-0123 packed │   │ │ General       92%   │ │
│ │ 09:12 Bin A-12 transferred │   │ │ Dangerous     45%   │ │
│ └─────────────────────────────┘   │ │ Oversize      60%   │ │
│                                   │ └─────────────────────┘ │
│ [View All Activity →]             │ [Manage Zones →]        │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 Inventory Table

```
┌─────────────────────────────────────────────────────────────┐
│ Inventory                                         [Export]  │
├─────────────────────────────────────────────────────────────┤
│ [SKU/MAWB] [Location] [Zone: All ▼] [Status: All ▼]        │
├─────────────────────────────────────────────────────────────┤
│ ■  □ SKU           Location  Zone    Qty  Status  Last Mov │
│ ■  │ CGO-001       A-12-01   Cold    24   Avail   09:45   │
│    │ CGO-002       B-04-08   Gen     56   Avail   Yesterday│
│    │ CGO-003       D-01-03   DG      12   Quarantine       │
├─────────────────────────────────────────────────────────────┤
│                                                     [<][>] │
└─────────────────────────────────────────────────────────────┘
```

**Inventory table columns:**

| Column | Width | Notes |
|---|---|---|
| Select | 40px | |
| SKU/MAWB | 150px | Link to detail |
| Location | 100px | Zone-bin format |
| Zone | 80px | Badge: Cold/Gen/DG/Oversize |
| Qty | 60px | |
| Status | 90px | Badge: Available, Reserved, Quarantine, Damaged |
| Last Movement | 100px | Relative time |
| Actions | 60px | Menu |

---

## 5. Cargo Receiving Flow

### 5.1 Flow Diagram

```
  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
  │ Scan     │───▶│ Verify   │───▶│ Assign   │───▶│ Confirm  │───▶│ Print    │
  │ MAWB     │    │ Pieces   │    │ Location │    │ Receipt  │    │ Label    │
  └──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
       │               │               │               │               │
       ▼               ▼               ▼               ▼               ▼
  Auto-fill       Piece count    Suggest bin      Save to DB     Physical
  shipment        verification   from zone       + audit log    label applied
  details                         algorithm                      to cargo
```

### 5.2 Receiving Screen (Desktop)

```
┌─────────────────────────────────────────────────────────────┐
│ Receive Cargo                                       [Done]  │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🔍  Scan or enter MAWB/AWB        [123-4567]  ✓        │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ Shipment: MAWB 123-4567    Origin: JFK    Status: Inbound  │
├─────────────────────────────────────────────────────────────┤
│ Pieces Expected: 12                                        │
│ Pieces Received: [12]  ← auto-fills from expected          │
│                                                             │
│ Condition: [Good ▼]  Options: Good / Damaged / Short       │
│                                                             │
│ Storage Zone: [Cold Storage ▼]                              │
│ Location: [A-12]  ← scanned or manually entered             │
│                                                             │
│ Remarks: [Optional notes...]                                │
├─────────────────────────────────────────────────────────────┤
│ [← Back]                    [Receive & Print Label]  ↵Enter │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 Receiving Screen (Mobile)

```
┌─────────────────────┐
│ ← Receive Cargo     │
├─────────────────────┤
│ 🔍  Scan MAWB       │  ← auto-focused, full-width
│                     │
│   123-4567          │  ← scanned result
│   ✓ Shipment found  │
├─────────────────────┤
│ Pieces              │
│ [12] of 12 expected │
├─────────────────────┤
│ Condition           │
│ [Good          ▼]   │
├─────────────────────┤
│ Location            │
│ [A-12          ▼]   │
├─────────────────────┤
│ [Receive & Label]   │  ← primary CTA, full-width
└─────────────────────┘
```

### 5.4 Scanning Interaction (Receive)

```
1. Scanner wakes screen (if sleeping) or auto-focuses scan field
2. Operator scans MAWB barcode
3. System fetches shipment data via WebSocket/API
4. Expected pieces auto-populate
5. Operator adjusts pieces if partial receipt
6. System suggests next available bin in appropriate zone
7. Operator scans bin barcode to confirm OR types
8. Tap "Receive" → mutation → print label → reset for next scan
```

**Partial receipt flow:**
- If received < expected → system creates "Short" flag on shipment
- Remaining pieces tracked as outstanding
- Option to close as "Short delivered" or keep open

### 5.5 Keyboard Flow

```
Focus order: Scan MAWB → Pieces → Condition → Location → Remarks → Submit
                                        ↓
Tab between fields. Enter on Scan submits scan.
Enter on Receive submits receipt.
Escape resets the form for next cargo item.
```

---

## 6. Cargo Packing Flow

### 6.1 Flow Diagram

```
  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
  │ Select   │───▶│ Scan     │───▶│ Assign   │───▶│ Generate │───▶│ Print    │
  │ Shipment │    │ Pieces   │    │ ULD/Pallet│   │ Manifest │    │ Labels   │
  └──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
       │               │               │               │               │
       ▼               ▼               ▼               ▼               ▼
  Filter by       Scan each       Suggest ULD     Auto-generate    Apply and
  "checked-in"    piece barcode   based on        manifest         attach to
  status                          destination     number           cargo
```

### 6.2 Packing Screen (Desktop)

```
┌─────────────────────────────────────────────────────────────┐
│ Pack Shipment                                     [Complete] │
├─────────────────────────────────────────────────────────────┤
│ Shipment: MAWB 123-4567     Dest: LHR    Status: Checked-In │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🔍  Scan piece barcode               [CGO-001]  ✓      │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ Scanned Pieces (8 of 12)                                    │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ■ CGO-001  ✓   ■ CGO-002  ✓   ■ CGO-003  ✓           │ │
│ │ ■ CGO-004  ✓   ■ CGO-005  ✓   ■ CGO-006  ✓           │ │
│ │ ■ CGO-007  ✓   ■ CGO-008  ✓                           │ │
│ │ ○ CGO-009      ○ CGO-010      ○ CGO-011  ○ CGO-012   │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ULD/Pallet: [ULD-12345]  ← scanned or selected from list   │
│                                                             │
│ Destination: LHR                                            │
│ Flight:     EK-123                                          │
├─────────────────────────────────────────────────────────────┤
│ [← Back]                    [Complete Packing]  ↵Enter      │
└─────────────────────────────────────────────────────────────┘
```

### 6.3 Piece Scanning UX

```
Progressive scanning pattern:

┌─────────────────────────────────────────────────────────────┐
│ Scan piece: [___]  ← auto-focused. Enter submits scan.     │
│                                                             │
│ Pieces scanned: 8/12                                        │
│ ■■■■■■■■○○○○                                                │
│                                                             │
│ Last scan: CGO-008 at 10:23:45                              │
│                                                             │
│ ❌ CGO-005 — already scanned in ULD-12344 (different ULD)   │
│    [Override] [Skip]                                        │
└─────────────────────────────────────────────────────────────┘

Duplicate scan detection:
- If piece already scanned into a DIFFERENT ULD → warning with override
- If piece already scanned into SAME ULD → ignore (already counted)
- If piece not in shipment → error "Piece not in this shipment"
```

### 6.4 Packing Completion

When "Complete Packing" is tapped:

```
┌─────────────────────────────────────────────────────────────┐
│ Complete Packing                                            │
│                                                             │
│ 📦 MAWB 123-4567                                            │
│ Total: 12 pieces in 1 ULD (ULD-12345)                      │
│                                                             │
│ □ Generate manifest                                         │
│ □ Print ULD labels (3 copies)                               │
│ □ Notify downstream                                         │
│                                                             │
│ [Cancel]  [Complete]                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. Manifest Workflow UX

### 7.1 Screens

| Screen | Route | Primary Action |
|---|---|---|
| Manifest List | `/workspace/export/manifests` | Browse manifests |
| Manifest Detail | `/workspace/export/manifests/{id}` | View/edit contents |
| Create Manifest | `/workspace/export/manifests/new` | Select flight + shipments |
| Manifest Export | `/workspace/export/manifests/{id}/export` | Download CCN/FWB |

### 7.2 Desktop Workflow Map

```
┌─────────────────────────────────────────────────────────────┐
│ Manifests                                        [Create]   │
├─────────────────────────────────────────────────────────────┤
│ [Flight] [Date] [Status: All ▼]                             │
├─────────────────────────────────────────────────────────────┤
│ ■  □ Manifest#   Flight   Dest   MAWBs  Status   Created   │
│ ■  │ MFT-001     EK-123   LHR    12     Draft    Today     │
│    │ MFT-002     EK-456   NRT    8      Final    Yesterday │
│    │ MFT-003     EK-789   DXB    24     Departed 2d ago   │
├─────────────────────────────────────────────────────────────┤
│                                                     [<][>] │
└─────────────────────────────────────────────────────────────┘
```

### 7.3 Create Manifest — Shipment Selection

```
┌─────────────────────────────────────────────────────────────┐
│ Create Manifest                                 [Flight...] │
├─────────────────────────────────────────────────────────────┤
│ Flight: [EK-123]      Date: [2024-01-15]                    │
│ Destination: [LHR]    Total capacity: 24 ULD positions      │
├─────────────────────────────────────────────────────────────┤
│ Available Shipments (Check-In status, same destination)     │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ■ MAWB 123-4567   Pieces: 12   ULD: ULD-12345  12m³   │ │
│ │ ■ MAWB 123-4568   Pieces: 8    ULD: ULD-12346  8m³    │ │
│ │ □ MAWB 123-4569   Pieces: 24   No ULD assigned         │ │
│ │                                     ↑ warning icon      │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Capacity used: 2 of 24 ULD positions                        │
│ Volume: 20m³ of 120m³                                       │
├─────────────────────────────────────────────────────────────┤
│ [Cancel]                    [Generate Manifest]  ↵Enter     │
└─────────────────────────────────────────────────────────────┘
```

**Shipment selection rules:**
- Only shows shipments with "Checked-In" or "Packed" status
- Only shows shipments matching selected flight destination
- Warns if shipment has no ULD assignment but can still include
- Shows capacity utilization in real-time

### 7.4 Manifest Detail

```
┌─────────────────────────────────────────────────────────────┐
│ Manifest: MFT-001                                           │
├─────────────────────────────────────────────────────────────┤
│ Flight: EK-123    Date: 2024-01-15    Status: Draft         │
│ Dest: LHR         12 MAWBs           Capacity: 45%          │
├─────────────────────────────────────────────────────────────┤
│ MAWBs on Manifest                                           │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ #   MAWB         Pieces  ULD        Volume  Status      │ │
│ │ 1   123-4567     12      ULD-12345  12m³    ✓ Added     │ │
│ │ 2   123-4568     8       ULD-12346  8m³     ✓ Added     │ │
│ │ 3   123-4570     24      ULD-12347  20m³    ⚠ No label  │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ [Add Shipments]  [Remove]  [Rearrange]                      │
│                                                             │
│ [Save Draft]           [Finalize Manifest]  [Export CCN]    │
└─────────────────────────────────────────────────────────────┘
```

### 7.5 Manifest Status Transitions

```
Draft → Finalized → Sent to Carrier → Acknowledged → Departed
  │         │             │                │              │
  └─ Edit   └─ Lock      └─ Send CCN      └─ Confirm    └─ DEP
```

- Draft: freely editable
- Finalized: locked, requires override to edit
- Sent to Carrier: CCN/FWB message sent
- Acknowledged: carrier confirmed receipt
- Departed: flight departed, manifest is historical

---

## 8. Warehouse Scanning UX

### 8.1 Shell Pattern

All warehouse scanning screens share this shell:

```
┌─────────────────────────────────────────────────────────────┐
│ [Module Name]                                [Menu •••]    │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🔍  Scan barcode or select action                       │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   Result area — changes based on scan context               │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ Quick Actions                                               │
│ [Receive]  [Pack]  [Transfer]  [Count]  [Locate]           │
└─────────────────────────────────────────────────────────────┘
```

### 8.2 Scan Results by Context

| Context | Scan Type | Result | Next Action |
|---|---|---|---|
| Receive | MAWB/AWB | Load receiving form | Assign location |
| Pack | Piece barcode | Mark piece as packed | Scan next piece |
| Transfer | Location bin | Show contents | Move items |
| Count | Location bin | Show expected count | Enter actual count |
| Locate | MAWB or piece | Show current location + path | Navigate to bin |
| Receive | Bin location | Set as receive location | Confirm receipt |
| Pickup | DO number | Load pickup verification | Release cargo |

### 8.3 Scan Result Display

```
┌─────────────────────────────────────────────────────────────┐
│ 🔍  Scan: MAWB 123-4567                                    │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ✓ Shipment Found                                       │ │
│ │                                                        │ │
│ │ MAWB:      123-4567                                    │ │
│ │ Origin:    JFK                                         │ │
│ │ Destination: LHR                                       │ │
│ │ Status:    Checked-In                                  │ │
│ │ Pieces:    12                                          │ │
│ │ Location:  A-12-01 (Cold Storage)                      │ │
│ │                                                        │ │
│ │ [View Detail]  [Receive]  [Pack]  [Transfer]           │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 8.4 Scanning Feedback

| Event | Visual | Audio/Haptic |
|---|---|---|
| Scan success | Green border flash 400ms | Short buzz (mobile) |
| Scan fail (not found) | Red border + error toast | Double buzz |
| Scan duplicate | Yellow warning + "Already scanned" | Single buzz |
| Scan wrong context | Orange border + context message | Medium buzz |
| Batch complete | Green flash + confetti | Success chime |

### 8.5 Scanner Input Component

```tsx
// Reusable scanner input for all warehouse screens
<ScannerInput
  onScan={handleScan}
  onError={handleScanError}
  placeholder="Scan barcode..."
  autoFocus
  context="receive" // determines result display
  soundEnabled
/>
```

---

## 9. Billing Operations UX

### 9.1 Screens

| Screen | Route | Primary Action |
|---|---|---|
| Invoice List | `/workspace/billing` | Browse invoices |
| Invoice Detail | `/workspace/billing/{id}` | View invoice |
| Create Invoice | `/workspace/billing/new` | Generate invoice |
| Payment Record | `/workspace/billing/{id}/payment` | Record payment |
| Credit Note | `/workspace/billing/{id}/credit` | Issue credit note |

### 9.2 Desktop Workflow Map

```
┌─────────────────────────────────────────────────────────────┐
│ Billing & Invoicing                              [Create]   │
├─────────────────────────────────────────────────────────────┤
│ [Search invoice/ref] [Status: All ▼] [Date range]           │
├─────────────────────────────────────────────────────────────┤
│ ■  □ Invoice#    Customer        Amount   Due     Status   │
│ ■  │ INV-001     Acme Corp      $1,250   01/20   ○ Paid    │
│    │ INV-002     Global Freight $3,400   01/25   ◐ Partial │
│    │ INV-003     FastShip Inc   $890     01/18   ● Overdue │
├─────────────────────────────────────────────────────────────┤
│ Totals: $5,540 outstanding   $1,250 due this week          │
├─────────────────────────────────────────────────────────────┤
│ [Select All]  [Send Reminders]  [Export]                   │
└─────────────────────────────────────────────────────────────┘
```

### 9.3 Invoice Detail

```
┌─────────────────────────────────────────────────────────────┐
│ Invoice: INV-001                                  [Actions] │
├─────────────────────────────────────────────────────────────┤
│ Customer: Acme Corp            Date: 2024-01-10             │
│ Reference: MAWB 123-4567       Due: 2024-01-20              │
├─────────────────────────────────────────────────────────────┤
│ Status: ○ Paid on 2024-01-15                                │
├─────────────────────────────────────────────────────────────┤
│ Line Items                                                  │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ #  Description                  Qty   Rate    Total     │ │
│ │ 1  Air Freight (JFK→LHR)        12    85.00   1,020.00 │ │
│ │ 2  Fuel Surcharge                1    120.00    120.00 │ │
│ │ 3  Security Fee                 12      5.00     60.00 │ │
│ │ 4  Documentation Fee             1     50.00     50.00 │ │
│ │                                    Subtotal   1,250.00 │ │
│ │                                    Total      1,250.00 │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ [Download PDF]  [Send Invoice]  [Record Payment]  [Credit] │
└─────────────────────────────────────────────────────────────┘
```

### 9.4 Payment Recording

```
┌─────────────────────────────────────────────────────────────┐
│ Record Payment — INV-001                         [Save]    │
├─────────────────────────────────────────────────────────────┤
│ Amount: [$1,250.00]                                         │
│ Payment Method: [Bank Transfer ▼]                           │
│ Reference: [TRX-2024-00123]                                 │
│ Date: [2024-01-15]                                          │
│ Notes: [Payment received via wire transfer]                 │
│                                                             │
│ [Cancel]                         [Record Payment]  ↵Enter   │
└─────────────────────────────────────────────────────────────┘
```

### 9.5 Billing Status Flow

```
Draft → Sent → Partial → Paid → Overdue → Cancelled
 │       │       │         │       │          │
 └─ Edit └─Send  └─Partial └─Full  └─Remind  └─Void
                 payment           auto
```

### 9.6 Table Columns (Billing)

| Column | Width | Notes |
|---|---|---|
| Select | 40px | |
| Invoice # | 110px | Link |
| Customer | 140px | |
| Amount | 100px | Right-aligned |
| Due Date | 100px | Red if overdue |
| Status | 90px | Badge: Paid/Partial/Overdue/Draft/Sent |
| Actions | 60px | Menu |

### 9.7 Keyboard Workflows

| Shortcut | Action |
|---|---|
| `⌘N` | New invoice |
| `⌘Enter` | Record payment |
| `⌘⇧S` | Send invoice |
| `⌘⇧D` | Download PDF |
| `⌘⇧R` | Send reminder |

---

## 10. Rider Delivery Mobile UX

### 10.1 Screens

| Screen | Route | Primary Action |
|---|---|---|
| Delivery Dashboard | `/workspace/delivery` | Today's deliveries |
| Delivery Detail | `/workspace/delivery/{id}` | Delivery actions |
| Delivery Scan | `/workspace/delivery/scan` | POD scanning |
| Route View | `/workspace/delivery/route` | Map view |

### 10.2 Mobile-First — Delivery Dashboard

```
┌─────────────────────┐
│ My Deliveries       │  ← 8:45 AM
│ Today, Jan 15       │
├─────────────────────┤
│ ┌─────────────────┐ │
│ │ 📦 12 deliveries│ │  ← stats cards
│ │ ✅ 8 completed  │ │
│ │ ⏳ 4 remaining  │ │
│ └─────────────────┘ │
├─────────────────────┤
│ Next Delivery       │
│ ┌─────────────────┐ │
│ │ 📦 DO-001       │ │
│ │ Acme Corp       │ │
│ │ 123 Main St     │ │
│ │ 2.3 km away     │ │
│ │                 │ │
│ │ [Navigate] [View]│ │
│ └─────────────────┘ │
├─────────────────────┤
│ All Deliveries      │
│ ┌─────────────────┐ │
│ │ ✅ DO-001 Done  │ │
│ │ ⏳ DO-002 Next  │ │
│ │ ⏳ DO-003       │ │
│ │ ⏳ DO-004       │ │
│ └─────────────────┘ │
└─────────────────────┘
```

### 10.3 Delivery Action Flow

```
┌─────────────────────┐
│ ← Delivery DO-002   │
├─────────────────────┤
│ 📦 DO-002           │
│ Acme Corp           │
│ Contact: John Doe   │
│ Phone: +254 712...  │
├─────────────────────┤
│ Pieces: 3 of 3      │
│ Status: Out for Del │
├─────────────────────┤
│ ┌─────────────────┐ │
│ │ ☑ Mark as       │ │
│ │   Delivered     │ │
│ ├─────────────────┤ │
│ │ Signature:      │ │
│ │ [________________]│ │
│ │ (touch to sign)  │ │
│ ├─────────────────┤ │
│ │ Photo of POD:   │ │
│ │ [📷 Take Photo]  │ │
│ ├─────────────────┤ │
│ │ Notes:           │ │
│ │ [_____________]  │ │
│ └─────────────────┘ │
├─────────────────────┤
│ [Complete Delivery] │ ← only enabled when all required
└─────────────────────┘   fields filled + signature + photo
```

### 10.4 Delivery Failure Options

```
┌─────────────────────┐
│ Delivery Issue      │
├─────────────────────┤
│ ○ Recipient not     │
│   available         │
│ ○ Wrong address     │
│ ○ Package damaged   │
│ ○ Refused delivery  │
│ ○ Business closed   │
├─────────────────────┤
│ Next action:        │
│ ○ Reschedule        │
│   [Select date/time]│
│ ○ Return to         │
│   warehouse         │
├─────────────────────┤
│ Reason notes:       │
│ [________________]  │
├─────────────────────┤
│ [Save] [Cancel]     │
└─────────────────────┘
```

### 10.5 Sign-off Requirements

For "Delivered" status:

1. Recipient name (text input)
2. Signature (canvas-based signature pad, mobile touch)
3. POD photo (camera capture)
4. Optional: notes

All three marked required. Form cannot submit without them.

### 10.6 Offline Delivery

```
┌─────────────────────┐
│ 📡 Offline          │
│ 3 pending syncs     │
├─────────────────────┤
│ Deliveries cached:  │
│ All 12 available    │
│ for offline use     │
├─────────────────────┤
│ You can still:      │
│ ✓ Complete delivery │
│ ✓ Capture signature │
│ ✓ Take photos       │
│ ✓ Scan POD          │
├─────────────────────┤
│ [View Pending Sync] │
└─────────────────────┘
```

- All delivery data cached in IndexedDB on app start
- Completed deliveries queued for sync
- Photos stored as Blob in IndexedDB, synced when online
- Signature as base64 in IndexedDB
- Sync queue visible, retry on reconnect

---

## 11. Customer Pickup UX

### 11.1 Screens

| Screen | Route | Primary Action |
|---|---|---|
| Pickup List | `/workspace/warehouse/pickups` | Scheduled pickups |
| Pickup Verification | `/workspace/warehouse/pickups/{id}` | Verify & release |

### 11.2 Desktop — Pickup Verification

```
┌─────────────────────────────────────────────────────────────┐
│ Pickup Verification — DO-001                    [Complete]  │
├─────────────────────────────────────────────────────────────┤
│ Customer: John Doe    DO#: DO-001    Status: Awaiting PU    │
│ Reference: MAWB 456-7890                                    │
├─────────────────────────────────────────────────────────────┤
│ Pieces to Collect                                           │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ■  CGO-001  ✓  Scanned  ✓                              │ │
│ │ ■  CGO-002  ✓  Scanned  ✓                              │ │
│ │ ■  CGO-003  ☐  Not yet scanned                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Customer Verification                                       │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ID Type:    [National ID ▼]                            │ │
│ │ ID Number:  [12345678]                                 │ │
│ │ Name Match: ✓ John Doe                                 │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Release Conditions                                          │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ☑ All charges paid     Status: ✓ Paid                  │ │
│ │ ☑ ID verified          Status: ✓ Verified              │ │
│ │ ☑ Pieces collected     Status: 2 of 3                  │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ [Hold]  [Release Cargo]                                     │
└─────────────────────────────────────────────────────────────┘
```

### 11.3 Mobile — Pickup Verification

```
┌─────────────────────┐
│ ← Pickup DO-001     │
├─────────────────────┤
│ Customer: John Doe  │
│ Pieces: 3           │
├─────────────────────┤
│ 📷 Scan piece 1     │
│ [CGO-001] ✓         │
│ 📷 Scan piece 2     │
│ [CGO-002] ✓         │
│ 📷 Scan piece 3     │
│ [_scan or enter_]   │
├─────────────────────┤
│ ID Verification     │
│ [Scan ID barcode]   │
│ John Doe ✓          │
├─────────────────────┤
│ [Release to Customer]│
└─────────────────────┘
```

### 11.4 Verification Checklist

The release checklist gates the "Release Cargo" button:

```
□ All charges paid (auto-checked against billing system)
□ ID verified (manual check, scan or input)
□ All pieces scanned (auto-checked against manifest)
□ Customer signature captured (mobile: touch signature pad)

All must be ✓ before "Release Cargo" enables.
```

---

## 12. Cargo Tracking Timeline UX

### 12.1 Components

```tsx
// Primary component
<TrackingTimeline
  events={TrackingEvent[]}
  currentStatus={ShipmentStatus}
  onEventClick={(event) => void}
  dense?: boolean   // compact mode for mobile
/>

// Shared types
interface TrackingEvent {
  id: string;
  type: 'scan' | 'status_change' | 'document' | 'note' | 'exception';
  title: string;
  description?: string;
  timestamp: Date;
  location?: string;
  user?: string;
  metadata?: Record<string, unknown>;
  highlighted?: boolean; // for realtime push
}
```

### 12.2 Desktop Timeline Display

```
┌─────────────────────────────────────────────────────────────┐
│ Tracking Timeline — MAWB 123-4567                           │
│ Origin: JFK │ Destination: LHR │ Status: In Transit        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ● ─── ● ─── ● ─── ● ──○───○───○───○───○                  │
│  Bkd   Chk   Rcv   Mft  DEP  ARR  CLR  DO   P/U            │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ● Departed                          Today 14:30     ▸  │ │
│ │   Flight EK-123 departed JFK → LHR                     │ │
│ │   Estimated arrival: 22:45 LHR time                    │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ ● Manifested                        Today 12:00     ▸  │ │
│ │   MAWB added to manifest MFT-001 on EK-123             │ │
│ │   ULD positions: 2 of 24                               │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ ● Received at Warehouse              Today 09:30     ▸  │ │
│ │   Location: Cold Storage A-12-01                       │ │
│ │   Received by: Jane Op                                 │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ ● Checked-In                        Yesterday 15:00 ▸  │ │
│ │ ● Booked                            Yesterday 11:00 ▸  │ │
│ │ ● Draft Created                     Yesterday 09:00 ▸  │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 12.3 Mobile Timeline Display

```
┌─────────────────────┐
│ MAWB 123-4567       │
│ JFK → LHR           │
│ In Transit          │
├─────────────────────┤
│ ● ● ● ● ○ ○ ○ ○ ○  │  ← 5-step progress dots
│ Bkd→Rcv→Mft→DEP     │
├─────────────────────┤
│ ┌─────────────────┐ │
│ │ ● Departed      │ │
│ │ 2:30 PM Today   │ │
│ │ Flight EK-123   │ │
│ ├─────────────────┤ │
│ │ ● Manifested    │ │
│ │ 12:00 PM Today  │ │
│ ├─────────────────┤ │
│ │ ● Received      │ │
│ │ 9:30 AM Today   │ │
│ ├─────────────────┤ │
│ │ ● Checked-In    │ │
│ │ Yesterday       │ │
│ └─────────────────┘ │
└─────────────────────┘
```

### 12.4 Event Types Visual

| Event Type | Icon | Color | Dot Style |
|---|---|---|---|
| Scan | `Scan` | blue | ● solid |
| Status Change | `ArrowRightCircle` | green | ● solid |
| Document | `FileText` | purple | ◆ diamond |
| Note | `MessageCircle` | gray | ○ outline |
| Exception | `AlertTriangle` | red | ★ star |

### 12.5 Timeline Interaction

- Click/tap event → expand to show full metadata
- Desktop: hover shows quick peek tooltip
- Each event has a "View Related" action (e.g., click scan event → show scan details)
- "Share Timeline" button copies shareable link
- Filter by event type: [All] [Scans] [Status] [Documents] [Exceptions]

### 12.6 Realtime Timeline Updates

```typescript
// WebSocket event for timeline
interface TimelineUpdate {
  shipmentId: string;
  event: TrackingEvent;
  // Client highlights new event with yellow flash,
  // auto-scrolls to top if user hasn't interacted
}
```

- New events push in realtime via WebSocket
- New event shows with yellow/gold background flash for 2 seconds
- Dot on progress bar animates from unfilled to filled
- Desktop: toast notification "New tracking event for MAWB 123-4567"
- If user is viewing the timeline, auto-scroll to top with smooth animation

---

## 13. Cross-Cutting Patterns

### 13.1 Detail Panel (Slide-Over)

Used for quick view of any entity without leaving the list.

```tsx
<DetailPanel
  entity={entity}
  type="shipment" | "invoice" | "manifest" | "customer"
  onClose={() => void}
  onAction={(action) => void}
>
```

- Slides in from right, 480px wide (desktop)
- Full screen on mobile (pushes list off screen)
- Contains summary header, status, key fields, and actions
- Links to full detail page at bottom
- Escape to close, click outside to close

### 13.2 Quick Action Menu

```
Right-click or "•••" button on any row:

┌─────────────────┐
│ View Detail     │
│ Edit            │
│ ─────────────── │
│ Duplicate       │
│ Print Label     │
│ ─────────────── │
│ Cancel          │  ← red text for destructive
└─────────────────┘
```

### 13.3 Confirmation Patterns

| Action | Confirmation | UX |
|---|---|---|
| Status change | Inline prompt | Small modal within context |
| Delete/Cancel | Full confirmation | Destructive red button, type to confirm |
| Bulk action | Side panel | Show count + affected items |
| Print | Toast + download | Non-blocking |
| Save draft | Auto-save | Silent, indicator only |

### 13.4 Mobile Gestures

| Gesture | Action |
|---|---|
| Swipe left | Archive/delete (with undo toast) |
| Swipe right | Quick status change |
| Long press | Context menu |
| Pull down | Refresh |
| Pinch | Dense/comfortable table toggle |
| Tap top bar | Scroll to top |

---

## 14. Realtime Update Strategy

### 14.1 Channel Architecture

```
WebSocket Connection (single, authenticated)
├── workspace:{userId}          ← personal notifications
├── workspace:export:{id}       ← export shipment updates
├── workspace:import:{id}       ← import shipment updates
├── workspace:warehouse:{id}    ← warehouse area updates
├── workspace:billing:{id}      ← invoice updates
└── workspace:delivery:{id}     ← delivery updates
```

### 14.2 Update Types

| Event Type | Delivery | Visual Treatment |
|---|---|---|
| `entity.created` | Push to list, toast | Green "New" badge, auto-insert at top |
| `entity.updated` | Patch list row, update detail | Blue highlight flash 800ms |
| `entity.status_changed` | Update badge, push to relevant section | Status badge transition animation |
| `entity.deleted` | Remove from list (with undo toast) | Fade out + slide up |
| `scan.event` | Push to timeline | Gold flash, auto-scroll |
| `notification` | Toast + bell badge | Slide-down toast |

### 14.3 Optimistic Updates

All status transitions and quick mutations use optimistic UI:

1. Immediately show new state with pending indicator
2. Send mutation to server
3. On success: remove pending indicator, confirm state
4. On failure: revert to previous state, show error toast with retry

### 14.4 Concurrency

When two operators act on the same entity:

- Server resolves conflict, broadcasts correct state
- Affected user sees: "Shipment was updated by [Name]. Your change was not applied. [View Current]"
- No data loss — conflict detection at the API layer

---

## Appendix: Component Reuse Map

| Operational Need | Component(s) | Props |
|---|---|---|
| Entity list | `DataTable` | columns, data, sorting, filtering, selection, pagination |
| Card grid | `ModuleGrid` + `AppCard` | columns, icon, title, description |
| Stats row | `StatCard` | label, value, change, icon |
| Status display | `StatusBadge` | status, label |
| Loading shell | `Skeleton`, `SkeletonTable` | rows, columns |
| Empty state | `EmptyState` | icon, title, description, action |
| Search | `SearchInput` | placeholder, value, onChange |
| Filter set | `FilterBar` | filters, onClearAll |
| Dropdown select | `FilterBar` internals | options, value, onChange |
| Header | `PageHeader` | title, description, action, breadcrumbs |
| Context panel | `ResponsiveDrawer` | isOpen, onClose, title, side |
| Command palette | `CommandPalette` | items, isOpen |
| Mobile nav | `MobileBottomNav` | items |
| Scan input | Custom `ScannerInput` (Phase 2) | onScan, context, placeholder |
| Timeline | Custom `TrackingTimeline` (Phase 2) | events, currentStatus |
| Avatar | `EntityAvatar` | name, src, size |
| Permission gate | `PermissionGate` | permission, permissions, role, fallback |

---

## Implementation Order (Recommended)

1. `ScannerInput` component — foundation for all warehouse flows
2. `TrackingTimeline` component — powers tracking across export/import
3. `DetailPanel` — slide-over for quick entity view
4. Warehouse receiving flow — highest frequency operational task
5. Packing flow — dependent on receiving
6. Manifest flow — dependent on packing
7. Export list → detail → status transitions
8. Import list → clearance → DO flow
9. Billing list → invoice → payment flow
10. Rider mobile app — independent, mobile-first
11. Customer pickup — last in chain, depends on delivery
12. Realtime WebSocket integration — across all screens
