-- ============================================================
--  KH Therapy – Public Read Grants Fix
--  Fixes: permission denied for table services (code 42501)
--
--  Root cause: Step 3 of fix-rls-complete.sql correctly revoked all
--  anon privileges, but public-facing tables need a Postgres-level
--  SELECT grant on anon in ADDITION to the permissive RLS policy.
--  RLS policies control row-level access; the table grant controls
--  whether the role can touch the table at all.
--
--  Run this in Supabase SQL Editor after fix-rls-complete.sql
-- ============================================================

-- anon needs schema USAGE to reach any table
GRANT USAGE ON SCHEMA public TO anon;

-- Grant SELECT-only on tables that the public booking flow requires
GRANT SELECT ON public.services                      TO anon;
GRANT SELECT ON public.services_time_slots           TO anon;
GRANT SELECT ON public.availability                  TO anon;
GRANT SELECT ON public.availability_templates        TO anon;
GRANT SELECT ON public.availability_template_slots   TO anon;
GRANT SELECT ON public.default_availability_schedule TO anon;

-- Ensure default privileges don't silently re-grant write access to anon for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE INSERT, UPDATE, DELETE ON TABLES FROM anon;

-- Verify: anon may only SELECT on the above 6 tables, nothing else
-- SELECT grantee, table_name, privilege_type
-- FROM information_schema.role_table_grants
-- WHERE grantee = 'anon' AND table_schema = 'public'
-- ORDER BY table_name;
