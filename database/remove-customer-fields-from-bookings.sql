-- Remove customer fields from bookings table
-- These fields are now handled in the separate customers table

-- First backup any existing data if needed
-- CREATE TABLE bookings_backup AS SELECT * FROM bookings;

-- Remove the customer columns from bookings table
-- Note: Be careful with production data - ensure customers table is populated first

-- 1. Remove customer_name column if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'bookings' AND column_name = 'customer_name') THEN
        ALTER TABLE bookings DROP COLUMN customer_name;
        RAISE NOTICE 'Dropped customer_name column from bookings table';
    ELSE
        RAISE NOTICE 'customer_name column does not exist in bookings table';
    END IF;
END $$;

-- 2. Remove customer_email column if it exists  
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'bookings' AND column_name = 'customer_email') THEN
        ALTER TABLE bookings DROP COLUMN customer_email;
        RAISE NOTICE 'Dropped customer_email column from bookings table';
    ELSE
        RAISE NOTICE 'customer_email column does not exist in bookings table';
    END IF;
END $$;

-- 3. Remove customer_phone column if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'bookings' AND column_name = 'customer_phone') THEN
        ALTER TABLE bookings DROP COLUMN customer_phone;
        RAISE NOTICE 'Dropped customer_phone column from bookings table';
    ELSE
        RAISE NOTICE 'customer_phone column does not exist in bookings table';
    END IF;
END $$;

-- 4. Ensure customer_id column exists and has proper foreign key constraint
DO $$ 
BEGIN
    -- Add customer_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'customer_id') THEN
        ALTER TABLE bookings ADD COLUMN customer_id INTEGER;
        RAISE NOTICE 'Added customer_id column to bookings table';
    END IF;
    
    -- Add foreign key constraint if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'bookings_customer_id_fkey') THEN
        ALTER TABLE bookings 
        ADD CONSTRAINT bookings_customer_id_fkey 
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added foreign key constraint for customer_id';
    END IF;
END $$;

-- 5. Create index on customer_id for better performance
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON bookings(customer_id);

-- Final completion message
DO $$ 
BEGIN
    RAISE NOTICE 'Bookings table customer field cleanup completed';
END $$;
