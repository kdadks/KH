-- Create proper payment_requests and payments tables to match TypeScript interfaces
-- This will replace/align with the existing schema

-- Drop existing tables if they exist (to start fresh)
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.payment_requests CASCADE;

-- Create payment_requests table matching PaymentRequest interface
CREATE TABLE public.payment_requests (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    invoice_id INTEGER NULL, -- Optional invoice reference
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'paid', 'expired', 'cancelled')),
    email_sent_at TIMESTAMP WITH TIME ZONE NULL,
    payment_due_date TIMESTAMP WITH TIME ZONE NULL,
    notes TEXT NULL,
    created_by_admin_email VARCHAR(255) NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create payments table matching Payment interface  
CREATE TABLE public.payments (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER NULL,
    customer_id INTEGER NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    sumup_transaction_id VARCHAR(255) NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'failed', 'refunded', 'cancelled')),
    payment_method VARCHAR(50) NULL,
    sumup_checkout_id VARCHAR(255) NULL,
    sumup_payment_type VARCHAR(50) NULL,
    failure_reason TEXT NULL,
    refund_amount DECIMAL(10,2) NULL,
    refund_reason TEXT NULL,
    payment_date TIMESTAMP WITH TIME ZONE NULL,
    notes TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_payment_requests_customer_id ON public.payment_requests(customer_id);
CREATE INDEX idx_payment_requests_status ON public.payment_requests(status);
CREATE INDEX idx_payment_requests_created_at ON public.payment_requests(created_at);

CREATE INDEX idx_payments_customer_id ON public.payments(customer_id);
CREATE INDEX idx_payments_status ON public.payments(status);
CREATE INDEX idx_payments_created_at ON public.payments(created_at);
CREATE INDEX idx_payments_sumup_transaction_id ON public.payments(sumup_transaction_id);

-- Enable RLS (Row Level Security)
ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payment_requests
CREATE POLICY "Users can view their own payment requests" 
ON public.payment_requests FOR SELECT 
USING (customer_id = (SELECT id FROM public.customers WHERE email = auth.jwt() ->> 'email'));

CREATE POLICY "Admins can view all payment requests" 
ON public.payment_requests FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM public.admins 
    WHERE email = auth.jwt() ->> 'email' AND is_active = true
));

CREATE POLICY "System can insert payment requests" 
ON public.payment_requests FOR INSERT 
WITH CHECK (true);

-- RLS Policies for payments
CREATE POLICY "Users can view their own payments" 
ON public.payments FOR SELECT 
USING (customer_id = (SELECT id FROM public.customers WHERE email = auth.jwt() ->> 'email'));

CREATE POLICY "Admins can view all payments" 
ON public.payments FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM public.admins 
    WHERE email = auth.jwt() ->> 'email' AND is_active = true
));

CREATE POLICY "System can insert payments" 
ON public.payments FOR INSERT 
WITH CHECK (true);

-- Grant permissions
GRANT ALL ON public.payment_requests TO authenticated;
GRANT ALL ON public.payments TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE payment_requests_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE payments_id_seq TO authenticated;
