# Fix for Service Type Database Error

## Problem
When admin logs in and lands on the dashboard, the dev console shows this error:
```json
{
    "code": "42703",
    "details": null,
    "hint": null,
    "message": "column invoices.service_type does not exist"
}
```

## Root Cause
The code in `paymentManagementUtils.ts` was trying to access a non-existent `service_type` column in the `invoices` table to get service information for payments.

## Solution Applied

### 1. Code Changes (✅ Already Applied)
- **Fixed `getRecentPayments()` function**: Now fetches service information from `bookings.package_name` via `booking_id` instead of `invoices.service_type`
- **Fixed `getAllPayments()` function**: Same fix applied
- **Updated SQL queries**: Added `booking_id` to SELECT statements and changed logic to use booking relationships

### 2. Database Migration Required
Execute the following SQL script in your Supabase SQL Editor:

**File:** `/database/fix-service-type-error.sql`

```sql
-- Run this script in Supabase SQL Editor
-- It will add the necessary booking_id columns if they don't exist
```

### 3. Alternative Quick Fix (If Migration Fails)
If you prefer to add the missing column instead of using the booking relationship:

```sql
-- Add service_type column to invoices table
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS service_type TEXT;

-- Update existing invoices with default service type
UPDATE invoices 
SET service_type = 'Payment' 
WHERE service_type IS NULL;
```

## How the Fix Works

### Before (❌ Broken)
```typescript
// Code was trying to get service info from non-existent column
const { data } = await supabase
  .from('invoices')
  .select('id, service_type')  // ❌ Column doesn't exist
```

### After (✅ Fixed)
```typescript
// Now gets service info from bookings via booking_id relationship
const { data } = await supabase
  .from('bookings')
  .select('id, package_name')  // ✅ Uses existing package_name field

// Maps booking_id to service name
service_name: bookingMap.get(payment.booking_id) || 'Payment'
```

## Expected Result
After running the migration:
- ✅ Admin dashboard loads without errors
- ✅ Payment information shows correct service names from bookings
- ✅ No more "column does not exist" errors in console
- ✅ Proper service tracking for payments and payment requests

## Files Modified
1. `/src/utils/paymentManagementUtils.ts` - Fixed service name fetching logic
2. `/database/fix-service-type-error.sql` - Database migration script

## Verification
After applying the fix, you can verify it's working by:
1. Logging in as admin
2. Navigating to the dashboard
3. Checking that no database errors appear in dev console
4. Confirming payment records show correct service names

The system now properly links payments to services through the booking relationship, which is the correct approach according to your database schema.
