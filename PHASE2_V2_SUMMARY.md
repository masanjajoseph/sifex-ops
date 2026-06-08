# Phase 2 V2: Air Cargo Consolidation Architecture - COMPLETE ✅

**Status**: DESIGN PHASE COMPLETE  
**Date**: May 25, 2026  
**Focus**: Freight forwarding, customs, warehouse operations, multi-currency billing

---

## What Changed from V1 to V2

### V1 (Generic Courier)
- Simple parcel pickup/delivery
- Boolean-based state tracking
- Single shipment workflow
- Basic billing

### V2 (Air Cargo Consolidation)
- Master AWB → House AWB hierarchy
- 5 separate workflows (export, import, warehouse, customs, billing)
- Station-to-station movement (CAN, HKG, DXB, DAR, NBO)
- Customs clearance with holds and queries
- Multi-currency billing with partial payments
- Airline and flight management
- Manifest management
- Operational scan events
- Shipment state vs warehouse state separation

---

## Core Architecture

### Master AWB & House AWB Hierarchy

```
Master AWB (Consolidation)
  ├── House AWB 1 (Shipment)
  │   ├── Parcel 1
  │   ├── Parcel 2
  │   └── Parcel 3
  │
  ├── House AWB 2 (Shipment)
  │   ├── Parcel 1
  │   └── Parcel 2
  │
  └── House AWB 3 (Shipment)
      └── Parcel 1
```

### 5 Separate Workflows

**1. Export Workflow** (Shipper → International Hub)
```
EXPORT_CREATED → EXPORT_PICKUP → EXPORT_AT_ORIGIN_WAREHOUSE → 
EXPORT_CONSOLIDATED → EXPORT_CUSTOMS_DECLARATION → 
EXPORT_UNDER_CLEARANCE → EXPORT_CLEARED → EXPORT_RELEASED → 
EXPORT_MANIFESTED → EXPORT_LOADED_TO_AIRLINE → EXPORT_IN_TRANSIT
```

**2. Import Workflow** (International Hub → Recipient)
```
IMPORT_ARRIVED_AT_HUB → IMPORT_CUSTOMS_DECLARATION → 
IMPORT_UNDER_CLEARANCE → IMPORT_CLEARED → IMPORT_RELEASED → 
IMPORT_AT_DESTINATION_WAREHOUSE → IMPORT_READY_FOR_DELIVERY → 
IMPORT_OUT_FOR_DELIVERY → IMPORT_DELIVERED → IMPORT_SIGNED
```

**3. Warehouse Workflow** (Internal Operations)
```
WAREHOUSE_RECEIVED → WAREHOUSE_STORED → WAREHOUSE_CONSOLIDATED → 
WAREHOUSE_MANIFESTED → WAREHOUSE_READY_FOR_DISPATCH → WAREHOUSE_DISPATCHED
```

**4. Customs Workflow** (Regulatory Operations)
```
CUSTOMS_DECLARED → CUSTOMS_UNDER_REVIEW → CUSTOMS_APPROVED → CUSTOMS_RELEASED
                                        ↓
                                  CUSTOMS_HOLD → CUSTOMS_QUERY_ISSUED → 
                                  CUSTOMS_QUERY_RESPONDED → CUSTOMS_APPROVED
```

**5. Billing Workflow** (Multi-Currency Payments)
```
BILLING_NOT_INVOICED → BILLING_CHARGES_CALCULATED → BILLING_INVOICED → 
BILLING_PARTIAL_PAYMENT → BILLING_PARTIAL_PAYMENT → BILLING_PAID
```

### Station-to-Station Movement

```
ORIGIN_WAREHOUSE (CAN - Guanzhou)
  ↓
CONSOLIDATION_HUB (HKG - Hong Kong)
  ├─→ TRANSIT_HUB_1 (DXB - Dubai)
  │     ↓
  │   TRANSIT_HUB_2 (DAR - Dar es Salaam)
  │     ↓
  │   DESTINATION_HUB (NBO - Nairobi)
  │
  └─→ DESTINATION_HUB (NBO - Nairobi) [direct]
      ↓
    FINAL_WAREHOUSE (recipient location)
```

