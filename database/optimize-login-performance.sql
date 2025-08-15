-- Performance optimization indexes for user authentication
-- Execute this in Supabase SQL Editor

-- Create index on customers email for faster login lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_email_active 
ON customers (email, is_active) 
WHERE is_active = true;

-- Create index on customers auth_user_id for faster profile loading
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_auth_user_id_active 
ON customers (auth_user_id, is_active) 
WHERE is_active = true;

-- Add comment for documentation
COMMENT ON INDEX idx_customers_email_active IS 'Optimizes customer login by email lookup';
COMMENT ON INDEX idx_customers_auth_user_id_active IS 'Optimizes customer profile loading by auth_user_id';
