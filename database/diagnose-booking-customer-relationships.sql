-- Check current booking data structure and customer relationships
-- Run this to understand what data exists in your bookings table

-- 1. Check if bookings have customer_id values
DO $$ 
DECLARE
    total_bookings INTEGER;
    bookings_with_customer_id INTEGER;
    bookings_without_customer_id INTEGER;
BEGIN
    RAISE NOTICE '=== BOOKING DATA ANALYSIS ===';
    
    -- Count total bookings
    SELECT COUNT(*) FROM bookings INTO total_bookings;
    
    -- Count bookings with customer_id
    SELECT COUNT(*) FROM bookings WHERE customer_id IS NOT NULL INTO bookings_with_customer_id;
    
    -- Count bookings without customer_id
    SELECT COUNT(*) FROM bookings WHERE customer_id IS NULL INTO bookings_without_customer_id;
    
    RAISE NOTICE 'Total bookings: %', total_bookings;
    RAISE NOTICE 'Bookings with customer_id: %', bookings_with_customer_id;
    RAISE NOTICE 'Bookings without customer_id: %', bookings_without_customer_id;
END $$;

-- 2. Show sample booking data
DO $$ 
DECLARE
    booking_record RECORD;
BEGIN
    RAISE NOTICE '=== SAMPLE BOOKING DATA ===';
    
    FOR booking_record IN 
        SELECT id, customer_name, customer_email, customer_phone, customer_id, package_name, created_at
        FROM bookings 
        ORDER BY created_at DESC 
        LIMIT 3
    LOOP
        RAISE NOTICE 'Booking ID: % | Customer: % | Email: % | Phone: % | Customer_ID: % | Service: %', 
            booking_record.id, 
            booking_record.customer_name, 
            booking_record.customer_email,
            booking_record.customer_phone,
            booking_record.customer_id,
            booking_record.package_name;
    END LOOP;
END $$;

-- 3. Check if customers table has data
DO $$ 
DECLARE
    total_customers INTEGER;
BEGIN
    RAISE NOTICE '=== CUSTOMER TABLE DATA ===';
    
    SELECT COUNT(*) FROM customers INTO total_customers;
    RAISE NOTICE 'Total customers: %', total_customers;
    
    IF total_customers > 0 THEN
        RAISE NOTICE 'Sample customers:';
        FOR customer_record IN 
            SELECT id, first_name, last_name, email, phone, created_at
            FROM customers 
            ORDER BY created_at DESC 
            LIMIT 3
        LOOP
            RAISE NOTICE 'Customer ID: % | Name: % % | Email: % | Phone: %', 
                customer_record.id, 
                customer_record.first_name, 
                customer_record.last_name,
                customer_record.email,
                customer_record.phone;
        END LOOP;
    ELSE
        RAISE NOTICE 'No customers found in customers table';
    END IF;
END $$;

-- 4. Show relationship status
DO $$ 
DECLARE
    joined_count INTEGER;
BEGIN
    RAISE NOTICE '=== RELATIONSHIP STATUS ===';
    
    -- Count how many bookings can be joined with customers
    SELECT COUNT(*) 
    FROM bookings b 
    INNER JOIN customers c ON b.customer_id = c.id 
    INTO joined_count;
    
    RAISE NOTICE 'Bookings that can be joined with customers: %', joined_count;
    
    -- Show sample joined data
    IF joined_count > 0 THEN
        RAISE NOTICE 'Sample joined data:';
        FOR joined_record IN 
            SELECT b.id as booking_id, b.package_name, c.first_name, c.last_name, c.email
            FROM bookings b 
            INNER JOIN customers c ON b.customer_id = c.id 
            LIMIT 2
        LOOP
            RAISE NOTICE 'Booking: % | Service: % | Customer: % % | Email: %', 
                joined_record.booking_id,
                joined_record.package_name,
                joined_record.first_name,
                joined_record.last_name,
                joined_record.email;
        END LOOP;
    END IF;
END $$;

-- Final summary
DO $$ 
BEGIN
    RAISE NOTICE '=== SUMMARY ===';
    RAISE NOTICE 'This diagnostic shows the current state of your booking-customer relationships';
    RAISE NOTICE 'If most bookings show customer_id as NULL, you need to run a migration';
    RAISE NOTICE 'to create customer records and link existing bookings';
END $$;
