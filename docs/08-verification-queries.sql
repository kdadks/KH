-- Step 8: Verification queries
-- Check customer count
SELECT COUNT(*) as customer_count FROM customers;

-- Check bookings with customer links
SELECT COUNT(*) as linked_bookings FROM bookings WHERE customer_id IS NOT NULL;

-- Check for orphaned bookings
SELECT COUNT(*) as orphaned_bookings FROM bookings WHERE customer_id IS NULL;

-- Sample data check
SELECT 
    c.first_name, 
    c.last_name, 
    c.email, 
    COUNT(b.id) as booking_count 
FROM customers c 
LEFT JOIN bookings b ON b.customer_id = c.id 
GROUP BY c.id, c.first_name, c.last_name, c.email 
LIMIT 5;
