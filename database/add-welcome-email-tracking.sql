-- Add welcome_email_sent flag to customers table to prevent duplicate welcome emails
-- This prevents welcome emails from being sent multiple times to the same customer

-- Add the column
ALTER TABLE customers 
ADD COLUMN welcome_email_sent BOOLEAN DEFAULT FALSE;

-- Update existing customers to mark as having received welcome email (to prevent retroactive sends)
UPDATE customers 
SET welcome_email_sent = TRUE 
WHERE created_at < NOW();

-- Add comment
COMMENT ON COLUMN customers.welcome_email_sent IS 'Tracks whether welcome email has been sent to prevent duplicates';

-- Verify the change
SELECT 'Column added successfully' as status;
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'customers' AND column_name = 'welcome_email_sent';
