# Phase 2: Domain Architecture V2 - Air Cargo Consolidation ERP

**Status**: Design Phase - Specialized for Freight Forwarding  
**Date**: May 25, 2026  
**Focus**: Air cargo consolidation, freight forwarding, customs, warehouse operations

---

## Executive Summary

This is NOT a parcel delivery system. This is an **air cargo consolidation and freight forwarding ERP**.

**Core Business Model**:
- Consolidate multiple shipments into Master AWBs
- Move cargo through international hubs (CAN, HKG, DXB, DAR, NBO)
- Handle customs clearance and regulatory compliance
- Manage warehouse operations and cargo release
- Coordinate with airlines and freight forwarders
- Handle multi-currency billing with partial payments

**Key Difference from V1**: Separated workflows for export, import, warehouse, and customs operations.

---

## 1. Core Entity Hierarchy

### Master-Detail Relationship

```
Organization
  └── Warehouse (origin/destination)
      ├── MASTER_AWB (Air Waybill - consolidation)
      │   ├── HOUSE_AWB (individual shipment)
      │   │   ├── Parcel (physical item)
      │   │   ├── HouseAWBStatus (current state)
      │   │   ├── HouseAWBTracking (location history)
      │   │   └── HouseAWBBilling (charges)
      │   │
      │   ├── MasterAWBStatus (consolidation state)
      │   ├── MasterAWBManifest (cargo manifest)
      │   ├── MasterAWBAirline (flight assignment)
      │   └── MasterAWBCustoms (customs clearance)
      │
      ├── Station (hub location: CAN, HKG, DXB, DAR, NBO)
      │   ├── StationInventory (cargo at station)
      │   ├── StationMovement (station-to-station)
      │   └── StationWarehouse (storage operations)
      │
      └── Customs (regulatory operations)
          ├── CustomsDeclaration
          ├── CustomsHold
          └── CustomsRelease
```

---

## 2. Workflow Separation

### Export Workflow (Shipper → International Hub)

```
EXPORT_CREATED
  ↓
EXPORT_PICKUP (collect from shipper)
  ↓
EXPORT_AT_ORIGIN_WAREHOUSE
  ├─→ EXPORT_CONSOLIDATED (added to Master AWB)
  │     ↓
  │   EXPORT_CUSTOMS_DECLARATION
  │     ├─→ EXPORT_UNDER_CLEARANCE
  │     │     ├─→ EXPORT_CUSTOMS_HOLD (if issues)
  │     │     │     └─→ EXPORT_CUSTOMS_QUERY (resolve)
  │     │     └─→ EXPORT_CLEARED
  │     │
  │     └─→ EXPORT_RELEASED (approved)
  │           ↓
  │         EXPORT_MANIFESTED (added to manifest)
  │           ↓
  │         EXPORT_LOADED_TO_AIRLINE
  │           ↓
  │         EXPORT_IN_TRANSIT
  │
  └─→ EXPORT_EXCEPTION (lost/damaged)
```

### Import Workflow (International Hub → Recipient)

```
IMPORT_ARRIVED_AT_HUB
  ↓
IMPORT_CUSTOMS_DECLARATION
  ├─→ IMPORT_UNDER_CLEARANCE
  │     ├─→ IMPORT_CUSTOMS_HOLD (if issues)
  │     │     └─→ IMPORT_CUSTOMS_QUERY (resolve)
  │     └─→ IMPORT_CLEARED
  │
  └─→ IMPORT_RELEASED (approved)
      ↓
    IMPORT_AT_DESTINATION_WAREHOUSE
      ├─→ IMPORT_READY_FOR_DELIVERY
      │     ↓
      │   IMPORT_OUT_FOR_DELIVERY
      │     ├─→ IMPORT_DELIVERED
      │     │     └─→ IMPORT_SIGNED
      │     │
      │     └─→ IMPORT_DELIVERY_FAILED
      │           ├─→ IMPORT_REATTEMPT
      │           └─→ IMPORT_RETURN_TO_WAREHOUSE
      │
      └─→ IMPORT_EXCEPTION (lost/damaged)
```