---

## Key Entities

| Entity | Purpose | Hierarchy |
|--------|---------|-----------|
| **Master AWB** | Consolidation container | Root |
| **House AWB** | Individual shipment | Child of Master AWB |
| **Parcel** | Physical item | Child of House AWB |
| **Station** | Hub location (CAN, HKG, etc) | Operational |
| **Customs Declaration** | Regulatory document | Linked to House/Master AWB |
| **Manifest** | Flight manifest | Linked to Master AWB |
| **Airline** | Carrier | Operational |
| **Flight** | Scheduled flight | Operational |
| **Warehouse Inventory** | Cargo location | Operational |
| **Billing Record** | Charges and payments | Linked to House AWB |

---

## Customs Workflow (Detailed)

```
CUSTOMS_DECLARED
  ↓
CUSTOMS_UNDER_REVIEW
  ├─→ CUSTOMS_APPROVED
  │     ↓
  │   CUSTOMS_RELEASED
  │
  ├─→ CUSTOMS_HOLD
  │     ├─→ CUSTOMS_QUERY_ISSUED
  │     │     ├─→ CUSTOMS_QUERY_RESPONDED
  │     │     │     └─→ CUSTOMS_APPROVED
  │     │     │
  │     │     └─→ CUSTOMS_QUERY_TIMEOUT
  │     │           └─→ CUSTOMS_HOLD_ESCALATED
  │     │
  │     └─→ CUSTOMS_HOLD_ESCALATED
  │           ├─→ CUSTOMS_MANUAL_INSPECTION
  │           │     └─→ CUSTOMS_APPROVED
  │           │
  │           └─→ CUSTOMS_REJECTED
  │
  └─→ CUSTOMS_REJECTED
```

---

## Operational Scan Events (13 types)

1. **SCAN_PICKUP** - Collect from shipper
2. **SCAN_ARRIVAL_AT_WAREHOUSE** - Receive at warehouse
3. **SCAN_CONSOLIDATION** - Add to Master AWB
4. **SCAN_MANIFESTING** - Add to manifest
5. **SCAN_LOADING_TO_AIRLINE** - Load to aircraft
6. **SCAN_DEPARTURE** - Flight departure
7. **SCAN_ARRIVAL_AT_HUB** - Arrive at hub
8. **SCAN_CUSTOMS_SUBMISSION** - Submit customs
9. **SCAN_CUSTOMS_CLEARANCE** - Customs approved
10. **SCAN_WAREHOUSE_RELEASE** - Release from warehouse
11. **SCAN_OUT_FOR_DELIVERY** - Start delivery
12. **SCAN_DELIVERY** - Delivered to recipient
13. **SCAN_RETURN_TO_WAREHOUSE** - Return to warehouse

---

## Multi-Currency Billing

### Charges

- **PICKUP_FEE** - Collection fee
- **CONSOLIDATION_FEE** - Consolidation fee
- **CUSTOMS_CLEARANCE_FEE** - Customs processing
- **STORAGE_FEE** - Per day storage
- **HANDLING_FEE** - Warehouse handling
- **AIRLINE_FREIGHT_CHARGE** - Airline freight
- **DELIVERY_FEE** - Final delivery
- **SURCHARGE** - Delays, exceptions
- **REFUND** - Refunds issued

### Partial Payments

```
Invoice: $1,000 USD
Payment 1: $300 USD (30%)
Payment 2: $400 USD (40%)
Payment 3: $300 USD (30%)
Status: PAID
```

### Exchange Rate Snapshots

```
Charge: $100 USD
Exchange Rate: 1 USD = 150 KES (snapshot at charge time)
Local Amount: 15,000 KES
```

---

## Shipment State vs Warehouse State

