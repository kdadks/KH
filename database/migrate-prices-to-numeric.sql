-- Migration: Convert price fields from VARCHAR to NUMERIC
-- Date: February 7, 2026
-- Purpose: Store prices as numeric values for easier calculations
-- UI will append € symbol for display
-- IMPORTANT: This migration ONLY removes the € symbol, values remain unchanged

-- Step 1: Add new numeric columns
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS price_numeric NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS in_hour_price_numeric NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS out_of_hour_price_numeric NUMERIC(10, 2);

-- Step 2: Migrate existing data (strip € and currency symbols only - preserve exact values)
-- Handles "€120", "120", and NULL values
-- Does NOT alter the actual numeric values (e.g., €65 becomes 65, not 65.00)
UPDATE services 
SET 
  price_numeric = CASE 
    WHEN price IS NULL OR TRIM(price) = '' OR LOWER(price) LIKE '%contact%' THEN NULL
    ELSE CAST(REGEXP_REPLACE(price, '[^0-9.]', '', 'g') AS NUMERIC(10, 2))
  END,
  in_hour_price_numeric = CASE 
    WHEN in_hour_price IS NULL OR TRIM(in_hour_price) = '' THEN NULL
    ELSE CAST(REGEXP_REPLACE(in_hour_price, '[^0-9.]', '', 'g') AS NUMERIC(10, 2))
  END,
  out_of_hour_price_numeric = CASE 
    WHEN out_of_hour_price IS NULL OR TRIM(out_of_hour_price) = '' THEN NULL
    ELSE CAST(REGEXP_REPLACE(out_of_hour_price, '[^0-9.]', '', 'g') AS NUMERIC(10, 2))
  END
WHERE price IS NOT NULL OR in_hour_price IS NOT NULL OR out_of_hour_price IS NOT NULL;

-- Step 3: Drop old VARCHAR columns
ALTER TABLE services 
DROP COLUMN IF EXISTS price,
DROP COLUMN IF EXISTS in_hour_price,
DROP COLUMN IF EXISTS out_of_hour_price;

-- Step 4: Rename new columns to original names
ALTER TABLE services 
RENAME COLUMN price_numeric TO price;

ALTER TABLE services 
RENAME COLUMN in_hour_price_numeric TO in_hour_price;

ALTER TABLE services 
RENAME COLUMN out_of_hour_price_numeric TO out_of_hour_price;

-- Step 5: Add helpful comments
COMMENT ON COLUMN services.price IS 'Fixed price in EUR (numeric only, € symbol added in UI). Values preserved from original data.';
COMMENT ON COLUMN services.in_hour_price IS 'In-hour price in EUR (numeric only, € symbol added in UI). Values preserved from original data.';
COMMENT ON COLUMN services.out_of_hour_price IS 'Out-of-hour price in EUR (numeric only, € symbol added in UI). Values preserved from original data.';

-- Verification query (run this after migration to confirm values are unchanged):
-- SELECT id, name, 
--        price AS price_now, 
--        in_hour_price AS in_hour_now, 
--        out_of_hour_price AS out_of_hour_now 
-- FROM services 
-- ORDER BY id 
-- LIMIT 10;
