-- Test Data Setup for User Management System
-- Run this in your Supabase SQL Editor to create test data

-- First, let's check what columns exist in the invoices table
DO $$
DECLARE
    invoice_columns text;
BEGIN
    SELECT string_agg(column_name, ', ' ORDER BY ordinal_position)
    INTO invoice_columns
    FROM information_schema.columns 
    WHERE table_name = 'invoices' AND table_schema = 'public';
    
    IF invoice_columns IS NOT NULL THEN
        RAISE NOTICE 'Available columns in invoices table: %', invoice_columns;
    ELSE
        RAISE NOTICE 'invoices table does not exist or has no columns';
    END IF;
END $$;

-- Check what columns exist in other tables too
DO $$
DECLARE
    table_rec record;
    column_list text;
BEGIN
    FOR table_rec IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('customers', 'bookings', 'payments')
        ORDER BY table_name
    LOOP
        SELECT string_agg(column_name, ', ' ORDER BY ordinal_position)
        INTO column_list
        FROM information_schema.columns 
        WHERE table_name = table_rec.table_name AND table_schema = 'public';
        
        RAISE NOTICE '% table columns: %', table_rec.table_name, column_list;
    END LOOP;
END $$;

-- 1. Create test customer (if not already exists from booking)
INSERT INTO customers (
  first_name, 
  last_name, 
  email, 
  phone, 
  is_active,
  created_at
) VALUES (
  'John', 
  'Doe', 
  'john.doe@test.com', 
  '+353 87 123 4567',
  true,
  NOW()
) ON CONFLICT (email) DO NOTHING;

-- Add address fields if they exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'address_line_1') THEN
        UPDATE customers SET 
            address_line_1 = '123 Test Street',
            city = 'Dublin',
            country = 'Ireland'
        WHERE email = 'john.doe@test.com' AND address_line_1 IS NULL;
    END IF;
END $$;

-- 3. Create test invoices (adapt to actual table structure)
DO $$
DECLARE
    customer_id_val integer;
    has_amount_col boolean;
    has_total_col boolean;
    has_total_amount_col boolean;
    has_subtotal_col boolean;
    has_vat_amount_col boolean;
    has_invoice_number_col boolean;
    has_invoice_date_col boolean;
    has_description_col boolean;
    has_notes_col boolean;
    has_due_date_col boolean;
    has_status_col boolean;
    invoice_id_val integer;
    insert_query text;
    allowed_statuses text[];
    status_type text;
