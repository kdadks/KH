-- Payment Management Safe Migration Script
-- This script can be run multiple times safely
-- Execute this in Supabase SQL Editor to enable payment management functionality

-- Begin transaction for safety
BEGIN;

-- Step 1: Create payment_gateways table safely
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_gateways') THEN
        CREATE TABLE payment_gateways (
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
        RAISE NOTICE '✓ Created payment_gateways table';
    ELSE
        RAISE NOTICE '• Payment_gateways table already exists';
    END IF;
END $$;

-- Step 2: Enable RLS for payment_gateways
ALTER TABLE payment_gateways ENABLE ROW LEVEL SECURITY;

-- Step 3: Create/recreate RLS policies for payment_gateways
DROP POLICY IF EXISTS "Allow admin access to payment gateways" ON payment_gateways;
CREATE POLICY "Allow admin access to payment gateways" ON payment_gateways
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admins 
            WHERE admins.email = auth.jwt() ->> 'email'
        )
    );
RAISE NOTICE '✓ Created RLS policy for payment_gateways';

-- Step 4: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payment_gateways_provider ON payment_gateways(provider);
CREATE INDEX IF NOT EXISTS idx_payment_gateways_is_active ON payment_gateways(is_active);
CREATE INDEX IF NOT EXISTS idx_payment_gateways_environment ON payment_gateways(environment);
RAISE NOTICE '✓ Created indexes for payment_gateways';

-- Step 5: Create/update trigger function for updated_at
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
RAISE NOTICE '✓ Created updated_at trigger for payment_gateways';

-- Step 7: Enhance existing payment_requests table safely
DO $$
DECLARE
    column_added BOOLEAN := FALSE;
BEGIN
    -- Add service_name column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'payment_requests' AND column_name = 'service_name') THEN
        ALTER TABLE payment_requests ADD COLUMN service_name TEXT;
        column_added := TRUE;
        RAISE NOTICE '✓ Added service_name column to payment_requests';
    END IF;

    -- Add due_date column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'payment_requests' AND column_name = 'due_date') THEN
        ALTER TABLE payment_requests ADD COLUMN due_date TIMESTAMP WITH TIME ZONE;
        column_added := TRUE;
        RAISE NOTICE '✓ Added due_date column to payment_requests';
    END IF;

    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'payment_requests' AND column_name = 'updated_at') THEN
        ALTER TABLE payment_requests ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
        column_added := TRUE;
        RAISE NOTICE '✓ Added updated_at column to payment_requests';
    END IF;

    -- Add booking_id column if it doesn't exist (for linking to bookings)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'payment_requests' AND column_name = 'booking_id') THEN
        -- Check if bookings table exists
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bookings') THEN
            ALTER TABLE payment_requests ADD COLUMN booking_id UUID;
            column_added := TRUE;
            RAISE NOTICE '✓ Added booking_id column to payment_requests';
        END IF;
    END IF;

    -- Add invoice_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'payment_requests' AND column_name = 'invoice_id') THEN
        ALTER TABLE payment_requests ADD COLUMN invoice_id INTEGER;
        column_added := TRUE;
        RAISE NOTICE '✓ Added invoice_id column to payment_requests';
    END IF;

    IF NOT column_added THEN
        RAISE NOTICE '• All payment_requests columns already exist';
    END IF;
END $$;

-- Step 8: Create payments_tracking table safely
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments_tracking') THEN
        CREATE TABLE payments_tracking (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            payment_request_id INTEGER REFERENCES payment_requests(id) ON DELETE CASCADE,
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
        RAISE NOTICE '✓ Created payments_tracking table';
    ELSE
        RAISE NOTICE '• Payments_tracking table already exists';
    END IF;
END $$;

-- Step 9: Enable RLS for payments_tracking
ALTER TABLE payments_tracking ENABLE ROW LEVEL SECURITY;

-- Step 10: Create/recreate RLS policies for payments_tracking
DROP POLICY IF EXISTS "Allow admin access to payments tracking" ON payments_tracking;
CREATE POLICY "Allow admin access to payments tracking" ON payments_tracking
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admins 
            WHERE admins.email = auth.jwt() ->> 'email'
        )
    );
RAISE NOTICE '✓ Created RLS policy for payments_tracking';

-- Step 11: Create indexes for payments_tracking
CREATE INDEX IF NOT EXISTS idx_payments_tracking_payment_request_id ON payments_tracking(payment_request_id);
CREATE INDEX IF NOT EXISTS idx_payments_tracking_status ON payments_tracking(status);
CREATE INDEX IF NOT EXISTS idx_payments_tracking_gateway_id ON payments_tracking(gateway_id);
CREATE INDEX IF NOT EXISTS idx_payments_tracking_transaction_id ON payments_tracking(transaction_id);
CREATE INDEX IF NOT EXISTS idx_payments_tracking_created_at ON payments_tracking(created_at);
RAISE NOTICE '✓ Created indexes for payments_tracking';

-- Step 12: Create trigger for payments_tracking updated_at
CREATE OR REPLACE FUNCTION update_payments_tracking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS payments_tracking_updated_at ON payments_tracking;
CREATE TRIGGER payments_tracking_updated_at
    BEFORE UPDATE ON payments_tracking
    FOR EACH ROW
    EXECUTE FUNCTION update_payments_tracking_updated_at();
