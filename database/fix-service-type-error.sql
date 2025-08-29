-- Fix service_type error by ensuring proper booking_id relationships
-- This script adds booking_id columns to payments and payment_requests tables if they don't exist
-- and provides a fallback solution for the missing service_type column

-- Step 1: Add booking_id to payment_requests table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'payment_requests' AND column_name = 'booking_id') THEN
        ALTER TABLE payment_requests 
        ADD COLUMN booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL;
        
        CREATE INDEX IF NOT EXISTS idx_payment_requests_booking_id ON payment_requests(booking_id);
        
        COMMENT ON COLUMN payment_requests.booking_id IS 'Links payment request to specific booking for accurate service-specific deposit tracking';
        
        RAISE NOTICE 'Added booking_id column to payment_requests table';
    ELSE
        RAISE NOTICE 'booking_id column already exists in payment_requests table';
    END IF;
END $$;

-- Step 2: Add booking_id to payments table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'payments' AND column_name = 'booking_id') THEN
        ALTER TABLE payments 
        ADD COLUMN booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL;
        
        CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);
        
        COMMENT ON COLUMN payments.booking_id IS 'Links payment to specific booking for accurate service-specific payment tracking';
        
        RAISE NOTICE 'Added booking_id column to payments table';
    ELSE
        RAISE NOTICE 'booking_id column already exists in payments table';
    END IF;
END $$;

-- Step 3: Optionally add service_type to invoices table as a fallback (if desired)
-- Uncomment the following if you want to add service_type column to invoices table
/*
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'invoices' AND column_name = 'service_type') THEN
        ALTER TABLE invoices 
        ADD COLUMN service_type TEXT;
        
        COMMENT ON COLUMN invoices.service_type IS 'Type of service for this invoice (fallback field)';
        
        RAISE NOTICE 'Added service_type column to invoices table';
    ELSE
        RAISE NOTICE 'service_type column already exists in invoices table';
    END IF;
END $$;
*/

-- Step 4: Verification queries
-- Check that booking_id columns exist
SELECT 
    'payment_requests' as table_name,
    COUNT(*) as column_exists
FROM information_schema.columns 
WHERE table_name = 'payment_requests' AND column_name = 'booking_id'
UNION ALL
SELECT 
    'payments' as table_name,
    COUNT(*) as column_exists
FROM information_schema.columns 
WHERE table_name = 'payments' AND column_name = 'booking_id';

-- Show sample data to verify relationships
SELECT 
    'Sample payment_requests with booking relationships' as description,
    COUNT(*) as total_payment_requests,
    COUNT(booking_id) as with_booking_id,
    COUNT(*) - COUNT(booking_id) as without_booking_id
FROM payment_requests;

SELECT 
    'Sample payments with booking relationships' as description,
    COUNT(*) as total_payments,
    COUNT(booking_id) as with_booking_id,
    COUNT(*) - COUNT(booking_id) as without_booking_id
FROM payments;

RAISE NOTICE 'Migration completed successfully. The service_type error should now be resolved.';
