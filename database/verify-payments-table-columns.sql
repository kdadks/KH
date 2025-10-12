-- Verify all columns in the payments table
-- Run this query in Supabase SQL Editor to see actual table structure

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public' 
    AND table_name = 'payments'
ORDER BY 
    ordinal_position;

-- Also show a sample record to see what data actually exists
SELECT * FROM public.payments 
ORDER BY created_at DESC 
LIMIT 1;
