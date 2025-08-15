# Adding booking_id to payment_requests table

## Problem
The payment_requests table was missing a direct link to bookings, causing the admin interface to show the same deposit amount for different services from the same customer.

**Fixed Error:** The `bookings.id` column uses UUID type, not integer.

## Solution
Add a `booking_id` column to the `payment_requests` table to create a direct relationship between payment requests and specific bookings.

## Migration Steps

1. **Execute the SQL migration** in your Supabase SQL Editor:
   ```sql
   -- Add booking_id column (UUID type to match bookings.id)
   ALTER TABLE payment_requests 
   ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL;

   -- Create index for performance
   CREATE INDEX IF NOT EXISTS idx_payment_requests_booking_id ON payment_requests(booking_id);

   -- Add comment to explain the purpose
   COMMENT ON COLUMN payment_requests.booking_id IS 'Links payment request to specific booking for accurate service-specific deposit tracking';
   ```

2. **Verify the migration** by checking the table structure:
   ```sql
   SELECT column_name, data_type, is_nullable 
   FROM information_schema.columns 
   WHERE table_name = 'payment_requests' AND column_name = 'booking_id';
   ```

3. **Test the application** - the changes are already applied to the codebase:
   - ✅ New payment requests will include `booking_id` (UUID)
   - ✅ Admin interface will match payments by `booking_id` first
   - ✅ Falls back to service name matching for legacy payment requests
   - ✅ Each booking will show the correct service-specific deposit amount

## Code Changes Applied
- ✅ Updated `PaymentRequest` and `CreatePaymentRequestData` interfaces (UUID type)
- ✅ Modified `createPaymentRequest()` to accept and store `booking_id` (string UUID)
- ✅ Updated `createBookingWithCustomer()` to pass `booking.id` (already UUID string)
- ✅ Enhanced admin `checkBookingPaymentStatus()` to match by `booking_id`
- ✅ Updated admin `handleCreatePaymentRequest()` to include `booking_id` (no parseInt needed)

## Expected Result
After running the SQL migration, each booking in the admin interface will show:
- ✅ **Correct service-specific deposit amounts**
- ✅ **Accurate payment request matching**
- ✅ **Clear service differentiation**

**Important:** The booking_id field is now UUID type (string) to match the bookings.id column type.

No more confusion between different service deposits for the same customer! 🎉
