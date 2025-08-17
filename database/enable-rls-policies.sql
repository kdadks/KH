-- Comprehensive RLS Policy Implementation for KH Therapy Database
-- This script enables RLS on all tables and creates appropriate policies
-- to maintain existing functionality while securing the database

-- IMPORTANT: Run this script carefully in a test environment first!
-- Make sure to backup your database before running in production

-- ============================================================================
-- STEP 1: Enable RLS on all tables (non-destructive, just turns on RLS)
-- ============================================================================

DO $$
BEGIN
    -- Enable RLS on sensitive data tables
    ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE '✓ RLS enabled on customers table';
    
    ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE '✓ RLS enabled on bookings table';
    
    ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE '✓ RLS enabled on invoices table';
    
    ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE '✓ RLS enabled on invoice_items table';
    
    ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE '✓ RLS enabled on payments table';
    
    ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE '✓ RLS enabled on payment_requests table';
    
    ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE '✓ RLS enabled on user_sessions table';
    
    -- Enable RLS on admin-only tables
    ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE '✓ RLS enabled on admins table';
    
    ALTER TABLE public.payment_gateways ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE '✓ RLS enabled on payment_gateways table';
    
    ALTER TABLE public.payments_tracking ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE '✓ RLS enabled on payments_tracking table';
    
    ALTER TABLE public.gdpr_audit_log ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE '✓ RLS enabled on gdpr_audit_log table';
    
    ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE '✓ RLS enabled on consent_records table';
    
    -- Leave public tables without RLS for now (availability, services, services_time_slots)
    -- These can remain publicly accessible as they contain non-sensitive data
    
    RAISE NOTICE '🔒 RLS enabled on all sensitive tables';
END $$;

-- ============================================================================
-- STEP 2: Create admin identification function
-- ============================================================================

