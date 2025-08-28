-- Manual backfill script for booking references
-- Run this if you're still seeing UUID references instead of date-based ones

-- First, check which bookings don't have booking_reference
SELECT 
    id,
    booking_date,
    package_name,
    booking_reference,
    CASE 
        WHEN booking_reference IS NULL THEN 'NEEDS_UPDATE'
        WHEN booking_reference ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}-[0-9]{3}$' THEN 'CORRECT_FORMAT'
        ELSE 'WRONG_FORMAT'
    END as status
FROM public.bookings 
ORDER BY booking_date DESC;

-- Manual backfill for any bookings that still don't have references
DO $$
DECLARE
    booking_record RECORD;
    new_reference TEXT;
    booking_date_only DATE;
    error_count INTEGER := 0;
    success_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Starting manual backfill for booking references...';
    
    -- Process bookings that don't have booking_reference
    FOR booking_record IN 
        SELECT id, booking_date, package_name
        FROM public.bookings 
        WHERE booking_reference IS NULL OR booking_reference = ''
        ORDER BY booking_date, created_at
    LOOP
        BEGIN
            -- Extract date from booking_date
            IF booking_record.booking_date IS NOT NULL THEN
                -- Handle both timestamp and date formats
                booking_date_only := DATE(booking_record.booking_date);
            ELSE
                -- Fallback to current date if booking_date is null
                booking_date_only := CURRENT_DATE;
            END IF;
            
            -- Generate reference for this booking
            new_reference := generate_booking_reference(booking_date_only);
            
            -- Update the booking with the new reference
            UPDATE public.bookings 
            SET booking_reference = new_reference 
            WHERE id = booking_record.id;
            
            success_count := success_count + 1;
            RAISE NOTICE 'SUCCESS: Updated booking % (%) with reference %', 
                booking_record.id, booking_record.package_name, new_reference;
                
        EXCEPTION WHEN OTHERS THEN
            error_count := error_count + 1;
            RAISE NOTICE 'ERROR: Failed to update booking % (%) - %', 
                booking_record.id, booking_record.package_name, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE 'Backfill completed: % successful, % errors', success_count, error_count;
END $$;

-- Verify the backfill worked
SELECT 
    COUNT(*) as total_bookings,
    COUNT(booking_reference) as bookings_with_references,
    COUNT(*) - COUNT(booking_reference) as bookings_without_references,
    COUNT(CASE WHEN booking_reference ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}-[0-9]{3}$' THEN 1 END) as correct_format_count
FROM public.bookings;

-- Show a sample of the updated booking references
SELECT 
    booking_reference,
    booking_date,
    package_name,
    created_at
FROM public.bookings 
WHERE booking_reference IS NOT NULL 
ORDER BY booking_reference DESC 
LIMIT 15;
