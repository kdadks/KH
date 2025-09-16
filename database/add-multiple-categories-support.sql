-- Migration to support multiple categories per service
-- Change category column from VARCHAR to TEXT[] array

-- First, create a backup of existing data
CREATE TEMP TABLE services_backup AS
SELECT id, category FROM services WHERE category IS NOT NULL AND category != '';

-- Update the category column to TEXT[] array
ALTER TABLE services ALTER COLUMN category TYPE TEXT[] USING
  CASE
    WHEN category IS NULL OR category = '' THEN ARRAY[]::TEXT[]
    ELSE ARRAY[category]
  END;

-- Add a comment to document the change
COMMENT ON COLUMN services.category IS 'Array of categories this service belongs to. Supports multiple categories per service.';

-- Create an index for better performance with array operations
CREATE INDEX IF NOT EXISTS idx_services_categories ON services USING GIN (category);

-- Update the existing policies to work with arrays (no changes needed for basic CRUD)

-- Optional: Add a constraint to ensure categories array is not empty for active services
-- ALTER TABLE services ADD CONSTRAINT check_categories_not_empty
--   CHECK (is_active = false OR array_length(category, 1) > 0);