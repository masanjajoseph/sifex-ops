# Phase 2: Domain Architecture - Cargo ERP Operational Core

**Status**: Design Phase  
**Date**: May 25, 2026  
**Focus**: Centralized shipment workflow architecture (NO UI implementation)

---

## Executive Summary

This document defines the operational core of Sifex ERP. It replaces boolean-based state tracking with:
- Centralized status machines
- Event sourcing patterns
- Workflow transition rules
- Timeline-based tracking
- Audit-driven accountability

**Core Principle**: Every state change is an event. Every event is auditable. Every transition is validated.

---

## 1. Entity Relationships & Hierarchy

### Shipment Hierarchy

```
Organization
  └── Warehouse (origin/destination)
      └── Shipment (root aggregate)
          ├── ShipmentStatus (current state)
          ├── ShipmentTimeline (event history)
          ├── ShipmentItems (cargo contents)
          ├── ShipmentTracking (location/movement)
          ├── ShipmentDelivery (assignment/completion)
          ├── ShipmentBilling (charges/payments)
          └── ShipmentAudit (all changes)
```

### Core Entities

| Entity | Purpose | Lifecycle |
|--------|---------|-----------|
| **Shipment** | Root aggregate for cargo movement | Created → Delivered → Archived |
| **ShipmentStatus** | Current operational state | Mutable, versioned |
| **ShipmentTimeline** | Immutable event log | Append-only |
| **ShipmentTracking** | Location/movement history | Immutable records |
| **ShipmentDelivery** | Assignment & completion | Mutable until signed |
| **ShipmentBilling** | Charges & payment state | Mutable until finalized |
| **ShipmentAudit** | All changes with user/timestamp | Immutable |

---

## 2. Shipment Lifecycle State Machine

### Valid Status Transitions

```
CREATED
  ↓
PENDING_PICKUP
  ├─→ PICKED_UP
  │     ↓
  │   IN_TRANSIT
  │     ├─→ AT_WAREHOUSE (intermediate stops)
  │     │     ↓
  │     │   IN_TRANSIT (resume)
  │     └─→ OUT_FOR_DELIVERY
  │           ↓
  │         DELIVERED
  │           ├─→ SIGNED (delivery confirmed)
  │           └─→ PENDING_RETURN (if rejected)
  │
  ├─→ CANCELLED (from CREATED/PENDING_PICKUP)
  │
  └─→ EXCEPTION
        ├─→ LOST
        ├─→ DAMAGED
        └─→ RETURNED_TO_SENDER
```

### Status Definitions

| Status | Meaning | Warehouse Role | Driver Role | Billing Impact |
|--------|---------|-----------------|-------------|-----------------|
| **CREATED** | Shipment registered | Can edit | N/A | No charge |
| **PENDING_PICKUP** | Awaiting collection | Ready for pickup | Assigned | Pickup fee pending |
| **PICKED_UP** | Collected from origin | Confirmed | Confirmed | Pickup fee charged |
| **IN_TRANSIT** | Moving to destination | Tracking | Active | Transit fee pending |
| **AT_WAREHOUSE** | Intermediate stop | Received/stored | Waiting | Storage fee pending |
| **OUT_FOR_DELIVERY** | Final leg to recipient | Handed to driver | Active | Delivery fee pending |
| **DELIVERED** | Reached recipient | Confirmed | Confirmed | Delivery fee charged |
| **SIGNED** | Recipient confirmed | Archived | Completed | All fees finalized |
| **CANCELLED** | Aborted before pickup | Archived | N/A | Cancellation fee |
| **EXCEPTION** | Lost/damaged/returned | Investigation | Reported | Claim processing |

---

## 3. Workflow Transition Engine

### Transition Rules

