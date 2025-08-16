-- Fix RLS policy for payment_gateways table
-- This creates a policy that works with Supabase authenticated users directly (following the pattern used by other tables)

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Admin access to payment_gateways" ON payment_gateways;
DROP POLICY IF EXISTS "Authenticated users can manage payment_gateways" ON payment_gateways;

-- Create simple policy for authenticated users (following the pattern used by bookings, customers, services, etc.)
CREATE POLICY "Authenticated users can manage payment_gateways" ON payment_gateways
    FOR ALL 
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- This follows the same pattern as:
-- CREATE POLICY "Authenticated users can manage customers" ON customers FOR ALL TO authenticated USING (true);
-- CREATE POLICY "Authenticated users can manage invoices" ON invoices FOR ALL TO authenticated USING (true);
-- CREATE POLICY "Enable insert for authenticated users" ON services FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');

SELECT 'Payment gateways RLS policy updated to match other table patterns' as result;