### Shipment State (HouseAWB)
Tracks the shipment's business journey:
- EXPORT_CREATED
- EXPORT_PICKUP
- EXPORT_AT_ORIGIN_WAREHOUSE
- EXPORT_CONSOLIDATED
- EXPORT_CUSTOMS_DECLARATION
- ... (continues through import)
- IMPORT_SIGNED

### Warehouse State (WarehouseInventory)
Tracks the cargo's physical location:
- RECEIVED
- STORED
- CONSOLIDATED
- MANIFESTED
- READY_FOR_DISPATCH
- DISPATCHED
- HELD
- EXCEPTION

**Key Difference**: A shipment can be IN_TRANSIT (shipment state) while its warehouse state is DISPATCHED (left warehouse).

---

## Event Types (40+)

### Export Events (12)
- EXPORT_CREATED
- EXPORT_PICKUP_ASSIGNED
- EXPORT_PICKED_UP
- EXPORT_AT_ORIGIN_WAREHOUSE
- EXPORT_CONSOLIDATED
- EXPORT_CUSTOMS_DECLARATION_SUBMITTED
- EXPORT_UNDER_CLEARANCE
- EXPORT_CUSTOMS_HOLD
- EXPORT_CUSTOMS_QUERY
- EXPORT_CLEARED
- EXPORT_RELEASED
- EXPORT_MANIFESTED

### Import Events (12)
- IMPORT_ARRIVED_AT_HUB
- IMPORT_CUSTOMS_DECLARATION_SUBMITTED
- IMPORT_UNDER_CLEARANCE
- IMPORT_CUSTOMS_HOLD
- IMPORT_CUSTOMS_QUERY
- IMPORT_CLEARED
- IMPORT_RELEASED
- IMPORT_AT_DESTINATION_WAREHOUSE
- IMPORT_READY_FOR_DELIVERY
- IMPORT_OUT_FOR_DELIVERY
- IMPORT_DELIVERED
- IMPORT_SIGNED

### Warehouse Events (8)
- WAREHOUSE_RECEIVED
- WAREHOUSE_STORED
- WAREHOUSE_CONSOLIDATED
- WAREHOUSE_MANIFESTED
- WAREHOUSE_READY_FOR_DISPATCH
- WAREHOUSE_DISPATCHED
- WAREHOUSE_HELD
- WAREHOUSE_EXCEPTION

### Customs Events (6)
- CUSTOMS_DECLARATION_SUBMITTED
- CUSTOMS_UNDER_REVIEW
- CUSTOMS_HOLD_ISSUED
- CUSTOMS_QUERY_ISSUED
- CUSTOMS_APPROVED
- CUSTOMS_RELEASED

### Billing Events (4)
- BILLING_INVOICED
- BILLING_PARTIAL_PAYMENT
- BILLING_PAID
- BILLING_REFUND

---

## Role Responsibilities

| Role | Responsibilities |
|------|------------------|
| **Freight Forwarder** | Create shipments, arrange pickup, consolidate, submit customs, arrange flights |
| **Customs Broker** | Submit declarations, respond to queries, manage holds, obtain clearance |
| **Warehouse Manager** | Receive cargo, store, consolidate, manifest, release |
| **Airline Coordinator** | Confirm bookings, manage manifests, coordinate loading, track flights |
| **Delivery Partner** | Receive at destination, manage delivery, collect signatures |
| **Billing Officer** | Generate invoices, record payments, manage refunds, handle disputes |
| **Admin** | Configure operations, manage users, override rules |

---

## Files Created

### Documentation
1. **docs/PHASE2_DOMAIN_ARCHITECTURE_V2.md** (967 lines)
   - Complete air cargo consolidation design
   - 14 sections covering all aspects
   - Master AWB & House AWB hierarchy
   - 5 separate workflows
   - Station-to-station movement
   - Customs workflow
   - Operational scan events
   - Multi-currency billing
   - Airline and manifest concepts

