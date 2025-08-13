-- STEP 3: Create Helper Functions (Run after Steps 1 & 2)
-- This creates utility functions for the user management system

-- Function to get customer overdue invoices
CREATE OR REPLACE FUNCTION get_customer_overdue_invoices(customer_auth_id UUID)
RETURNS TABLE (
    invoice_id INTEGER,
    invoice_number VARCHAR,
    amount DECIMAL,
    due_date TIMESTAMP WITH TIME ZONE,
    days_overdue INTEGER,
    description TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.id,
        i.invoice_number,
        i.amount,
        i.due_date,
        EXTRACT(DAYS FROM (NOW() - i.due_date))::INTEGER as days_overdue,
        i.description
    FROM public.invoices i
    JOIN public.customers c ON i.customer_id = c.id
    WHERE c.auth_user_id = customer_auth_id
      AND i.status != 'paid'
      AND i.due_date < NOW()
    ORDER BY i.due_date ASC;
END;
$$;

-- Function to get customer payment history
CREATE OR REPLACE FUNCTION get_customer_payment_history(customer_auth_id UUID)
RETURNS TABLE (
    payment_id INTEGER,
    invoice_id INTEGER,
    amount DECIMAL,
    payment_date TIMESTAMP WITH TIME ZONE,
    payment_method VARCHAR,
    status VARCHAR,
    transaction_id VARCHAR
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only return data if payments table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') THEN
        RETURN QUERY
        SELECT 
            p.id,
            p.invoice_id,
            p.amount,
            p.payment_date,
            p.payment_method,
            p.status,
            p.sumup_transaction_id
        FROM public.payments p
        JOIN public.customers c ON p.customer_id = c.id
        WHERE c.auth_user_id = customer_auth_id
        ORDER BY p.payment_date DESC NULLS LAST;
    END IF;
END;
$$;

-- Function to link customer to auth user
CREATE OR REPLACE FUNCTION link_customer_to_auth_user(
    customer_email VARCHAR, 
    auth_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    customer_count INTEGER;
BEGIN
    -- Check if customer exists with this email
    SELECT COUNT(*) INTO customer_count 
    FROM public.customers 
    WHERE email = customer_email AND is_active = true;
    
    IF customer_count = 0 THEN
        RETURN FALSE;
    END IF;
    
    -- Update customer with auth_user_id
    UPDATE public.customers 
    SET auth_user_id = link_customer_to_auth_user.auth_user_id,
        updated_at = NOW()
    WHERE email = customer_email AND is_active = true;
    
    RETURN TRUE;
END;
$$;

-- Function to create user session
CREATE OR REPLACE FUNCTION create_user_session(
    auth_user_id UUID,
    ip_addr INET DEFAULT NULL,
    user_agent_string TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    session_id INTEGER;
    customer_id INTEGER;
BEGIN
    -- Get customer_id for the auth user
    SELECT c.id INTO customer_id
    FROM public.customers c
    WHERE c.auth_user_id = create_user_session.auth_user_id;
    
    -- Create session record
    INSERT INTO public.user_sessions (
        auth_user_id, 
        customer_id, 
        ip_address, 
        user_agent
    ) VALUES (
        create_user_session.auth_user_id,
        customer_id,
        ip_addr,
        user_agent_string
    ) RETURNING id INTO session_id;
    
    RETURN session_id;
END;
$$;

-- Trigger to automatically update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add update triggers to tables that have updated_at columns
DO $$
BEGIN
    -- admins table
    DROP TRIGGER IF EXISTS update_admins_updated_at ON public.admins;
    CREATE TRIGGER update_admins_updated_at 
        BEFORE UPDATE ON public.admins 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    -- payments table (if it exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') THEN
        DROP TRIGGER IF EXISTS update_payments_updated_at ON public.payments;
        CREATE TRIGGER update_payments_updated_at 
            BEFORE UPDATE ON public.payments 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- payment_requests table
    DROP TRIGGER IF EXISTS update_payment_requests_updated_at ON public.payment_requests;
    CREATE TRIGGER update_payment_requests_updated_at 
        BEFORE UPDATE ON public.payment_requests 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
END $$;

-- Success message
SELECT 'STEP 3 COMPLETE: Helper functions and triggers created successfully!' as result;
