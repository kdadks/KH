-- Availability Management Table
-- This script creates the availability table for managing appointment slots

-- Create availability table if it doesn't exist
CREATE TABLE IF NOT EXISTS availability (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;

-- Create policies for availability table
DROP POLICY IF EXISTS "Enable read access for all users" ON availability;
DROP POLICY IF EXISTS "Enable insert for all users" ON availability;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON availability;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON availability;

CREATE POLICY "Enable read access for all users" ON availability FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON availability FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users" ON availability FOR UPDATE USING (auth.role() = 'authenticated' OR auth.role() = 'anon');
CREATE POLICY "Enable delete for authenticated users" ON availability FOR DELETE USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- Insert sample availability slots for testing (optional)
-- Uncomment the following lines if you want to add sample data:

/*
INSERT INTO availability (date, start_time, end_time, is_available) VALUES
  ('2025-08-12', '09:00:00', '10:00:00', true),
  ('2025-08-12', '10:00:00', '11:00:00', true),
  ('2025-08-12', '11:00:00', '12:00:00', true),
  ('2025-08-12', '14:00:00', '15:00:00', true),
  ('2025-08-12', '15:00:00', '16:00:00', true),
  ('2025-08-13', '09:00:00', '10:00:00', true),
  ('2025-08-13', '10:00:00', '11:00:00', true),
  ('2025-08-13', '11:00:00', '12:00:00', true),
  ('2025-08-13', '14:00:00', '15:00:00', false),
  ('2025-08-13', '15:00:00', '16:00:00', true),
  ('2025-08-14', '09:00:00', '10:00:00', true),
  ('2025-08-14', '10:00:00', '11:00:00', true),
  ('2025-08-14', '14:00:00', '15:00:00', true),
  ('2025-08-14', '15:00:00', '16:00:00', true),
  ('2025-08-15', '09:00:00', '10:00:00', true),
  ('2025-08-15', '10:00:00', '11:00:00', false),
  ('2025-08-15', '14:00:00', '15:00:00', true),
  ('2025-08-15', '15:00:00', '16:00:00', true)
ON CONFLICT DO NOTHING;
*/