```typescript
// Allowed transitions with validation
CREATED → PENDING_PICKUP
  - Requires: valid recipient address
  - Requires: shipment items listed
  - Requires: origin warehouse assigned
  - Audit: "Shipment ready for pickup"

PENDING_PICKUP → PICKED_UP
  - Requires: driver assigned
  - Requires: vehicle assigned
  - Requires: pickup timestamp
  - Audit: "Shipment picked up by [driver]"

PICKED_UP → IN_TRANSIT
  - Requires: route assigned
  - Requires: departure timestamp
  - Audit: "Shipment departed warehouse"

IN_TRANSIT → AT_WAREHOUSE
  - Requires: intermediate warehouse
  - Requires: arrival timestamp
  - Audit: "Shipment arrived at [warehouse]"

AT_WAREHOUSE → IN_TRANSIT
  - Requires: departure timestamp
  - Audit: "Shipment left [warehouse]"

IN_TRANSIT → OUT_FOR_DELIVERY
  - Requires: final delivery address confirmed
  - Requires: delivery driver assigned
  - Audit: "Shipment out for delivery"

OUT_FOR_DELIVERY → DELIVERED
  - Requires: delivery timestamp
  - Requires: recipient signature (optional)
  - Audit: "Shipment delivered"

DELIVERED → SIGNED
  - Requires: recipient confirmation
  - Audit: "Delivery confirmed by recipient"

CREATED/PENDING_PICKUP → CANCELLED
  - Requires: cancellation reason
  - Audit: "Shipment cancelled: [reason]"

ANY → EXCEPTION
  - Requires: exception type (LOST/DAMAGED/RETURNED)
  - Requires: incident report
  - Audit: "Exception reported: [type]"
```

### Invalid Transitions (Blocked)

```
PICKED_UP → CREATED (cannot uncollect)
DELIVERED → PENDING_PICKUP (cannot restart)
SIGNED → DELIVERED (cannot unsign)
EXCEPTION → IN_TRANSIT (must resolve first)
CANCELLED → PENDING_PICKUP (cannot resurrect)
```

---

## 4. Warehouse Lifecycle State Machine

### Warehouse States

```
ACTIVE
  ├─→ MAINTENANCE (temporary closure)
  │     └─→ ACTIVE
  └─→ INACTIVE (permanent closure)

MAINTENANCE
  - Shipments cannot be picked up
  - Shipments cannot be received
  - Existing shipments continue tracking
  - Billing paused for new operations
```

### Warehouse Responsibilities

| Role | Responsibility | Triggers |
|------|-----------------|----------|
| **Origin Warehouse** | Validate shipment | CREATED → PENDING_PICKUP |
| | Confirm pickup | PENDING_PICKUP → PICKED_UP |
| | Record departure | PICKED_UP → IN_TRANSIT |
| **Transit Warehouse** | Receive shipment | IN_TRANSIT → AT_WAREHOUSE |
| | Store shipment | AT_WAREHOUSE state |
| | Confirm departure | AT_WAREHOUSE → IN_TRANSIT |
| **Destination Warehouse** | Receive shipment | IN_TRANSIT → OUT_FOR_DELIVERY |
| | Assign delivery driver | OUT_FOR_DELIVERY state |
| | Confirm delivery | OUT_FOR_DELIVERY → DELIVERED |

---

## 5. Delivery Assignment Lifecycle

### Delivery States

```
UNASSIGNED
  ↓
ASSIGNED (driver + vehicle)
  ↓
IN_PROGRESS (driver started route)
  ├─→ COMPLETED (delivered)
  │     ├─→ SIGNED (recipient confirmed)
  │     └─→ PENDING_RETURN (rejected)
  │
  └─→ FAILED (exception)
        ├─→ REATTEMPT
        └─→ RETURN_TO_WAREHOUSE
```

### Delivery Assignment Rules

```
- One shipment = one delivery assignment
- One driver = multiple shipments per route
- One vehicle = multiple drivers per day
- Assignment locked once IN_PROGRESS
- Cannot reassign after COMPLETED
- Reattempt creates new assignment
```

---

## 6. Billing State Machine

### Billing Lifecycle

```
NOT_BILLED
  ↓
PENDING (charges calculated)
  ├─→ INVOICED (sent to customer)
  │     ├─→ PAID (payment received)
  │     └─→ OVERDUE (payment late)
  │
  └─→ CANCELLED (shipment cancelled)
```

### Billing Triggers

