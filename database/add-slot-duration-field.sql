-- Add slot_duration field to services_time_slots table
-- This allows admin to choose between 30-minute and 50-minute slots

ALTER TABLE services_time_slots 
ADD COLUMN IF NOT EXISTS slot_duration INTEGER DEFAULT 50 CHECK (slot_duration IN (30, 50));

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_services_time_slots_duration ON services_time_slots(slot_duration);

-- All existing slots should remain as 50-minute slots (which is already the default)