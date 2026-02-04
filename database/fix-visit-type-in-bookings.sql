-- Check visit_type in bookings table
-- This verifies the visit_type column and shows current data distribution

-- Verify column exists (should already exist)
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'bookings' AND column_name = 'visit_type';

-- Show current visit_type distribution including NULL values
SELECT 
  COALESCE(visit_type, 'NULL') as visit_type, 
  COUNT(*) as count 
FROM bookings 
GROUP BY visit_type
ORDER BY visit_type;

-- Optional: If you want to update existing NULL values to 'clinic' for historical data only
-- Uncomment the following line if needed:
-- UPDATE bookings SET visit_type = 'clinic' WHERE visit_type IS NULL;

-- Add index for better query performance if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_bookings_visit_type ON bookings(visit_type);
