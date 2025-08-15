-- Execute this SQL in Supabase Dashboard to:
-- 1. Add booking_id column to payments table
-- 2. Reset all ID sequences to start from 1
-- 3. Clear all data and start fresh

-- STEP 1: Add booking_id to payments table
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS booking_id uuid;

ALTER TABLE public.payments 
ADD CONSTRAINT IF NOT EXISTS payments_booking_id_fkey 
FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_payments_booking_id 
ON public.payments USING btree (booking_id);

-- STEP 2: Clear all data from tables (CAREFUL - THIS DELETES ALL DATA!)
-- Uncomment these lines if you want to clear all data:

-- TRUNCATE TABLE payment_requests RESTART IDENTITY CASCADE;
-- TRUNCATE TABLE payments RESTART IDENTITY CASCADE;  
-- TRUNCATE TABLE customers RESTART IDENTITY CASCADE;
-- TRUNCATE TABLE invoices RESTART IDENTITY CASCADE;
-- TRUNCATE TABLE invoice_items RESTART IDENTITY CASCADE;

-- STEP 3: Reset all ID sequences to start from 1
-- (Run this even if you don't clear data to reset sequences)

ALTER SEQUENCE customers_id_seq RESTART WITH 1;
ALTER SEQUENCE payments_id_seq RESTART WITH 1;
ALTER SEQUENCE payment_requests_id_seq RESTART WITH 1;

-- Reset other sequences if they exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.sequences WHERE sequence_name = 'invoices_id_seq') THEN
        ALTER SEQUENCE invoices_id_seq RESTART WITH 1;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.sequences WHERE sequence_name = 'invoice_items_id_seq') THEN
        ALTER SEQUENCE invoice_items_id_seq RESTART WITH 1;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.sequences WHERE sequence_name = 'services_id_seq') THEN
        ALTER SEQUENCE services_id_seq RESTART WITH 1;
    END IF;
END $$;

-- VERIFICATION: Check that booking_id column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'payments' 
  AND column_name = 'booking_id';

-- VERIFICATION: Check sequence values
SELECT 
    schemaname,
    sequencename, 
    last_value,
    start_value
FROM pg_sequences 
WHERE schemaname = 'public' 
  AND sequencename LIKE '%_id_seq'
ORDER BY sequencename;
