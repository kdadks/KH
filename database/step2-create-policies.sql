-- STEP 2: Enable RLS and Create Policies (Run after Step 1)
-- This creates the Row Level Security policies for the user management tables

-- Enable RLS on all user management tables
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- Only enable RLS on payments table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') THEN
        ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS enabled on payments table ✓';
    END IF;
END $$;

ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admins table
DROP POLICY IF EXISTS "Authenticated users can read admins" ON public.admins;
CREATE POLICY "Authenticated users can read admins" ON public.admins
    FOR SELECT 
    TO authenticated
    USING (true);

-- RLS Policies for customers table (extend existing)
DROP POLICY IF EXISTS "Users can view their own customer data" ON public.customers;
CREATE POLICY "Users can view their own customer data" ON public.customers
    FOR SELECT 
    TO authenticated
    USING (auth_user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own customer data" ON public.customers;
CREATE POLICY "Users can update their own customer data" ON public.customers
    FOR UPDATE 
    TO authenticated
    USING (auth_user_id = auth.uid());

-- RLS Policies for payments table (only if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') THEN
        -- Users can view their own payments
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

        -- Admins can manage all payments (if admins table exists)
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admins') THEN
            DROP POLICY IF EXISTS "Admins can manage all payments" ON public.payments;
            CREATE POLICY "Admins can manage all payments" ON public.payments
                FOR ALL 
                TO authenticated
                USING (
                    EXISTS (
                        SELECT 1 FROM public.admins 
                        WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
                          AND is_active = true
                    )
                );
        END IF;
        
        RAISE NOTICE 'RLS policies created for payments table ✓';
    END IF;
END $$;

-- RLS Policies for payment_requests table
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

-- Admins can manage all payment requests (if admins table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admins') THEN
        DROP POLICY IF EXISTS "Admins can manage all payment requests" ON public.payment_requests;
        CREATE POLICY "Admins can manage all payment requests" ON public.payment_requests
            FOR ALL 
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM public.admins 
                    WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
                      AND is_active = true
                )
            );
        RAISE NOTICE 'Admin policies created for payment_requests ✓';
    END IF;
END $$;

-- RLS Policies for user_sessions table
DROP POLICY IF EXISTS "Users can manage their own sessions" ON public.user_sessions;
CREATE POLICY "Users can manage their own sessions" ON public.user_sessions
    FOR ALL 
    TO authenticated
    USING (auth_user_id = auth.uid());

-- Success message
SELECT 'STEP 2 COMPLETE: RLS policies created successfully!' as result;
