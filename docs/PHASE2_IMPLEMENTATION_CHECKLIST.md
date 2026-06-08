# Phase 2: Implementation Checklist & Reference Guide

**Purpose**: Single source of truth for Phase 2 implementation  
**Status**: Ready for development  
**Last Updated**: May 25, 2026

---

## Quick Reference: Core Entities

| Entity | Purpose | Lifecycle | Mutable |
|--------|---------|-----------|---------|
| **Shipment** | Root aggregate | CREATED → SIGNED | Until SIGNED |
| **ShipmentStatus** | Current state | Versioned | Yes |
| **ShipmentTimeline** | Event log | Append-only | No |
| **ShipmentTracking** | Location history | Append-only | No |
| **ShipmentDelivery** | Assignment | UNASSIGNED → SIGNED | Until SIGNED |
| **ShipmentBilling** | Charges | NOT_BILLED → PAID | Until PAID |
| **ShipmentAudit** | All changes | Append-only | No |
| **Warehouse** | Location | ACTIVE/MAINTENANCE/INACTIVE | Yes |

---

## Quick Reference: Status Enums

### ShipmentStatus (10 states)
```
CREATED → PENDING_PICKUP → PICKED_UP → IN_TRANSIT → 
  [AT_WAREHOUSE] → OUT_FOR_DELIVERY → DELIVERED → SIGNED

EXCEPTION (from any state)
CANCELLED (from CREATED/PENDING_PICKUP)
```

### DeliveryStatus (8 states)
```
UNASSIGNED → ASSIGNED → IN_PROGRESS → COMPLETED → SIGNED
                                    ↓
                                  FAILED → REATTEMPT → IN_PROGRESS
                                    ↓
                            RETURN_TO_WAREHOUSE
```

### BillingStatus (6 states)
```
NOT_BILLED → PENDING → INVOICED → PAID
                    ↓
                 CANCELLED

INVOICED → OVERDUE → PAID
```

### WarehouseStatus (3 states)
```
ACTIVE ↔ MAINTENANCE
  ↓
INACTIVE
```

---

## Quick Reference: Transition Rules

### Shipment Transitions (15+ allowed)

| From | To | Required Fields | Required Role | Audit Event |
|------|----|-----------------|----|---|
| CREATED | PENDING_PICKUP | recipientAddress, items | WAREHOUSE_MANAGER | SHIPMENT_UPDATED |
| CREATED | CANCELLED | reason | WAREHOUSE_MANAGER | SHIPMENT_CANCELLED |
| PENDING_PICKUP | PICKED_UP | driverId, vehicleId | DRIVER | SHIPMENT_PICKED_UP |
| PICKED_UP | IN_TRANSIT | departureTimestamp, route | DRIVER | SHIPMENT_IN_TRANSIT |
| IN_TRANSIT | AT_WAREHOUSE | warehouseId, arrivalTimestamp | WAREHOUSE_MANAGER | SHIPMENT_AT_WAREHOUSE |
| AT_WAREHOUSE | IN_TRANSIT | departureTimestamp | WAREHOUSE_MANAGER | WAREHOUSE_DISPATCHED |
| IN_TRANSIT | OUT_FOR_DELIVERY | deliveryDriverId | WAREHOUSE_MANAGER | SHIPMENT_OUT_FOR_DELIVERY |
| OUT_FOR_DELIVERY | DELIVERED | deliveryTimestamp | DRIVER | SHIPMENT_DELIVERED |
| DELIVERED | SIGNED | recipientSignature | DRIVER | SHIPMENT_SIGNED |
| ANY | EXCEPTION | exceptionType, incidentReport | WAREHOUSE_MANAGER | SHIPMENT_EXCEPTION_REPORTED |

### Delivery Transitions (8+ allowed)

| From | To | Required Fields | Required Role | Audit Event |
|------|----|-----------------|----|---|
| UNASSIGNED | ASSIGNED | driverId, vehicleId | WAREHOUSE_MANAGER | DELIVERY_ASSIGNED |
| ASSIGNED | IN_PROGRESS | startTimestamp | DRIVER | DELIVERY_STARTED |
| IN_PROGRESS | COMPLETED | completionTimestamp | DRIVER | DELIVERY_COMPLETED |
| IN_PROGRESS | FAILED | failureReason | DRIVER | DELIVERY_FAILED |
| COMPLETED | SIGNED | recipientSignature | DRIVER | DELIVERY_COMPLETED |
| FAILED | REATTEMPT | nextAttemptTime | WAREHOUSE_MANAGER | DELIVERY_ASSIGNED |
| FAILED | RETURN_TO_WAREHOUSE | returnReason | WAREHOUSE_MANAGER | DELIVERY_FAILED |
| REATTEMPT | IN_PROGRESS | startTimestamp | DRIVER | DELIVERY_STARTED |

