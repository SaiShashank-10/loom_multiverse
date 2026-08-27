-- ============================================
-- Loom Multiverse — Database Initialization
-- ============================================
-- This runs automatically when the PostgreSQL container starts for the first time.

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Verify extensions are loaded
DO $$
BEGIN
  RAISE NOTICE 'Loom Multiverse database initialized successfully';
  RAISE NOTICE 'Extensions loaded: uuid-ossp, vector, pg_trgm';
END $$;