BEGIN
    -- Get customer ID
    SELECT id INTO customer_id_val FROM customers WHERE email = 'john.doe@test.com';
    
    IF customer_id_val IS NULL THEN
        RAISE NOTICE 'Customer john.doe@test.com not found, skipping invoice creation';
        RETURN;
    END IF;
    
    -- Check what columns exist in invoices table
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoices' AND column_name = 'amount'
    ) INTO has_amount_col;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoices' AND column_name = 'total'
    ) INTO has_total_col;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoices' AND column_name = 'total_amount'
    ) INTO has_total_amount_col;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoices' AND column_name = 'subtotal'
    ) INTO has_subtotal_col;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoices' AND column_name = 'vat_amount'
    ) INTO has_vat_amount_col;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoices' AND column_name = 'invoice_number'
    ) INTO has_invoice_number_col;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoices' AND column_name = 'description'
    ) INTO has_description_col;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoices' AND column_name = 'notes'
    ) INTO has_notes_col;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoices' AND column_name = 'due_date'
    ) INTO has_due_date_col;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoices' AND column_name = 'status'
    ) INTO has_status_col;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoices' AND column_name = 'invoice_number'
    ) INTO has_invoice_number_col;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoices' AND column_name = 'invoice_date'
    ) INTO has_invoice_date_col;
    
    -- Detect allowed status values if status column exists
    IF has_status_col THEN
        -- Check if it's an enum type
        SELECT udt_name INTO status_type 
        FROM information_schema.columns 
        WHERE table_name = 'invoices' AND column_name = 'status';
        
        IF status_type IS NOT NULL AND EXISTS (SELECT 1 FROM pg_type WHERE typname = status_type AND typtype = 'e') THEN
            -- It's an enum, get the allowed values
            SELECT array_agg(enumlabel ORDER BY enumsortorder) INTO allowed_statuses
            FROM pg_enum 
            WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = status_type);
            
            RAISE NOTICE 'Detected enum status values: %', allowed_statuses;
        ELSE
            -- Not an enum, try common values
            allowed_statuses := ARRAY['draft', 'pending', 'sent', 'paid', 'overdue', 'cancelled', 'voided'];
            RAISE NOTICE 'Using common status values (not enum detected): %', allowed_statuses;
        END IF;
    END IF;
    
    RAISE NOTICE 'Invoice table columns found - amount: %, total: %, total_amount: %, subtotal: %, vat_amount: %, description: %, notes: %, due_date: %, status: %, invoice_number: %, invoice_date: %', 
                 has_amount_col, has_total_col, has_total_amount_col, has_subtotal_col, has_vat_amount_col, has_description_col, has_notes_col, has_due_date_col, has_status_col, has_invoice_number_col, has_invoice_date_col;
    
    -- Build dynamic insert query based on available columns
    insert_query := 'INSERT INTO invoices (customer_id';
    
    -- Skip invoice_number as it's auto-generated by trigger
    -- Add invoice_date if it exists (required field)
    IF has_invoice_date_col THEN
        insert_query := insert_query || ', invoice_date';
    END IF;
    
    -- Add optional financial columns (prioritize subtotal, then amount, then total)
    IF has_subtotal_col THEN
        insert_query := insert_query || ', subtotal';
    ELSIF has_amount_col THEN
        insert_query := insert_query || ', amount';
    ELSIF has_total_col THEN
        insert_query := insert_query || ', total';
    END IF;
    
    -- Add vat_amount if it exists (required field in Ireland)
    IF has_vat_amount_col THEN
        insert_query := insert_query || ', vat_amount';
    END IF;
    
    -- Add total_amount if it exists (grand total = subtotal + vat)
    IF has_total_amount_col THEN
        insert_query := insert_query || ', total_amount';
    END IF;
    
    IF has_due_date_col THEN
        insert_query := insert_query || ', due_date';
    END IF;
    
    IF has_status_col THEN
        insert_query := insert_query || ', status';
    END IF;
    
    IF has_description_col THEN
        insert_query := insert_query || ', description';
    ELSIF has_notes_col THEN
        insert_query := insert_query || ', notes';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'created_at') THEN
        insert_query := insert_query || ', created_at';
    END IF;
    
    insert_query := insert_query || ') VALUES ';
    
    -- Add values based on available columns
    FOR i IN 1..4 LOOP
        IF i > 1 THEN
            insert_query := insert_query || ', ';
        END IF;
        
        insert_query := insert_query || '(' || customer_id_val;
        
        -- Skip invoice_number as it's auto-generated by trigger
        -- Add invoice_date if required
        IF has_invoice_date_col THEN
            CASE i
                WHEN 1 THEN insert_query := insert_query || ', ''2025-08-01''';
                WHEN 2 THEN insert_query := insert_query || ', ''2025-07-01''';
                WHEN 3 THEN insert_query := insert_query || ', ''2025-06-01''';
                WHEN 4 THEN insert_query := insert_query || ', ''2025-08-10''';
            END CASE;
        END IF;
        
        -- Add amount/total/subtotal if available
        IF has_subtotal_col OR has_amount_col OR has_total_col THEN
            CASE i
                WHEN 1 THEN insert_query := insert_query || ', 150.00';
                WHEN 2 THEN insert_query := insert_query || ', 200.00';
                WHEN 3 THEN insert_query := insert_query || ', 175.00';
                WHEN 4 THEN insert_query := insert_query || ', 125.00';
            END CASE;
        END IF;
        
        -- Add vat_amount if available (23% VAT for Ireland)
        IF has_vat_amount_col THEN
            CASE i
                WHEN 1 THEN insert_query := insert_query || ', 34.50';  -- 23% of 150.00
                WHEN 2 THEN insert_query := insert_query || ', 46.00';  -- 23% of 200.00
                WHEN 3 THEN insert_query := insert_query || ', 40.25';  -- 23% of 175.00
                WHEN 4 THEN insert_query := insert_query || ', 28.75';  -- 23% of 125.00
            END CASE;
        END IF;
        
        -- Add total_amount if available (subtotal + vat_amount)
        IF has_total_amount_col THEN
            CASE i
                WHEN 1 THEN insert_query := insert_query || ', 184.50';  -- 150.00 + 34.50
                WHEN 2 THEN insert_query := insert_query || ', 246.00';  -- 200.00 + 46.00
                WHEN 3 THEN insert_query := insert_query || ', 215.25';  -- 175.00 + 40.25
                WHEN 4 THEN insert_query := insert_query || ', 153.75';  -- 125.00 + 28.75
            END CASE;
        END IF;
        
        -- Add due_date if available
        IF has_due_date_col THEN
            CASE i
                WHEN 1 THEN insert_query := insert_query || ', ''2025-08-20''';
                WHEN 2 THEN insert_query := insert_query || ', ''2025-07-15''';
                WHEN 3 THEN insert_query := insert_query || ', ''2025-06-10''';
                WHEN 4 THEN insert_query := insert_query || ', ''2025-08-25''';
            END CASE;
        END IF;
        
        -- Add status if available (using exact schema values)
        IF has_status_col THEN
            CASE i
                WHEN 1 THEN insert_query := insert_query || ', ''draft''';
                WHEN 2 THEN insert_query := insert_query || ', ''sent''';
                WHEN 3 THEN insert_query := insert_query || ', ''paid''';
                WHEN 4 THEN insert_query := insert_query || ', ''overdue''';
            END CASE;
        END IF;
        
        -- Add description/notes if available
        IF has_description_col OR has_notes_col THEN
            CASE i
                WHEN 1 THEN insert_query := insert_query || ', ''Physiotherapy Session - Sports Injury''';
                WHEN 2 THEN insert_query := insert_query || ', ''Manual Therapy Package''';
                WHEN 3 THEN insert_query := insert_query || ', ''Chronic Pain Management''';
                WHEN 4 THEN insert_query := insert_query || ', ''Follow-up Consultation''';
            END CASE;
        END IF;
        
        -- Add created_at if available
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'created_at') THEN
            CASE i
                WHEN 1 THEN insert_query := insert_query || ', ''2025-08-01''::timestamp';
                WHEN 2 THEN insert_query := insert_query || ', ''2025-07-01''::timestamp';
                WHEN 3 THEN insert_query := insert_query || ', ''2025-06-01''::timestamp';
                WHEN 4 THEN insert_query := insert_query || ', ''2025-08-10''::timestamp';
            END CASE;
        END IF;
        
        insert_query := insert_query || ')';
    END LOOP;
    
    insert_query := insert_query || ' ON CONFLICT DO NOTHING';
    
    -- Execute the dynamic query
    RAISE NOTICE 'Executing: %', insert_query;
    EXECUTE insert_query;
    
    RAISE NOTICE 'Created test invoices for customer %', customer_id_val;
