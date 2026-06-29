-- Prisma connection pooling optimization with PgBouncer
-- Add to DATABASE_URL: ?pgbouncer=true&connection_limit=10&pool_timeout=30

-- Example DATABASE_URL for PgBouncer:
-- postgresql://user:password@host:6543/sifex_prod?pgbouncer=true&connection_limit=10&pool_timeout=30

-- Connection pool sizing:
-- 4 Pods (Vercel) × 10 connections = 40 total connections
-- PgBouncer mode: transaction
-- Max connections: 100 (allow headroom)

-- Recommended PgBouncer config:
-- pool_mode = transaction
-- max_client_conn = 200
-- default_pool_size = 25
-- reserve_pool_size = 5
-- reserve_pool_timeout = 3
-- max_db_connections = 50
-- query_wait_timeout = 30

-- Prisma config in schema.prisma:
-- generator client {
--   provider        = "prisma-client-js"
--   previewFeatures = ["postgresqlExtensions"]
-- }
--
-- datasource db {
--   provider   = "postgresql"
--   url        = env("DATABASE_URL")
--   extensions = [uuidOssp, citext]
--   connectionLimit = 10
--   poolTimeout     = 30
-- }
