-- GDPR Compatibility Check Script
-- This script validates that the GDPR schema additions won't break existing functionality

-- Check existing customers table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'customers' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Test if any critical functions depend on missing columns
-- This simulates what the GDPR retention function would need

-- Safe test for last_login field existence
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'customers' AND column_name = 'last_login') THEN
        RAISE NOTICE 'last_login column exists - GDPR retention function will work';
    ELSE
        RAISE NOTICE 'last_login column missing - will be created by GDPR schema';
    END IF;
END $$;

-- Safe test for is_active field existence
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'customers' AND column_name = 'is_active') THEN
        RAISE NOTICE 'is_active column exists - GDPR retention function will work';
    ELSE
        RAISE WARNING 'is_active column missing - this could cause issues';
    END IF;
END $$;

-- Check for existing GDPR-related columns to avoid duplicates
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'customers' AND column_name = 'gdpr_anonymized') THEN
        RAISE NOTICE 'GDPR columns already exist - schema will skip creation';
    ELSE
        RAISE NOTICE 'GDPR columns will be created';
    END IF;
END $$;

-- Test backward compatibility of existing queries
-- This tests the most common customer queries used in the application

-- Test 1: Basic customer lookup (used by UserAuthContext)
SELECT 'Customer lookup test' AS test_name, 
       COUNT(*) as customer_count 
FROM public.customers 
WHERE is_active = true 
LIMIT 1;

-- Test 2: Customer with auth_user_id lookup (used by user management)
SELECT 'Auth user lookup test' AS test_name,
       COUNT(*) as customer_count
FROM public.customers 
WHERE auth_user_id IS NOT NULL 
LIMIT 1;

-- Test 3: Email-based lookup (used by authentication)
SELECT 'Email lookup test' AS test_name,
       COUNT(*) as customer_count
FROM public.customers 
WHERE email LIKE '%@%' 
LIMIT 1;

RAISE NOTICE 'Compatibility check completed - review results above';
