-- Quick check to see if service_name column exists in payment_requests table
-- Run this in Supabase SQL Editor to verify the column exists

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'payment_requests' 
  AND column_name IN ('service_name', 'due_date', 'booking_id', 'invoice_id')
ORDER BY column_name;
