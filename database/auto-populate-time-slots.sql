-- STEP 1: Check your existing services and their IDs
-- Run this first to see what services you have
SELECT id, name, category, in_hour_price, out_of_hour_price, is_active 
FROM services 
WHERE is_active = true 
ORDER BY id;

-- STEP 2: Check if services_time_slots table has any data
SELECT COUNT(*) as total_slots FROM services_time_slots;

-- STEP 3: If you need to clear existing time slots (optional)
-- DELETE FROM services_time_slots WHERE service_id IN (SELECT id FROM services WHERE is_active = true);

-- STEP 4: Add time slots for ALL your active services
-- This will work for any service IDs you have

-- For EACH service that has in_hour_price or out_of_hour_price, add time slots
DO $$
DECLARE
    service_rec RECORD;
BEGIN
    -- Loop through all active services
    FOR service_rec IN 
        SELECT id, name, in_hour_price, out_of_hour_price 
        FROM services 
        WHERE is_active = true 
    LOOP
        RAISE NOTICE 'Processing service: % (ID: %)', service_rec.name, service_rec.id;
        
        -- Add in-hour slots if service has in_hour_price
        IF service_rec.in_hour_price IS NOT NULL AND service_rec.in_hour_price != '' THEN
            -- Monday to Friday, 9AM-12PM and 1PM-5PM
            INSERT INTO services_time_slots (service_id, slot_type, day_of_week, start_time, end_time, is_available) VALUES
            -- Monday
            (service_rec.id, 'in-hour', 1, '09:00:00', '12:00:00', true),
            (service_rec.id, 'in-hour', 1, '13:00:00', '17:00:00', true),
            -- Tuesday
            (service_rec.id, 'in-hour', 2, '09:00:00', '12:00:00', true),
            (service_rec.id, 'in-hour', 2, '13:00:00', '17:00:00', true),
            -- Wednesday
            (service_rec.id, 'in-hour', 3, '09:00:00', '12:00:00', true),
            (service_rec.id, 'in-hour', 3, '13:00:00', '17:00:00', true),
            -- Thursday
            (service_rec.id, 'in-hour', 4, '09:00:00', '12:00:00', true),
            (service_rec.id, 'in-hour', 4, '13:00:00', '17:00:00', true),
            -- Friday
            (service_rec.id, 'in-hour', 5, '09:00:00', '12:00:00', true),
            (service_rec.id, 'in-hour', 5, '13:00:00', '17:00:00', true);
            
            RAISE NOTICE 'Added in-hour slots for service: %', service_rec.name;
        END IF;
        
        -- Add out-of-hour slots if service has out_of_hour_price  
        IF service_rec.out_of_hour_price IS NOT NULL AND service_rec.out_of_hour_price != '' THEN
            -- Early morning, evenings, and weekends
            INSERT INTO services_time_slots (service_id, slot_type, day_of_week, start_time, end_time, is_available) VALUES
            -- Monday to Friday - Early morning
            (service_rec.id, 'out-of-hour', 1, '07:00:00', '09:00:00', true),
            (service_rec.id, 'out-of-hour', 2, '07:00:00', '09:00:00', true),
            (service_rec.id, 'out-of-hour', 3, '07:00:00', '09:00:00', true),
            (service_rec.id, 'out-of-hour', 4, '07:00:00', '09:00:00', true),
            (service_rec.id, 'out-of-hour', 5, '07:00:00', '09:00:00', true),
            -- Monday to Friday - Evenings
            (service_rec.id, 'out-of-hour', 1, '17:00:00', '20:00:00', true),
            (service_rec.id, 'out-of-hour', 2, '17:00:00', '20:00:00', true),
            (service_rec.id, 'out-of-hour', 3, '17:00:00', '20:00:00', true),
            (service_rec.id, 'out-of-hour', 4, '17:00:00', '20:00:00', true),
            (service_rec.id, 'out-of-hour', 5, '17:00:00', '20:00:00', true),
            -- Weekends
            (service_rec.id, 'out-of-hour', 6, '09:00:00', '13:00:00', true), -- Saturday
            (service_rec.id, 'out-of-hour', 0, '09:00:00', '13:00:00', true); -- Sunday
            
            RAISE NOTICE 'Added out-of-hour slots for service: %', service_rec.name;
        END IF;
    END LOOP;
END $$;

-- STEP 5: Verify the data was inserted correctly
SELECT 
    s.id,
    s.name,
    st.slot_type,
    COUNT(*) as slot_count
FROM services s
LEFT JOIN services_time_slots st ON s.id = st.service_id
WHERE s.is_active = true
GROUP BY s.id, s.name, st.slot_type
ORDER BY s.id, st.slot_type;

-- STEP 6: Show sample time slots for verification
SELECT 
    s.name as service_name,
    st.slot_type,
    st.day_of_week,
    st.start_time,
    st.end_time
FROM services_time_slots st
JOIN services s ON st.service_id = s.id
WHERE s.is_active = true
ORDER BY s.id, st.slot_type, st.day_of_week, st.start_time
LIMIT 20;
