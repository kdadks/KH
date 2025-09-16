-- Fix slot_type categorization to properly handle early morning slots that overlap business hours
-- Issue: 8:55-9:45 AM slots should be 'in-hour' but are incorrectly categorized as 'out-of-hour'
--
-- INSTRUCTIONS TO RUN THIS SCRIPT:
-- 1. Connect to your database using: psql $DATABASE_URL
-- 2. Run this file: \i database/fix-slot-type-categorization.sql
-- OR
-- Copy and paste this entire script into your database management tool

-- First, show current problematic slots before the fix
SELECT
    date,
    start_time,
    end_time,
    slot_type,
    CASE
        WHEN EXTRACT(DOW FROM date) IN (0, 6) THEN 'Weekend - should be out-of-hour'
        WHEN end_time >= '09:15' AND start_time < '17:00' THEN 'Should be in-hour (ends >= 9:15 AM)'
        WHEN start_time >= '17:00' THEN 'Should be out-of-hour (starts >= 5 PM)'
        WHEN start_time < '09:00' AND end_time < '09:15' THEN 'Should be out-of-hour (early, ends < 9:15 AM)'
        ELSE 'Should be in-hour (standard hours)'
    END as correct_classification
FROM public.availability
WHERE start_time = '08:55:00' AND end_time = '09:45:00'
ORDER BY date
LIMIT 10;

DO $$
BEGIN
    RAISE NOTICE 'Starting slot_type categorization fix...';

    -- Count current incorrect categorizations
    DECLARE
        incorrect_count INTEGER;
    BEGIN
        SELECT COUNT(*) INTO incorrect_count
        FROM public.availability
        WHERE (
            -- Weekday slots ending >= 9:15 AM but marked as out-of-hour
            (EXTRACT(DOW FROM date) NOT IN (0, 6) AND end_time >= '09:15' AND start_time < '17:00' AND slot_type = 'out-of-hour')
            OR
            -- Early slots ending < 9:15 AM but marked as in-hour
            (start_time < '09:00' AND end_time < '09:15' AND slot_type = 'in-hour')
        );

        RAISE NOTICE 'Found % slots with incorrect categorization', incorrect_count;
    END;

    -- Update the categorization logic with improved rules
    UPDATE public.availability
    SET slot_type = CASE
        -- Weekend slots are always out-of-hour
        WHEN EXTRACT(DOW FROM date) IN (0, 6) THEN 'out-of-hour'

        -- Slots that end at or after 9:15 AM on weekdays are in-hour (even if they start early)
        -- This fixes the 8:55-9:45 AM issue
        WHEN end_time >= '09:15' AND start_time < '17:00' THEN 'in-hour'

        -- Slots that start at or after 5 PM are out-of-hour
        WHEN start_time >= '17:00' THEN 'out-of-hour'

        -- Slots that start before 9 AM and end before 9:15 AM are out-of-hour
        WHEN start_time < '09:00' AND end_time < '09:15' THEN 'out-of-hour'

        -- All other weekday slots (9 AM - 5 PM) are in-hour
        ELSE 'in-hour'
    END;

    -- Count how many rows were affected
    GET DIAGNOSTICS incorrect_count = ROW_COUNT;
    RAISE NOTICE 'Updated % slots with corrected categorization', incorrect_count;

    RAISE NOTICE 'Slot categorization rules applied:';
    RAISE NOTICE '✓ Weekend slots → out-of-hour';
    RAISE NOTICE '✓ Weekday slots ending >= 9:15 AM and starting < 5 PM → in-hour';
    RAISE NOTICE '✓ Slots starting >= 5 PM → out-of-hour';
    RAISE NOTICE '✓ Early slots ending < 9:15 AM → out-of-hour';
    RAISE NOTICE '✓ All other weekday slots → in-hour';

END $$;

-- Show the fix results for the problematic 8:55-9:45 slots
RAISE NOTICE 'Checking 8:55-9:45 AM slots after fix:';
SELECT
    date,
    start_time,
    end_time,
    slot_type,
    'Fixed: Should now be in-hour' as status
FROM public.availability
WHERE start_time = '08:55:00' AND end_time = '09:45:00'
ORDER BY date
LIMIT 5;

-- Update the comment to reflect the corrected logic
COMMENT ON COLUMN public.availability.slot_type IS 'Classification of slot timing: in-hour (Mon-Fri slots that end at/after 9:15AM and start before 5PM) or out-of-hour (weekends, early slots ending before 9:15AM, or late slots starting at/after 5PM)';