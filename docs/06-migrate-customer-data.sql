-- Step 6: Migrate existing customer data from bookings
INSERT INTO customers (first_name, last_name, email, phone, created_at)
SELECT 
    CASE 
        WHEN POSITION(' ' IN customer_name) > 0 
        THEN SUBSTRING(customer_name FROM 1 FOR POSITION(' ' IN customer_name) - 1)
        ELSE customer_name
    END as first_name,
    CASE 
        WHEN POSITION(' ' IN customer_name) > 0 
        THEN SUBSTRING(customer_name FROM POSITION(' ' IN customer_name) + 1)
        ELSE ''
    END as last_name,
    customer_email,
    customer_phone,
    MIN(created_at) as created_at
FROM bookings
WHERE customer_email IS NOT NULL 
    AND customer_email != ''
    AND NOT EXISTS (
        SELECT 1 FROM customers c 
        WHERE c.email = bookings.customer_email
    )
GROUP BY customer_name, customer_email, customer_phone;
