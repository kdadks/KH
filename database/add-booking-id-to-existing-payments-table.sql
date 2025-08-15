-- Add booking_id column to existing payments table to properly link payments to specific bookings
-- This will resolve the payment status display issue where completed payments show as "Request sent"

-- Add the booking_id column (UUID type to match bookings.id)
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS booking_id uuid;

-- Add foreign key constraint to link payments to bookings
ALTER TABLE public.payments 
ADD CONSTRAINT payments_booking_id_fkey 
FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE SET NULL;

-- Create index for performance (matching the existing pattern)
CREATE INDEX IF NOT EXISTS idx_payments_booking_id 
ON public.payments USING btree (booking_id) TABLESPACE pg_default;

-- Verify the column was added successfully
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'payments' 
  AND column_name = 'booking_id';

-- Check the foreign key constraint was created
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'payments'
  AND kcu.column_name = 'booking_id';
