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
