-- Create Payment Requests Table
CREATE TABLE IF NOT EXISTS payment_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL,
    service_name TEXT NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    deposit_amount DECIMAL(10, 2) NOT NULL,
    remaining_amount DECIMAL(10, 2) NOT NULL,
    status TEXT CHECK (status IN ('pending', 'paid', 'failed', 'expired')) DEFAULT 'pending',
    payment_type TEXT CHECK (payment_type IN ('deposit', 'full_payment')) DEFAULT 'deposit',
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    paid_at TIMESTAMP WITH TIME ZONE,
    transaction_id TEXT,
    payment_method TEXT,
    notes TEXT
);

-- Create Payment Confirmations Table
CREATE TABLE IF NOT EXISTS payment_confirmations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_request_id UUID NOT NULL REFERENCES payment_requests(id) ON DELETE CASCADE,
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL,
    amount_paid DECIMAL(10, 2) NOT NULL,
    transaction_id TEXT NOT NULL UNIQUE,
    payment_method TEXT NOT NULL,
    payment_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT CHECK (status IN ('confirmed', 'pending_verification', 'failed')) DEFAULT 'confirmed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_payment_requests_customer_id ON payment_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_booking_id ON payment_requests(booking_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_status ON payment_requests(status);
CREATE INDEX IF NOT EXISTS idx_payment_requests_payment_due_date ON payment_requests(payment_due_date);

CREATE INDEX IF NOT EXISTS idx_payment_confirmations_customer_id ON payment_confirmations(customer_id);
CREATE INDEX IF NOT EXISTS idx_payment_confirmations_booking_id ON payment_confirmations(booking_id);
CREATE INDEX IF NOT EXISTS idx_payment_confirmations_payment_request_id ON payment_confirmations(payment_request_id);
CREATE INDEX IF NOT EXISTS idx_payment_confirmations_transaction_id ON payment_confirmations(transaction_id);

-- Add service_cost column to bookings table if it doesn't exist
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS service_cost DECIMAL(10, 2) DEFAULT 0.00;

-- Create a trigger to automatically set service_cost based on service_name
-- This will be populated with actual service pricing
UPDATE bookings 
SET service_cost = CASE 
    WHEN service_name LIKE '%Sports Injury%' THEN 85.00
    WHEN service_name LIKE '%Manual Therapy%' THEN 75.00
    WHEN service_name LIKE '%Chronic Pain%' THEN 80.00
    WHEN service_name LIKE '%Post Surgery%' THEN 90.00
    WHEN service_name LIKE '%Neuromuscular%' THEN 85.00
    WHEN service_name LIKE '%Ergonomic%' THEN 70.00
    ELSE 75.00
END
WHERE service_cost = 0.00 OR service_cost IS NULL;

-- Enable Row Level Security
ALTER TABLE payment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_confirmations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payment_requests
CREATE POLICY "Users can view their own payment requests" ON payment_requests
    FOR SELECT USING (customer_id::text = auth.uid()::text);

CREATE POLICY "Users can update their own payment requests" ON payment_requests
    FOR UPDATE USING (customer_id::text = auth.uid()::text);

-- RLS Policies for payment_confirmations
CREATE POLICY "Users can view their own payment confirmations" ON payment_confirmations
    FOR SELECT USING (customer_id::text = auth.uid()::text);

-- Admin policies (users without customer profile can access all records)
CREATE POLICY "Admins can access all payment requests" ON payment_requests
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND NOT EXISTS (
                SELECT 1 FROM customers 
                WHERE customers.auth_user_id = auth.users.id
            )
        )
    );

CREATE POLICY "Admins can access all payment confirmations" ON payment_confirmations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND NOT EXISTS (
                SELECT 1 FROM customers 
                WHERE customers.auth_user_id = auth.users.id
            )
        )
    );

-- Insert policy for payment requests (for system/admin creation)
CREATE POLICY "System can insert payment requests" ON payment_requests
    FOR INSERT WITH CHECK (true);

CREATE POLICY "System can insert payment confirmations" ON payment_confirmations
    FOR INSERT WITH CHECK (true);

-- Grant necessary permissions
GRANT ALL ON payment_requests TO authenticated;
GRANT ALL ON payment_confirmations TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
