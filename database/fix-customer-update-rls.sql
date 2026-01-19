-- Fix RLS policy for customers table to allow anonymous updates
-- This is needed because the app uses custom authentication, not Supabase Auth

-- Drop existing update policy
DROP POLICY IF EXISTS "Allow authenticated users to update customers" ON public.customers;

-- Create new update policy that allows both authenticated and anonymous users
-- The policy name is misleading but kept for backwards compatibility
CREATE POLICY "Allow authenticated users to update customers" ON public.customers
    FOR UPDATE 
    USING (true)
    WITH CHECK (true);

-- Also ensure anon role has UPDATE permission
GRANT UPDATE ON public.customers TO anon;
GRANT UPDATE ON public.customers TO authenticated;

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
WHERE tablename = 'customers';