### Warehouse Workflow (Internal Operations)

```
WAREHOUSE_RECEIVED
  ↓
WAREHOUSE_STORED (in inventory)
  ├─→ WAREHOUSE_CONSOLIDATED (added to Master AWB)
  │     ↓
  │   WAREHOUSE_MANIFESTED
  │     ↓
  │   WAREHOUSE_READY_FOR_DISPATCH
  │     ↓
  │   WAREHOUSE_DISPATCHED
  │
  ├─→ WAREHOUSE_HELD (customs/payment)
  │     ├─→ WAREHOUSE_CUSTOMS_HOLD
  │     │     └─→ WAREHOUSE_CUSTOMS_RELEASED
  │     │
  │     └─→ WAREHOUSE_PAYMENT_HOLD
  │           └─→ WAREHOUSE_PAYMENT_RECEIVED
  │
  └─→ WAREHOUSE_EXCEPTION (damage/loss)
```

### Customs Workflow (Regulatory Operations)

```
CUSTOMS_DECLARATION_SUBMITTED
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

### Billing Workflow (Multi-Currency, Partial Payments)

```
BILLING_NOT_INVOICED
  ↓
BILLING_CHARGES_CALCULATED
  ├─→ BILLING_INVOICED
  │     ├─→ BILLING_PARTIAL_PAYMENT (payment received)
  │     │     ├─→ BILLING_PARTIAL_PAYMENT (more payments)
  │     │     │     └─→ BILLING_PAID (fully paid)
  │     │     │
  │     │     └─→ BILLING_PAID (fully paid)
  │     │
  │     ├─→ BILLING_OVERDUE
  │     │     ├─→ BILLING_PARTIAL_PAYMENT
  │     │     └─→ BILLING_PAID
  │     │
  │     └─→ BILLING_DISPUTED
  │           ├─→ BILLING_DISPUTE_RESOLVED
  │           │     └─→ BILLING_PAID
  │           │
  │           └─→ BILLING_REFUND_ISSUED
  │
  └─→ BILLING_CANCELLED
```

---

## 3. Station-to-Station Movement Architecture

### Hub Stations

```
ORIGIN_WAREHOUSE (CAN - Canada)
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

### Station Movement Events

```
STATION_ARRIVAL
  - timestamp
  - station_id
  - master_awb_id
  - house_awb_ids
  - cargo_weight
  - cargo_volume

STATION_STORAGE
  - duration
  - storage_fee
  - warehouse_location
  - temperature_control (if applicable)

STATION_CONSOLIDATION
  - master_awb_created
  - house_awbs_consolidated
  - total_weight
  - total_volume

STATION_MANIFESTING
  - manifest_created
  - airline_assigned
  - flight_number
  - departure_time

STATION_DEPARTURE
  - timestamp
  - next_station
  - airline
  - flight_number
  - cargo_weight
  - cargo_volume
```

---

## 4. Master AWB & House AWB Hierarchy

### Master AWB (Consolidation)

```
MasterAWB {
  id: UUID
  organizationId: UUID
  originStationId: UUID (CAN)
  destinationStationId: UUID (NBO)
  status: MasterAWBStatus
  
  // Consolidation details
  houseAWBs: HouseAWB[]
  totalWeight: number
  totalVolume: number
  totalPieces: number
  
  // Airline & Flight
  airlineId: UUID
  flightNumber: string
  departureTime: DateTime
  arrivalTime: DateTime
  
  // Manifest
  manifestNumber: string
  manifestStatus: ManifestStatus
  
  // Customs
  customsDeclarationId: UUID
  customsStatus: CustomsStatus
  
  // Billing
  masterAWBBilling: MasterAWBBilling
  
  // Timeline
  createdAt: DateTime
  consolidatedAt: DateTime
  manifestedAt: DateTime
  departedAt: DateTime
  arrivedAt: DateTime
}
```

