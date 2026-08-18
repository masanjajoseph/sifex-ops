# Warehouse Operations Center — SIFEX Air Cargo ERP

## Table of Contents

1. [Operational Flow](#1-operational-flow)
2. [Warehouse Layout & Zones](#2-warehouse-layout--zones)
3. [Screens & Views](#3-screens--views)
4. [KPIs & Dashboards](#4-kpis--dashboards)
5. [Real-time Events](#5-real-time-events)
6. [Automation Rules](#6-automation-rules)
7. [Workflow Diagram](#7-workflow-diagram)

---

## 1. Operational Flow

### 1.1 Receiving Cargo

**Trigger**: Import Department sets workflow status to `CUSTOMS_CLEARED` → Side-effect transitions to `WAREHOUSE_RECEIVING`.

**Entry Criteria**:
- Cargo has cleared customs
- All HAWBs verified
- Pieces counted and documented
- Digital handover from Import Department

**Steps**:
1. Import officer marks cargo as "Ready for Warehouse"
2. Warehouse receives notification (real-time + email)
3. Cargo physically arrives at warehouse receiving bay
4. Receiving officer scans barcode/QR on MAWB
5. System pre-fills cargo manifest data
6. Receiving officer counts physical pieces
7. If piece count matches manifest → proceed
8. If piece count mismatch → create discrepancy report (see [Damage Reporting](#163-damage-reporting))

**Data Captured at Receiving**:
- Actual weight (weighed at receiving bay)
- Actual volume (measured)
- Package condition photos (minimum 4 angles)
- Timestamp of arrival
- Receiving officer ID
- Truck/vehicle ID (if delivered by truck)
- Seal number (if containerized)
- Temperature (if temperature-sensitive)
- Dangerous goods class check (mandatory acknowledgment)

### 1.2 Receiving Confirmation

**Validation Rules**:
- All HAWBs under the MAWB must be accounted for
- Piece count must match ± system tolerance (configurable, default 0)
- Weight must be within ±5% of declared weight (configurable)
- Photos must be uploaded before confirmation
- Dangerous goods must have matching DG declaration

**On Confirmation**:
- Status changes to `WAREHOUSE_RECEIVED`
- Inventory record created
- Storage fee timer starts (configurable grace period)
- SLA timer starts (configurable target time to put-away)
- Workflow Engine triggers event: `CARGO_RECEIVED`
- Notification sent to Warehouse Supervisor
- Audit log created with receiving officer, timestamp, piece count, weight

### 1.3 Put Away Planning

**System Behavior**:
- Cargo assigned to storage zone based on:
  - Cargo type (general, dangerous goods, cold chain, oversized)
  - Available capacity
  - Weight distribution
  - Storage duration estimate
- Auto-suggest shelf location using `AUTO_SHELF_ASSIGNMENT` rule
- Warehouse supervisor can override

**Algorithm for Shelf Assignment**:
```text
SCORE = (ZONE_MATCH × 1000)
      + (CAPACITY_FIT × 500)
      + (WEIGHT_DISTRIBUTION × 200)
      + (SAME_MAWB_PROXIMITY × 300)
      - (DISTANCE_FROM_RECEIVING × 10)

ZONE_MATCH  = 1 if cargo type matches zone, 0 otherwise
CAPACITY_FIT = remaining_capacity / total_capacity (0-1)
WEIGHT_DISTRIBUTION = 1 - (shelf_current_weight / shelf_max_weight)
SAME_MAWB_PROXIMITY = 1 if related cargo exists nearby, 0 otherwise
DISTANCE_FROM_RECEIVING = meters from receiving bay
```

### 1.4 Shelf Assignment

**Manual Assignment**:
- Supervisor selects zone → aisle → rack → shelf
- System shows real-time capacity at each level
- Visual color coding: green (available), yellow (>70% full), red (full)

**Bulk Assignment**:
- Select multiple cargo items
- Assign to same zone/aisle
- System auto-distributes across shelves

**On Assignment**:
- Status changes to `SHELF_ASSIGNED`
- Storage location recorded (zone → aisle → rack → shelf → position)
- Inventory updated with location
- Barcode/QR regenerated with location data
- Workflow event: `SHELF_ASSIGNED`

### 1.5 Barcode / QR Scan

**Scan Points**:
- At receiving bay (assigns inbound barcode)
- At each shelf assignment (confirms placement)
- At cargo movement (update location)
- At release (confirms departure)
- At dispatch (final verification)

**Barcode Data**:
- MAWB number (11 digits)
- HAWB number
- Piece number (1-N)
- Storage location code
- Date received
- Status code

**QR Code Data** (for mobile scanning):
```json
{
  "mawb": "123-45678901",
  "hawb": "HKG-202407-001",
  "piece": 3,
  "location": "Z2-A4-R12-S3",
  "status": "STORED",
  "dgClass": "6.1"
}
```

### 1.6 Storage Confirmation

**Steps**:
1. Officer places cargo on assigned shelf
2. Scans shelf barcode (confirms location)
3. System verifies location matches assignment
4. Mismatch → alert, require confirmation override (supervisor approval)
5. On match → status changes to `STORED`
6. Inventory confirmed at location

### 1.7 Inventory Update

**Performed On**:
- Receiving → Add to inventory
- Shelf assignment → Update location
- Movement → Update location, update timestamps
- Damage → Adjust status (quarantine), reduce value
- Release → Remove from inventory
- Cycle count → Adjust count

**Inventory Record Contains**:
- MAWB number
- HAWB number
- Piece number
- Storage location (zone → aisle → rack → shelf → position)
- Status (RECEIVED, STORED, QUARANTINED, RELEASED, DISPATCHED)
- Weight (actual)
- Volume (actual)
- Received date
- Storage duration (days)
- Last moved date
- Storage fee accrual (computed)
- Condition
- Temperature log (if cold chain)
- DG class (if applicable)
- Photo references (array of URLs)
- Audit trail (array of actions with timestamps and officer IDs)

### 1.8 Location Management

**Hierarchy**:
```text
Warehouse
├── Zone (e.g., Z1 = General, Z2 = Cold Storage, Z3 = DG, Z4 = Oversized)
│   ├── Aisle (e.g., A01, A02)
│   │   ├── Rack (e.g., R01, R02)
│   │   │   ├── Shelf (e.g., S1, S2, S3, S4)
│   │   │   │   └── Position (e.g., P1, P2 — for split shelves)
```

**Location Properties**:
- Max weight capacity (kg)
- Max volume capacity (m³)
- Current weight load (kg)
- Current volume load (m³)
- Available weight (kg)
- Available volume (m³)
- Occupancy percentage
- Zone type
- Temperature (if cold storage)
- DG class allowed (if DG zone)
- Status (ACTIVE, MAINTENANCE, FULL, RESERVED)

**Location Search**:
- By zone
- By capacity (available weight > X, available volume > Y)
- By type (general, cold, DG, oversized)
- By status (empty, partial, full)

### 1.9 Cargo Movement

**Trigger**: Operator scans cargo → scans destination shelf.

**Validation**:
- Cargo must be in `STORED` status (cannot move cargo in `QUARANTINED` without supervisor override)
- Destination shelf must have available capacity
- DG restrictions must be met
- Cold chain continuity (if moving cold cargo, destination must also be cold zone)

**On Movement**:
- Previous shelf freed (recalculate capacity)
- New shelf capacity updated
- Cargo location updated
- Movement audit log created (from → to, officer, timestamp, reason)
- Storage fee timer continues (no reset)
- Workflow event: `CARGO_MOVED`

**Bulk Movement**:
- Select multiple cargo items
- Assign all to same destination or to a zone for auto-distribution
- Confirm all at once

### 1.10 Transfer Between Shelves

Same as Cargo Movement but specifically within the same zone for reorganization purposes.

**Use Cases**:
- Consolidating cargo from same MAWB
- Freeing up space in high-demand aisles
- Moving to more appropriate zone based on storage duration
- Rebalancing weight distribution

### 1.11 Damage Reporting

**Trigger**: Officer discovers damage during receiving, inspection, storage, or movement.

**Steps**:
1. Scan cargo barcode
2. Select damage type from predefined list:
   - Physical damage (crush, tear, puncture)
   - Water damage
   - Pest infestation
   - Leakage
   - Tampering
3. Upload photos (minimum 2, mandatory)
4. Enter estimated value loss
5. Select severity: MINOR, MODERATE, SEVERE, TOTAL_LOSS
6. Supervisor must approve damage report
7. On approval → status changes to `DAMAGED`
8. Cargo quarantined in inspection area
9. Notification sent to:
   - Warehouse Supervisor
   - Import Department (for insurance claim)
   - Customer (via notification system)
10. Inventory value adjusted

**Damage Report Record**:
- Cargo ID
- Damage type
- Severity
- Description
- Photos (array of URLs)
- Estimated value loss
- Reported by
- Approved by
- Report timestamp
- Resolution (REPAIRED, SCRAPPED, COMPENSATED, PENDING)

### 1.12 Missing Cargo

**Trigger**: Discrepancy between system count and physical count during:
- Receiving (manifest says 10 → counted 9)
- Cycle count
- Release verification
- Investigation request

**Steps**:
1. Officer initiates missing report
2. System checks last known location and movement history
3. Supervisor reviews movement audit trail
4. If not found within 24 hours → status changed to `MISSING`
5. Notification to:
   - Warehouse Supervisor
   - Operations Manager
   - Customer
   - Security (if theft suspected)
6. Inventory adjusted (remove from available stock)

### 1.13 Hold Cargo

**Trigger**:
- Customs hold (second inspection required)
- Regulatory hold (DG documentation incomplete)
- Commercial hold (customer payment pending)
- Quality hold (damage investigation ongoing)
- Security hold (flagged for screening)

**On Hold**:
- Status changes to `HELD`
- Cargo moved to holding area (physically separated)
- Hold reason recorded
- Hold release condition documented
- Timer starts for hold duration (SLA for resolution)
- Notification to relevant department

### 1.14 Release Cargo

**Trigger**:
- Hold condition resolved
- Customer requested release
- Billing completed (if invoice required before release)

**Validation**:
- Must NOT be on hold (unless release IS the hold resolution)
- Must NOT be damaged (unless customer accepts as-is)
- Billing check: if storage fees incurred, must be paid or invoiced
- Customs status: must be CLEARED or EXEMPT

**On Release**:
- Status changes to `RELEASED`
- Storage fee timer stops
- Final storage fee calculated
- Billing record created (if not already)
- Inventory removed from available stock
- Cargo moved to Released Cargo Area
- Workflow event: `CARGO_RELEASED`
- Notification to Delivery Department
- Ready for billing auto-check

### 1.15 Ready For Billing

**Auto-Trigger**: When cargo is released, system checks:
- Is there a billing rule that requires invoice before delivery?
- Are storage fees applicable?
- Are there any additional services (special handling, overtime, DG fee)?

**If invoice required before delivery**:
- Status set to `READY_FOR_BILLING`
- Billing Department notified
- Workflow Engine transitions to BILLING module

**If no billing required**:
- Status set to `READY_FOR_DELIVERY`
- Delivery Department notified
- Workflow Engine transitions to DELIVERY module

### 1.16 Ready For Delivery

**Final Step in Warehouse**:
- Cargo physically in Dispatch Area
- All documentation (release notes, delivery order) printed
- Delivery assignment pending in Delivery module

---

## 2. Warehouse Layout & Zones

### 2.1 Receiving Area

**Purpose**: Initial cargo intake, verification, and inspection.

**Capacity**: 2-4 truck bays (configurable)

**Equipment**: Dock levelers, weighing scales, dimension measurement, camera system

**Max Dwell Time**: 4 hours (SLA alert at 3 hours)

**Layout**: Adjacent to main entrance with direct access from truck yard

**Technology**: Fixed barcode scanners, overhead cameras, weighbridge

### 2.2 Inspection Area

**Purpose**: Detailed inspection of cargo before storage.

**Equipment**: X-ray (if available), inspection table, measurement tools, camera

**Handling**: All DG cargo must pass through inspection. Random sample of 5% of general cargo.

**Output**: Inspection report attached to cargo record

### 2.3 General Storage Area

**Purpose**: Primary storage for non-specialized cargo.

**Racking**: Adjustable pallet racking (standard)

**Aisle Width**: 3.5 meters (for forklift access)

**Max Stack Height**: 4 pallets high

**Zones**: Z1-A through Z1-F (6 aisles)

**Capacity**: 20 kg/m² floor load

### 2.4 Cold Storage

**Purpose**: Temperature-controlled storage for perishable goods.

**Temperature Ranges**:
- Chiller: +2°C to +8°C
- Frozen: -18°C to -22°C
- Deep Freeze: -40°C to -60°C (if applicable)

**Monitoring**: Continuous temperature logging with 5-minute intervals

**Alert Threshold**: +1°C deviation from set point → immediate alert

**Zones**: Z2-C (chiller), Z2-F (frozen)

**Capacity**: 500 m³ chiller, 300 m³ frozen

### 2.5 Dangerous Goods Area

**Purpose**: Storage of IATA-classified dangerous goods.

**DG Classes Stored**: 2, 3, 4, 5, 6, 8, 9 (Class 7 radioactive requires special handling)

**Separation Requirements**:
- Segregation matrix enforced by system
- Incompatible classes stored minimum 5 meters apart
- Fire suppression system required

**Access**: Restricted to certified DG handlers only

**Zones**: Z3-DG1 through Z3-DG4

**Ventilation**: 6 air changes per hour minimum

### 2.6 Oversized Cargo Area

**Purpose**: Cargo exceeding standard pallet dimensions (> 120cm × 100cm × 160cm)

**Storage**: Floor storage (no racking)

**Equipment**: Heavy-duty forklifts, crane (if needed)

**Zones**: Z4-OS1, Z4-OS2

**Max Weight**: 5,000 kg per item

### 2.7 Released Cargo Area

**Purpose**: Cargo awaiting pickup or delivery

**Max Dwell Time**: 24 hours (SLA alert at 20 hours)

**Zones**: Z5-RL1, Z5-RL2

### 2.8 Dispatch Area

**Purpose**: Final staging before cargo leaves the warehouse

**Equipment**: Dock levelers, scanners, document printer

**Validation**: Final scan before truck loading. Driver signs digital manifest.

---

## 3. Screens & Views

### 3.1 Warehouse Dashboard

**Purpose**: Real-time overview of warehouse operations

**Users**: Warehouse Supervisor, Operations Manager, Warehouse Officer

**Permissions**: `warehouse.view`, `warehouse.manage`

**Dashboard Cards**:
```
┌─────────────────────────────────────────────────────────────┐
│  Warehouse Operations Center  │  [Date]  │  Refresh: Live   │
├────────────┬────────┬────────┬────────┬────────┬────────────┤
│ Received   │ Stored │ Damaged│ Missing│ Occup. │ Available  │
│ Today      │ Today  │ Cargo  │ Cargo  │   Rate │    Space   │
│    42      │   38   │    2   │    1   │   78%  │  1,240 m³  │
├────────────┴────────┴────────┴────────┴────────┴────────────┤
│  Zone Map (visual)                                          │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐   │
│  │ Z1-A │ │ Z1-B │ │ Z1-C │ │ Z2-C │ │ Z3-DG│ │ Z4-OS│   │
│  │ 82%  │ │ 65%  │ │ 90%  │ │ 45%  │ │ 30%  │ │ 55%  │   │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘   │
├────────────┬────────┬────────┬────────┬────────────────────┤
│ Receiving  │ Put-   │ Storage│ Release│ Activity Feed      │
│ Queue      │ Away   │ Timer  │ Queue  │ (real-time)        │
│  5 items   │ 12     │ ⏱ 3h   │  8     │ 10:23 Rcvd pallet  │
│   avg 12m  │ items  │ avg    │ items  │ 10:18 Moved Z1-A   │
│            │ avg 8m │        │        │ 10:15 Rel. HKG...  │
└────────────┴────────┴────────┴────────┴────────────────────┘
```

### 3.2 Receiving Screen

**Filters**: Status (PENDING, IN_PROGRESS, COMPLETED), Date range, MAWB, Airline, Origin

**Table Columns**:
| MAWB | Origin | Pieces Declared | Pieces Received | Weight Declared | Weight Actual | Status | Time in Queue | Actions |
|------|--------|-----------------|-----------------|-----------------|---------------|--------|---------------|---------|

**Quick Actions**:
- `START_RECEIVING` — Opens receiving workflow for selected MAWB
- `REPORT_DISCREPANCY` — Opens discrepancy form
- `PRINT_LABEL` — Prints barcode labels for received pieces
- `VIEW_DOCUMENTS` — Shows uploaded documents

**Bulk Actions**:
- Confirm multiple receipts at once
- Print labels for batch

**Receiving Workflow (Modal/Page)**:
1. Scan MAWB barcode
2. System pre-fills manifest
3. Enter actual piece count
4. Enter actual weight
5. Enter actual volume
6. Upload photos (optional but recommended)
7. Verify DG declaration (if applicable)
8. Confirm

### 3.3 Put Away Planning Screen

**View Options**:
- **List View**: Cargo awaiting put-away with suggested locations
- **Map View**: Warehouse layout showing suggested shelves

**Table Columns**:
| MAWB | HAWB | Pieces | Zone Assigned | Suggested Aisle | Suggested Shelf | Capacity Match | Priority | Actions |
|------|------|--------|---------------|-----------------|-----------------|----------------|----------|---------|

**Priority Scoring**:
- HIGH: Cold chain, DG, or >4 hours waiting
- MEDIUM: Standard cargo
- LOW: Long-term storage (>7 days expected)

**Quick Actions**:
- `ASSIGN_SHELF` — Accepts system suggestion or manual override
- `REASSIGN_ZONE` — Changes zone assignment
- `PRINT_PUT_AWAY_LIST` — Print pick list for warehouse officer
- `TRANSFER_TO_OFFICER` — Assigns to specific officer

### 3.4 Shelf View (Visual Map)

**Display**: Grid of shelves by zone → aisle → rack

**Color Coding**:
- 🟢 Green: Available (0-50% full)
- 🟡 Yellow: Partial (51-85% full)
- 🟠 Orange: Near full (86-95% full)
- 🔴 Red: Full (>95% full)
- ⚪ Gray: Maintenance
- 🔵 Blue: Reserved

**Click Shelf → Detail Panel**:
```
┌────────────────────────────────────┐
│ Shelf: Z1-A-R03-S4                 │
├────────────────────────────────────┤
│ Capacity: 1,000 kg / 1,200 kg      │
│ Occupancy: 83%                     │
│ Temperature: 22°C                  │
│                                    │
│ Current Cargo (3 items):           │
│ ┌──────────────────────────────┐   │
│ │ MAWB: 123-45678901           │   │
│ │ HAWB: HKG-202407-001-01      │   │
│ │ Weight: 350 kg               │   │
│ │ Received: 2024-07-28         │   │
│ │ Days: 3                      │   │
│ └──────────────────────────────┘   │
│ ┌──────────────────────────────┐   │
│ │ MAWB: 123-45678902           │   │
│ │ ...                          │   │
│ └──────────────────────────────┘   │
│                                    │
│ [ADD CARGO] [MOVE ALL] [EMPTY]    │
└────────────────────────────────────┘
```

### 3.5 Inventory Screen

**Filters**: Zone, Status, MAWB, HAWB, Date Range, Storage Duration, DG Class

**Table Columns**:
| MAWB | HAWB | Pieces | Location | Status | Weight | Volume | Days in Storage | Storage Fee | Actions |
|------|------|--------|----------|--------|--------|--------|-----------------|-------------|---------|

**Quick Actions**:
- `VIEW_DETAILS` — Full cargo detail panel
- `MOVE_CARGO` — Opens movement workflow
- `REPORT_DAMAGE` — Opens damage report
- `RELEASE` — Opens release workflow
- `HOLD` — Opens hold form with reason selection

**Bulk Actions**:
- Select multiple → `BULK_MOVE`, `BULK_RELEASE`, `BULK_HOLD`

### 3.6 Cargo Detail Panel

**Tabs**:
```
┌─────────────────────────────────────────────────────────────┐
│ Cargo: MAWB 123-45678901 / HAWB HKG-202407-001-01          │
├──────────┬────────┬────────┬────────┬────────┬──────────────┤
│ Overview │ Photos │ Tim-   │ Docu-  │ Audit  │ Billing      │
│          │        │ line   │ ments  │ Log    │              │
├──────────┴────────┴────────┴────────┴────────┴──────────────┤
│ Overview Tab:                                                │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Status: STORED                    Zone: Z1-A-R03-S4    │ │
│ │ Received: 2024-07-26 10:23       By: John W.           │ │
│ │ Days in Storage: 3                Fee: $45.00           │ │
│ │ Weight: 350 kg / 360 kg (declared)                     │ │
│ │ Volume: 2.4 m³ / 2.5 m³ (declared)                    │ │
│ │ DG Class: None                    Temp: N/A             │ │
│ │ Condition: Good                                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Storage Timer: ⏱ 3 days 4 hours 12 minutes              │ │
│ │ SLA Target: 24h to put-away             ✅ Met           │ │
│ │ SLA Target: 48h to release              ⏳ In Progress   │ │
│ └─────────────────────────────────────────────────────────┘ │
│ Quick Actions:                                              │
│ [MOVE] [RELEASE] [HOLD] [REPORT DAMAGE] [PRINT LABEL]      │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. KPIs & Dashboards

### 4.1 Operational KPIs

| KPI | Formula | Refresh | Alert Threshold |
|-----|---------|---------|-----------------|
| Cargo Received Today | COUNT(received today) | Real-time | — |
| Cargo Stored Today | COUNT(stored today) | Real-time | — |
| Cargo Released Today | COUNT(released today) | Real-time | — |
| Cargo Waiting (In Queue) | COUNT(status = RECEIVED) | Real-time | > 20 items |
| Put Away Backlog | COUNT(status = RECEIVED, age > 4h) | Real-time | > 10 items |
| Storage Occupancy % | SUM(used capacity) / SUM(total capacity) × 100 | Every 5 min | > 85% → YELLOW, > 95% → RED |
| Available Space (m³) | SUM(available volume) | Every 5 min | < 500 m³ → alert |
| Average Receiving Time | AVG(completed_at - received_at) | Daily | > 30 min |
| Average Put Away Time | AVG(stored_at - received_at) | Daily | > 4 hours |
| Average Storage Duration | AVG(now - stored_at) for STORED cargo | Daily | > 7 days → review |
| Damaged Cargo | COUNT(status = DAMAGED) | Real-time | > 5 items |
| Missing Cargo | COUNT(status = MISSING) | Real-time | > 2 items |
| Storage Revenue (Today) | SUM(fees for released today) | Daily | — |
| Storage Revenue (MTD) | SUM(fees for released this month) | Daily | — |
| SLA Compliance % | COUNT(SLA met) / COUNT(SLA triggered) × 100 | Daily | < 90% → alert |
| Zone Utilization | Per zone: used / total × 100 | Every 15 min | Per zone > 85% |
| Cycle Count Accuracy | (1 - |system_count - physical_count| / system_count) × 100 | Per cycle | < 98% → investigate |

### 4.2 Dashboard Layout

```text
┌─────────────────────────────────────────────────────────────────┐
│ WAREHOUSE COMMAND CENTER                     [Live] [1m] [5m]   │
├─────────────────────────────────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌───────────┐ │
│ │Received │ │  Put    │ │Occupancy│ │Released │ │  Storage   │ │
│ │  Today  │ │  Away   │ │  78%    │ │  Today  │ │  Revenue   │ │
│ │   42    │ │ Backlog │ │ ███████░│ │   15    │ │ $2,340     │ │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘ └───────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────┐ ┌─────────────────────────────────┐ │
│ │ Zone Utilization Map    │ │  Recent Activity (Live Feed)   │ │
│ │ ┌──────┐ ┌──────┐ ...  │ │ 10:23: Rcvd pallet HKG-...    │ │
│ │ │ Z1-A │ │ Z1-B │      │ │ 10:18: Moved HKG-001→Z1-A-R3 │ │
│ │ │ 82%  │ │ 65%  │      │ │ 10:15: Released HKG-002       │ │
│ │ └──────┘ └──────┘      │ │ 10:10: Damaged HKG-003 (crush)│ │
│ └─────────────────────────┘ └─────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ ┌──────────────────────┐ ┌──────────────────────┐ ┌───────────┐ │
│ │ Receiving Queue      │ │ Put Away Queue       │ │ Release   │ │
│ │ [5 items waiting]    │ │ [12 items waiting]   │ │ Queue     │ │
│ │ ┌──────────────────┐ │ │ ┌──────────────────┐ │ │ [8 items] │ │
│ │ │MAWB: 123-45678901│ │ │ │MAWB: 123-45678905│ │ │ ...       │ │
│ │ │Pieces: 10/10     │ │ │ │Zone: Z1-A (auto) │ │ │           │ │
│ │ │Wait: 12 min      │ │ │ │Wait: 3h 22m      │ │ │           │ │
│ │ │[START]           │ │ │ │[ASSIGN SHELF]    │ │ │           │ │
│ │ └──────────────────┘ │ │ └──────────────────┘ │ │           │ │
│ └──────────────────────┘ └──────────────────────┘ └───────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Real-time Events

### 5.1 Event Types

| Event | Trigger | Notification Recipients | Channel |
|-------|---------|------------------------|---------|
| `CARGO_RECEIVED` | Receiving confirmed | Supervisor, Import Officer | Dashboard toast, notification |
| `SHELF_ASSIGNED` | Shelf assigned | Warehouse Officer (assigned) | Dashboard toast |
| `CARGO_STORED` | Storage confirmed | Supervisor | Notification |
| `CARGO_MOVED` | Location changed | Supervisor (if zone changed) | Dashboard toast |
| `CARGO_RELEASED` | Release confirmed | Delivery Dept, Billing Dept | Notification, workflow |
| `DAMAGE_REPORTED` | Damage created | Supervisor, Import, Customer | High priority notification |
| `MISSING_REPORTED` | Missing confirmed | Supervisor, Security, Ops Mgr | Urgent notification |
| `HOLD_PLACED` | Hold status set | Supervisor, relevant department | Notification |
| `HOLD_RELEASED` | Hold resolved | Original holder, Delivery | Notification |
| `CAPACITY_ALERT` | Zone > 85% occupied | Supervisor | Dashboard alert |
| `FULL_CAPACITY` | Zone > 95% occupied | Supervisor, Ops Manager | Urgent dashboard alert |
| `SLA_BREACH` | Put-away > 4h | Supervisor | Escalation notification |
| `STORAGE_FEE_THRESHOLD` | Fee > $1,000 | Billing Dept | Notification |
| `TEMPERATURE_ALERT` | Cold storage deviation | Supervisor, Cold chain officer | Urgent notification |
| `CYCLE_COUNT_DUE` | Scheduled count due | Inventory officer | Task notification |

### 5.2 Dashboard Real-time Feed

```text
┌──────────────────────────────────────┐
│ 🔴 LIVE ACTIVITY FEED               │
├──────────────────────────────────────┤
│ 🟢 10:23  Rcvd  MAWB 123-45678901   │
│         10/10 pcs | John W.          │
│ 🟡 10:18  Moved HKG-001 → Z1-A-R03  │
│         Officer: Sarah K.            │
│ 🔴 10:15  Rel.  HKG-002             │
│         To: Delivery #DEL-1024       │
│ 🟠 10:10  Damaged HKG-003           │
│         Type: Crush | Severity: MOD  │
│ 🟢 10:05  Stored HKG-004            │
│         At: Z1-B-R07-S2              │
│ 🔵 09:58  Hold  HKG-005             │
│         Reason: Customs (2nd insp.)  │
└──────────────────────────────────────┘
```

---

## 6. Automation Rules

### 6.1 Auto Shelf Assignment

**Rule**: `AUTO_SHELF_ASSIGN`
**Trigger**: Cargo status changes to `WAREHOUSE_RECEIVED`
**Action**: 
1. Determine cargo type (general, cold, DG, oversized)
2. Find best-fit zone with available capacity
3. Within zone, find shelf with:
   - Highest capacity fit
   - Lowest current occupancy
   - Proximity to same-MAWB cargo (if any)
4. Create shelf assignment suggestion
5. If confidence > 90% → auto-assign
6. If confidence < 90% → flag for supervisor review

**Confidence Score** = Weighted sum of:
- Zone match (50%)
- Capacity fit (25%)
- Weight distribution (15%)
- MAWB proximity (10%)

### 7.2 Capacity Check

**Rule**: `CAPACITY_CHECK`
**Trigger**: Before any shelf assignment or movement
**Action**:
1. Validate destination shelf has available weight capacity
2. Validate destination shelf has available volume capacity
3. Validate zone-level capacity (zone not at >95%)
4. If cold chain: validate destination is cold zone
5. If DG: validate DG class is allowed at destination
6. Return PASS/FAIL with reason

### 7.3 Storage Fee Timer

**Rule**: `STORAGE_FEE_CALC`
**Trigger**:
- On cargo release (final fee calculation)
- Daily batch (accrual update)

**Fee Structure**:
```text
Free Period: 2 days (configurable)
Daily Rate: $5.00 per CBM per day (configurable)
Min Charge: $10.00 per day
Max Charge: $50.00 per day per item

Formula:
  billable_days = MAX(0, storage_days - free_period)
  daily_fee = MAX(min_charge, MIN(volume_cbm × daily_rate_per_cbm, max_charge))
  total_fee = billable_days × daily_fee
```

### 7.4 SLA Timers

**Put-away SLA**:
- Target: 4 hours from receiving to storage
- Warning: 3 hours → notify supervisor
- Breach: 4 hours → escalate to operations manager
- Severe: 8 hours → escalate to director

**Release SLA**:
- Target: 24 hours from release request to release confirmation
- Warning: 20 hours
- Breach: 24 hours

**Receiving SLA**:
- Target: 30 minutes per MAWB
- Warning: 25 minutes per MAWB
- Breach: 45 minutes per MAWB

### 7.5 Workflow Engine Integration

**Transitions handled by Warehouse module**:

| From Status | To Status | Action | Trigger |
|-------------|-----------|--------|---------|
| CUSTOMS_CLEARED | WAREHOUSE_RECEIVING | Transition (from Import) | Import completes |
| WAREHOUSE_RECEIVING | WAREHOUSE_RECEIVED | CONFIRM_RECEIPT | Officer confirms |
| WAREHOUSE_RECEIVED | SHELF_ASSIGNED | ASSIGN_SHELF | Shelf assigned |
| SHELF_ASSIGNED | STORED | CONFIRM_STORAGE | Officer confirms |
| STORED | STORED | MOVE_CARGO | Location changed |
| STORED | DAMAGED | REPORT_DAMAGE | Damage documented |
| STORED | MISSING | REPORT_MISSING | Missing confirmed |
| STORED | HELD | PLACE_HOLD | Hold reason specified |
| HELD | STORED | RELEASE_HOLD | Hold resolved |
| STORED | RELEASED | RELEASE_CARGO | Release confirmed |
| RELEASED | READY_FOR_BILLING | Transition | Billing required |
| RELEASED | READY_FOR_DELIVERY | Transition | No billing needed |

---

## 7. Complete Workflow Diagram

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                    WAREHOUSE OPERATIONS WORKFLOW                            │
│                                                                             │
│  FROM IMPORT DEPARTMENT                                                     │
│  ┌──────────────┐                                                           │
│  │ CUSTOMS      │                                                           │
│  │ CLEARED      │                                                           │
│  └──────┬───────┘                                                           │
│         │ Workflow Engine: side-effect transition                           │
│         ▼                                                                   │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    RECEIVING ZONE                                    │  │
│  │  ┌──────────────┐    ┌───────────────┐    ┌──────────────────────┐  │  │
│  │  │ WAREHOUSE    │───►│ RECEIVING      │───►│ WAREHOUSE            │  │  │
│  │  │ RECEIVING    │    │ IN PROGRESS    │    │ RECEIVED             │  │  │
│  │  └──────────────┘    └───────────────┘    └──────────┬───────────┘  │  │
│  │                                                      │               │  │
│  │                               Discrepancy?           │               │  │
│  │                               ┌──────────────────────┤               │  │
│  │                               ▼                      ▼               │  │
│  │                        ┌──────────────┐      ┌──────────────┐       │  │
│  │                        │ DISCREPANCY  │      │ OK - Proceed │       │  │
│  │                        │ REPORTED     │      │   to Put     │       │  │
│  │                        └──────────────┘      │   Away       │       │  │
│  │                                               └──────┬───────┘       │  │
│  └──────────────────────────────────────────────────────┼──────────────┘  │
│                                                          │                 │
│                                                          ▼                 │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    PUT AWAY ZONE                                    │  │
│  │  ┌──────────────┐    ┌───────────────┐    ┌──────────────────────┐  │  │
│  │  │ SHELF        │───►│ PUT AWAY       │───►│ CONFIRM STORAGE     │  │  │
│  │  │ ASSIGNED     │    │ IN PROGRESS    │    │ (Barcode Scan)      │  │  │
│  │  └──────┬───────┘    └───────────────┘    └──────────┬───────────┘  │  │
│  │         │                                            │               │  │
│  │    Auto Assign?                                       │               │  │
│  │    ┌────┴────┐                                        │               │  │
│  │    ▼         ▼                                        ▼               │  │
│  │ ┌──────┐ ┌────────┐                           ┌──────────────┐      │  │
│  │ │ Auto │ │ Manual │                           │ INVENTORY    │      │  │
│  │ │ Pass │ │ Override│                           │ UPDATED      │      │  │
│  │ └──────┘ └────────┘                           └──────────────┘      │  │
│  └──────────────────────────────────────────────────────┼──────────────┘  │
│                                                          │                 │
│                                                          ▼                 │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    STORAGE ZONE                                     │  │
│  │                                                                    │  │
│  │  ┌──────────────┐    ┌───────────────┐    ┌──────────────────────┐  │  │
│  │  │ STORED       │───►│ MONITORING    │───►│ RELEASE REQUESTED   │  │  │
│  │  │ (Normal)     │    │ (SLA, Fee,    │    │ (Customer / Import) │  │  │
│  │  └──────┬───────┘    │  Temp, etc.)  │    └──────────┬───────────┘  │  │
│  │         │            └───────────────┘               │               │  │
│  │         ▼                                            │               │  │
│  │  ┌──────────────┐                                    │               │  │
│  │  │ MOVEMENT     │◄───────────────────────────────────┘               │  │
│  │  │ (Re-shelf,   │                                                    │  │
│  │  │  Consol.)    │                                                    │  │
│  │  └──────────────┘                                                    │  │
│  │         │                                                            │  │
│  │  ┌──────┴──────────────────────────────────────────────┐             │  │
│  │  │                     EXCEPTIONS                      │             │  │
│  │  │  ┌──────────┐  ┌─────────┐  ┌─────────┐  ┌──────┐ │             │  │
│  │  │  │ DAMAGED  │  │ MISSING │  │ HELD    │  │ TEMP │ │             │  │
│  │  │  │ (Quar.)  │  │ (Inves.)│  │ (Reason)│  │ ALERT│ │             │  │
│  │  │  └────┬─────┘  └────┬────┘  └────┬────┘  └──┬───┘ │             │  │
│  │  │       │             │           │          │     │             │  │
│  │  │       ▼             ▼           ▼          ▼     │             │  │
│  │  │  ┌──────────┐  ┌─────────┐  ┌─────────┐  ┌──────┐ │             │  │
│  │  │  │ Resolved │  │ Found / │  │ Hold    │  │ Temp │ │             │  │
│  │  │  │ → REPAIRED│  │ Claim   │  │ Released│  │ OK   │ │             │  │
│  │  │  │ → SCRAPPED│  │ → INV.  │  │ → STORED│  │      │ │             │  │
│  │  │  │ → COMPENS.│  │ Adj.    │  │         │  │      │ │             │  │
│  │  │  └──────────┘  └─────────┘  └─────────┘  └──────┘ │             │  │
│  │  └────────────────────────────────────────────────────┘             │  │
│  └──────────────────────────────────────────────────────┬──────────────┘  │
│                                                          │                 │
│                                                          ▼                 │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    RELEASE ZONE                                     │  │
│  │  ┌──────────────┐    ┌───────────────┐    ┌──────────────────────┐  │  │
│  │  │ RELEASED     │───►│ VALIDATIONS   │───►│ BILLING CHECK        │  │  │
│  │  │ (Confirmed)  │    │ (Hold check,  │    │ ┌────────────────┐   │  │  │
│  │  └──────┬───────┘    │  Damage check,│    │ │ Invoice needed?│   │  │  │
│  │         │            │  Customs)     │    │ │  YES     NO    │   │  │  │
│  │         │            └───────────────┘    │ └────┬────┬─────┘   │  │  │
│  │         │                                  │      │    │        │  │  │
│  │         ▼                                  │      ▼    ▼        │  │  │
│  │  ┌──────────────┐                          │ ┌──────┐ ┌──────┐  │  │  │
│  │  │ TO BILLING   │◄─────────────────────────┤ │ BILL │ │ DEL  │  │  │  │
│  │  │ (If Invoice) │                          │ └──────┘ └──────┘  │  │  │
│  │  └──────┬───────┘                          └────────────────────┘  │  │
│  │         │                                                          │  │
│  │         ▼                                                          │  │
│  │  ┌──────────────┐                                                  │  │
│  │  │ TO DELIVERY  │                                                  │  │
│  │  │ (All paths)  │                                                  │  │
│  │  └──────────────┘                                                  │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  TO DELIVERY DEPARTMENT                                                     │
│  ┌──────────────┐                                                           │
│  │ READY_FOR    │                                                           │
│  │ DELIVERY     │                                                           │
│  └──────────────┘                                                           │
└─────────────────────────────────────────────────────────────────────────────┘
```