### Billing Transitions (6+ allowed)

| From | To | Required Fields | Required Role | Audit Event |
|------|----|-----------------|----|---|
| NOT_BILLED | PENDING | charges | BILLING_OFFICER | BILLING_CHARGED |
| PENDING | INVOICED | invoiceNumber | BILLING_OFFICER | BILLING_INVOICED |
| INVOICED | PAID | paymentAmount | BILLING_OFFICER | BILLING_PAID |
| INVOICED | OVERDUE | (automatic) | ADMIN | USER_ACTION |
| OVERDUE | PAID | paymentAmount | BILLING_OFFICER | BILLING_PAID |
| PENDING | CANCELLED | cancellationReason | BILLING_OFFICER | USER_ACTION |

---

## Quick Reference: Billing Charges

| Event | Charge Type | Amount | When Applied |
|-------|-------------|--------|---------------|
| PICKED_UP | PICKUP | Weight × Rate | Immediately |
| IN_TRANSIT | TRANSIT | Distance × Rate | Immediately |
| AT_WAREHOUSE | STORAGE | Daily × Days | Per day |
| OUT_FOR_DELIVERY | DELIVERY | Distance × Rate | Immediately |
| DELIVERED | SURCHARGE | Calculated | If applicable |
| SIGNED | FINALIZE | All charges | On signature |
| EXCEPTION | CLAIM | Calculated | On exception |
| CANCELLED | CANCELLATION | Fixed fee | On cancellation |

---

## Quick Reference: Event Types (20+)

### Shipment Events
- SHIPMENT_CREATED
- SHIPMENT_UPDATED
- SHIPMENT_STATUS_CHANGED
- SHIPMENT_PICKED_UP
- SHIPMENT_IN_TRANSIT
- SHIPMENT_AT_WAREHOUSE
- SHIPMENT_OUT_FOR_DELIVERY
- SHIPMENT_DELIVERED
- SHIPMENT_SIGNED
- SHIPMENT_CANCELLED
- SHIPMENT_EXCEPTION_REPORTED

### Delivery Events
- DELIVERY_ASSIGNED
- DELIVERY_STARTED
- DELIVERY_COMPLETED
- DELIVERY_FAILED

### Billing Events
- BILLING_CHARGED
- BILLING_INVOICED
- BILLING_PAID

### Warehouse Events
- WAREHOUSE_RECEIVED
- WAREHOUSE_STORED
- WAREHOUSE_DISPATCHED

### Generic
- USER_ACTION

---

## Quick Reference: Role Permissions

### ADMIN
✅ Can do everything  
✅ Can override system rules (with audit)  
✅ Can configure workflows  
✅ Can manage users  

### WAREHOUSE_MANAGER
✅ View all shipments at warehouse  
✅ Assign drivers  
✅ Confirm pickups/deliveries  
✅ Report exceptions  
✅ View warehouse analytics  
❌ Cannot modify billing  
❌ Cannot cancel shipments  

### DRIVER
✅ View assigned shipments  
✅ Update delivery status  
✅ Collect signatures  
✅ Report delivery issues  
✅ View route optimization  
❌ Cannot modify shipment details  
❌ Cannot change delivery address  

### BILLING_OFFICER
✅ View billing status  
✅ Generate invoices  
✅ Record payments  
✅ View billing history  
✅ Generate reports  
❌ Cannot modify shipment status  
❌ Cannot change delivery assignments  

### CUSTOMER_SERVICE
✅ View shipment status  
✅ Respond to inquiries  
✅ Report issues  
✅ View tracking history  
❌ Cannot modify shipment details  
❌ Cannot change billing  

### CUSTOMER
✅ View own shipments  
✅ View tracking  
✅ Confirm delivery  
✅ Report issues  
❌ Cannot modify anything  

