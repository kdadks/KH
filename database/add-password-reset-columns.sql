-- Add password reset functionality to customers table
-- This should be run in Supabase to enable forgot password functionality

-- Add password reset columns to customers table
DO $$
BEGIN
    -- Add password reset token column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'customers' AND column_name = 'password_reset_token') THEN
        ALTER TABLE public.customers ADD COLUMN password_reset_token VARCHAR(255);
        RAISE NOTICE 'Added password_reset_token column to customers table';
    ELSE
        RAISE NOTICE 'password_reset_token column already exists';
    END IF;
    
    -- Add password reset token expiry column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'customers' AND column_name = 'password_reset_expires_at') THEN
        ALTER TABLE public.customers ADD COLUMN password_reset_expires_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Added password_reset_expires_at column to customers table';
    ELSE
        RAISE NOTICE 'password_reset_expires_at column already exists';
    END IF;
    
    -- Add password reset requested at column for tracking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'customers' AND column_name = 'password_reset_requested_at') THEN
        ALTER TABLE public.customers ADD COLUMN password_reset_requested_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Added password_reset_requested_at column to customers table';
    ELSE
        RAISE NOTICE 'password_reset_requested_at column already exists';
    END IF;
END $$;

-- Create index for password reset token for faster lookups
CREATE INDEX IF NOT EXISTS idx_customers_password_reset_token 
ON public.customers (password_reset_token) 
WHERE password_reset_token IS NOT NULL;
