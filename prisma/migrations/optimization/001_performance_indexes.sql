-- Performance Indexes for high-volume tables
-- Run: psql -d sifex_prod -f prisma/migrations/optimization/001_performance_indexes.sql

-- MasterAWB: composite indexes for common query patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_master_awbs_scope
  ON "MasterAWB" ("deletedAt", "cargoStatus", "createdAt")
  WHERE "deletedAt" IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_master_awbs_station_status
  ON "MasterAWB" ("originStationId", "cargoStatus")
  WHERE "deletedAt" IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_master_awbs_airline_flight
  ON "MasterAWB" ("airlineId", "flightNumber", "departureTime")
  WHERE "deletedAt" IS NULL;

-- HouseAWB: composite indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_house_awbs_master_status
  ON "HouseAWB" ("masterAWBId", "cargoStatus")
  WHERE "deletedAt" IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_house_awbs_billing_status
  ON "HouseAWB" ("billingStatus", "cargoStatus")
  WHERE "deletedAt" IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_house_awbs_scope
  ON "HouseAWB" ("deletedAt", "cargoStatus", "billingStatus", "createdAt")
  WHERE "deletedAt" IS NULL;

-- TrackingEvent: high-volume table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tracking_events_lookup
  ON "TrackingEvent" ("entityType", "entityId", "createdAt" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tracking_events_recent
  ON "TrackingEvent" ("createdAt" DESC)
  WHERE "createdAt" > NOW() - INTERVAL '90 days';

-- DomainEvent: high-volume table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_domain_events_lookup
  ON "DomainEvent" ("aggregateType", "aggregateId", "occurredAt" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_domain_events_pending
  ON "DomainEvent" ("eventType", "occurredAt")
  WHERE "eventType" IN ('MASTER_AWB_STATUS_CHANGED', 'HOUSE_AWB_STATUS_CHANGED', 'BILLING_PAID');

-- BillingRecord: query optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_billing_records_customer_status
  ON "BillingRecord" ("customerId", "status")
  WHERE "deletedAt" IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_billing_records_payment_range
  ON "BillingRecord" ("status", "lastPaymentAt")
  WHERE "deletedAt" IS NULL AND "status" = 'PAID';

-- Payment: recent payments lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_recent
  ON "Payment" ("paymentDate" DESC, "paymentMethod");

-- TcraOutbox: pending processing
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tcra_outbox_pending
  ON "TcraOutbox" ("status", "createdAt")
  WHERE "status" = 'PENDING';

-- Flight: active searches
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_flights_active
  ON "Flight" ("departureTime", "status")
  WHERE "status" IN ('SCHEDULED', 'ACTIVE') AND "deletedAt" IS NULL;

-- Partial indexes for status-based queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_master_awbs_pending
  ON "MasterAWB" ("createdAt" DESC)
  WHERE "deletedAt" IS NULL AND "cargoStatus" IN ('INITIATED', 'ACCEPTED', 'RCS', 'LOADED', 'MANIFESTED');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_master_awbs_in_transit
  ON "MasterAWB" ("departedAt", "cargoStatus")
  WHERE "deletedAt" IS NULL AND "cargoStatus" = 'IN_TRANSIT';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_master_awbs_arrived
  ON "MasterAWB" ("arrivedAt" DESC)
  WHERE "deletedAt" IS NULL AND "cargoStatus" IN ('ARRIVED', 'UNDER_CLEARANCE');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_master_awbs_released
  ON "MasterAWB" ("closedAt" DESC)
  WHERE "deletedAt" IS NULL AND "cargoStatus" = 'RELEASED';
