-- Quick fix: Add time slots for service ID 7 (Basic Wellness)
-- Run this in your Supabase SQL Editor

-- First, check what services exist
SELECT id, name FROM services WHERE is_active = true ORDER BY id;

-- Add time slots for service ID 7 (Basic Wellness)
-- In-hour slots (Business hours: Monday-Friday 9AM-5PM)
INSERT INTO services_time_slots (service_id, slot_type, day_of_week, start_time, end_time, is_available) VALUES
-- Monday
(7, 'in-hour', 1, '09:00:00', '12:00:00', true),
(7, 'in-hour', 1, '13:00:00', '17:00:00', true),
-- Tuesday  
(7, 'in-hour', 2, '09:00:00', '12:00:00', true),
(7, 'in-hour', 2, '13:00:00', '17:00:00', true),
-- Wednesday
(7, 'in-hour', 3, '09:00:00', '12:00:00', true),
(7, 'in-hour', 3, '13:00:00', '17:00:00', true),
-- Thursday
(7, 'in-hour', 4, '09:00:00', '12:00:00', true),
(7, 'in-hour', 4, '13:00:00', '17:00:00', true),
-- Friday
(7, 'in-hour', 5, '09:00:00', '12:00:00', true),
(7, 'in-hour', 5, '13:00:00', '17:00:00', true);

-- Out-of-hour slots (Early morning, evenings, weekends)
INSERT INTO services_time_slots (service_id, slot_type, day_of_week, start_time, end_time, is_available) VALUES
-- Early morning slots (Monday-Friday 7-9AM)
(7, 'out-of-hour', 1, '07:00:00', '09:00:00', true),
(7, 'out-of-hour', 2, '07:00:00', '09:00:00', true),
(7, 'out-of-hour', 3, '07:00:00', '09:00:00', true),
(7, 'out-of-hour', 4, '07:00:00', '09:00:00', true),
(7, 'out-of-hour', 5, '07:00:00', '09:00:00', true),
-- Evening slots (Monday-Friday 5-8PM)
(7, 'out-of-hour', 1, '17:00:00', '20:00:00', true),
(7, 'out-of-hour', 2, '17:00:00', '20:00:00', true),
(7, 'out-of-hour', 3, '17:00:00', '20:00:00', true),
(7, 'out-of-hour', 4, '17:00:00', '20:00:00', true),
(7, 'out-of-hour', 5, '17:00:00', '20:00:00', true),
-- Weekend slots (Saturday & Sunday 9AM-1PM) 
(7, 'out-of-hour', 6, '09:00:00', '13:00:00', true),
(7, 'out-of-hour', 0, '09:00:00', '13:00:00', true);

-- Verify the data was inserted
SELECT st.*, s.name as service_name 
FROM services_time_slots st 
JOIN services s ON st.service_id = s.id 
WHERE st.service_id = 7 
ORDER BY st.slot_type, st.day_of_week, st.start_time;
