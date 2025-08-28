-- Add booking reference system with date-based format: YYYY-MM-DD-000
-- This migration adds a booking_reference column and creates functions to generate unique daily references

-- Step 1: Add booking_reference column to bookings table
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS booking_reference VARCHAR(15) UNIQUE;

-- Step 2: Create index for performance
CREATE INDEX IF NOT EXISTS idx_bookings_reference ON public.bookings(booking_reference);

-- Step 3: Create function to generate next booking reference for a given date
CREATE OR REPLACE FUNCTION generate_booking_reference(booking_date DATE)
RETURNS TEXT AS $$
DECLARE
    date_prefix TEXT;
    max_counter INTEGER;
    next_counter TEXT;
BEGIN
    -- Format date as YYYY-MM-DD
    date_prefix := TO_CHAR(booking_date, 'YYYY-MM-DD');
    
    -- Find the highest counter for this date
    SELECT COALESCE(
        MAX(
            CASE 
                WHEN booking_reference ~ ('^' || date_prefix || '-[0-9]{3}$') 
                THEN CAST(RIGHT(booking_reference, 3) AS INTEGER)
                ELSE 0
            END
        ), 0
    ) INTO max_counter
    FROM public.bookings 
    WHERE booking_reference LIKE date_prefix || '-%';
    
    -- Generate next counter (increment by 1, pad to 3 digits)
    next_counter := LPAD((max_counter + 1)::TEXT, 3, '0');
    
    -- Return the full reference
    RETURN date_prefix || '-' || next_counter;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create function to auto-generate reference on booking insert
CREATE OR REPLACE FUNCTION auto_generate_booking_reference()
RETURNS TRIGGER AS $$
BEGIN
    -- Only generate reference if not already set
    IF NEW.booking_reference IS NULL THEN
        NEW.booking_reference := generate_booking_reference(NEW.booking_date::DATE);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create trigger to auto-generate booking references
DROP TRIGGER IF EXISTS trigger_auto_booking_reference ON public.bookings;
CREATE TRIGGER trigger_auto_booking_reference
    BEFORE INSERT ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION auto_generate_booking_reference();

-- Step 6: Backfill existing bookings with new reference format
-- This updates existing bookings to have the new reference format
DO $$
DECLARE
    booking_record RECORD;
    new_reference TEXT;
    booking_date_only DATE;
BEGIN
    -- Update existing bookings that don't have a booking_reference
    FOR booking_record IN 
        SELECT id, booking_date 
        FROM public.bookings 
        WHERE booking_reference IS NULL
        ORDER BY booking_date, created_at
    LOOP
        -- Extract date from booking_date (handle both DATE and TIMESTAMP types)
        BEGIN
            IF booking_record.booking_date IS NOT NULL THEN
                booking_date_only := booking_record.booking_date::DATE;
            ELSE
                booking_date_only := CURRENT_DATE;
            END IF;
            
            -- Generate reference for this booking
            new_reference := generate_booking_reference(booking_date_only);
            
            -- Update the booking with the new reference
            UPDATE public.bookings 
            SET booking_reference = new_reference 
            WHERE id = booking_record.id;
            
            RAISE NOTICE 'Updated booking % with reference %', booking_record.id, new_reference;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Failed to update booking %: %', booking_record.id, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE 'Backfilled booking references for existing bookings';
END $$;

-- Step 7: Add comment to explain the purpose
COMMENT ON COLUMN public.bookings.booking_reference IS 'Unique booking reference in format YYYY-MM-DD-000, auto-generated based on booking date';
COMMENT ON FUNCTION generate_booking_reference(DATE) IS 'Generates next available booking reference for a given date in format YYYY-MM-DD-000';
COMMENT ON FUNCTION auto_generate_booking_reference() IS 'Trigger function to auto-generate booking reference on insert';

-- Step 8: Grant necessary permissions
GRANT EXECUTE ON FUNCTION generate_booking_reference(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION auto_generate_booking_reference() TO authenticated;

-- Verification queries
-- Check that the function works correctly
SELECT generate_booking_reference(CURRENT_DATE) as sample_reference;

-- Check that existing bookings now have references
SELECT COUNT(*) as total_bookings, 
       COUNT(booking_reference) as bookings_with_references,
       COUNT(*) - COUNT(booking_reference) as bookings_without_references
FROM public.bookings;

-- Show sample booking references
SELECT booking_reference, booking_date, package_name 
FROM public.bookings 
WHERE booking_reference IS NOT NULL 
ORDER BY booking_reference DESC 
LIMIT 10;
