-- Step-by-step Database Setup for User Management
-- Run this to check what tables exist and create missing ones

-- 1. First, let's check what tables currently exist
SELECT 
    'Existing tables:' as status,
    schemaname,
    tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- 2. Check if required base tables exist
DO $$
BEGIN
    -- Check for customers table
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customers') THEN
        RAISE NOTICE 'ERROR: customers table does not exist. Please create it first.';
    ELSE
        RAISE NOTICE 'customers table exists ✓';
    END IF;
    
    -- Check for invoices table
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoices') THEN
        RAISE NOTICE 'ERROR: invoices table does not exist. Please create it first.';
    ELSE
        RAISE NOTICE 'invoices table exists ✓';
    END IF;
    
    -- Check for bookings table
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bookings') THEN
        RAISE NOTICE 'ERROR: bookings table does not exist. Please create it first.';
    ELSE
        RAISE NOTICE 'bookings table exists ✓';
    END IF;
END $$;