### House AWB (Individual Shipment)

```
HouseAWB {
  id: UUID
  masterAWBId: UUID
  organizationId: UUID
  
  // Shipment details
  shipperId: UUID
  recipientId: UUID
  status: HouseAWBStatus
  
  // Cargo
  parcels: Parcel[]
  totalWeight: number
  totalVolume: number
  totalPieces: number
  
  // Customs
  hsCode: string
  customsValue: number
  customsCurrency: string
  
  // Tracking
  trackingNumber: string
  timeline: HouseAWBTimeline[]
  
  // Billing
  houseAWBBilling: HouseAWBBilling
  
  // Timeline
  createdAt: DateTime
  pickedUpAt: DateTime
  consolidatedAt: DateTime
  deliveredAt: DateTime
  signedAt: DateTime
}
```

---

## 5. Customs Workflow Architecture

### Customs Declaration

```
CustomsDeclaration {
  id: UUID
  masterAWBId: UUID
  houseAWBId: UUID
  
  // Declaration details
  declarationType: "EXPORT" | "IMPORT"
  declarationNumber: string
  status: CustomsStatus
  
  // Declared goods
  items: CustomsItem[]
  totalDeclaredValue: number
  totalDeclaredWeight: number
  
  // Regulatory
  hsCode: string
  originCountry: string
  destinationCountry: string
  
  // Submission
  submittedAt: DateTime
  submittedBy: UUID
  
  // Clearance
  clearedAt: DateTime
  clearedBy: UUID
  
  // Holds & Queries
  holds: CustomsHold[]
  queries: CustomsQuery[]
}
```

### Customs Status Machine

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

## 6. Operational Scan Events

### Scan Event Types

```
SCAN_PICKUP
  - timestamp
  - location
  - driver_id
  - vehicle_id
  - house_awb_id

SCAN_ARRIVAL_AT_WAREHOUSE
  - timestamp
  - warehouse_id
  - house_awb_id
  - received_by
  - condition_check

SCAN_CONSOLIDATION
  - timestamp
  - warehouse_id
  - master_awb_id
  - house_awbs_consolidated
  - total_weight
  - total_volume

SCAN_MANIFESTING
  - timestamp
  - warehouse_id
  - manifest_number
  - airline
  - flight_number
  - departure_time

SCAN_LOADING_TO_AIRLINE
  - timestamp
  - warehouse_id
  - airline_id
  - flight_number
  - cargo_weight
  - cargo_volume

SCAN_DEPARTURE
  - timestamp
  - origin_station
  - destination_station
  - airline
  - flight_number

SCAN_ARRIVAL_AT_HUB
  - timestamp
  - hub_station
  - master_awb_id
  - house_awbs
  - cargo_condition

SCAN_CUSTOMS_SUBMISSION
  - timestamp
  - hub_station
  - customs_declaration_id
  - submitted_by

SCAN_CUSTOMS_CLEARANCE
  - timestamp
  - hub_station
  - customs_declaration_id
  - cleared_by

SCAN_WAREHOUSE_RELEASE
  - timestamp
  - warehouse_id
  - house_awb_id
  - released_by

SCAN_OUT_FOR_DELIVERY
  - timestamp
  - driver_id
  - vehicle_id
  - house_awb_id

SCAN_DELIVERY
  - timestamp
  - recipient_location
  - house_awb_id
  - recipient_signature
  - delivery_notes

SCAN_RETURN_TO_WAREHOUSE
  - timestamp
  - warehouse_id
  - house_awb_id
  - return_reason
```

---

## 7. Billing Lifecycle - Multi-Currency

### Billing Charges

