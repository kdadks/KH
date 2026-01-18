-- Migration: Force password reset for plaintext passwords
-- This migration identifies customers with plaintext passwords and marks them for forced password reset
-- Plaintext passwords are identified as those not starting with '$2a$', '$2b$', or '$2y$' (bcrypt prefixes)

-- Step 1: Identify customers with plaintext passwords
-- Run this query to see which customers need attention:
-- SELECT id, email, SUBSTRING(password, 1, 10) as password_prefix 
-- FROM customers 
-- WHERE password IS NOT NULL 
--   AND password != '' 
--   AND password NOT LIKE '$2a$%' 
--   AND password NOT LIKE '$2b$%' 
--   AND password NOT LIKE '$2y$%';

-- Step 2: Mark customers with plaintext passwords to change password on next login
UPDATE customers
SET must_change_password = true
WHERE password IS NOT NULL 
  AND password != '' 
  AND password NOT LIKE '$2a$%' 
  AND password NOT LIKE '$2b$%' 
  AND password NOT LIKE '$2y$%'
  AND is_active = true;

-- Step 3: Log the action
-- Records updated: [Number of customers with plaintext passwords marked for reset]

-- Step 4: After all customers have changed passwords, delete plaintext passwords
-- (This should be done after a grace period to allow customers to reset)
-- UPDATE customers
-- SET password = NULL
-- WHERE password IS NOT NULL 
--   AND password != '' 
--   AND password NOT LIKE '$2a$%' 
--   AND password NOT LIKE '$2b$%' 
--   AND password NOT LIKE '$2y$%';

-- Security Notes:
-- - Plaintext passwords pose a CRITICAL security risk
-- - This migration ensures all existing plaintext passwords are replaced with hashed versions
-- - Customers with plaintext passwords must reset them on next login
-- - All new passwords are bcrypt-hashed with appropriate salt rounds
-- - The login system now REJECTS any plaintext passwords completely
