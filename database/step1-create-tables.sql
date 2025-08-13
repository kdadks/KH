-- STEP 1: Create Basic Tables Only (No Policies)
-- Run this first to create the tables without RLS policies

-- Create admins table
CREATE TABLE IF NOT EXISTS public.admins (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default admin
INSERT INTO public.admins (email, full_name) VALUES 
('admin@khtherapy.ie', 'KH Therapy Admin')
ON CONFLICT (email) DO NOTHING;

-- Add auth_user_id to customers table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'customers' AND column_name = 'auth_user_id') THEN
        ALTER TABLE public.customers ADD COLUMN auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_customers_auth_user_id ON public.customers (auth_user_id);
    END IF;
END $$;

-- Add email verification fields to customers table
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

-- Only create payments table if invoices table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoices') THEN
        -- Create payments table
        CREATE TABLE IF NOT EXISTS public.payments (
            id SERIAL PRIMARY KEY,
            invoice_id INTEGER REFERENCES public.invoices(id) ON DELETE CASCADE,
            customer_id INTEGER NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
            sumup_transaction_id VARCHAR(255),
            amount DECIMAL(10,2) NOT NULL,
            currency VARCHAR(3) DEFAULT 'EUR',
            status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'failed', 'refunded', 'cancelled')),
            payment_method VARCHAR(50),
            sumup_checkout_id VARCHAR(255),
            sumup_payment_type VARCHAR(50),
            failure_reason TEXT,
            refund_amount DECIMAL(10,2),
            refund_reason TEXT,
            payment_date TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            notes TEXT
        );
        
        -- Create indexes for payments table
        CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON public.payments (customer_id);
        CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON public.payments (invoice_id);
        CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments (status);
        CREATE INDEX IF NOT EXISTS idx_payments_sumup_transaction_id ON public.payments (sumup_transaction_id);
        CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON public.payments (payment_date);
        
        RAISE NOTICE 'payments table created ✓';
    ELSE
        RAISE NOTICE 'WARNING: invoices table does not exist. Skipping payments table creation.';
    END IF;
END $$;

-- Create payment_requests table
CREATE TABLE IF NOT EXISTS public.payment_requests (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    invoice_id INTEGER REFERENCES public.invoices(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'paid', 'expired', 'cancelled')),
    email_sent_at TIMESTAMP WITH TIME ZONE,
    payment_due_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_by_admin_email VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for payment_requests table
CREATE INDEX IF NOT EXISTS idx_payment_requests_customer_id ON public.payment_requests (customer_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_invoice_id ON public.payment_requests (invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_status ON public.payment_requests (status);

-- Create user_sessions table  
CREATE TABLE IF NOT EXISTS public.user_sessions (
    id SERIAL PRIMARY KEY,
    auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    customer_id INTEGER REFERENCES public.customers(id) ON DELETE SET NULL,
    session_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    session_end TIMESTAMP WITH TIME ZONE,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for user_sessions table
CREATE INDEX IF NOT EXISTS idx_user_sessions_auth_user_id ON public.user_sessions (auth_user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_customer_id ON public.user_sessions (customer_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_start ON public.user_sessions (session_start);

-- Success message
SELECT 'STEP 1 COMPLETE: Basic tables created successfully!' as result;
