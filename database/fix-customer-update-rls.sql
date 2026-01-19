-- Fix RLS policy for customers table to allow anonymous updates
-- This is needed because the app uses custom authentication, not Supabase Auth
-- The anon role needs explicit UPDATE permission

-- Add explicit anon UPDATE policy
DROP POLICY IF EXISTS "allow_anon_update_customers" ON public.customers;

CREATE POLICY "allow_anon_update_customers" ON public.customers
    FOR UPDATE 
    TO anon
    USING (true)
    WITH CHECK (true);

-- Ensure anon role has UPDATE permission
GRANT UPDATE ON public.customers TO anon;

-- Verify the policy was created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'customers'
ORDER BY policyname;