```
PICKUP_FEE
  - amount
  - currency
  - applied_at: PICKED_UP

CONSOLIDATION_FEE
  - amount
  - currency
  - applied_at: CONSOLIDATED

CUSTOMS_CLEARANCE_FEE
  - amount
  - currency
  - applied_at: CUSTOMS_CLEARED

STORAGE_FEE
  - amount_per_day
  - currency
  - days_stored
  - applied_at: WAREHOUSE_STORED

HANDLING_FEE
  - amount
  - currency
  - applied_at: MANIFESTED

AIRLINE_FREIGHT_CHARGE
  - amount
  - currency
  - weight_charge
  - volume_charge
  - applied_at: LOADED_TO_AIRLINE

DELIVERY_FEE
  - amount
  - currency
  - applied_at: OUT_FOR_DELIVERY

SURCHARGE
  - amount
  - currency
  - reason (delay, exception, etc)
  - applied_at: varies

REFUND
  - amount
  - currency
  - reason
  - applied_at: varies

EXCHANGE_RATE_SNAPSHOT
  - from_currency
  - to_currency
  - rate
  - timestamp
  - applied_to_charges
```

### Billing Status with Partial Payments

```
BillingRecord {
  id: UUID
  houseAWBId: UUID
  
  // Charges
  charges: BillingCharge[]
  totalAmount: number
  totalCurrency: string
  
  // Payments
  payments: Payment[]
  paidAmount: number
  remainingAmount: number
  
  // Status
  status: BillingStatus
  
  // Exchange rates
  exchangeRateSnapshots: ExchangeRateSnapshot[]
  
  // Timeline
  invoicedAt: DateTime
  firstPaymentAt: DateTime
  lastPaymentAt: DateTime
  fullyPaidAt: DateTime
}

Payment {
  id: UUID
  billingRecordId: UUID
  amount: number
  currency: string
  paymentMethod: string
  paymentDate: DateTime
  reference: string
  exchangeRate: number
}
```

---

## 8. Airline & Flight Concepts

### Airline

```
Airline {
  id: UUID
  organizationId: UUID
  name: string
  iataCode: string
  icaoCode: string
  status: "ACTIVE" | "INACTIVE"
  
  // Capacity
  standardCapacity: number (kg)
  premiumCapacity: number (kg)
  
  // Rates
  standardRate: number (per kg)
  premiumRate: number (per kg)
  
  // Contacts
  contacts: Contact[]
  
  // Agreements
  agreements: AirlineAgreement[]
}
```

### Flight

```
Flight {
  id: UUID
  organizationId: UUID
  airlineId: UUID
  
  // Flight details
  flightNumber: string
  aircraftType: string
  
  // Route
  originStationId: UUID
  destinationStationId: UUID
  
  // Schedule
  departureTime: DateTime
  arrivalTime: DateTime
  
  // Capacity
  totalCapacity: number (kg)
  availableCapacity: number (kg)
  bookedCapacity: number (kg)
  
  // Status
  status: "SCHEDULED" | "CONFIRMED" | "DEPARTED" | "ARRIVED" | "CANCELLED"
  
  // Manifest
  manifests: Manifest[]
}
```

---

## 9. Manifest Concepts

### Manifest

```
Manifest {
  id: UUID
  organizationId: UUID
  flightId: UUID
  
  // Manifest details
  manifestNumber: string
  manifestType: "EXPORT" | "IMPORT"
  
  // Cargo
  masterAWBs: MasterAWB[]
  totalWeight: number
  totalVolume: number
  totalPieces: number
  
  // Status
  status: ManifestStatus
  
  // Submission
  submittedAt: DateTime
  submittedBy: UUID
  
  // Airline
  airlineConfirmedAt: DateTime
  airlineConfirmedBy: UUID
  
  // Departure
  departedAt: DateTime
  
  // Arrival
  arrivedAt: DateTime
  
  // Customs
  customsSubmittedAt: DateTime
  customsApprovedAt: DateTime
}
```

