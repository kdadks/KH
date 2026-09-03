-- ============================================================================
-- KH Therapy - Safe & Comprehensive Database Permissions & RLS Fix
-- Safely applies grants and RLS policies ONLY to tables that exist in your DB.
-- Prevents PostgreSQL Error 42P01 (relation does not exist) if any table is missing.
--
-- How to apply:
-- Run this SQL in your Supabase Dashboard SQL Editor (https://supabase.com/dashboard/project/_/sql).
-- ============================================================================

-- 1. Ensure schema usage privilege is granted
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- 2. Grant sequence and function execution privileges safely
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- 3. Safely grant DML privileges and configure RLS policies for existing tables only
DO $$
DECLARE
    t text;
    tables text[] := ARRAY[
        'customers', 'bookings', 'payments', 'payment_requests', 'payment_gateways',
        'payments_tracking', 'payment_failures', 'payment_status_checks', 'webhook_events',
        'invoices', 'invoice_items', 'services', 'services_time_slots', 'availability',
        'availability_templates', 'availability_template_slots', 'default_availability_schedule',
        'schedule_generation_history', 'rescheduling_requests', 'user_sessions', 'admins',
        'gdpr_audit_log', 'consent_records', 'data_subject_requests', 'data_retention_policies'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        -- Check if the table exists in the public schema before executing GRANT and RLS Statements
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
            -- Grant SELECT, INSERT, UPDATE, DELETE permissions
            EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO anon, authenticated;', t);
            
            -- Enable Row Level Security
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
            
            -- Drop existing policy if present and create fresh permissive policy
            EXECUTE format('DROP POLICY IF EXISTS "allow_anon_app_access" ON public.%I;', t);
            EXECUTE format('CREATE POLICY "allow_anon_app_access" ON public.%I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);', t);
            
            RAISE NOTICE '✅ Granted permissions and RLS policy on: %', t;
        ELSE
            RAISE NOTICE 'ℹ️ Skipped (table does not exist): %', t;
        END IF;
    END LOOP;
END $$;

-- 4. Verification Summary Query
SELECT 
    t.table_name,
    CASE WHEN p.policyname IS NOT NULL THEN '✅ RLS Policy Configured' ELSE '⚠️ No Policy Found' END AS rls_status,
    p.policyname
FROM information_schema.tables t
LEFT JOIN pg_policies p ON p.schemaname = t.table_schema AND p.tablename = t.table_name
WHERE t.table_schema = 'public'
ORDER BY t.table_name;
