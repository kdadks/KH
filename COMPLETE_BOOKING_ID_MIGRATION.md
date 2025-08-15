# Complete booking_id Migration Guide

## Problem
Both `payment_requests` and `payments` tables were missing direct links to bookings, causing the admin interface to show the same amounts for different services from the same customer.

## Solution
Add `booking_id` columns to both tables to create proper relationships.

## Migration Steps

### Step 1: Add booking_id to payment_requests table
```sql
-- Add booking_id column (UUID type to match bookings.id)
ALTER TABLE payment_requests 
ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_payment_requests_booking_id ON payment_requests(booking_id);

-- Add comment
COMMENT ON COLUMN payment_requests.booking_id IS 'Links payment request to specific booking for accurate service-specific deposit tracking';
```

### Step 2: Add booking_id to payments table
```sql
-- Add booking_id column (UUID type to match bookings.id)
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);

-- Add comment
COMMENT ON COLUMN payments.booking_id IS 'Links payment to specific booking for accurate service-specific payment tracking';
```

### Step 3: Populate existing payment_requests with booking_id (Optional)
```sql
-- This attempts to link existing payment requests to bookings based on timing and service matching
-- Only run this if you have existing payment requests you want to link

UPDATE payment_requests 
SET booking_id = (
  SELECT b.id 
  FROM bookings b 
  WHERE b.customer_id = payment_requests.customer_id 
    AND b.package_name IS NOT NULL
    AND payment_requests.notes IS NOT NULL
    AND LOWER(payment_requests.notes) LIKE '%' || LOWER(SPLIT_PART(b.package_name, ' -', 1)) || '%'
    AND ABS(EXTRACT(EPOCH FROM (b.created_at - payment_requests.created_at))) < 3600 -- Within 1 hour
  ORDER BY ABS(EXTRACT(EPOCH FROM (b.created_at - payment_requests.created_at))) ASC
  LIMIT 1
)
WHERE booking_id IS NULL;
```

### Step 4: Populate existing payments with booking_id (Optional)
```sql
-- This attempts to link existing payments to bookings via payment_requests
-- Only run this if you have existing payments you want to link

UPDATE payments 
SET booking_id = (
  SELECT pr.booking_id 
  FROM payment_requests pr 
  WHERE pr.customer_id = payments.customer_id 
    AND pr.booking_id IS NOT NULL
    AND payments.notes IS NOT NULL
    AND payments.notes LIKE '%payment request #' || pr.id || '%'
  LIMIT 1
)
WHERE booking_id IS NULL;
```

### Step 5: Verify the migration
```sql
-- Check payment_requests
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'payment_requests' AND column_name = 'booking_id';

-- Check payments
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'payments' AND column_name = 'booking_id';

-- Count linked vs unlinked records
SELECT 
  'payment_requests' as table_name,
  COUNT(*) as total_records,
  COUNT(booking_id) as linked_records,
  COUNT(*) - COUNT(booking_id) as unlinked_records
FROM payment_requests
UNION ALL
SELECT 
  'payments' as table_name,
  COUNT(*) as total_records,
  COUNT(booking_id) as linked_records,
  COUNT(*) - COUNT(booking_id) as unlinked_records
FROM payments;
```

## Code Changes Applied
- ✅ Updated `PaymentRequest` interface to include `booking_id?: string | null`
- ✅ Updated `Payment` interface to include `booking_id?: string | null`
- ✅ Enhanced admin payment matching to use `booking_id` first, service name fallback
- ✅ All booking creation flows now include `booking_id` in payment requests
- ✅ Prevents incorrect payment amounts being shown for different services

## Expected Result
After running the migrations:
- ✅ **New payments will be properly linked to bookings**
- ✅ **Admin interface shows correct service-specific payment amounts**
- ✅ **No more confusion between different service payments**
- ✅ **Robust payment tracking with direct booking relationships**

## Important Notes
- Steps 3 & 4 are optional and attempt to link existing records
- New bookings will automatically have proper `booking_id` relationships
- The system gracefully handles legacy payments without `booking_id`
- Admin interface prioritizes `booking_id` matching over service name parsing
