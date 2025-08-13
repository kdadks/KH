-- User Management System Database Migration
-- This script creates tables for user authentication, payments, and user portal functionality

-- First, create the admins table for admin access control
DROP TABLE IF EXISTS public.admins CASCADE;
CREATE TABLE public.admins (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on admins table
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- RLS policy for admins table (only authenticated users can read)
DROP POLICY IF EXISTS "Authenticated users can read admins" ON public.admins;
CREATE POLICY "Authenticated users can read admins" ON public.admins
    FOR SELECT 
    TO authenticated
    USING (true);

-- Insert default admin (replace with your actual admin email)
INSERT INTO public.admins (email, full_name) VALUES 
('admin@khtherapy.ie', 'KH Therapy Admin')
ON CONFLICT (email) DO NOTHING;

-- 1. Add auth_user_id to customers table to link with Supabase Auth
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'customers' AND column_name = 'auth_user_id') THEN
        ALTER TABLE public.customers ADD COLUMN auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_customers_auth_user_id ON public.customers (auth_user_id);
    END IF;
END $$;

-- 2. Add email verification fields to customers table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'customers' AND column_name = 'is_email_verified') THEN
        ALTER TABLE public.customers ADD COLUMN is_email_verified BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'customers' AND column_name = 'email_verification_token') THEN
        ALTER TABLE public.customers ADD COLUMN email_verification_token VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'customers' AND column_name = 'email_verification_sent_at') THEN
        ALTER TABLE public.customers ADD COLUMN email_verification_sent_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- 3. Create payments table
CREATE TABLE IF NOT EXISTS public.payments (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    customer_id INTEGER NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    sumup_transaction_id VARCHAR(255), -- SumUp transaction ID
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'failed', 'refunded', 'cancelled')),
    payment_method VARCHAR(50), -- card, bank_transfer, etc.
    sumup_checkout_id VARCHAR(255), -- SumUp checkout session ID
    sumup_payment_type VARCHAR(50), -- card, apple_pay, google_pay, etc.
    failure_reason TEXT, -- reason for failed payments
    refund_amount DECIMAL(10,2), -- amount refunded if any
    refund_reason TEXT, -- reason for refund
    payment_date TIMESTAMP WITH TIME ZONE, -- when payment was completed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT -- admin notes about payment
);

-- Create indexes for payments table
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON public.payments (invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON public.payments (customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments (status);
CREATE INDEX IF NOT EXISTS idx_payments_sumup_transaction_id ON public.payments (sumup_transaction_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments (created_at);

-- 4. Create payment_requests table for tracking payment link requests
CREATE TABLE IF NOT EXISTS public.payment_requests (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    customer_id INTEGER NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    request_token VARCHAR(255) UNIQUE NOT NULL, -- unique token for payment link
    sumup_checkout_url TEXT, -- SumUp checkout URL
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'opened', 'expired', 'completed', 'cancelled')),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL, -- payment link expiry
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    opened_at TIMESTAMP WITH TIME ZONE, -- when customer opened the link
    completed_at TIMESTAMP WITH TIME ZONE, -- when payment was completed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for payment_requests table
CREATE INDEX IF NOT EXISTS idx_payment_requests_invoice_id ON public.payment_requests (invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_customer_id ON public.payment_requests (customer_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_token ON public.payment_requests (request_token);
CREATE INDEX IF NOT EXISTS idx_payment_requests_status ON public.payment_requests (status);
CREATE INDEX IF NOT EXISTS idx_payment_requests_expires_at ON public.payment_requests (expires_at);

-- 5. Add payment tracking fields to invoices table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'invoices' AND column_name = 'payment_request_sent') THEN
        ALTER TABLE public.invoices ADD COLUMN payment_request_sent BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'invoices' AND column_name = 'payment_request_sent_at') THEN
        ALTER TABLE public.invoices ADD COLUMN payment_request_sent_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'invoices' AND column_name = 'last_payment_reminder_sent') THEN
        ALTER TABLE public.invoices ADD COLUMN last_payment_reminder_sent TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- 6. Create user_sessions table for custom session management
CREATE TABLE IF NOT EXISTS public.user_sessions (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

-- Create indexes for user_sessions table
CREATE INDEX IF NOT EXISTS idx_user_sessions_customer_id ON public.user_sessions (customer_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON public.user_sessions (session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON public.user_sessions (expires_at);

-- 7. Create functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at fields
DROP TRIGGER IF EXISTS update_payments_updated_at ON public.payments;
CREATE TRIGGER update_payments_updated_at 
    BEFORE UPDATE ON public.payments 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_payment_requests_updated_at ON public.payment_requests;
CREATE TRIGGER update_payment_requests_updated_at 
    BEFORE UPDATE ON public.payment_requests 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Enable Row Level Security (RLS)
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- 9. Create RLS policies

-- Payments policies
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

DROP POLICY IF EXISTS "Admins can manage all payments" ON public.payments;
CREATE POLICY "Admins can manage all payments" ON public.payments
    FOR ALL 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.admins 
            WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
        )
    );

-- Payment requests policies
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

DROP POLICY IF EXISTS "Admins can manage all payment requests" ON public.payment_requests;
CREATE POLICY "Admins can manage all payment requests" ON public.payment_requests
    FOR ALL 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.admins 
            WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
        )
    );