| Event | Charge | Status |
|-------|--------|--------|
| PICKED_UP | Pickup fee | PENDING |
| IN_TRANSIT | Transit fee | PENDING |
| AT_WAREHOUSE | Storage fee (per day) | PENDING |
| OUT_FOR_DELIVERY | Delivery fee | PENDING |
| DELIVERED | Surcharge (if applicable) | PENDING |
| SIGNED | Finalize all charges | INVOICED |
| EXCEPTION | Claim fee | PENDING |
| CANCELLED | Cancellation fee | INVOICED |

### Billing Rules

```
- Charges accumulate until SIGNED
- Storage fees calculated daily
- Surcharges applied for delays
- Exceptions trigger claim processing
- Cancellation fees non-refundable
- Payment deadline: 30 days from invoice
```

---

## 7. Audit & Event Engine

### Event Types

```
SHIPMENT_CREATED
SHIPMENT_UPDATED
SHIPMENT_STATUS_CHANGED
SHIPMENT_PICKED_UP
SHIPMENT_IN_TRANSIT
SHIPMENT_AT_WAREHOUSE
SHIPMENT_OUT_FOR_DELIVERY
SHIPMENT_DELIVERED
SHIPMENT_SIGNED
SHIPMENT_CANCELLED
SHIPMENT_EXCEPTION_REPORTED
DELIVERY_ASSIGNED
DELIVERY_STARTED
DELIVERY_COMPLETED
DELIVERY_FAILED
BILLING_CHARGED
BILLING_INVOICED
BILLING_PAID
WAREHOUSE_RECEIVED
WAREHOUSE_STORED
WAREHOUSE_DISPATCHED
USER_ACTION (generic)
```

### Audit Record Structure

```typescript
{
  id: UUID
  shipmentId: UUID
  eventType: EventType
  timestamp: ISO8601
  userId: UUID
  userRole: Role
  action: string
  previousState: object
  newState: object
  metadata: {
    ipAddress: string
    userAgent: string
    location: string
  }
  signature: string (for compliance)
}
```

### Audit Triggers

```
- Every status transition
- Every user action
- Every billing event
- Every delivery assignment
- Every warehouse operation
- Every exception reported
- Every payment received
```

---

## 8. Tracking Timeline Architecture

### Timeline Events

```
CREATED
  └─ timestamp, location, warehouse

PICKED_UP
  └─ timestamp, driver, vehicle, location

DEPARTED
  └─ timestamp, route, location

ARRIVED_AT_WAREHOUSE
  └─ timestamp, warehouse, location

DEPARTED_WAREHOUSE
  └─ timestamp, warehouse, location

OUT_FOR_DELIVERY
  └─ timestamp, driver, vehicle, location

DELIVERED
  └─ timestamp, recipient, location, signature

EXCEPTION
  └─ timestamp, type, location, report
```

### Timeline Visibility Rules

```
CUSTOMER (shipper/recipient)
  - Can see: CREATED, PICKED_UP, IN_TRANSIT, DELIVERED, SIGNED, EXCEPTION
  - Cannot see: warehouse internal movements, billing details

WAREHOUSE_STAFF
  - Can see: all events at their warehouse
  - Cannot see: other warehouse operations, billing details

DRIVER
  - Can see: assigned shipments, current location, next stops
  - Cannot see: billing, other drivers' routes

ADMIN
  - Can see: all events, all details, all history

BILLING_STAFF
  - Can see: billing events, delivery confirmations
  - Cannot see: internal warehouse operations
```

---

## 9. Notification Event Architecture

### Event-Driven Notifications

```
SHIPMENT_CREATED
  → Send to: Warehouse staff
  → Message: "New shipment [ID] ready for pickup"

PICKED_UP
  → Send to: Customer, Warehouse
  → Message: "Your shipment has been picked up"

IN_TRANSIT
  → Send to: Customer
  → Message: "Your shipment is on the way"

AT_WAREHOUSE
  → Send to: Warehouse staff
  → Message: "Shipment [ID] arrived for storage"

OUT_FOR_DELIVERY
  → Send to: Customer
  → Message: "Your shipment is out for delivery today"

DELIVERED
  → Send to: Customer, Billing staff
  → Message: "Your shipment has been delivered"

SIGNED
  → Send to: Billing staff
  → Message: "Delivery confirmed, ready for billing"

EXCEPTION
  → Send to: Admin, Customer
  → Message: "Issue with shipment [ID]: [type]"

PAYMENT_RECEIVED
  → Send to: Customer
  → Message: "Payment received for shipment [ID]"
```