### TypeScript
2. **types/cargo-domain.ts** (596 lines)
   - 10 status enums (HouseAWB, MasterAWB, Customs, Warehouse, Manifest, Billing, Scan, Cargo events)
   - 15 domain interfaces (MasterAWB, HouseAWB, Station, Customs, Manifest, Airline, Flight, etc)
   - 5 Zod validation schemas
   - Full type safety for air cargo operations

---

## Statistics

| File | Lines | Type | Purpose |
|------|-------|------|---------|
| PHASE2_DOMAIN_ARCHITECTURE_V2.md | 967 | Doc | Complete air cargo design |
| types/cargo-domain.ts | 596 | Code | Type definitions |
| **TOTAL** | **1,563** | - | - |

---

## Implementation Roadmap

### Phase 2.1: Core Cargo Entities (Week 1-2)
- [ ] Master AWB aggregate
- [ ] House AWB aggregate
- [ ] Station entity
- [ ] Customs declaration entity
- [ ] Event sourcing foundation

### Phase 2.2: Workflow Engines (Week 2-3)
- [ ] Export workflow engine
- [ ] Import workflow engine
- [ ] Warehouse workflow engine
- [ ] Customs workflow engine
- [ ] Transition validator

### Phase 2.3: Operational Features (Week 3-4)
- [ ] Scan event system
- [ ] Station-to-station movement
- [ ] Manifest management
- [ ] Airline integration
- [ ] Customs integration

### Phase 2.4: Billing & Payments (Week 4-5)
- [ ] Multi-currency billing
- [ ] Partial payment tracking
- [ ] Exchange rate snapshots
- [ ] Refund management
- [ ] Billing reports

### Phase 2.5: UI Implementation (Week 5-6)
- [ ] Export dashboard
- [ ] Import dashboard
- [ ] Warehouse dashboard
- [ ] Customs dashboard
- [ ] Billing dashboard

---

## Key Differences from V1

| Aspect | V1 (Generic) | V2 (Air Cargo) |
|--------|-------------|----------------|
| **Hierarchy** | Single shipment | Master AWB → House AWB |
| **Workflows** | Single workflow | 5 separate workflows |
| **Stations** | Generic locations | Specific hubs (CAN, HKG, DXB, DAR, NBO) |
| **Customs** | Not modeled | Full customs workflow with holds/queries |
| **Billing** | Simple charges | Multi-currency with partial payments |
| **Airline** | Not modeled | Full airline and flight management |
| **Manifest** | Not modeled | Full manifest management |
| **Scans** | Generic events | 13 specific operational scans |
| **State** | Single state | Shipment state + warehouse state |

---

## Next Steps

1. **Review V2 Architecture**
   - Read `PHASE2_DOMAIN_ARCHITECTURE_V2.md`
   - Validate against business requirements
   - Confirm workflows and transitions

2. **Approve Type System**
   - Review `types/cargo-domain.ts`
   - Validate enums and interfaces
   - Confirm validation schemas

3. **Begin Phase 2.1**
   - Create Master AWB aggregate
   - Create House AWB aggregate
   - Implement event sourcing
   - Create transition validator

---

## Key Principles

1. **Cargo-Centric**: Everything revolves around cargo movement
2. **Station-Based**: Hub-to-hub movement architecture
3. **Workflow Separation**: Export, import, warehouse, customs are distinct
4. **Customs-First**: Regulatory compliance is built-in
5. **Multi-Currency**: Global operations with exchange rates
6. **Audit Trail**: Every scan and action is recorded
7. **Real-Time Tracking**: Operational visibility at every step
8. **Scalable**: Handles thousands of shipments daily
9. **Compliant**: Full regulatory audit trail
10. **Observable**: All events are trackable

---

**Status**: ✅ PHASE 2 DOMAIN ARCHITECTURE V2 COMPLETE

**Ready For**: Phase 2.1 Implementation (Core Cargo Entities)

**Next Action**: Begin Phase 2.1 Development

---

*Last Updated: May 25, 2026*  
*Version: 2.0*  
*Status: FINAL*
