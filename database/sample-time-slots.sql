-- Sample time slots data for testing dynamic booking form
-- Run this in your Supabase SQL editor to populate the services_time_slots table

-- First, let's see what services exist (you can run this to check your service IDs)
-- SELECT id, name FROM services WHERE is_active = true;

-- Insert sample time slots for service ID 1 (replace with your actual service IDs)
-- Assuming service ID 1 exists, add in-hour slots (Monday to Friday, 9AM-5PM)
INSERT INTO services_time_slots (service_id, slot_type, day_of_week, start_time, end_time, is_available) VALUES
-- Monday in-hour slots
(1, 'in-hour', 1, '09:00:00', '12:00:00', true),
(1, 'in-hour', 1, '13:00:00', '17:00:00', true),
-- Tuesday in-hour slots  
(1, 'in-hour', 2, '09:00:00', '12:00:00', true),
(1, 'in-hour', 2, '13:00:00', '17:00:00', true),
-- Wednesday in-hour slots
(1, 'in-hour', 3, '09:00:00', '12:00:00', true),
(1, 'in-hour', 3, '13:00:00', '17:00:00', true),
-- Thursday in-hour slots
(1, 'in-hour', 4, '09:00:00', '12:00:00', true),
(1, 'in-hour', 4, '13:00:00', '17:00:00', true),
-- Friday in-hour slots
(1, 'in-hour', 5, '09:00:00', '12:00:00', true),
(1, 'in-hour', 5, '13:00:00', '17:00:00', true);

-- Add out-of-hour slots (early morning, evenings, weekends)
INSERT INTO services_time_slots (service_id, slot_type, day_of_week, start_time, end_time, is_available) VALUES
-- Early morning slots (Monday to Friday, 7AM-9AM)
(1, 'out-of-hour', 1, '07:00:00', '09:00:00', true),
(1, 'out-of-hour', 2, '07:00:00', '09:00:00', true),
(1, 'out-of-hour', 3, '07:00:00', '09:00:00', true),
(1, 'out-of-hour', 4, '07:00:00', '09:00:00', true),
(1, 'out-of-hour', 5, '07:00:00', '09:00:00', true),
-- Evening slots (Monday to Friday, 5PM-8PM)
(1, 'out-of-hour', 1, '17:00:00', '20:00:00', true),
(1, 'out-of-hour', 2, '17:00:00', '20:00:00', true),
(1, 'out-of-hour', 3, '17:00:00', '20:00:00', true),
(1, 'out-of-hour', 4, '17:00:00', '20:00:00', true),
(1, 'out-of-hour', 5, '17:00:00', '20:00:00', true),
-- Weekend slots (Saturday, Sunday 9AM-1PM)
(1, 'out-of-hour', 6, '09:00:00', '13:00:00', true),
(1, 'out-of-hour', 0, '09:00:00', '13:00:00', true);

-- If you have more services, repeat for other service IDs
-- For service ID 2:
-- INSERT INTO services_time_slots (service_id, slot_type, day_of_week, start_time, end_time, is_available) VALUES
-- (2, 'in-hour', 1, '09:00:00', '17:00:00', true),
-- ... etc

-- Check the inserted data
-- SELECT * FROM services_time_slots ORDER BY service_id, day_of_week, start_time;
