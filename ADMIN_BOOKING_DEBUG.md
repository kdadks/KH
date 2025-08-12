# Admin Booking Modal Time Slots Debug Guide

## Changes Made to Fix Time Slot Loading

### 1. **Updated fetchTimeSlots Function**
- Now matches the logic from the main booking page exactly
- Removes day-of-week filtering (gets all slots for service)
- Properly handles service ID parsing and price type extraction
- Added comprehensive debug logging

### 2. **Updated Input Change Handler**
- Correctly finds service by displayName and uses the service ID
- Added debug logging to trace the flow

### 3. **Added Fallback Logic**
- If no slots found for specific price type, shows all available slots
- Prevents empty time slot lists when data exists

## Debug Steps

### Step 1: Open Browser Console
1. Open your admin panel
2. Open browser Developer Tools (F12)
3. Go to Console tab
4. Try creating a new booking

### Step 2: Check Console Output
Look for these debug messages:
```
Input change: {field: "service", value: "Service Name - In Hour (€50)"}
Found service: {id: "1-in", displayName: "...", priceType: "in-hour"}
Fetching time slots for: {serviceId: "1-in", selectedDate: "2025-08-15"}
Parsed service info: {actualServiceId: 1, priceType: "in-hour"}
Time slots query result: {data: [...], error: null}
All slots before filtering: [...]
Relevant slots after filtering: [...]
Generated time options: [...]
```

### Step 3: Database Verification
Run the debug SQL script (`database/debug-time-slots.sql`) to verify:
1. Services exist and are active
2. Time slots exist for your services
3. Time slots have proper `slot_type` values

## Common Issues and Solutions

### Issue 1: No Services Loading
- Check if services table has `is_active = true` records
- Verify services have pricing information

### Issue 2: Services Load but No Time Slots
- Check if `services_time_slots` table has data for your service IDs
- Verify `is_available = true` on time slots
- Check if `service_id` in time slots matches `id` in services

### Issue 3: Time Slots Exist but Don't Show
- Check console for service ID parsing errors
- Verify `slot_type` values match ('in-hour', 'out-of-hour')
- Check if price type extraction is working correctly

## Quick Fixes

### Fix 1: If Services Table Empty
```sql
-- Check if you need to run the service population script
SELECT COUNT(*) FROM services WHERE is_active = true;
```

### Fix 2: If Time Slots Table Empty
```sql
-- Check if you need to run the time slot population script
SELECT COUNT(*) FROM services_time_slots WHERE is_available = true;
```

### Fix 3: If Service IDs Don't Match
```sql
-- Check for ID mismatches
SELECT s.id as service_id, s.name, COUNT(st.id) as slot_count
FROM services s
LEFT JOIN services_time_slots st ON s.id = st.service_id
WHERE s.is_active = true
GROUP BY s.id, s.name
ORDER BY s.id;
```

## Testing Checklist

1. ✅ Admin can open "Create New Booking" modal
2. ✅ Services load in dropdown (check console for fetch)
3. ✅ Select a service with pricing (In-Hour/Out-of-Hour)
4. ✅ Select a date
5. ✅ Time slots appear in dropdown (check console logs)
6. ✅ Can select time slot and create booking
7. ✅ New booking appears in bookings list with timeslot data

## Fallback Behavior
- If no slots found for specific price type, all available slots for the service will be shown
- This prevents the "No available time slots" message when slots actually exist

The debug logging will show you exactly where the issue is occurring and what data is being processed at each step.