END $$;

-- 4. Create test payments for paid invoices (if payments table exists)
DO $$
DECLARE
    customer_id_val integer;
    paid_invoice_id integer;
    has_transaction_id_col boolean;
BEGIN
    -- Only proceed if payments table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') THEN
        RAISE NOTICE 'Payments table does not exist, skipping payment creation';
        RETURN;
    END IF;
    
    -- Get customer ID
    SELECT id INTO customer_id_val FROM customers WHERE email = 'john.doe@test.com';
    
    -- Get a paid invoice ID
    SELECT id INTO paid_invoice_id 
    FROM invoices 
    WHERE customer_id = customer_id_val AND status = 'paid' 
    LIMIT 1;
    
    IF paid_invoice_id IS NULL THEN
        RAISE NOTICE 'No paid invoices found, skipping payment creation';
        RETURN;
    END IF;
    
    -- Check if transaction_id column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'payments' AND column_name IN ('transaction_id', 'sumup_transaction_id')
    ) INTO has_transaction_id_col;
    
    -- Create payment record
    IF has_transaction_id_col THEN
        INSERT INTO payments (
            customer_id,
            invoice_id,
            amount,
            payment_date,
            payment_method,
            status,
            sumup_transaction_id,
            created_at
        ) VALUES (
            customer_id_val,
            paid_invoice_id,
            175.00,
            '2025-06-15'::timestamp,
            'card',
            'completed',
            'TXN_' || UPPER(SUBSTRING(MD5(RANDOM()::text), 1, 10)),
            '2025-06-15'::timestamp
        ) ON CONFLICT DO NOTHING;
    ELSE
        INSERT INTO payments (
            customer_id,
            invoice_id,
            amount,
            payment_date,
            payment_method,
            status,
            created_at
        ) VALUES (
            customer_id_val,
            paid_invoice_id,
            175.00,
            '2025-06-15'::timestamp,
            'card',
            'completed',
            '2025-06-15'::timestamp
        ) ON CONFLICT DO NOTHING;
    END IF;
    
    RAISE NOTICE 'Created test payment for invoice %', paid_invoice_id;