---

## 10. Station Responsibilities

### Origin Warehouse

**Responsibilities**:
- Validate shipment details
- Confirm pickup readiness
- Assign pickup driver
- Record pickup timestamp
- Update shipment status to PICKED_UP
- Generate pickup receipt

**Cannot Do**:
- Modify shipment after PICKED_UP
- Cancel shipment after PICKED_UP
- Change delivery address

### Transit Warehouse

**Responsibilities**:
- Receive shipment
- Verify contents
- Store shipment
- Calculate storage fees
- Assign next leg driver
- Record departure timestamp

**Cannot Do**:
- Modify delivery address
- Change billing
- Reassign without reason

### Destination Warehouse

**Responsibilities**:
- Receive shipment
- Verify contents
- Assign delivery driver
- Track delivery attempts
- Record delivery confirmation
- Collect recipient signature

**Cannot Do**:
- Modify shipment details
- Change billing
- Extend delivery deadline

---

## 11. Role Responsibilities

### Warehouse Manager

**Can**:
- View all shipments at warehouse
- Assign drivers
- Confirm pickups/deliveries
- Report exceptions
- View warehouse analytics

**Cannot**:
- Modify billing
- Cancel shipments
- Override system rules

### Driver

**Can**:
- View assigned shipments
- Update delivery status
- Collect signatures
- Report delivery issues
- View route optimization

**Cannot**:
- Modify shipment details
- Change delivery address
- Access other drivers' data

### Billing Officer

**Can**:
- View billing status
- Generate invoices
- Record payments
- View billing history
- Generate reports

**Cannot**:
- Modify shipment status
- Change delivery assignments
- Override warehouse operations

### Customer Service

**Can**:
- View shipment status
- Respond to customer inquiries
- Report issues
- View tracking history

**Cannot**:
- Modify shipment details
- Change billing
- Assign drivers

### Admin

**Can**:
- Do everything
- Override system rules (with audit)
- Configure workflows
- Manage users

---

## 12. Offline Sync Strategy

### Offline-First Architecture

```
LOCAL STATE (Device)
  ├─ Shipment cache
  ├─ Delivery assignments
  ├─ Tracking events
  └─ Pending actions queue

SYNC PROCESS
  1. Queue all actions locally
  2. When online: sync to server
  3. Server validates transitions
  4. Server returns confirmation
  5. Local state updated
  6. Conflict resolution if needed
```

### Conflict Resolution

```
SCENARIO: Driver updates delivery status offline, then goes online

1. Local: DELIVERED (timestamp: 14:30)
2. Server: OUT_FOR_DELIVERY (last update: 14:00)
3. Resolution: Accept local (newer timestamp)
4. Server updates to DELIVERED
5. Audit records both events

SCENARIO: Two drivers update same shipment

1. Driver A: DELIVERED (14:30)
2. Driver B: DELIVERED (14:31)
3. Resolution: Accept first (14:30)
4. Reject second with conflict error
5. Driver B must retry
```

### Sync Priorities

```
HIGH PRIORITY (sync immediately)
- Status changes
- Delivery confirmations
- Exception reports
- Payment receipts

MEDIUM PRIORITY (sync within 5 minutes)
- Location updates
- Route changes
- Warehouse movements

LOW PRIORITY (sync within 1 hour)
- Analytics data
- Performance metrics
- Non-critical updates
```

---

## 13. Scaling Strategy

### Horizontal Scaling

```
SHIPMENT SERVICE
  - Stateless service
  - Scales by shipment volume
  - Load balanced

WAREHOUSE SERVICE
  - Per-warehouse instance
  - Scales by warehouse count
  - Regional deployment

DELIVERY SERVICE
  - Per-region instance
  - Scales by delivery volume
  - Route optimization

BILLING SERVICE
  - Centralized
  - Scales by invoice volume
  - Batch processing
```

### Data Partitioning

