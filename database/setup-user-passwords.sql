-- Password Setup Helper for Existing Users
-- This script helps set up Supabase Auth users for existing customers/admins

-- First, check existing customers and admins without auth_user_id
DO $$
DECLARE
    rec record;
    temp_password text := 'TempPass123!'; -- Temporary password - users should change it
BEGIN
    RAISE NOTICE 'Checking existing users without Supabase Auth setup:';
    RAISE NOTICE '';
    
    -- Check customers
    RAISE NOTICE 'CUSTOMERS without auth_user_id:';
    FOR rec IN 
        SELECT id, first_name, last_name, email 
        FROM customers 
        WHERE auth_user_id IS NULL 
        ORDER BY email
    LOOP
        RAISE NOTICE 'Customer ID: %, Name: % %, Email: %', 
                     rec.id, rec.first_name, rec.last_name, rec.email;
    END LOOP;
    
    RAISE NOTICE '';
    
    -- Check if admins table exists and show admin users
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admins') THEN
        RAISE NOTICE 'ADMINS without auth_user_id (if column exists):';
        
        -- Check if admins table has auth_user_id column
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admins' AND column_name = 'auth_user_id') THEN
            FOR rec IN 
                SELECT id, username, email 
                FROM admins 
                WHERE auth_user_id IS NULL 
                ORDER BY email
            LOOP
                RAISE NOTICE 'Admin ID: %, Username: %, Email: %', 
                             rec.id, rec.username, rec.email;
            END LOOP;
        ELSE
            -- If no auth_user_id column, show all admins
            FOR rec IN 
                SELECT id, username, email 
                FROM admins 
                ORDER BY email
            LOOP
                RAISE NOTICE 'Admin ID: %, Username: %, Email: % (no auth_user_id column)', 
                             rec.id, rec.username, rec.email;
            END LOOP;
        END IF;
    ELSE
        RAISE NOTICE 'No admins table found';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== SETUP INSTRUCTIONS ===';
    RAISE NOTICE '1. For each user listed above, you need to:';
    RAISE NOTICE '   a) Create a Supabase Auth user account';
    RAISE NOTICE '   b) Link the auth_user_id to the customer/admin record';
    RAISE NOTICE '';
    RAISE NOTICE '2. You can do this through:';
    RAISE NOTICE '   a) Supabase Dashboard > Authentication > Users';
    RAISE NOTICE '   b) Or use the signup feature on your website';
    RAISE NOTICE '';
    RAISE NOTICE '3. After creating auth users, update the records:';
    RAISE NOTICE '   UPDATE customers SET auth_user_id = ''auth-user-uuid'' WHERE email = ''user@example.com'';';
    RAISE NOTICE '';
    RAISE NOTICE '4. Recommended: Ask users to set their own passwords by:';
    RAISE NOTICE '   a) Using the "Forgot Password" feature on login page';
    RAISE NOTICE '   b) Or creating accounts with temporary passwords and forcing password reset';
END $$;