---

## Quick Reference: Visibility Rules

### CUSTOMER (Shipper/Recipient)
Can see:
- CREATED
- PICKED_UP
- IN_TRANSIT
- DELIVERED
- SIGNED
- EXCEPTION

Cannot see:
- Warehouse internal movements
- Billing details
- Other customers' shipments

### WAREHOUSE_STAFF
Can see:
- All events at their warehouse
- Shipment details
- Delivery assignments

Cannot see:
- Other warehouse operations
- Billing details
- Customer contact info

### DRIVER
Can see:
- Assigned shipments
- Current location
- Next stops
- Route optimization

Cannot see:
- Billing
- Other drivers' routes
- Customer contact info

### BILLING_STAFF
Can see:
- Billing events
- Delivery confirmations
- Invoice history
- Payment records

Cannot see:
- Internal warehouse operations
- Driver locations
- Customer contact info

### ADMIN
Can see:
- Everything
- All details
- All history
- All users

---

## Quick Reference: Offline Sync

### Sync Process
1. Queue all actions locally
2. When online: sync to server
3. Server validates transitions
4. Server returns confirmation
5. Local state updated
6. Conflict resolution if needed

### Conflict Resolution
```
LOCAL: DELIVERED (14:30)
SERVER: OUT_FOR_DELIVERY (14:00)
RESOLUTION: Accept local (newer timestamp)
```

### Sync Priorities
- **HIGH**: Status changes, confirmations, exceptions, payments (immediate)
- **MEDIUM**: Location updates, route changes, movements (5 min)
- **LOW**: Analytics, metrics, non-critical (1 hour)

---

## Quick Reference: Notification Events

| Event | Recipient | Message |
|-------|-----------|---------|
| SHIPMENT_CREATED | Warehouse | "New shipment [ID] ready for pickup" |
| SHIPMENT_PICKED_UP | Customer | "Your shipment has been picked up" |
| SHIPMENT_IN_TRANSIT | Customer | "Your shipment is on the way" |
| SHIPMENT_AT_WAREHOUSE | Warehouse | "Shipment [ID] arrived for storage" |
| SHIPMENT_OUT_FOR_DELIVERY | Customer | "Your shipment is out for delivery today" |
| SHIPMENT_DELIVERED | Customer | "Your shipment has been delivered" |
| SHIPMENT_SIGNED | Billing | "Delivery confirmed, ready for billing" |
| SHIPMENT_EXCEPTION | Admin | "Issue with shipment [ID]: [type]" |
| BILLING_INVOICED | Customer | "Invoice ready for payment" |
| BILLING_PAID | Billing | "Payment received for shipment [ID]" |

---

## Implementation Checklist: Phase 2.1 (Domain Engines)

### Week 1: Shipment Lifecycle Engine
- [ ] Create Shipment aggregate root
- [ ] Implement ShipmentStatus entity
- [ ] Create ShipmentTimeline (append-only)
- [ ] Implement status validation
- [ ] Create transition validator
- [ ] Write unit tests for transitions
- [ ] Document transition rules

### Week 2: Workflow Transition Engine
- [ ] Implement TransitionValidator class
- [ ] Create transition rule engine
- [ ] Implement role-based validation
- [ ] Create warehouse status validation
- [ ] Implement required field validation
- [ ] Create transition audit logging
- [ ] Write integration tests

---

## Implementation Checklist: Phase 2.2 (Warehouse Operations)

### Week 2-3: Warehouse State Engine
- [ ] Create Warehouse entity
- [ ] Implement warehouse status machine
- [ ] Create warehouse capacity tracking
- [ ] Implement warehouse operations
- [ ] Create warehouse audit logging
- [ ] Write warehouse tests

### Week 2-3: Delivery Assignment Engine
- [ ] Create DeliveryAssignment entity
- [ ] Implement delivery status machine
- [ ] Create driver assignment logic
- [ ] Implement route optimization
- [ ] Create delivery audit logging
- [ ] Write delivery tests

### Week 2-3: Tracking Timeline Engine
- [ ] Create ShipmentTracking entity
- [ ] Implement location tracking
- [ ] Create timeline events
- [ ] Implement visibility rules
- [ ] Create tracking audit logging
- [ ] Write tracking tests