-- User sessions policies
DROP POLICY IF EXISTS "Users can manage their own sessions" ON public.user_sessions;
CREATE POLICY "Users can manage their own sessions" ON public.user_sessions
    FOR ALL 
    TO authenticated
    USING (auth_user_id = auth.uid());

-- 10. Create helper functions

-- Function to get customer overdue invoices
CREATE OR REPLACE FUNCTION public.get_customer_overdue_invoices(customer_user_id UUID)
RETURNS TABLE (
    id INTEGER,
    invoice_number VARCHAR,
    total_amount DECIMAL,
    due_date DATE,
    days_overdue INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.id,
        i.invoice_number,
        i.total_amount,
        i.due_date,
        (CURRENT_DATE - i.due_date)::INTEGER as days_overdue
    FROM public.invoices i
    JOIN public.customers c ON i.customer_id = c.id
    WHERE c.auth_user_id = customer_user_id
      AND i.status != 'paid'
      AND i.due_date < CURRENT_DATE
    ORDER BY i.due_date ASC;
END;
$$;

-- Function to get customer payment history
CREATE OR REPLACE FUNCTION public.get_customer_payment_history(customer_user_id UUID)
RETURNS TABLE (
    id INTEGER,
    invoice_number VARCHAR,
    amount DECIMAL,
    status VARCHAR,
    payment_date TIMESTAMP WITH TIME ZONE,
    payment_method VARCHAR
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        i.invoice_number,
        p.amount,
        p.status,
        p.payment_date,
        p.payment_method
    FROM public.payments p
    JOIN public.invoices i ON p.invoice_id = i.id
    JOIN public.customers c ON p.customer_id = c.id
    WHERE c.auth_user_id = customer_user_id
    ORDER BY p.created_at DESC;
END;
$$;

-- 11. Insert default data and constraints

-- Add constraint to ensure customers can only have one auth_user_id
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                  WHERE constraint_name = 'customers_auth_user_id_unique' 
                  AND table_name = 'customers') THEN
        ALTER TABLE public.customers 
        ADD CONSTRAINT customers_auth_user_id_unique UNIQUE (auth_user_id);
    END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_invoices_customer_status ON public.invoices (customer_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date_status ON public.invoices (due_date, status);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON public.customers TO authenticated;
GRANT SELECT ON public.invoices TO authenticated;
GRANT ALL ON public.payments TO authenticated;
GRANT ALL ON public.payment_requests TO authenticated;
GRANT ALL ON public.user_sessions TO authenticated;

-- Grant permissions on sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

COMMENT ON TABLE public.payments IS 'Stores payment transactions linked to invoices and customers with SumUp integration';
COMMENT ON TABLE public.payment_requests IS 'Tracks payment request links sent to customers with expiry and status tracking';
COMMENT ON TABLE public.user_sessions IS 'Manages user sessions for the customer portal';
COMMENT ON COLUMN public.customers.auth_user_id IS 'Links customer record to Supabase Auth user';
COMMENT ON COLUMN public.customers.is_email_verified IS 'Indicates if customer email has been verified';
