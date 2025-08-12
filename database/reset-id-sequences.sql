-- Reset ID sequences to 1 for all tables with integer ID columns
-- This should be run when the database is empty to ensure clean ID numbering

-- Reset customers table sequence
DO $$ 
BEGIN
    -- Check if sequence exists before trying to reset it
    IF EXISTS (SELECT 1 FROM information_schema.sequences WHERE sequence_name = 'customers_id_seq') THEN
        -- Only reset if table is empty
        IF NOT EXISTS (SELECT 1 FROM customers LIMIT 1) THEN
            ALTER SEQUENCE customers_id_seq RESTART WITH 1;
            RAISE NOTICE 'Reset customers_id_seq to 1 (table was empty)';
        ELSE
            RAISE NOTICE 'Customers table not empty - sequence not reset';
        END IF;
    ELSE
        RAISE NOTICE 'customers_id_seq sequence does not exist - skipping';
    END IF;
END $$;

-- Reset bookings table sequence  
DO $$ 
BEGIN
    -- Check if sequence exists before trying to reset it
    IF EXISTS (SELECT 1 FROM information_schema.sequences WHERE sequence_name = 'bookings_id_seq') THEN
        -- Only reset if table is empty
        IF NOT EXISTS (SELECT 1 FROM bookings LIMIT 1) THEN
            ALTER SEQUENCE bookings_id_seq RESTART WITH 1;
            RAISE NOTICE 'Reset bookings_id_seq to 1 (table was empty)';
        ELSE
            RAISE NOTICE 'Bookings table not empty - sequence not reset';
        END IF;
    ELSE
        RAISE NOTICE 'bookings_id_seq sequence does not exist - skipping';
    END IF;
END $$;

-- Reset services table sequence (if it exists and has auto-increment ID)
DO $$ 
BEGIN
    -- Check if services table exists and has a sequence
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'services') 
       AND EXISTS (SELECT 1 FROM information_schema.sequences WHERE sequence_name = 'services_id_seq') THEN
        -- Only reset if table is empty
        IF NOT EXISTS (SELECT 1 FROM services LIMIT 1) THEN
            ALTER SEQUENCE services_id_seq RESTART WITH 1;
            RAISE NOTICE 'Reset services_id_seq to 1 (table was empty)';
        ELSE
            RAISE NOTICE 'Services table not empty - sequence not reset';
        END IF;
    ELSE
        RAISE NOTICE 'Services table or sequence does not exist - skipping';
    END IF;
END $$;

-- Reset invoices table sequence (if it exists)
DO $$ 
BEGIN
    -- Check if invoices table exists and has a sequence
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoices') 
       AND EXISTS (SELECT 1 FROM information_schema.sequences WHERE sequence_name = 'invoices_id_seq') THEN
        -- Only reset if table is empty
        IF NOT EXISTS (SELECT 1 FROM invoices LIMIT 1) THEN
            ALTER SEQUENCE invoices_id_seq RESTART WITH 1;
            RAISE NOTICE 'Reset invoices_id_seq to 1 (table was empty)';
        ELSE
            RAISE NOTICE 'Invoices table not empty - sequence not reset';
        END IF;
    ELSE
        RAISE NOTICE 'Invoices table or sequence does not exist - skipping';
    END IF;
END $$;

-- Reset invoice_items table sequence (if it exists)
DO $$ 
BEGIN
    -- Check if invoice_items table exists and has a sequence
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoice_items') 
       AND EXISTS (SELECT 1 FROM information_schema.sequences WHERE sequence_name = 'invoice_items_id_seq') THEN
        -- Only reset if table is empty
        IF NOT EXISTS (SELECT 1 FROM invoice_items LIMIT 1) THEN
            ALTER SEQUENCE invoice_items_id_seq RESTART WITH 1;
            RAISE NOTICE 'Reset invoice_items_id_seq to 1 (table was empty)';
        ELSE
            RAISE NOTICE 'Invoice_items table not empty - sequence not reset';
        END IF;
    ELSE
        RAISE NOTICE 'Invoice_items table or sequence does not exist - skipping';
    END IF;
END $$;

-- Reset time_slots table sequence (if it exists)
DO $$ 
BEGIN
    -- Check if time_slots table exists and has a sequence
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'time_slots') 
       AND EXISTS (SELECT 1 FROM information_schema.sequences WHERE sequence_name = 'time_slots_id_seq') THEN
        -- Only reset if table is empty
        IF NOT EXISTS (SELECT 1 FROM time_slots LIMIT 1) THEN
            ALTER SEQUENCE time_slots_id_seq RESTART WITH 1;
            RAISE NOTICE 'Reset time_slots_id_seq to 1 (table was empty)';
        ELSE
            RAISE NOTICE 'Time_slots table not empty - sequence not reset';
        END IF;
    ELSE
        RAISE NOTICE 'Time_slots table or sequence does not exist - skipping';
    END IF;
END $$;

-- Generic sequence reset function for any additional tables
-- This will find and reset all sequences that follow the pattern tablename_id_seq
DO $$ 
DECLARE
    seq_record RECORD;
    table_name_part TEXT;
    table_exists BOOLEAN;
    table_empty BOOLEAN;
BEGIN
    -- Loop through all sequences that end with _id_seq
    FOR seq_record IN 
        SELECT sequence_name 
        FROM information_schema.sequences 
        WHERE sequence_name LIKE '%_id_seq'
        AND sequence_name NOT IN ('customers_id_seq', 'bookings_id_seq', 'services_id_seq', 'invoices_id_seq', 'invoice_items_id_seq', 'time_slots_id_seq')
    LOOP
        -- Extract table name from sequence name (remove _id_seq suffix)
        table_name_part := REPLACE(seq_record.sequence_name, '_id_seq', '');
        
        -- Check if corresponding table exists
        SELECT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = table_name_part AND table_schema = 'public'
        ) INTO table_exists;
        
        IF table_exists THEN
            BEGIN
                -- Check if table is empty (with error handling)
                EXECUTE format('SELECT NOT EXISTS (SELECT 1 FROM %I LIMIT 1)', table_name_part) INTO table_empty;
                
                IF table_empty THEN
                    EXECUTE format('ALTER SEQUENCE %I RESTART WITH 1', seq_record.sequence_name);
                    RAISE NOTICE 'Reset % to 1 (table % was empty)', seq_record.sequence_name, table_name_part;
                ELSE
                    RAISE NOTICE 'Table % not empty - sequence % not reset', table_name_part, seq_record.sequence_name;
                END IF;
            EXCEPTION
                WHEN OTHERS THEN
                    RAISE NOTICE 'Error accessing table % for sequence % - skipping (Error: %)', table_name_part, seq_record.sequence_name, SQLERRM;
            END;
        ELSE
            RAISE NOTICE 'Table % does not exist for sequence % - skipping', table_name_part, seq_record.sequence_name;
        END IF;
    END LOOP;
END $$;

-- Final completion message
DO $$ 
BEGIN
    RAISE NOTICE 'ID sequence reset process completed';
    RAISE NOTICE 'All empty tables now have their ID sequences starting from 1';
END $$;