### Week 3: Offline Sync Strategy
- [ ] Create PendingAction queue
- [ ] Implement sync engine
- [ ] Create conflict resolution
- [ ] Implement sync priorities
- [ ] Create sync audit logging
- [ ] Write sync tests

---

## Implementation Checklist: Phase 2.3 (Billing & Audit)

### Week 3-4: Billing State Machine
- [ ] Create BillingRecord entity
- [ ] Implement billing status machine
- [ ] Create charge calculation engine
- [ ] Implement invoice generation
- [ ] Create payment processing
- [ ] Create billing audit logging
- [ ] Write billing tests

### Week 3-4: Audit/Event Engine
- [ ] Create AuditLog entity
- [ ] Implement event sourcing
- [ ] Create event store
- [ ] Implement event replay
- [ ] Create compliance logging
- [ ] Create audit queries
- [ ] Write audit tests

### Week 4: Notification Architecture
- [ ] Create Notification entity
- [ ] Implement notification engine
- [ ] Create notification channels
- [ ] Implement notification queue
- [ ] Create notification audit logging
- [ ] Write notification tests

---

## Implementation Checklist: Phase 2.4 (Integration & Testing)

### Week 4-5: API Endpoints
- [ ] Create shipment endpoints
- [ ] Create delivery endpoints
- [ ] Create billing endpoints
- [ ] Create warehouse endpoints
- [ ] Create tracking endpoints
- [ ] Create audit endpoints
- [ ] Create notification endpoints

### Week 4-5: Integration Tests
- [ ] Test shipment lifecycle
- [ ] Test delivery workflow
- [ ] Test billing workflow
- [ ] Test warehouse operations
- [ ] Test offline sync
- [ ] Test notification system
- [ ] Test audit logging

### Week 5: Performance Testing
- [ ] Test status update latency
- [ ] Test sync performance
- [ ] Test query performance
- [ ] Test concurrent operations
- [ ] Test scaling limits
- [ ] Optimize bottlenecks

### Week 5: Scaling Validation
- [ ] Test horizontal scaling
- [ ] Test data partitioning
- [ ] Test caching strategy
- [ ] Test regional deployment
- [ ] Test failover scenarios

---

## Implementation Checklist: Phase 2.5 (UI Implementation)

### Week 5-6: Shipment Dashboard
- [ ] Create shipment list view
- [ ] Create shipment detail view
- [ ] Create shipment creation form
- [ ] Create status update UI
- [ ] Create tracking map
- [ ] Create shipment search

### Week 5-6: Warehouse Operations UI
- [ ] Create warehouse dashboard
- [ ] Create pickup management
- [ ] Create delivery assignment
- [ ] Create warehouse inventory
- [ ] Create warehouse analytics

### Week 5-6: Delivery Tracking UI
- [ ] Create driver dashboard
- [ ] Create route optimization
- [ ] Create delivery confirmation
- [ ] Create signature capture
- [ ] Create delivery history

### Week 5-6: Billing Dashboard
- [ ] Create billing overview
- [ ] Create invoice management
- [ ] Create payment tracking
- [ ] Create billing reports
- [ ] Create billing analytics

---

## Database Schema Reference

### Core Tables

