-- Add booking_type field to services table
-- This allows admin to choose between "Book Now" and "Contact Me" for each service

ALTER TABLE services 
ADD COLUMN IF NOT EXISTS booking_type VARCHAR(20) DEFAULT 'book_now' CHECK (booking_type IN ('book_now', 'contact_me'));

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_services_booking_type ON services(booking_type);

-- Update existing services based on current category logic
-- Corporate Packages should default to 'contact_me', others to 'book_now'
UPDATE services 
SET booking_type = 'contact_me' 
WHERE category = 'Corporate Packages' AND booking_type = 'book_now';

-- All other services should remain as 'book_now' (which is already the default)