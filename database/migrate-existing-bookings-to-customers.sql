-- Migrate existing bookings to use customer relationships
-- This script will:
-- 1. Create customer records for existing bookings that don't have customer_id
-- 2. Link existing bookings to their corresponding customers
-- 3. Handle duplicate customers (same email)

-- IMPORTANT: Run the diagnostic script first to understand your current data!

DO $$ 
DECLARE
    booking_record RECORD;
    existing_customer_id INTEGER;
    new_customer_id INTEGER;
    processed_count INTEGER := 0;
    created_customers_count INTEGER := 0;
    linked_bookings_count INTEGER := 0;
BEGIN
    RAISE NOTICE '=== STARTING BOOKING-CUSTOMER MIGRATION ===';
    
    -- Process all bookings that don't have customer_id but have customer data
    FOR booking_record IN 
        SELECT id, customer_name, customer_email, customer_phone, package_name, created_at
        FROM bookings 
        WHERE customer_id IS NULL 
        AND customer_email IS NOT NULL 
        AND customer_email != ''
        ORDER BY created_at ASC
    LOOP
        processed_count := processed_count + 1;
        
        -- Check if customer already exists by email
        SELECT id INTO existing_customer_id 
        FROM customers 
        WHERE email = booking_record.customer_email 
        LIMIT 1;
        
        IF existing_customer_id IS NOT NULL THEN
            -- Customer exists, just link the booking
            UPDATE bookings 
            SET customer_id = existing_customer_id 
            WHERE id = booking_record.id;
            
            linked_bookings_count := linked_bookings_count + 1;
            RAISE NOTICE 'Linked booking % to existing customer % (email: %)', 
                booking_record.id, existing_customer_id, booking_record.customer_email;
        ELSE
            -- Customer doesn't exist, create new customer
            BEGIN
                -- Parse customer name into first_name and last_name
                DECLARE
                    name_parts TEXT[];
                    first_name_part TEXT;
                    last_name_part TEXT;
                BEGIN
                    -- Split customer name by space
                    name_parts := string_to_array(trim(booking_record.customer_name), ' ');
                    
                    IF array_length(name_parts, 1) >= 2 THEN
                        first_name_part := name_parts[1];
                        last_name_part := array_to_string(name_parts[2:array_length(name_parts,1)], ' ');
                    ELSE
                        first_name_part := coalesce(booking_record.customer_name, 'Unknown');
                        last_name_part := 'Customer';
                    END IF;
                    
                    -- Insert new customer
                    INSERT INTO customers (first_name, last_name, email, phone, created_at, updated_at)
                    VALUES (
                        first_name_part,
                        last_name_part,
                        booking_record.customer_email,
                        booking_record.customer_phone,
                        booking_record.created_at,  -- Use booking creation time
                        NOW()
                    )
                    RETURNING id INTO new_customer_id;
                    
                    -- Link booking to new customer
                    UPDATE bookings 
                    SET customer_id = new_customer_id 
                    WHERE id = booking_record.id;
                    
                    created_customers_count := created_customers_count + 1;
                    linked_bookings_count := linked_bookings_count + 1;
                    
                    RAISE NOTICE 'Created customer % (%: %) and linked booking %', 
                        new_customer_id, first_name_part, last_name_part, booking_record.id;
                END;
            EXCEPTION
                WHEN OTHERS THEN
                    RAISE WARNING 'Failed to process booking %: %', booking_record.id, SQLERRM;
            END;
        END IF;
        
        -- Progress indicator
        IF processed_count % 10 = 0 THEN
            RAISE NOTICE 'Processed % bookings...', processed_count;
        END IF;
    END LOOP;
    
    RAISE NOTICE '=== MIGRATION COMPLETED ===';
    RAISE NOTICE 'Total bookings processed: %', processed_count;
    RAISE NOTICE 'New customers created: %', created_customers_count;
    RAISE NOTICE 'Bookings linked to customers: %', linked_bookings_count;
END $$;

-- Verify the migration results
DO $$ 
DECLARE
    total_bookings INTEGER;
    bookings_with_customers INTEGER;
    total_customers INTEGER;
BEGIN
    RAISE NOTICE '=== MIGRATION VERIFICATION ===';
    
    SELECT COUNT(*) FROM bookings INTO total_bookings;
    SELECT COUNT(*) FROM bookings WHERE customer_id IS NOT NULL INTO bookings_with_customers;
    SELECT COUNT(*) FROM customers INTO total_customers;
    
    RAISE NOTICE 'Total bookings: %', total_bookings;
    RAISE NOTICE 'Bookings with customer relationships: %', bookings_with_customers;
    RAISE NOTICE 'Total customers: %', total_customers;
    RAISE NOTICE 'Migration success rate: %%%', 
        CASE WHEN total_bookings > 0 
             THEN ROUND((bookings_with_customers::DECIMAL / total_bookings) * 100, 1)
             ELSE 0 
        END;
END $$;
