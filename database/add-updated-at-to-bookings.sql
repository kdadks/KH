-- Add updated_at column to bookings table
-- This fixes the error: "Could not find the 'updated_at' column of 'bookings' in the schema cache"

-- Add updated_at column to bookings table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bookings' 
        AND column_name = 'updated_at'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.bookings 
        ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        
        -- Update existing records to have a proper updated_at value
        UPDATE public.bookings 
        SET updated_at = COALESCE(created_at, NOW())
        WHERE updated_at IS NULL;
        
        RAISE NOTICE 'Added updated_at column to bookings table and populated existing records';
    ELSE
        RAISE NOTICE 'updated_at column already exists in bookings table';
    END IF;
END $$;

-- Create a trigger to automatically update the updated_at column when a booking is modified
CREATE OR REPLACE FUNCTION update_bookings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the trigger if it exists and create it fresh
DROP TRIGGER IF EXISTS trigger_update_bookings_updated_at ON public.bookings;
CREATE TRIGGER trigger_update_bookings_updated_at
    BEFORE UPDATE ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_bookings_updated_at();

-- Add a comment to document the column
COMMENT ON COLUMN public.bookings.updated_at IS 'Timestamp when the booking record was last updated. Automatically maintained by trigger.';

-- Verification: Check that the column was added
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'bookings' 
  AND column_name = 'updated_at';

-- Verification: Check that the trigger was created
SELECT 
    trigger_name, 
    event_manipulation, 
    action_timing, 
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'bookings' 
  AND trigger_name = 'trigger_update_bookings_updated_at';