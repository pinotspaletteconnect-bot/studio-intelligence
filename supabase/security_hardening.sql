-- Studio Intelligence: reduce public schema exposure
--
-- Purpose:
-- Remove broad anonymous and authenticated access from public warehouse tables,
-- views, sequences, and functions. The dashboard and ETL services should continue
-- to use server-side access patterns rather than relying on public database grants.
--
-- Run this in the Supabase SQL Editor against the target project.

BEGIN;

-- Revoke broad access from public roles that should not inherit warehouse access.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;

-- Keep the schema itself from being used by public roles unless a future policy
-- explicitly grants a narrow permission.
REVOKE USAGE ON SCHEMA public FROM anon, authenticated;

COMMIT;

-- Note:
-- If a future authenticated UI experience requires warehouse reads, add an
-- explicit RLS policy and grant only the minimum required privileges for that
-- specific object rather than reintroducing broad public access.
