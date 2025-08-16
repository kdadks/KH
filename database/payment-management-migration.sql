-- Payment Management Complete Migration Script
-- Execute this in Supabase SQL Editor to enable full payment management functionality

-- Step 1: Create payment_gateways table
CREATE TABLE IF NOT EXISTS payment_gateways (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    provider VARCHAR(20) NOT NULL CHECK (provider IN ('sumup', 'stripe', 'paypal')),
    environment VARCHAR(20) NOT NULL DEFAULT 'sandbox' CHECK (environment IN ('sandbox', 'production')),
    api_key TEXT NOT NULL,
    secret_key TEXT,
    webhook_url TEXT,
    merchant_id VARCHAR(100),
    client_id VARCHAR(100),
    is_active BOOLEAN DEFAULT false,
    configuration JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Step 2: Enable RLS for payment_gateways
ALTER TABLE payment_gateways ENABLE ROW LEVEL SECURITY;

-- Step 3: Create RLS policies for payment_gateways
CREATE POLICY "Allow admin access to payment gateways" ON payment_gateways
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admins 
            WHERE admins.email = auth.jwt() ->> 'email'
        )
    );

-- Step 4: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payment_gateways_provider ON payment_gateways(provider);
CREATE INDEX IF NOT EXISTS idx_payment_gateways_is_active ON payment_gateways(is_active);
CREATE INDEX IF NOT EXISTS idx_payment_gateways_environment ON payment_gateways(environment);

-- Step 5: Create trigger function for updated_at
CREATE OR REPLACE FUNCTION update_payment_gateways_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create trigger for payment_gateways
DROP TRIGGER IF EXISTS payment_gateways_updated_at ON payment_gateways;
CREATE TRIGGER payment_gateways_updated_at
    BEFORE UPDATE ON payment_gateways
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_gateways_updated_at();

-- Step 7: Enhance payment_requests table if needed
DO $$
BEGIN
    -- Add invoice_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'payment_requests' AND column_name = 'invoice_id') THEN
        ALTER TABLE payment_requests ADD COLUMN invoice_id INTEGER REFERENCES invoices(id);
    END IF;

    -- Add booking_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'payment_requests' AND column_name = 'booking_id') THEN
        ALTER TABLE payment_requests ADD COLUMN booking_id UUID REFERENCES bookings(id);
    END IF;

    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'payment_requests' AND column_name = 'updated_at') THEN
        ALTER TABLE payment_requests ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- Step 8: Create payments table for tracking successful payments
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_request_id UUID REFERENCES payment_requests(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    payment_method VARCHAR(50),
    transaction_id VARCHAR(100),
    gateway_id UUID REFERENCES payment_gateways(id),
    gateway_response JSONB DEFAULT '{}',
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Step 9: Enable RLS for payments
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Step 10: Create RLS policies for payments
CREATE POLICY "Allow admin access to payments" ON payments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admins 
            WHERE admins.email = auth.jwt() ->> 'email'
        )
    );

-- Step 11: Create indexes for payments
CREATE INDEX IF NOT EXISTS idx_payments_payment_request_id ON payments(payment_request_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_gateway_id ON payments(gateway_id);
CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON payments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);

-- Step 12: Create trigger for payments updated_at
CREATE OR REPLACE FUNCTION update_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS payments_updated_at ON payments;
CREATE TRIGGER payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_payments_updated_at();

-- Step 13: Create view for payment statistics
CREATE OR REPLACE VIEW payment_statistics AS
SELECT 
    COUNT(*) as total_requests,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_requests,
    COUNT(*) FILTER (WHERE status = 'paid') as paid_requests,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_requests,
    COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_requests,
    SUM(amount) as total_amount,
    SUM(amount) FILTER (WHERE status = 'paid') as paid_amount,
    SUM(amount) FILTER (WHERE status = 'pending') as outstanding_amount,
    CASE 
        WHEN COUNT(*) > 0 THEN 
            ROUND((COUNT(*) FILTER (WHERE status = 'paid')::DECIMAL / COUNT(*) * 100), 1)
        ELSE 0 
    END as payment_rate
FROM payment_requests;

-- Step 14: Create function to get bookings without payment requests
CREATE OR REPLACE FUNCTION get_bookings_without_payment_requests()
RETURNS TABLE (
    booking_id UUID,
    customer_name TEXT,
    customer_email TEXT,
    package_name TEXT,
    status TEXT,
    booking_date TIMESTAMP WITH TIME ZONE,
    has_payment_request BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.id,
        c.name,
        c.email,
        b.package_name,
        b.status,
        b.booking_date,
        FALSE as has_payment_request
    FROM bookings b
    JOIN customers c ON b.customer_id = c.id
    WHERE NOT EXISTS (
        SELECT 1 FROM payment_requests pr 
        WHERE pr.booking_id = b.id
    )
    ORDER BY b.booking_date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 15: Create function to get invoices with payment tracking
CREATE OR REPLACE FUNCTION get_invoices_with_payment_tracking()
RETURNS TABLE (
    invoice_id INTEGER,
    customer_id INTEGER,
    customer_name TEXT,
    total_amount DECIMAL,
    paid_amount DECIMAL,
    remaining_amount DECIMAL,
    status TEXT,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.id,
        i.customer_id,
        c.name,
        i.total_amount,
        COALESCE(SUM(pr.amount) FILTER (WHERE pr.status = 'paid'), 0) as paid_amount,
        i.total_amount - COALESCE(SUM(pr.amount) FILTER (WHERE pr.status = 'paid'), 0) as remaining_amount,
        i.status,
        i.created_at
    FROM invoices i
    JOIN customers c ON i.customer_id = c.id
    LEFT JOIN payment_requests pr ON pr.invoice_id = i.id
    GROUP BY i.id, i.customer_id, c.name, i.total_amount, i.status, i.created_at
    ORDER BY i.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 16: Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON payment_statistics TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_bookings_without_payment_requests() TO authenticated;
GRANT EXECUTE ON FUNCTION get_invoices_with_payment_tracking() TO authenticated;

-- Step 17: Insert default gateway (optional - remove if not needed)
INSERT INTO payment_gateways (name, provider, environment, api_key, is_active) 
VALUES ('Default SumUp Gateway', 'sumup', 'sandbox', 'replace-with-your-api-key', false)
ON CONFLICT DO NOTHING;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Payment Management migration completed successfully!';
    RAISE NOTICE 'You can now use the Payment Management module in the admin console.';
    RAISE NOTICE 'Remember to configure your payment gateways with real API keys.';
END $$;
