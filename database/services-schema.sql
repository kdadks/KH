-- Services Management Table Schema
-- This script creates the services table for managing treatment packages and services

-- Create services table
CREATE TABLE IF NOT EXISTS services (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  price VARCHAR(100),
  in_hour_price VARCHAR(50),
  out_of_hour_price VARCHAR(50),
  features TEXT[], -- PostgreSQL array for storing multiple features
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create services_time_slots table for in-hour and out-of-hour availability slots
CREATE TABLE IF NOT EXISTS services_time_slots (
  id SERIAL PRIMARY KEY,
  service_id INTEGER REFERENCES services(id) ON DELETE CASCADE,
  slot_type VARCHAR(20) NOT NULL CHECK (slot_type IN ('in-hour', 'out-of-hour')),
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 6=Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

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
