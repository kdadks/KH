-- Debug queries to check services and time slots availability
-- Run these in your Supabase SQL Editor to diagnose the issue

-- 1. Check what services exist and their structure
SELECT id, name, in_hour_price, out_of_hour_price, is_active 
FROM services 
WHERE is_active = true 
ORDER BY id;

-- 2. Check what time slots exist for each service
SELECT 
    s.id as service_id,
    s.name as service_name,
    st.slot_type,
    st.day_of_week,
    st.start_time,
    st.end_time,
    st.is_available
FROM services s
JOIN services_time_slots st ON s.id = st.service_id
WHERE s.is_active = true AND st.is_available = true
ORDER BY s.id, st.slot_type, st.day_of_week, st.start_time;

-- 3. Count slots per service
SELECT 
    s.id,
    s.name,
    COUNT(CASE WHEN st.slot_type = 'in-hour' THEN 1 END) as in_hour_slots,
    COUNT(CASE WHEN st.slot_type = 'out-of-hour' THEN 1 END) as out_of_hour_slots,
    COUNT(st.id) as total_slots
FROM services s
LEFT JOIN services_time_slots st ON s.id = st.service_id AND st.is_available = true
WHERE s.is_active = true
GROUP BY s.id, s.name
ORDER BY s.id;

-- 4. Test query to match what the admin modal is doing
-- Replace '1' with actual service ID you're testing
SELECT *
FROM services_time_slots
WHERE service_id = 1 
  AND is_available = true
ORDER BY day_of_week, start_time;
