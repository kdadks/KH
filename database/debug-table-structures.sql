-- Database Structure Diagnostic
-- Run this to see actual table structures before creating test data

-- Show all tables in public schema
SELECT 'Available tables:' as info;
SELECT schemaname, tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- Show columns for customers table
SELECT 'CUSTOMERS TABLE STRUCTURE:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'customers' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Show columns for invoices table
SELECT 'INVOICES TABLE STRUCTURE:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'invoices' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Show columns for bookings table
SELECT 'BOOKINGS TABLE STRUCTURE:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'bookings' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Show columns for payments table
SELECT 'PAYMENTS TABLE STRUCTURE:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'payments' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Show row counts
DO $$
DECLARE
    row_count integer;
BEGIN
    RAISE NOTICE '=== TABLE ROW COUNTS ===';
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customers') THEN
        SELECT COUNT(*) INTO row_count FROM customers;
        RAISE NOTICE 'customers: % rows', row_count;
    ELSE
        RAISE NOTICE 'customers: TABLE DOES NOT EXIST';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoices') THEN
        SELECT COUNT(*) INTO row_count FROM invoices;
        RAISE NOTICE 'invoices: % rows', row_count;
    ELSE
        RAISE NOTICE 'invoices: TABLE DOES NOT EXIST';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bookings') THEN
        SELECT COUNT(*) INTO row_count FROM bookings;
        RAISE NOTICE 'bookings: % rows', row_count;
    ELSE
        RAISE NOTICE 'bookings: TABLE DOES NOT EXIST';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') THEN
        SELECT COUNT(*) INTO row_count FROM payments;
        RAISE NOTICE 'payments: % rows', row_count;
    ELSE
        RAISE NOTICE 'payments: TABLE DOES NOT EXIST';
    END IF;
END $$;
