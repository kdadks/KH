-- Diagnostic script to check existing sequences and tables
-- Run this first to see what sequences exist in your database

-- 1. List all sequences in the database
DO $$ 
DECLARE
    seq_record RECORD;
BEGIN
    RAISE NOTICE '=== EXISTING SEQUENCES ===';
    FOR seq_record IN 
        SELECT sequence_name, sequence_schema
        FROM information_schema.sequences 
        ORDER BY sequence_name
    LOOP
        RAISE NOTICE 'Found sequence: %.%', seq_record.sequence_schema, seq_record.sequence_name;
    END LOOP;
END $$;

-- 2. List all tables with ID columns
DO $$ 
DECLARE
    table_record RECORD;
BEGIN
    RAISE NOTICE '=== TABLES WITH ID COLUMNS ===';
    FOR table_record IN 
        SELECT t.table_name, c.column_name, c.column_default
        FROM information_schema.tables t
        JOIN information_schema.columns c ON t.table_name = c.table_name
        WHERE t.table_type = 'BASE TABLE'
        AND t.table_schema = 'public'
        AND c.column_name = 'id'
        ORDER BY t.table_name
    LOOP
        RAISE NOTICE 'Table: % has ID column with default: %', table_record.table_name, table_record.column_default;
    END LOOP;
END $$;

-- 3. Check specific tables and their sequences
DO $$ 
DECLARE
    table_names TEXT[] := ARRAY['customers', 'bookings', 'services', 'invoices', 'invoice_items', 'time_slots'];
    tbl_name TEXT;
    seq_name TEXT;
    table_exists BOOLEAN;
    sequence_exists BOOLEAN;
    record_count INTEGER;
BEGIN
    RAISE NOTICE '=== TABLE AND SEQUENCE STATUS ===';
    FOREACH tbl_name IN ARRAY table_names
    LOOP
        -- Check if table exists
        SELECT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = tbl_name AND table_schema = 'public'
        ) INTO table_exists;
        
        -- Generate expected sequence name
        seq_name := tbl_name || '_id_seq';
        
        -- Check if sequence exists
        SELECT EXISTS (
            SELECT 1 FROM information_schema.sequences 
            WHERE sequence_name = seq_name
        ) INTO sequence_exists;
        
        IF table_exists THEN
            -- Get record count
            EXECUTE format('SELECT COUNT(*) FROM %I', tbl_name) INTO record_count;
            RAISE NOTICE 'Table: % | Exists: YES | Records: % | Sequence % | Exists: %', 
                tbl_name, record_count, seq_name, 
                CASE WHEN sequence_exists THEN 'YES' ELSE 'NO' END;
        ELSE
            RAISE NOTICE 'Table: % | Exists: NO | Sequence: % | Exists: %', 
                tbl_name, seq_name,
                CASE WHEN sequence_exists THEN 'YES' ELSE 'NO' END;
        END IF;
    END LOOP;
END $$;

-- 4. Show current sequence values
DO $$ 
DECLARE
    seq_record RECORD;
    current_value BIGINT;
BEGIN
    RAISE NOTICE '=== CURRENT SEQUENCE VALUES ===';
    FOR seq_record IN 
        SELECT sequence_name
        FROM information_schema.sequences 
        WHERE sequence_name LIKE '%_id_seq'
        ORDER BY sequence_name
    LOOP
        BEGIN
            -- Try to get the current value, handle errors gracefully
            EXECUTE format('SELECT last_value FROM %I', seq_record.sequence_name) INTO current_value;
            RAISE NOTICE 'Sequence: % | Current Value: %', seq_record.sequence_name, current_value;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Sequence: % | ERROR: Could not read current value (%) ', seq_record.sequence_name, SQLERRM;
        END;
    END LOOP;
    
    -- Check if no sequences were found
    IF NOT FOUND THEN
        RAISE NOTICE 'No sequences ending with "_id_seq" found in the database';
    END IF;
END $$;

-- Final summary
DO $$ 
BEGIN
    RAISE NOTICE '=== DIAGNOSTIC COMPLETE ===';
    RAISE NOTICE 'Review the output above to understand your database structure';
    RAISE NOTICE 'Then run the appropriate reset script based on what sequences exist';
END $$;
