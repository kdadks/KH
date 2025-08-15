-- Add booking_id column to payment_requests table to properly link payment requests to specific bookings
-- This will resolve the issue of showing the same deposit amount for different services

-- Add the booking_id column if it doesn't exist (UUID type to match bookings.id)
ALTER TABLE payment_requests 
ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_payment_requests_booking_id ON payment_requests(booking_id);

-- Add comment to explain the purpose
COMMENT ON COLUMN payment_requests.booking_id IS 'Links payment request to specific booking for accurate service-specific deposit tracking';

-- Sample query to verify the column was added
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'payment_requests' AND column_name = 'booking_id';