END $$;

-- 5. Create test bookings (adapt to actual table structure)
DO $$
DECLARE
    customer_id_val integer;
    has_timeslot_cols boolean;
    has_booking_date_col boolean;
BEGIN
    -- Get customer ID
    SELECT id INTO customer_id_val FROM customers WHERE email = 'john.doe@test.com';
    
    IF customer_id_val IS NULL THEN
        RAISE NOTICE 'Customer not found, skipping booking creation';
        RETURN;
    END IF;
    
    -- Check what columns exist in bookings table
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bookings' AND column_name IN ('timeslot_start_time', 'timeslot_end_time')
    ) INTO has_timeslot_cols;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bookings' AND column_name = 'booking_date'
    ) INTO has_booking_date_col;
    
    -- Create bookings based on available columns
    IF has_timeslot_cols AND has_booking_date_col THEN
        -- Full booking structure
        INSERT INTO bookings (
            customer_id,
            package_name,
            booking_date,
            status,
            notes,
            timeslot_start_time,
            timeslot_end_time,
            created_at
        ) VALUES 
            (customer_id_val, 'Sports Injury Assessment', '2025-08-20 14:00:00'::timestamp, 'confirmed', 'Initial consultation for knee injury', '14:00'::time, '15:00'::time, '2025-08-01'::timestamp),
            (customer_id_val, 'Manual Therapy Session', '2025-08-22 10:30:00'::timestamp, 'confirmed', 'Follow-up session', '10:30'::time, '11:30'::time, '2025-08-02'::timestamp),
            (customer_id_val, 'Physiotherapy Consultation', '2025-08-25 16:00:00'::timestamp, 'pending', 'Assessment for chronic pain', '16:00'::time, '17:00'::time, '2025-08-10'::timestamp),
            (customer_id_val, 'Post-Surgery Rehabilitation', '2025-07-15 09:00:00'::timestamp, 'cancelled', 'Patient cancelled due to illness', '09:00'::time, '10:00'::time, '2025-07-01'::timestamp)
        ON CONFLICT DO NOTHING;
    ELSIF has_booking_date_col THEN
        -- Bookings without timeslot columns
        INSERT INTO bookings (
            customer_id,
            package_name,
            booking_date,
            status,
            notes,
            created_at
        ) VALUES 
            (customer_id_val, 'Sports Injury Assessment', '2025-08-20 14:00:00'::timestamp, 'confirmed', 'Initial consultation for knee injury', '2025-08-01'::timestamp),
            (customer_id_val, 'Manual Therapy Session', '2025-08-22 10:30:00'::timestamp, 'confirmed', 'Follow-up session', '2025-08-02'::timestamp),
            (customer_id_val, 'Physiotherapy Consultation', '2025-08-25 16:00:00'::timestamp, 'pending', 'Assessment for chronic pain', '2025-08-10'::timestamp),
            (customer_id_val, 'Post-Surgery Rehabilitation', '2025-07-15 09:00:00'::timestamp, 'cancelled', 'Patient cancelled due to illness', '2025-07-01'::timestamp)
        ON CONFLICT DO NOTHING;
    ELSE
        -- Minimal booking structure
        INSERT INTO bookings (
            customer_id,
            package_name,
            status,
            notes,
            created_at
        ) VALUES 
            (customer_id_val, 'Sports Injury Assessment', 'confirmed', 'Initial consultation for knee injury', '2025-08-01'::timestamp),
            (customer_id_val, 'Manual Therapy Session', 'confirmed', 'Follow-up session', '2025-08-02'::timestamp),
            (customer_id_val, 'Physiotherapy Consultation', 'pending', 'Assessment for chronic pain', '2025-08-10'::timestamp),
            (customer_id_val, 'Post-Surgery Rehabilitation', 'cancelled', 'Patient cancelled due to illness', '2025-07-01'::timestamp)
        ON CONFLICT DO NOTHING;
    END IF;
    
    RAISE NOTICE 'Created test bookings for customer %', customer_id_val;
