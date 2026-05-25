-- Migration: Add date_of_birth column to customers table (if it doesn't already exist)
-- Run this in the Supabase SQL editor

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'customers'
      AND column_name = 'date_of_birth'
  ) THEN
    ALTER TABLE public.customers ADD COLUMN date_of_birth TEXT NULL;
    COMMENT ON COLUMN public.customers.date_of_birth IS 'Date of birth stored as TEXT (YYYY-MM-DD). May be encrypted for GDPR compliance.';
    RAISE NOTICE 'Column date_of_birth added to customers table.';
  ELSE
    -- Column exists but may be DATE type — cast to TEXT to allow encrypted values
    ALTER TABLE public.customers ALTER COLUMN date_of_birth TYPE TEXT USING date_of_birth::TEXT;
    RAISE NOTICE 'Column date_of_birth already exists — type ensured as TEXT.';
  END IF;
END $$;

-- Verify
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'customers'
  AND column_name = 'date_of_birth';
