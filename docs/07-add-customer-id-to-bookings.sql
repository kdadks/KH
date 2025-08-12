-- Step 7: Add customer_id to bookings table
ALTER TABLE bookings ADD COLUMN customer_id INTEGER;

-- Populate customer_id based on email matching
UPDATE bookings 
SET customer_id = (
    SELECT c.id 
    FROM customers c 
    WHERE c.email = bookings.customer_email
    LIMIT 1
);

-- Add foreign key constraint
ALTER TABLE bookings 
ADD CONSTRAINT fk_bookings_customer 
FOREIGN KEY (customer_id) REFERENCES customers(id);

-- Create index
CREATE INDEX idx_bookings_customer ON bookings(customer_id);
