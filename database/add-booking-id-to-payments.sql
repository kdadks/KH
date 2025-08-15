-- Add booking_id column to payments table to properly link payments to specific bookings
-- This will resolve the issue of showing the same payment amount for different services

-- Add the booking_id column if it doesn't exist (UUID type to match bookings.id)
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);

-- Add comment to explain the purpose
COMMENT ON COLUMN payments.booking_id IS 'Links payment to specific booking for accurate service-specific payment tracking';

-- Sample query to verify the column was added
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'payments' AND column_name = 'booking_id';
