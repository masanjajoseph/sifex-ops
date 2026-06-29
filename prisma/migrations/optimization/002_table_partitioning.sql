-- Table partitioning for high-volume tables
-- Requires PostgreSQL 12+

-- 1. Partition TrackingEvent by month
CREATE TABLE IF NOT EXISTS "TrackingEvent" (
  LIKE "TrackingEvent_template" INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES
) PARTITION BY RANGE ("createdAt");

CREATE TABLE "TrackingEvent_2024" PARTITION OF "TrackingEvent"
  FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
CREATE TABLE "TrackingEvent_2025" PARTITION OF "TrackingEvent"
  FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
CREATE TABLE "TrackingEvent_2026" PARTITION OF "TrackingEvent"
  FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');
CREATE TABLE "TrackingEvent_future" PARTITION OF "TrackingEvent"
  FOR VALUES FROM ('2027-01-01') TO (MAXVALUE);

-- 2. Partition DomainEvent by month
CREATE TABLE IF NOT EXISTS "DomainEvent" (
  LIKE "DomainEvent_template" INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES
) PARTITION BY RANGE ("occurredAt");

CREATE TABLE "DomainEvent_2024" PARTITION OF "DomainEvent"
  FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
CREATE TABLE "DomainEvent_2025" PARTITION OF "DomainEvent"
  FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
CREATE TABLE "DomainEvent_2026" PARTITION OF "DomainEvent"
  FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');
CREATE TABLE "DomainEvent_future" PARTITION OF "DomainEvent"
  FOR VALUES FROM ('2027-01-01') TO (MAXVALUE);

-- 3. Partition AuditLog by month
CREATE TABLE IF NOT EXISTS "AuditLog" (
  LIKE "AuditLog_template" INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES
) PARTITION BY RANGE ("createdAt");

CREATE TABLE "AuditLog_2024" PARTITION OF "AuditLog"
  FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
CREATE TABLE "AuditLog_2025" PARTITION OF "AuditLog"
  FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
CREATE TABLE "AuditLog_2026" PARTITION OF "AuditLog"
  FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');
CREATE TABLE "AuditLog_future" PARTITION OF "AuditLog"
  FOR VALUES FROM ('2027-01-01') TO (MAXVALUE);

-- 4. Partition TcraOutbox by month
CREATE TABLE IF NOT EXISTS "TcraOutbox" (
  LIKE "TcraOutbox_template" INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES
) PARTITION BY RANGE ("createdAt");

CREATE TABLE "TcraOutbox_2025" PARTITION OF "TcraOutbox"
  FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
CREATE TABLE "TcraOutbox_2026" PARTITION OF "TcraOutbox"
  FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');
CREATE TABLE "TcraOutbox_future" PARTITION OF "TcraOutbox"
  FOR VALUES FROM ('2027-01-01') TO (MAXVALUE);

-- Partition maintenance function
CREATE OR REPLACE FUNCTION create_next_partition()
RETURNS void AS $$
DECLARE
  next_year text;
  partition_name text;
BEGIN
  next_year := to_char(NOW() + INTERVAL '1 year', 'YYYY');
  partition_name := 'TrackingEvent_' || next_year;

  IF NOT EXISTS (
    SELECT 1 FROM pg_class WHERE relname = partition_name
  ) THEN
    EXECUTE format(
      'CREATE TABLE %I PARTITION OF "TrackingEvent" FOR VALUES FROM (%L) TO (%L)',
      partition_name,
      (next_year || '-01-01'),
      ((next_year::int + 1) || '-01-01')
    );
  END IF;
END;
$$ LANGUAGE plpgsql;
