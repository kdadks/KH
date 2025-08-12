-- Test data for services_time_slots table
-- Run this in your Supabase SQL Editor to populate time slots

-- First, check existing services
SELECT id, name, in_hour_price, out_of_hour_price FROM services WHERE is_active = true ORDER BY id;

-- Clear existing time slots (optional - only if you want a fresh start)
-- DELETE FROM services_time_slots;

-- Add comprehensive time slots for all your services
-- Replace the service_id values (1, 2, 3, etc.) with your actual service IDs

-- Service ID 1 - Sample service
INSERT INTO services_time_slots (service_id, slot_type, day_of_week, start_time, end_time, is_available) VALUES
-- Monday to Friday - In-hour slots
(1, 'in-hour', 1, '09:00:00', '12:00:00', true),
(1, 'in-hour', 1, '13:00:00', '17:00:00', true),
(1, 'in-hour', 2, '09:00:00', '12:00:00', true),
(1, 'in-hour', 2, '13:00:00', '17:00:00', true),
(1, 'in-hour', 3, '09:00:00', '12:00:00', true),
(1, 'in-hour', 3, '13:00:00', '17:00:00', true),
(1, 'in-hour', 4, '09:00:00', '12:00:00', true),
(1, 'in-hour', 4, '13:00:00', '17:00:00', true),
(1, 'in-hour', 5, '09:00:00', '12:00:00', true),
(1, 'in-hour', 5, '13:00:00', '17:00:00', true),
-- Out-of-hour slots
(1, 'out-of-hour', 1, '07:00:00', '09:00:00', true),
(1, 'out-of-hour', 1, '17:00:00', '20:00:00', true),
(1, 'out-of-hour', 2, '07:00:00', '09:00:00', true),
(1, 'out-of-hour', 2, '17:00:00', '20:00:00', true),
(1, 'out-of-hour', 3, '07:00:00', '09:00:00', true),
(1, 'out-of-hour', 3, '17:00:00', '20:00:00', true),
(1, 'out-of-hour', 4, '07:00:00', '09:00:00', true),
(1, 'out-of-hour', 4, '17:00:00', '20:00:00', true),
(1, 'out-of-hour', 5, '07:00:00', '09:00:00', true),
(1, 'out-of-hour', 5, '17:00:00', '20:00:00', true),
(1, 'out-of-hour', 6, '09:00:00', '13:00:00', true), -- Saturday
(1, 'out-of-hour', 0, '09:00:00', '13:00:00', true); -- Sunday

-- Service ID 2 - Repeat for other services
INSERT INTO services_time_slots (service_id, slot_type, day_of_week, start_time, end_time, is_available) VALUES
(2, 'in-hour', 1, '09:00:00', '12:00:00', true),
(2, 'in-hour', 1, '13:00:00', '17:00:00', true),
(2, 'in-hour', 2, '09:00:00', '12:00:00', true),
(2, 'in-hour', 2, '13:00:00', '17:00:00', true),
(2, 'in-hour', 3, '09:00:00', '12:00:00', true),
(2, 'in-hour', 3, '13:00:00', '17:00:00', true),
(2, 'in-hour', 4, '09:00:00', '12:00:00', true),
(2, 'in-hour', 4, '13:00:00', '17:00:00', true),
(2, 'in-hour', 5, '09:00:00', '12:00:00', true),
(2, 'in-hour', 5, '13:00:00', '17:00:00', true),
(2, 'out-of-hour', 1, '07:00:00', '09:00:00', true),
(2, 'out-of-hour', 1, '17:00:00', '20:00:00', true),
(2, 'out-of-hour', 2, '07:00:00', '09:00:00', true),
(2, 'out-of-hour', 2, '17:00:00', '20:00:00', true),
(2, 'out-of-hour', 3, '07:00:00', '09:00:00', true),
(2, 'out-of-hour', 3, '17:00:00', '20:00:00', true),
(2, 'out-of-hour', 4, '07:00:00', '09:00:00', true),
(2, 'out-of-hour', 4, '17:00:00', '20:00:00', true),
(2, 'out-of-hour', 5, '07:00:00', '09:00:00', true),
(2, 'out-of-hour', 5, '17:00:00', '20:00:00', true),
(2, 'out-of-hour', 6, '09:00:00', '13:00:00', true),
(2, 'out-of-hour', 0, '09:00:00', '13:00:00', true);

-- Continue for more services as needed...
-- Service ID 3, 4, 5, 6, 7, etc.

-- Verify the inserted data
SELECT 
    s.id as service_id,
    s.name as service_name,
    st.slot_type,
    st.day_of_week,
    st.start_time,
    st.end_time,
    st.is_available
FROM services_time_slots st
JOIN services s ON st.service_id = s.id
ORDER BY s.id, st.slot_type, st.day_of_week, st.start_time;

-- Count slots per service
SELECT 
    service_id,
    s.name,
    slot_type,
    COUNT(*) as slot_count
FROM services_time_slots st
JOIN services s ON st.service_id = s.id
GROUP BY service_id, s.name, slot_type
ORDER BY service_id, slot_type;
