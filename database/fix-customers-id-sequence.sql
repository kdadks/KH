-- Fix customers table ID sequence issue
-- This fixes the "duplicate key value violates unique constraint customers_pkey" error

-- First, check the last used sequence value (this works without currval)
SELECT last_value, is_called FROM customers_id_seq;

-- Check the maximum ID in the customers table
SELECT MAX(id) as max_customer_id FROM customers;

-- Reset the sequence to be higher than the maximum ID
-- This prevents primary key collisions
SELECT setval('customers_id_seq', COALESCE(MAX(id), 1), true) FROM customers;

-- Verify the sequence is now correct
SELECT last_value, is_called FROM customers_id_seq;

-- Test that we can now insert a new customer (this will not actually insert, just test)
-- EXPLAIN (ANALYZE, BUFFERS) INSERT INTO customers (first_name, last_name, email, country, is_active)
-- VALUES ('Test', 'User', 'test@example.com', 'Ireland', true);