-- Function to check if current user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if the current user's email exists in the admins table
    RETURN EXISTS (
        SELECT 1 FROM public.admins 
        WHERE email = auth.jwt() ->> 'email'
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current user's customer ID
CREATE OR REPLACE FUNCTION public.current_customer_id()
RETURNS INTEGER AS $$
BEGIN
    -- Return the customer ID for the current authenticated user
    RETURN (
        SELECT id FROM public.customers 
        WHERE auth_user_id = auth.uid()
        LIMIT 1
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 3: Create RLS policies for CUSTOMERS table
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "customers_admin_all_access" ON public.customers;
DROP POLICY IF EXISTS "customers_user_own_access" ON public.customers;
DROP POLICY IF EXISTS "customers_admin_insert" ON public.customers;
DROP POLICY IF EXISTS "customers_anon_insert" ON public.customers;

-- Admin can do everything
CREATE POLICY "customers_admin_all_access" ON public.customers
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Users can view and update their own data
CREATE POLICY "customers_user_own_access" ON public.customers
    FOR SELECT
    TO authenticated
    USING (auth_user_id = auth.uid());

CREATE POLICY "customers_user_own_update" ON public.customers
    FOR UPDATE
    TO authenticated
    USING (auth_user_id = auth.uid())
    WITH CHECK (auth_user_id = auth.uid());

-- Allow both admin and anon to insert customers (for booking system)
CREATE POLICY "customers_admin_insert" ON public.customers
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

-- Allow anonymous insert for new bookings (existing functionality)
CREATE POLICY "customers_anon_insert" ON public.customers
    FOR INSERT
    TO anon
    WITH CHECK (true);

-- ============================================================================
-- STEP 4: Create RLS policies for BOOKINGS table
-- ============================================================================

DROP POLICY IF EXISTS "bookings_admin_all_access" ON public.bookings;
DROP POLICY IF EXISTS "bookings_user_own_access" ON public.bookings;
DROP POLICY IF EXISTS "bookings_anon_insert" ON public.bookings;

-- Admin can do everything
CREATE POLICY "bookings_admin_all_access" ON public.bookings
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Users can view their own bookings
CREATE POLICY "bookings_user_own_access" ON public.bookings
    FOR SELECT
    TO authenticated
    USING (customer_id = public.current_customer_id());

-- Allow anonymous insert for new bookings (existing booking flow)
CREATE POLICY "bookings_anon_insert" ON public.bookings
    FOR INSERT
    TO anon
    WITH CHECK (true);

-- Allow authenticated users to insert bookings
CREATE POLICY "bookings_auth_insert" ON public.bookings
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- ============================================================================
-- STEP 5: Create RLS policies for INVOICES table
-- ============================================================================

DROP POLICY IF EXISTS "invoices_admin_all_access" ON public.invoices;
DROP POLICY IF EXISTS "invoices_user_own_access" ON public.invoices;

-- Admin can do everything
CREATE POLICY "invoices_admin_all_access" ON public.invoices
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Users can view their own invoices
CREATE POLICY "invoices_user_own_access" ON public.invoices
    FOR SELECT
    TO authenticated
    USING (customer_id = public.current_customer_id());

-- ============================================================================
-- STEP 6: Create RLS policies for INVOICE_ITEMS table
-- ============================================================================

DROP POLICY IF EXISTS "invoice_items_admin_all_access" ON public.invoice_items;
DROP POLICY IF EXISTS "invoice_items_user_own_access" ON public.invoice_items;

-- Admin can do everything
CREATE POLICY "invoice_items_admin_all_access" ON public.invoice_items
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Users can view their own invoice items (through invoice relationship)
CREATE POLICY "invoice_items_user_own_access" ON public.invoice_items
    FOR SELECT
    TO authenticated
    USING (
        invoice_id IN (
            SELECT id FROM public.invoices 
            WHERE customer_id = public.current_customer_id()
        )
    );

-- ============================================================================
-- STEP 7: Create RLS policies for PAYMENTS table
-- ============================================================================

DROP POLICY IF EXISTS "payments_admin_all_access" ON public.payments;
DROP POLICY IF EXISTS "payments_user_own_access" ON public.payments;

-- Admin can do everything
CREATE POLICY "payments_admin_all_access" ON public.payments
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Users can view their own payments
CREATE POLICY "payments_user_own_access" ON public.payments
    FOR SELECT
    TO authenticated
    USING (customer_id = public.current_customer_id());

-- ============================================================================
-- STEP 8: Create RLS policies for PAYMENT_REQUESTS table
-- ============================================================================

DROP POLICY IF EXISTS "payment_requests_admin_all_access" ON public.payment_requests;
DROP POLICY IF EXISTS "payment_requests_user_own_access" ON public.payment_requests;

-- Admin can do everything
CREATE POLICY "payment_requests_admin_all_access" ON public.payment_requests
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Users can view their own payment requests
CREATE POLICY "payment_requests_user_own_access" ON public.payment_requests
    FOR SELECT
    TO authenticated
    USING (customer_id = public.current_customer_id());

-- ============================================================================
-- STEP 9: Create RLS policies for USER_SESSIONS table
-- ============================================================================

DROP POLICY IF EXISTS "user_sessions_admin_all_access" ON public.user_sessions;
DROP POLICY IF EXISTS "user_sessions_user_own_access" ON public.user_sessions;

-- Admin can do everything
CREATE POLICY "user_sessions_admin_all_access" ON public.user_sessions
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Users can manage their own sessions
CREATE POLICY "user_sessions_user_own_access" ON public.user_sessions
    FOR ALL
    TO authenticated
    USING (customer_id = public.current_customer_id())
    WITH CHECK (customer_id = public.current_customer_id());

-- ============================================================================
-- STEP 10: Create RLS policies for ADMIN-ONLY tables
-- ============================================================================

-- ADMINS table - only admins can access
DROP POLICY IF EXISTS "admins_admin_only_access" ON public.admins;
CREATE POLICY "admins_admin_only_access" ON public.admins
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- PAYMENT_GATEWAYS table - only admins can access
DROP POLICY IF EXISTS "payment_gateways_admin_only_access" ON public.payment_gateways;
CREATE POLICY "payment_gateways_admin_only_access" ON public.payment_gateways
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- PAYMENTS_TRACKING table - only admins can access
DROP POLICY IF EXISTS "payments_tracking_admin_only_access" ON public.payments_tracking;
CREATE POLICY "payments_tracking_admin_only_access" ON public.payments_tracking
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- GDPR_AUDIT_LOG table - only admins can access
DROP POLICY IF EXISTS "gdpr_audit_log_admin_only_access" ON public.gdpr_audit_log;
CREATE POLICY "gdpr_audit_log_admin_only_access" ON public.gdpr_audit_log
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- CONSENT_RECORDS table - only admins can access
DROP POLICY IF EXISTS "consent_records_admin_only_access" ON public.consent_records;
CREATE POLICY "consent_records_admin_only_access" ON public.consent_records
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ============================================================================
-- STEP 11: Grant necessary permissions to roles
-- ============================================================================

-- Ensure proper permissions are granted
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant access to public tables (these remain without RLS)
GRANT SELECT ON public.availability TO anon, authenticated;
GRANT SELECT ON public.services TO anon, authenticated;
GRANT SELECT ON public.services_time_slots TO anon, authenticated;

-- Grant access to RLS-protected tables (policies will control actual access)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookings TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_sessions TO authenticated;

-- Grant access to admin-only tables
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admins TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_gateways TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments_tracking TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gdpr_audit_log TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.consent_records TO authenticated;

-- Grant sequence permissions
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- ============================================================================
-- STEP 12: Verification queries
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '🔍 VERIFICATION: Checking RLS status on all tables...';
    
    -- This will show which tables have RLS enabled
    RAISE NOTICE 'Use these queries to verify RLS is working:';
    RAISE NOTICE '1. SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE schemaname = ''public'';';
    RAISE NOTICE '2. SELECT schemaname, tablename, policyname, roles FROM pg_policies WHERE schemaname = ''public'';';
    RAISE NOTICE '3. Test anonymous access: should be limited to public tables and customer/booking inserts';
    RAISE NOTICE '4. Test authenticated admin access: should have full access to all tables';
    RAISE NOTICE '5. Test authenticated user access: should only see own data';
    
    RAISE NOTICE '✅ RLS implementation complete!';
    RAISE NOTICE '⚠️  IMPORTANT: Test all functionality thoroughly before deploying to production';
END $$;
