-- Services Management Table Schema
-- This script updates the services table to use numeric price columns
-- Use this ONLY if the table already exists and you want to update the column types

-- Update existing price columns from VARCHAR to NUMERIC
-- This will preserve existing data by converting string prices to numeric

-- Step 1: Add temporary numeric columns
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS price_temp NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS in_hour_price_temp NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS out_of_hour_price_temp NUMERIC(10, 2);

-- Step 2: Copy data, stripping € symbols and converting to numeric
UPDATE services 
SET 
  price_temp = CASE 
    WHEN price IS NULL OR TRIM(price::text) = '' OR LOWER(price::text) LIKE '%contact%' THEN NULL
    ELSE CAST(REGEXP_REPLACE(price::text, '[^0-9.]', '', 'g') AS NUMERIC(10, 2))
  END,
  in_hour_price_temp = CASE 
    WHEN in_hour_price IS NULL OR TRIM(in_hour_price::text) = '' THEN NULL
    ELSE CAST(REGEXP_REPLACE(in_hour_price::text, '[^0-9.]', '', 'g') AS NUMERIC(10, 2))
  END,
  out_of_hour_price_temp = CASE 
    WHEN out_of_hour_price IS NULL OR TRIM(out_of_hour_price::text) = '' THEN NULL
    ELSE CAST(REGEXP_REPLACE(out_of_hour_price::text, '[^0-9.]', '', 'g') AS NUMERIC(10, 2))
  END;

-- Step 3: Drop old columns
ALTER TABLE services 
DROP COLUMN IF EXISTS price CASCADE,
DROP COLUMN IF EXISTS in_hour_price CASCADE,
DROP COLUMN IF EXISTS out_of_hour_price CASCADE;

-- Step 4: Rename temp columns to final names
ALTER TABLE services 
RENAME COLUMN price_temp TO price;

ALTER TABLE services 
RENAME COLUMN in_hour_price_temp TO in_hour_price;

ALTER TABLE services 
RENAME COLUMN out_of_hour_price_temp TO out_of_hour_price;

-- Step 5: Add helpful comments
COMMENT ON COLUMN services.price IS 'Fixed price in EUR (numeric only, € symbol added in UI)';
COMMENT ON COLUMN services.in_hour_price IS 'In-hour price in EUR (numeric only, € symbol added in UI)';
COMMENT ON COLUMN services.out_of_hour_price IS 'Out-of-hour price in EUR (numeric only, € symbol added in UI)';

-- Note: services_time_slots table already exists with data - no schema changes needed for price conversion
-- The time slots table doesn't store prices, only time slot information

-- Enable Row Level Security
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE services_time_slots ENABLE ROW LEVEL SECURITY;

-- Create policies for services table
DROP POLICY IF EXISTS "Enable read access for all users" ON services;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON services;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON services;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON services;

CREATE POLICY "Enable read access for all users" ON services FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users" ON services FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');
CREATE POLICY "Enable update for authenticated users" ON services FOR UPDATE USING (auth.role() = 'authenticated' OR auth.role() = 'anon');
CREATE POLICY "Enable delete for authenticated users" ON services FOR DELETE USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- Create policies for services_time_slots table
DROP POLICY IF EXISTS "Enable read access for all users" ON services_time_slots;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON services_time_slots;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON services_time_slots;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON services_time_slots;

CREATE POLICY "Enable read access for all users" ON services_time_slots FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users" ON services_time_slots FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');
CREATE POLICY "Enable update for authenticated users" ON services_time_slots FOR UPDATE USING (auth.role() = 'authenticated' OR auth.role() = 'anon');
CREATE POLICY "Enable delete for authenticated users" ON services_time_slots FOR DELETE USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category);
CREATE INDEX IF NOT EXISTS idx_services_is_active ON services(is_active);
CREATE INDEX IF NOT EXISTS idx_services_time_slots_service_id ON services_time_slots(service_id);
CREATE INDEX IF NOT EXISTS idx_services_time_slots_type_day ON services_time_slots(slot_type, day_of_week);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_services_updated_at ON services;
CREATE TRIGGER update_services_updated_at 
    BEFORE UPDATE ON services 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Sample data (uncomment if you want to add some initial services)
/*
INSERT INTO services (name, category, price, in_hour_price, out_of_hour_price, features, description) VALUES
  ('Initial Physiotherapy Assessment', 'Individual', '€70', '€70', '€85', ARRAY['Comprehensive assessment', 'Treatment plan development', 'Exercise prescription'], 'Detailed initial assessment and treatment planning'),
  ('Follow-up Physiotherapy Session', 'Individual', NULL, '€65', '€80', ARRAY['Manual therapy', 'Exercise therapy', 'Progress monitoring'], 'Standard physiotherapy treatment session'),
  ('Sports Injury Treatment', 'Individual', NULL, '€70', '€85', ARRAY['Sport-specific assessment', 'Injury rehabilitation', 'Performance optimization'], 'Specialized treatment for sports-related injuries'),
  ('Group Pilates Class', 'Classes', '€25', NULL, NULL, ARRAY['Group setting', 'Equipment provided', 'All levels welcome'], 'Small group Pilates classes'),
  ('Corporate Wellness Package', 'Corporate Packages', 'Contact for Quote', NULL, NULL, ARRAY['On-site visits', 'Multiple employees', 'Customized programs'], 'Tailored wellness programs for businesses');
*/
