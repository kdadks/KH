-- Alternative approach: Remove admin policies that reference the admins table
-- Use this if you don't want to create an admins table

-- Drop the problematic admin policies
DROP POLICY IF EXISTS "Admins can manage all payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can manage all payment requests" ON public.payment_requests;

-- Create simpler policies that don't reference the admins table
-- For payments: Users can only see their own payments
DROP POLICY IF EXISTS "Users can view their own payments" ON public.payments;
CREATE POLICY "Users can view their own payments" ON public.payments
    FOR SELECT 
    TO authenticated
    USING (
        customer_id IN (
            SELECT id FROM public.customers 
            WHERE auth_user_id = auth.uid()
        )
    );

-- For payment requests: Users can only see their own payment requests  
DROP POLICY IF EXISTS "Users can view their own payment requests" ON public.payment_requests;
CREATE POLICY "Users can view their own payment requests" ON public.payment_requests
    FOR SELECT 
    TO authenticated
    USING (
        customer_id IN (
            SELECT id FROM public.customers 
            WHERE auth_user_id = auth.uid()
        )
    );

-- Note: This removes admin access to payments and payment requests
-- Admin access would need to be handled at the application level
SELECT 'Admin policies removed - user management should work now' as status;