### Manifest Status

```
MANIFEST_CREATED
  ↓
MANIFEST_SUBMITTED_TO_AIRLINE
  ↓
MANIFEST_CONFIRMED_BY_AIRLINE
  ↓
MANIFEST_LOADED_TO_AIRCRAFT
  ↓
MANIFEST_DEPARTED
  ↓
MANIFEST_ARRIVED
  ↓
MANIFEST_SUBMITTED_TO_CUSTOMS
  ↓
MANIFEST_CUSTOMS_APPROVED
  ↓
MANIFEST_CLOSED
```

---

## 10. Shipment State vs Warehouse State

### Shipment State (HouseAWB)

```
Tracks the shipment's journey:
- EXPORT_CREATED
- EXPORT_PICKUP
- EXPORT_AT_ORIGIN_WAREHOUSE
- EXPORT_CONSOLIDATED
- EXPORT_CUSTOMS_DECLARATION
- EXPORT_UNDER_CLEARANCE
- EXPORT_CLEARED
- EXPORT_RELEASED
- EXPORT_MANIFESTED
- EXPORT_LOADED_TO_AIRLINE
- EXPORT_IN_TRANSIT
- IMPORT_ARRIVED_AT_HUB
- IMPORT_CUSTOMS_DECLARATION
- IMPORT_UNDER_CLEARANCE
- IMPORT_CLEARED
- IMPORT_RELEASED
- IMPORT_AT_DESTINATION_WAREHOUSE
- IMPORT_READY_FOR_DELIVERY
- IMPORT_OUT_FOR_DELIVERY
- IMPORT_DELIVERED
- IMPORT_SIGNED
```

### Warehouse State (WarehouseInventory)

```
Tracks the cargo's location and status:
- RECEIVED (at warehouse)
- STORED (in inventory)
- CONSOLIDATED (added to Master AWB)
- MANIFESTED (added to manifest)
- READY_FOR_DISPATCH (prepared for shipment)
- DISPATCHED (left warehouse)
- HELD (customs/payment hold)
- EXCEPTION (damage/loss)
```

**Key Difference**: A shipment can be IN_TRANSIT while its warehouse state is DISPATCHED. The warehouse state tracks physical location, the shipment state tracks business process.

---

## 11. Event Types (40+)

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

### Scan Events (10)
- SCAN_PICKUP
- SCAN_ARRIVAL_AT_WAREHOUSE
- SCAN_CONSOLIDATION
- SCAN_MANIFESTING
- SCAN_LOADING_TO_AIRLINE
- SCAN_DEPARTURE
- SCAN_ARRIVAL_AT_HUB
- SCAN_CUSTOMS_SUBMISSION
- SCAN_CUSTOMS_CLEARANCE
- SCAN_DELIVERY

---

## 12. Role Responsibilities

### Freight Forwarder (Origin)
- Create export shipments
- Arrange pickup
- Consolidate shipments
- Submit customs declarations
- Arrange airline bookings
- Manage manifests

### Customs Broker
- Submit customs declarations
- Respond to customs queries
- Manage customs holds
- Obtain customs clearance
- Manage regulatory compliance

### Warehouse Manager (Hub)
- Receive cargo
- Store cargo
- Consolidate shipments
- Create manifests
- Manage inventory
- Release cargo

### Airline Coordinator
- Confirm flight bookings
- Manage manifests
- Coordinate loading
- Track flights
- Manage capacity

### Delivery Partner
- Receive cargo at destination
- Manage final delivery
- Collect signatures
- Handle exceptions
- Report delivery status

### Billing Officer
- Generate invoices
- Record payments
- Manage refunds
- Handle disputes
- Track exchange rates

### Admin
- Configure all operations
- Manage users
- Override system rules
- Generate reports

---

## 13. Implementation Roadmap

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

## 14. Key Design Principles

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
