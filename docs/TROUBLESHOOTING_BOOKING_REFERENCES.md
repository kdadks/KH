# Troubleshooting Guide: Booking Reference Not Showing

## Problem
You're still seeing old UUID format (like `#234e8c93-aed2-4402-9a0c-aceb0b881123`) instead of the new date format (like `2025-08-28-001`).

## Solution Steps

### Step 1: Run Manual Backfill Script
The migration might not have updated all existing bookings. Run this in your Supabase SQL Editor:

```sql
-- File: /database/manual-backfill-booking-references.sql
```

This will:
- Check which bookings don't have proper booking_reference values
- Manually update them with the correct format
- Show you the results

### Step 2: Verify Database Has Correct Data
Run this query to check:

```sql
-- Check specific booking that's causing conflict
SELECT 
    id,
    booking_reference,
    booking_date,
    package_name
FROM public.bookings 
WHERE id = '234e8c93-aed2-4402-9a0c-aceb0b881123';

-- Check overall status
SELECT 
    COUNT(*) as total_bookings,
    COUNT(booking_reference) as bookings_with_references,
    COUNT(CASE WHEN booking_reference ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}-[0-9]{3}$' THEN 1 END) as correct_format_count
FROM public.bookings;
```

### Step 3: Clear Browser Cache
1. **Hard refresh**: Press `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
2. **Or clear cache**: Go to browser DevTools > Application > Storage > Clear site data
3. **Or incognito**: Open the admin panel in incognito/private browsing mode

### Step 4: Check Browser Console
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for log messages starting with `🔍` - these will show what data is being loaded
4. Create a test booking to see if new bookings get the correct format

### Step 5: Test New Booking
1. Create a new test booking
2. Check if it gets the new format immediately
3. If new bookings work but existing ones don't, the issue is in the backfill

## Expected Results

After following these steps, you should see:
- **Existing bookings**: `2025-08-28-001`, `2025-08-28-002`, etc.
- **New bookings**: Automatically get the new format
- **Conflict messages**: Show the new format instead of UUIDs

## Still Not Working?

If you're still seeing issues:

1. **Check console logs**: Look for any errors in browser console
2. **Database check**: Run the debug queries to confirm database has correct data
3. **Contact**: The issue might be in browser caching or a specific edge case

## Quick Fix for Immediate Testing

To test that the system works for new bookings:
1. Create a brand new booking
2. It should automatically get format like `2025-08-28-001`
3. This confirms the system is working for new data
