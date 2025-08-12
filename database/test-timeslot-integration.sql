-- Test script to verify timeslot integration
-- Run these queries in your Supabase SQL Editor to test the implementation

-- 1. Verify new columns exist
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'bookings' 
  AND column_name IN ('timeslot_start_time', 'timeslot_end_time')
ORDER BY column_name;

-- 2. Check current bookings structure
SELECT id, customer_name, package_name, booking_date, 
       timeslot_start_time, timeslot_end_time, status,
       created_at
FROM bookings 
ORDER BY created_at DESC 
LIMIT 5;

-- 3. Test inserting a booking with timeslot data (replace with actual customer_id)
-- INSERT INTO bookings (
--   customer_name, customer_email, customer_phone, package_name,
--   booking_date, timeslot_start_time, timeslot_end_time,
--   notes, status
-- ) VALUES (
--   'John Doe', 'john@example.com', '+353123456789', 'Basic Physiotherapy',
--   '2025-08-15T09:00:00', '09:00:00', '12:00:00',
--   'Test booking with timeslot data', 'pending'
-- );

-- 4. Count bookings with vs without timeslot data
SELECT 
  COUNT(CASE WHEN timeslot_start_time IS NOT NULL AND timeslot_end_time IS NOT NULL THEN 1 END) as with_timeslot,
  COUNT(CASE WHEN timeslot_start_time IS NULL OR timeslot_end_time IS NULL THEN 1 END) as without_timeslot,
  COUNT(*) as total_bookings
FROM bookings;

-- 5. Show sample of bookings with timeslot ranges
SELECT 
  id,
  customer_name,
  package_name,
  DATE(booking_date) as booking_date,
  TIME(booking_date) as booking_time,
  timeslot_start_time,
  timeslot_end_time,
  CASE 
    WHEN timeslot_start_time IS NOT NULL AND timeslot_end_time IS NOT NULL 
    THEN CONCAT(timeslot_start_time, ' - ', timeslot_end_time)
    ELSE 'Legacy booking'
  END as timeslot_range
FROM bookings
WHERE status != 'cancelled'
ORDER BY booking_date DESC
LIMIT 10;
