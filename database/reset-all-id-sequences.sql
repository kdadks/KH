-- Reset all auto-increment sequences to start from 1
-- This should be run after emptying tables to reset ID counters

-- Reset customers table sequence
ALTER SEQUENCE customers_id_seq RESTART WITH 1;

-- Reset payments table sequence  
ALTER SEQUENCE payments_id_seq RESTART WITH 1;

-- Reset payment_requests table sequence
ALTER SEQUENCE payment_requests_id_seq RESTART WITH 1;

-- Reset invoices table sequence (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.sequences WHERE sequence_name = 'invoices_id_seq') THEN
        ALTER SEQUENCE invoices_id_seq RESTART WITH 1;
    END IF;
END $$;

-- Reset invoice_items table sequence (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.sequences WHERE sequence_name = 'invoice_items_id_seq') THEN
        ALTER SEQUENCE invoice_items_id_seq RESTART WITH 1;
    END IF;
END $$;

-- Reset services table sequence (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.sequences WHERE sequence_name = 'services_id_seq') THEN
        ALTER SEQUENCE services_id_seq RESTART WITH 1;
    END IF;
END $$;

-- Reset admins table sequence (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.sequences WHERE sequence_name = 'admins_id_seq') THEN
        ALTER SEQUENCE admins_id_seq RESTART WITH 1;
    END IF;
END $$;

-- Verify the sequences have been reset
SELECT 
    schemaname,
    sequencename, 
    last_value,
    start_value,
    increment_by
FROM pg_sequences 
WHERE schemaname = 'public' 
  AND sequencename LIKE '%_id_seq'
ORDER BY sequencename;

-- Show current max IDs in tables to verify
SELECT 'customers' as table_name, COALESCE(MAX(id), 0) as max_id FROM customers
UNION ALL
SELECT 'payments', COALESCE(MAX(id), 0) FROM payments  
UNION ALL
SELECT 'payment_requests', COALESCE(MAX(id), 0) FROM payment_requests
UNION ALL
SELECT 'invoices', COALESCE(MAX(id), 0) FROM invoices
UNION ALL
SELECT 'invoice_items', COALESCE(MAX(id), 0) FROM invoice_items
ORDER BY table_name;
