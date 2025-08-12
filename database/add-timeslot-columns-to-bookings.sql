-- Add timeslot start and end time columns to bookings table
-- Run this in your Supabase SQL Editor to add the new columns

-- Add timeslot_start_time column
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS timeslot_start_time TIME;

-- Add timeslot_end_time column  
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS timeslot_end_time TIME;

-- Add comments to document the new columns
COMMENT ON COLUMN bookings.timeslot_start_time IS 'Start time of the booked timeslot from services_time_slots table';
COMMENT ON COLUMN bookings.timeslot_end_time IS 'End time of the booked timeslot from services_time_slots table';

-- Verify the changes
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'bookings' 
  AND column_name IN ('timeslot_start_time', 'timeslot_end_time')
ORDER BY column_name;

-- Show sample of updated table structure
SELECT * FROM bookings LIMIT 5;