```
BY WAREHOUSE
  - Origin warehouse ID = partition key
  - Enables regional scaling
  - Reduces cross-region traffic

BY TIME
  - Shipment created date = partition key
  - Enables archive strategy
  - Improves query performance

BY CUSTOMER
  - Customer ID = partition key
  - Enables customer-specific scaling
  - Improves data locality
```

### Caching Strategy

```
CACHE LAYER
  - Shipment status (TTL: 5 minutes)
  - Warehouse info (TTL: 1 hour)
  - Driver assignments (TTL: 1 minute)
  - Billing rates (TTL: 24 hours)

INVALIDATION
  - Status change → invalidate shipment cache
  - Assignment change → invalidate driver cache
  - Rate change → invalidate billing cache
```

### Event Sourcing for Audit

```
IMMUTABLE EVENT LOG
  - All events stored permanently
  - Enables full audit trail
  - Enables event replay
  - Enables temporal queries

SNAPSHOT STRATEGY
  - Create snapshot every 100 events
  - Reduces replay time
  - Maintains audit integrity
```

---

## 14. Database Schema (Conceptual)

### Core Tables

```sql
-- Shipments (mutable)
shipments
  id, organization_id, origin_warehouse_id, destination_warehouse_id
  status, created_at, updated_at

-- Shipment Status History (immutable)
shipment_status_history
  id, shipment_id, old_status, new_status, timestamp, user_id

-- Shipment Timeline (immutable)
shipment_timeline
  id, shipment_id, event_type, timestamp, location, metadata

-- Shipment Tracking (immutable)
shipment_tracking
  id, shipment_id, latitude, longitude, timestamp, source

-- Shipment Delivery (mutable until signed)
shipment_delivery
  id, shipment_id, driver_id, vehicle_id, status, assigned_at

-- Shipment Billing (mutable until finalized)
shipment_billing
  id, shipment_id, status, total_amount, paid_amount, due_date

-- Audit Log (immutable)
audit_log
  id, shipment_id, event_type, user_id, timestamp, changes, signature
```

---

## 15. Implementation Roadmap

### Phase 2.1: Domain Engines (Week 1-2)
- [ ] Shipment Lifecycle Engine
- [ ] Workflow Transition Engine
- [ ] Status validation rules
- [ ] Event sourcing foundation

### Phase 2.2: Warehouse Operations (Week 2-3)
- [ ] Warehouse State Engine
- [ ] Delivery Assignment Engine
- [ ] Tracking Timeline Engine
- [ ] Offline sync strategy

### Phase 2.3: Billing & Audit (Week 3-4)
- [ ] Billing State Machine
- [ ] Audit/Event Engine
- [ ] Notification architecture
- [ ] Compliance logging

### Phase 2.4: Integration & Testing (Week 4-5)
- [ ] API endpoints for all engines
- [ ] Integration tests
- [ ] Performance testing
- [ ] Scaling validation

### Phase 2.5: UI Implementation (Week 5-6)
- [ ] Shipment dashboard
- [ ] Warehouse operations UI
- [ ] Delivery tracking UI
- [ ] Billing dashboard

---

## 16. Key Design Principles

1. **Event-Driven**: Every state change is an event
2. **Immutable History**: Timeline and audit logs are append-only
3. **Validated Transitions**: Only allowed transitions execute
4. **Audit Everything**: Every action is recorded with user/timestamp
5. **Offline-First**: Works without connectivity
6. **Scalable**: Horizontal scaling by warehouse/region
7. **Compliant**: Full audit trail for regulatory requirements
8. **User-Centric**: Visibility rules by role
9. **Resilient**: Handles failures gracefully
10. **Observable**: All events are trackable

---

## 17. Success Metrics

- [ ] All status transitions validated
- [ ] Zero invalid state transitions
- [ ] 100% audit coverage
- [ ] <100ms status update latency
- [ ] <5 minute offline sync time
- [ ] Zero data loss on sync
- [ ] Full compliance audit trail
- [ ] Role-based visibility enforced

---

**Document Status**: COMPLETE - Ready for Implementation  
**Next Step**: Implement Domain Engines (Phase 2.1)
