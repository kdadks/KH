-- Add slot_type field to availability table for hours classification
-- This enables filtering of in-hour vs out-of-hour slots

DO $$
BEGIN
    -- Add slot_type column to availability table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_name = 'availability' AND column_name = 'slot_type') THEN
        ALTER TABLE public.availability
        ADD COLUMN slot_type VARCHAR(20) DEFAULT 'in-hour'
        CHECK (slot_type IN ('in-hour', 'out-of-hour'));

        -- Update existing slots based on time and day logic
        -- Out-of-hour slots are:
        -- 1. Weekend days (Saturday/Sunday)
        -- 2. Slots that start before 9 AM and don't extend past 9:15 AM
        -- 3. Slots that start at or after 5 PM
        -- Special rule: If slot starts before 9 AM but ends after 9:15 AM, consider it in-hour
        UPDATE public.availability
        SET slot_type = CASE
            WHEN EXTRACT(DOW FROM date) IN (0, 6) THEN 'out-of-hour'  -- Weekend
            WHEN (start_time < '09:00' AND end_time >= '09:15') THEN 'in-hour'  -- Early start but overlaps business hours
            WHEN (start_time < '09:00' OR start_time >= '17:00') THEN 'out-of-hour'  -- Outside business hours
            ELSE 'in-hour'
        END
        WHERE slot_type IS NULL OR slot_type = 'in-hour';

        RAISE NOTICE 'Added slot_type column to availability table and updated existing records';
    ELSE
        RAISE NOTICE 'slot_type column already exists in availability table';
    END IF;
END $$;

-- Create index for better performance on slot_type queries
CREATE INDEX IF NOT EXISTS idx_availability_slot_type ON public.availability (slot_type);

-- Create combined index for date + slot_type queries (common in booking system)
CREATE INDEX IF NOT EXISTS idx_availability_date_slot_type ON public.availability (date, slot_type);

COMMENT ON COLUMN public.availability.slot_type IS 'Classification of slot timing: in-hour (Mon-Fri, starts 9AM-5PM OR starts before 9AM but ends after 9:15AM) or out-of-hour (weekends, early/late without overlap)';