```sql
-- Shipments (mutable)
shipments (
  id UUID PRIMARY KEY,
  organization_id UUID,
  origin_warehouse_id UUID,
  destination_warehouse_id UUID,
  status ShipmentStatus,
  tracking_number VARCHAR,
  customer_id UUID,
  recipient_name VARCHAR,
  recipient_address VARCHAR,
  recipient_phone VARCHAR,
  weight DECIMAL,
  dimensions JSON,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  picked_up_at TIMESTAMP,
  delivered_at TIMESTAMP,
  signed_at TIMESTAMP,
  cancelled_at TIMESTAMP
)

-- Shipment Status History (immutable)
shipment_status_history (
  id UUID PRIMARY KEY,
  shipment_id UUID,
  old_status ShipmentStatus,
  new_status ShipmentStatus,
  timestamp TIMESTAMP,
  user_id UUID,
  reason VARCHAR
)

-- Shipment Timeline (immutable)
shipment_timeline (
  id UUID PRIMARY KEY,
  shipment_id UUID,
  event_type EventType,
  timestamp TIMESTAMP,
  location JSON,
  metadata JSON
)

-- Shipment Tracking (immutable)
shipment_tracking (
  id UUID PRIMARY KEY,
  shipment_id UUID,
  latitude DECIMAL,
  longitude DECIMAL,
  timestamp TIMESTAMP,
  source VARCHAR,
  accuracy DECIMAL
)

-- Shipment Delivery (mutable until signed)
shipment_delivery (
  id UUID PRIMARY KEY,
  shipment_id UUID,
  driver_id UUID,
  vehicle_id UUID,
  status DeliveryStatus,
  assigned_at TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  recipient_signature VARCHAR,
  delivery_notes TEXT,
  attempt_number INT,
  max_attempts INT
)

-- Shipment Billing (mutable until finalized)
shipment_billing (
  id UUID PRIMARY KEY,
  shipment_id UUID,
  status BillingStatus,
  pickup_fee DECIMAL,
  transit_fee DECIMAL,
  storage_fee DECIMAL,
  delivery_fee DECIMAL,
  surcharges DECIMAL,
  total_amount DECIMAL,
  paid_amount DECIMAL,
  due_date TIMESTAMP,
  invoice_number VARCHAR,
  invoiced_at TIMESTAMP,
  paid_at TIMESTAMP
)

-- Audit Log (immutable)
audit_log (
  id UUID PRIMARY KEY,
  shipment_id UUID,
  event_type EventType,
  user_id UUID,
  user_role UserRole,
  timestamp TIMESTAMP,
  action VARCHAR,
  previous_state JSON,
  new_state JSON,
  metadata JSON,
  signature VARCHAR
)

-- Warehouses (mutable)
warehouses (
  id UUID PRIMARY KEY,
  organization_id UUID,
  name VARCHAR,
  status WarehouseStatus,
  address VARCHAR,
  latitude DECIMAL,
  longitude DECIMAL,
  capacity DECIMAL,
  current_load DECIMAL,
  manager_id UUID,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

---

## Key Files to Create

### Phase 2.1
- [ ] `lib/engines/shipment-lifecycle.ts` - Shipment state machine
- [ ] `lib/engines/workflow-transition.ts` - Transition validator
- [ ] `lib/event-store.ts` - Event sourcing foundation
- [ ] `services/shipment.ts` - Shipment service

### Phase 2.2
- [ ] `lib/engines/warehouse-state.ts` - Warehouse state machine
- [ ] `lib/engines/delivery-assignment.ts` - Delivery engine
- [ ] `lib/engines/tracking-timeline.ts` - Tracking engine
- [ ] `lib/offline-sync.ts` - Offline sync engine
- [ ] `services/warehouse.ts` - Warehouse service
- [ ] `services/delivery.ts` - Delivery service

### Phase 2.3
- [ ] `lib/engines/billing-state.ts` - Billing state machine
- [ ] `lib/engines/audit-event.ts` - Audit engine
- [ ] `lib/notification-engine.ts` - Notification engine
- [ ] `services/billing.ts` - Billing service
- [ ] `services/audit.ts` - Audit service

### Phase 2.4
- [ ] `app/api/shipments/route.ts` - Shipment API
- [ ] `app/api/deliveries/route.ts` - Delivery API
- [ ] `app/api/billing/route.ts` - Billing API
- [ ] `app/api/warehouses/route.ts` - Warehouse API
- [ ] `app/api/tracking/route.ts` - Tracking API
- [ ] `app/api/audit/route.ts` - Audit API

### Phase 2.5
- [ ] `app/(workspace)/shipments/page.tsx` - Shipment dashboard
- [ ] `app/(workspace)/warehouse/page.tsx` - Warehouse dashboard
- [ ] `app/(workspace)/delivery/page.tsx` - Delivery dashboard
- [ ] `app/(workspace)/billing/page.tsx` - Billing dashboard

---

## Success Criteria

✅ All status transitions validated  
✅ Zero invalid state transitions  
✅ 100% audit coverage  
✅ <100ms status update latency  
✅ <5 minute offline sync time  
✅ Zero data loss on sync  
✅ Full compliance audit trail  
✅ Role-based visibility enforced  
✅ All tests passing  
✅ Performance benchmarks met  

---

**Document Status**: COMPLETE - Ready for Phase 2.1 Implementation  
**Next Action**: Begin Phase 2.1 (Domain Engines)
