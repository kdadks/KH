# Visit Type Feature Implementation - Database Migration Instructions

## Overview
This migration adds support for visit types (Home, Online, Clinic) to the booking system. Customers can now select their preferred visit type, and for home visits, their eircode/zipcode will be collected and stored.

## Database Changes Required

### Run this SQL in Supabase SQL Editor:

```sql
-- Add visit type support to services and bookings
-- This migration adds visit_type field to services and bookings tables
-- Also ensures eircode field exists in customers table

-- Add visit_type to services table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'services' AND column_name = 'visit_type') THEN
        ALTER TABLE public.services ADD COLUMN visit_type VARCHAR(50) DEFAULT 'clinic';
        
        -- Add check constraint for valid visit types
        ALTER TABLE public.services ADD CONSTRAINT check_visit_type 
        CHECK (visit_type IN ('home', 'online', 'clinic'));
        
        COMMENT ON COLUMN public.services.visit_type IS 'Type of visit: home, online, or clinic';
    END IF;
END $$;

-- Add visit_type to bookings table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'bookings' AND column_name = 'visit_type') THEN
        ALTER TABLE public.bookings ADD COLUMN visit_type VARCHAR(50) DEFAULT 'clinic';
        
        -- Add check constraint for valid visit types
        ALTER TABLE public.bookings ADD CONSTRAINT check_booking_visit_type 
        CHECK (visit_type IN ('home', 'online', 'clinic'));
        
        COMMENT ON COLUMN public.bookings.visit_type IS 'Type of visit selected by customer: home, online, or clinic';
    END IF;
END $$;

-- Ensure eircode field exists in customers table (it already does based on check)
-- But add an index for better performance
CREATE INDEX IF NOT EXISTS idx_customers_eircode ON public.customers(eircode);

-- Create index on visit_type for better query performance
CREATE INDEX IF NOT EXISTS idx_services_visit_type ON public.services(visit_type);
CREATE INDEX IF NOT EXISTS idx_bookings_visit_type ON public.bookings(visit_type);

-- Add a composite index for filtering active services by visit type
CREATE INDEX IF NOT EXISTS idx_services_active_visit_type ON public.services(is_active, visit_type);

COMMENT ON INDEX idx_services_visit_type IS 'Index for filtering services by visit type';
COMMENT ON INDEX idx_bookings_visit_type IS 'Index for filtering bookings by visit type';
COMMENT ON INDEX idx_customers_eircode IS 'Index for searching customers by eircode/zipcode';
```

## Features Implemented

### 1. Admin - Services Management
- **Visit Type Selection**: When creating/editing a service, admins can now select:
  - 🏥 Clinic Visit
  - 💻 Online
  - 🏠 Home Visit
- Each service is associated with one visit type
- Services are displayed with visit type badges in the admin interface

### 2. Customer - Booking Flow
- **Visit Type Selection** (First Step):
  - Customer selects visit type before choosing a service
  - Three options displayed as cards with icons
  - Default selection: Online
- **Filtered Services**:
  - Services are automatically filtered based on selected visit type
  - Only relevant services are shown
- **Eircode Collection** (Home Visits Only):
  - If "Home Visit" is selected, an eircode/postal code field appears
  - Field is required for home visits
  - Collected eircode is stored in customer profile

### 3. Customer Profile
- **Eircode Storage**: Home visit zipcodes are stored in the `customers` table
- Accessible for admin review and planning

### 4. Booking Dashboard (Admin)
- Visit type is stored with each booking
- Eircode visible for home visit bookings (to be implemented in UI)

## Testing Instructions

1. **Run Database Migration**:
   - Copy the SQL above
   - Open Supabase Dashboard → SQL Editor
   - Paste and run the migration

2. **Verify Database Changes**:
   ```bash
   cd "d:\ITWala Projects\KH"
   node scripts/check-database-state.mjs
   ```
   - Should show `visit_type` fields in services and bookings
   - Should show `eircode` field in customers

3. **Test Admin Flow**:
   - Go to Admin Console → Services
   - Create a new service with each visit type (home, online, clinic)
   - Verify services are saved with correct visit type

4. **Test Customer Booking Flow**:
   - Go to Booking Page
   - Select "Online" → verify online services appear
   - Select "Clinic Visit" → verify clinic services appear
   - Select "Home Visit" → verify home services appear AND eircode field shows
   - Complete a home visit booking with eircode
   - Verify booking is created with visit type and customer has eircode saved

5. **Verify Data**:
   - Check Supabase → services table → verify `visit_type` column
   - Check Supabase → bookings table → verify `visit_type` column
   - Check Supabase → customers table → verify `eircode` populated for home visit bookings

## Next Steps (Not Implemented Yet)

### Admin Booking Dashboard Enhancements
- Display visit type badge in booking list
- Show eircode prominently for home visit bookings
- Add filters to view bookings by visit type
- Accept/Reject workflow for home visit bookings based on eircode location

To implement these, update the Bookings.tsx component to:
1. Display `booking.visit_type` with colored badges
2. Show `customer_details.eircode` for home visits
3. Add filtering by visit type

## Files Modified

### Database
- `database/add-visit-type-support.sql` - Database migration

### Types
- `src/components/admin/types.ts` - Added visit_type to Package, Service, BookingFormData

### Admin Components
- `src/components/admin/Services.tsx` - Added visit type selection in service creation/edit

### Customer Components
- `src/pages/BookingPage.tsx` - Added visit type selection and eircode capture

### Utilities
- `scripts/check-database-state.mjs` - Database state verification script

## Payment Workflow
✅ **Not Modified** - Payment workflow remains completely unchanged as requested.