END $$;

-- 6. Create another test customer for variety
INSERT INTO customers (
  first_name, 
  last_name, 
  email, 
  phone, 
  is_active,
  created_at
) VALUES (
  'Jane', 
  'Smith', 
  'jane.smith@test.com', 
  '+353 86 987 6543',
  true,
  NOW()
) ON CONFLICT (email) DO NOTHING;

-- Add address fields if they exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'address_line_1') THEN
        UPDATE customers SET 
            address_line_1 = '456 Example Avenue',
            city = 'Cork',
            country = 'Ireland'
        WHERE email = 'jane.smith@test.com' AND address_line_1 IS NULL;
    END IF;
END $$;

-- Verification queries - adapted to handle different table structures
SELECT 'Customers created:' as info, COUNT(*) as count FROM customers WHERE email LIKE '%test.com';

DO $$
DECLARE
    table_count integer;
BEGIN
    -- Check invoices
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoices') THEN
        SELECT COUNT(*) INTO table_count FROM invoices WHERE customer_id IN (SELECT id FROM customers WHERE email LIKE '%test.com');
        RAISE NOTICE 'Invoices created: %', table_count;
    ELSE
        RAISE NOTICE 'Invoices table does not exist';
    END IF;
    
    -- Check payments  
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') THEN
        SELECT COUNT(*) INTO table_count FROM payments WHERE customer_id IN (SELECT id FROM customers WHERE email LIKE '%test.com');
        RAISE NOTICE 'Payments created: %', table_count;
    ELSE
        RAISE NOTICE 'Payments table does not exist';
    END IF;
    
    -- Check bookings
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bookings') THEN
        SELECT COUNT(*) INTO table_count FROM bookings WHERE customer_id IN (SELECT id FROM customers WHERE email LIKE '%test.com');
        RAISE NOTICE 'Bookings created: %', table_count;
    ELSE
        RAISE NOTICE 'Bookings table does not exist';
    END IF;
END $$;

-- Show test data summary - only for existing tables
SELECT 
  c.first_name,
  c.last_name,
  c.email
FROM customers c
WHERE c.email LIKE '%test.com'
ORDER BY c.email;

-- Show additional summary if tables exist
DO $$
DECLARE
    rec record;
BEGIN
    FOR rec IN 
        SELECT c.first_name, c.last_name, c.email, c.id
        FROM customers c
        WHERE c.email LIKE '%test.com'
        ORDER BY c.email
    LOOP
        RAISE NOTICE 'Customer: % % (%) - ID: %', rec.first_name, rec.last_name, rec.email, rec.id;
        
        -- Show invoice count if table exists
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoices') THEN
            RAISE NOTICE '  - Invoices: %', (SELECT COUNT(*) FROM invoices WHERE customer_id = rec.id);
        END IF;
        
        -- Show booking count if table exists
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bookings') THEN
            RAISE NOTICE '  - Bookings: %', (SELECT COUNT(*) FROM bookings WHERE customer_id = rec.id);
        END IF;
        
        -- Show payment count if table exists
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') THEN
            RAISE NOTICE '  - Payments: %', (SELECT COUNT(*) FROM payments WHERE customer_id = rec.id);
        END IF;
    END LOOP;
END $$;

SELECT 'TEST DATA CREATION COMPLETED!' as result;
