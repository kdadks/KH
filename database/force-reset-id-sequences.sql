-- FORCE RESET all ID sequences to 1 
-- ⚠️ WARNING: This will reset sequences even if tables contain data!
-- ⚠️ Use this ONLY when you want to completely reset the database numbering
-- ⚠️ This may cause issues with existing foreign key relationships

-- Truncate all tables first (optional - uncomment if needed)
-- TRUNCATE customers, bookings, services, invoices, invoice_items, time_slots RESTART IDENTITY CASCADE;

-- Force reset customers table sequence
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.sequences WHERE sequence_name = 'customers_id_seq') THEN
        ALTER SEQUENCE customers_id_seq RESTART WITH 1;
        RAISE NOTICE 'FORCE reset customers_id_seq to 1';
    END IF;
END $$;

-- Force reset bookings table sequence  
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.sequences WHERE sequence_name = 'bookings_id_seq') THEN
        ALTER SEQUENCE bookings_id_seq RESTART WITH 1;
        RAISE NOTICE 'FORCE reset bookings_id_seq to 1';
    END IF;
END $$;

-- Force reset services table sequence
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.sequences WHERE sequence_name = 'services_id_seq') THEN
        ALTER SEQUENCE services_id_seq RESTART WITH 1;
        RAISE NOTICE 'FORCE reset services_id_seq to 1';
    END IF;
END $$;

-- Force reset invoices table sequence
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.sequences WHERE sequence_name = 'invoices_id_seq') THEN
        ALTER SEQUENCE invoices_id_seq RESTART WITH 1;
        RAISE NOTICE 'FORCE reset invoices_id_seq to 1';
    END IF;
END $$;

-- Force reset invoice_items table sequence
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.sequences WHERE sequence_name = 'invoice_items_id_seq') THEN
        ALTER SEQUENCE invoice_items_id_seq RESTART WITH 1;
        RAISE NOTICE 'FORCE reset invoice_items_id_seq to 1';
    END IF;
END $$;

-- Force reset time_slots table sequence
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.sequences WHERE sequence_name = 'time_slots_id_seq') THEN
        ALTER SEQUENCE time_slots_id_seq RESTART WITH 1;
        RAISE NOTICE 'FORCE reset time_slots_id_seq to 1';
    END IF;
END $$;

-- Force reset ALL remaining _id_seq sequences
DO $$ 
DECLARE
    seq_record RECORD;
BEGIN
    -- Loop through all sequences that end with _id_seq
    FOR seq_record IN 
        SELECT sequence_name 
        FROM information_schema.sequences 
        WHERE sequence_name LIKE '%_id_seq'
        AND sequence_name NOT IN ('customers_id_seq', 'bookings_id_seq', 'services_id_seq', 'invoices_id_seq', 'invoice_items_id_seq', 'time_slots_id_seq')
    LOOP
        EXECUTE format('ALTER SEQUENCE %I RESTART WITH 1', seq_record.sequence_name);
        RAISE NOTICE 'FORCE reset % to 1', seq_record.sequence_name;
    END LOOP;
END $$;

-- Final completion message
DO $$ 
BEGIN
    RAISE NOTICE '⚠️ FORCE ID sequence reset completed';
    RAISE NOTICE '⚠️ ALL sequences have been reset to start from 1';
    RAISE NOTICE '⚠️ Ensure this was intended as it may affect existing data relationships';
END $$;
