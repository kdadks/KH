-- Migration to allow date_of_birth encryption
-- This changes the date_of_birth column from DATE to TEXT to allow encrypted strings

-- Change existing column to TEXT to allow encryption
ALTER TABLE public.customers ALTER COLUMN date_of_birth TYPE TEXT;

-- Add comment to document the change
COMMENT ON COLUMN public.customers.date_of_birth IS 'Encrypted date of birth stored as TEXT for privacy compliance';

-- Verify the column type change
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'customers' AND column_name = 'date_of_birth';
