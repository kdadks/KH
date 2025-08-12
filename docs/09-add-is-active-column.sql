-- Add is_active column to customers table for soft delete functionality
ALTER TABLE customers 
ADD COLUMN is_active BOOLEAN DEFAULT true;

-- Create index for better performance when filtering active customers
CREATE INDEX idx_customers_is_active ON customers(is_active);

-- Update existing customers to be active by default
UPDATE customers SET is_active = true WHERE is_active IS NULL;

-- Add comment to document the purpose
COMMENT ON COLUMN customers.is_active IS 'Soft delete flag: true = active, false = soft deleted, null = active (legacy)';
