-- Add temporary password support to customers table
-- This allows customers to login with a temporary password and be forced to change it

DO $$
BEGIN
    -- Add password column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' 
        AND column_name = 'password' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE customers ADD COLUMN password VARCHAR(255) NULL;
        RAISE NOTICE 'Added password column to customers table';
    ELSE
        RAISE NOTICE 'password column already exists in customers table';
    END IF;
    
    -- Add password_change_required column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' 
        AND column_name = 'password_change_required' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE customers ADD COLUMN password_change_required BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added password_change_required column to customers table';
    ELSE
        RAISE NOTICE 'password_change_required column already exists in customers table';
    END IF;
    
    -- Add must_change_password column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' 
        AND column_name = 'must_change_password' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE customers ADD COLUMN must_change_password BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added must_change_password column to customers table';
    ELSE
        RAISE NOTICE 'must_change_password column already exists in customers table';
    END IF;
    
    -- Add first_login column to track if user has logged in before
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' 
        AND column_name = 'first_login' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE customers ADD COLUMN first_login BOOLEAN DEFAULT true;
        RAISE NOTICE 'Added first_login column to customers table';
    ELSE
        RAISE NOTICE 'first_login column already exists in customers table';
    END IF;
    
    -- Add last_login column to track login times
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' 
        AND column_name = 'last_login' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE customers ADD COLUMN last_login TIMESTAMP WITH TIME ZONE NULL;
        RAISE NOTICE 'Added last_login column to customers table';
    ELSE
        RAISE NOTICE 'last_login column already exists in customers table';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== CUSTOMERS TABLE UPDATED ===';
    RAISE NOTICE 'New columns added:';
    RAISE NOTICE '- password: Store temporary passwords for first login';
    RAISE NOTICE '- password_change_required: Flag to force password change';  
    RAISE NOTICE '- must_change_password: Flag to force password change on login';
    RAISE NOTICE '- first_login: Track if user has completed first login';
    RAISE NOTICE '- last_login: Track last login timestamp';
    
END $$;

-- Show current customers without Supabase Auth setup
DO $$
DECLARE
    customer_rec record;
    count_without_auth integer := 0;
    temp_password text := 'TempPass123!';
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== CUSTOMERS WITHOUT SUPABASE AUTH ===';
    
    FOR customer_rec IN 
        SELECT id, first_name, last_name, email, auth_user_id, temp_password, password_change_required
        FROM customers 
        WHERE auth_user_id IS NULL 
        ORDER BY email
    LOOP
        count_without_auth := count_without_auth + 1;
        RAISE NOTICE 'Customer ID: %, Name: % %, Email: %, Temp Password: %, Change Required: %', 
                     customer_rec.id, 
                     customer_rec.first_name, 
                     customer_rec.last_name, 
                     customer_rec.email,
                     COALESCE(customer_rec.temp_password, 'NOT SET'),
                     COALESCE(customer_rec.password_change_required, false);
    END LOOP;
    
    IF count_without_auth = 0 THEN
        RAISE NOTICE 'All customers have Supabase Auth setup!';
    ELSE
        RAISE NOTICE '';
        RAISE NOTICE '=== SETUP INSTRUCTIONS ===';
        RAISE NOTICE '1. For each customer above, you can:';
        RAISE NOTICE '   a) Set a temporary password: UPDATE customers SET temp_password = ''%'', password_change_required = true WHERE email = ''customer@email.com'';', temp_password;
        RAISE NOTICE '   b) Create Supabase Auth user with the email and temporary password';
        RAISE NOTICE '   c) Link the auth user: UPDATE customers SET auth_user_id = ''uuid'' WHERE email = ''customer@email.com'';';
        RAISE NOTICE '';
        RAISE NOTICE '2. On first login, user will be prompted to change password';
        RAISE NOTICE '3. After password change, temp_password will be cleared and password_change_required set to false';
    END IF;
    
END $$;
