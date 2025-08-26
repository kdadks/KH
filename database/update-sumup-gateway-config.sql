-- Update SumUp payment gateway with real production credentials
-- This script populates the payment_gateways table with actual SumUp configuration

-- First, deactivate any existing SumUp gateways
UPDATE payment_gateways 
SET is_active = false 
WHERE provider = 'sumup';

-- Insert or update the real SumUp gateway configuration
-- First check if a SumUp gateway already exists, if so update it, otherwise insert
DO $$
BEGIN
    -- Try to update existing SumUp gateway
    UPDATE payment_gateways 
    SET 
        name = 'SumUp Production Gateway',
        api_key = 'sup_sk_4V8sH9sN2fNFvNrLHq9wZpF5wQ3yJ8xR2mK7vX1cS6dL0nP9tE', -- Replace with actual API key from .env
        merchant_id = 'MQEKWZR0',
        is_active = true,
        updated_at = NOW()
    WHERE provider = 'sumup' AND environment = 'sandbox';
    
    -- If no rows were updated, insert a new record
    IF NOT FOUND THEN
        INSERT INTO payment_gateways (
            name, 
            provider, 
            environment, 
            api_key, 
            merchant_id, 
            is_active, 
            created_at, 
            updated_at
        ) VALUES (
            'SumUp Production Gateway',
            'sumup',
            'sandbox', -- Change to 'production' when ready for live environment
            'sup_sk_4V8sH9sN2fNFvNrLHq9wZpF5wQ3yJ8xR2mK7vX1cS6dL0nP9tE', -- Replace with actual API key from .env
            'MQEKWZR0', -- Real merchant code
            true,
            NOW(),
            NOW()
        );
    END IF;
END $$;

-- Verify the configuration
SELECT 
    id,
    name,
    provider,
    environment,
    merchant_id,
    is_active,
    created_at,
    updated_at
FROM payment_gateways 
WHERE provider = 'sumup' 
ORDER BY is_active DESC, created_at DESC;