RAISE NOTICE '✓ Created updated_at trigger for payments_tracking';

-- Step 13: Create updated_at trigger for payment_requests if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'payment_requests_updated_at') THEN
        CREATE OR REPLACE FUNCTION update_payment_requests_updated_at()
        RETURNS TRIGGER AS $func$
        BEGIN
            NEW.updated_at = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $func$ LANGUAGE plpgsql;

        CREATE TRIGGER payment_requests_updated_at
            BEFORE UPDATE ON payment_requests
            FOR EACH ROW
            EXECUTE FUNCTION update_payment_requests_updated_at();
        
        RAISE NOTICE '✓ Created updated_at trigger for payment_requests';
    ELSE
        RAISE NOTICE '• Updated_at trigger for payment_requests already exists';
    END IF;
END $$;

-- Step 14: Create/replace view for payment statistics
CREATE OR REPLACE VIEW payment_statistics AS
SELECT 
    COUNT(*) as total_requests,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_requests,
    COUNT(*) FILTER (WHERE status = 'paid') as paid_requests,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_requests,
    COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_requests,
    COALESCE(SUM(amount), 0) as total_amount,
    COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0) as paid_amount,
    COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0) as outstanding_amount,
    CASE 
        WHEN COUNT(*) > 0 THEN 
            ROUND((COUNT(*) FILTER (WHERE status = 'paid')::DECIMAL / COUNT(*) * 100), 1)
        ELSE 0 
    END as payment_rate
FROM payment_requests;
RAISE NOTICE '✓ Created payment_statistics view';

-- Step 15: Create/replace function to get bookings without payment requests
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
        COALESCE(c.name, 'Unknown') as customer_name,
        COALESCE(c.email, 'Unknown') as customer_email,
        COALESCE(b.package_name, 'Unknown Package') as package_name,
        COALESCE(b.status, 'unknown') as status,
        b.booking_date,
        FALSE as has_payment_request
    FROM bookings b
    LEFT JOIN customers c ON b.customer_id = c.id
    WHERE NOT EXISTS (
        SELECT 1 FROM payment_requests pr 
        WHERE pr.booking_id = b.id
    )
    ORDER BY b.booking_date DESC;
EXCEPTION
    WHEN undefined_table THEN
        -- If bookings table doesn't exist, return empty result
        RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
RAISE NOTICE '✓ Created get_bookings_without_payment_requests function';

-- Step 16: Create/replace function to get invoices with payment tracking
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
        COALESCE(c.name, 'Unknown') as customer_name,
        i.total_amount,
        COALESCE(SUM(pr.amount) FILTER (WHERE pr.status = 'paid'), 0) as paid_amount,
        i.total_amount - COALESCE(SUM(pr.amount) FILTER (WHERE pr.status = 'paid'), 0) as remaining_amount,
        i.status,
        i.created_at
    FROM invoices i
    LEFT JOIN customers c ON i.customer_id = c.id
    LEFT JOIN payment_requests pr ON pr.invoice_id = i.id
    GROUP BY i.id, i.customer_id, c.name, i.total_amount, i.status, i.created_at
    ORDER BY i.created_at DESC;
EXCEPTION
    WHEN undefined_table THEN
        -- If invoices table doesn't exist, return empty result
        RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
RAISE NOTICE '✓ Created get_invoices_with_payment_tracking function';

-- Step 17: Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON payment_statistics TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_bookings_without_payment_requests() TO authenticated;
GRANT EXECUTE ON FUNCTION get_invoices_with_payment_tracking() TO authenticated;
RAISE NOTICE '✓ Granted necessary permissions';

-- Step 18: Insert default SumUp gateway safely
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM payment_gateways WHERE name = 'SumUp Demo Gateway') THEN
        INSERT INTO payment_gateways (name, provider, environment, api_key, merchant_id, is_active) 
        VALUES ('SumUp Demo Gateway', 'sumup', 'sandbox', 'demo-api-key-replace-with-real', 'DEMO-MERCHANT-001', false);
        RAISE NOTICE '✓ Created default SumUp gateway';
    ELSE
        RAISE NOTICE '• Default SumUp gateway already exists';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '⚠ Could not insert default gateway: %', SQLERRM;
END $$;

-- Commit transaction
COMMIT;

-- Final success message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 ================================================';
    RAISE NOTICE '🎉  Payment Management Migration Completed!';
    RAISE NOTICE '🎉 ================================================';
    RAISE NOTICE '';
    RAISE NOTICE '📋 What was created/updated:';
    RAISE NOTICE '   • payment_gateways table with RLS policies';
    RAISE NOTICE '   • payments_tracking table with RLS policies';
    RAISE NOTICE '   • Enhanced payment_requests table';
    RAISE NOTICE '   • Payment statistics view';
    RAISE NOTICE '   • Helper functions for data retrieval';
    RAISE NOTICE '   • Default SumUp gateway configuration';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Next steps:';
    RAISE NOTICE '   1. Navigate to Admin Console → Payments';
    RAISE NOTICE '   2. Go to Payment Gateways tab';
    RAISE NOTICE '   3. Edit the demo gateway with your real API key';
    RAISE NOTICE '   4. Test the payment management functionality';
    RAISE NOTICE '';
    RAISE NOTICE '✅ All systems ready for payment management!';
END $$;
