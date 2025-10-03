-- Allow multiple customer names per email address
-- This enables different people to book using the same email with different names
-- For example: Sarah Tiwari and Neha Tiwari using the same email sarah@domain.com

-- Remove the unique constraint on email to allow multiple customers with same email
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_email_key;

-- Keep the email index for performance (but remove uniqueness)
DROP INDEX IF EXISTS idx_customers_email;
CREATE INDEX idx_customers_email ON customers(email);

-- Add a composite index for email + name combination for better performance
CREATE INDEX idx_customers_email_name ON customers(email, first_name, last_name);

-- Add comment to document this change
COMMENT ON COLUMN customers.email IS 'Email address - multiple customers can share the same email with different names';