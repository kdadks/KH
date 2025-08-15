-- Add password reset functionality to customers table

-- Add password reset columns to customers table
DO $$
BEGIN
    -- Add password reset token column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'customers' AND column_name = 'password_reset_token') THEN
        ALTER TABLE public.customers ADD COLUMN password_reset_token VARCHAR(255);
    END IF;
    
    -- Add password reset token expiry column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'customers' AND column_name = 'password_reset_expires_at') THEN
        ALTER TABLE public.customers ADD COLUMN password_reset_expires_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Add password reset requested at column for tracking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'customers' AND column_name = 'password_reset_requested_at') THEN
        ALTER TABLE public.customers ADD COLUMN password_reset_requested_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Create index for password reset token for faster lookups
CREATE INDEX IF NOT EXISTS idx_customers_password_reset_token ON public.customers (password_reset_token);

-- Create function to clean up expired password reset tokens
CREATE OR REPLACE FUNCTION clean_expired_password_reset_tokens()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    UPDATE public.customers 
    SET 
        password_reset_token = NULL,
        password_reset_expires_at = NULL
    WHERE 
        password_reset_expires_at IS NOT NULL 
        AND password_reset_expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to generate password reset token
CREATE OR REPLACE FUNCTION generate_password_reset_token(
    customer_email VARCHAR(255)
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    reset_token TEXT,
    customer_id INTEGER
) AS $$
DECLARE
    found_customer_id INTEGER;
    reset_token_value TEXT;
    token_expiry TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Check if customer exists and is active
    SELECT id INTO found_customer_id
    FROM public.customers
    WHERE email = customer_email 
    AND is_active = true;
    
    IF found_customer_id IS NULL THEN
        RETURN QUERY SELECT false, 'Customer not found or inactive'::TEXT, NULL::TEXT, NULL::INTEGER;
        RETURN;
    END IF;
    
    -- Generate a random token (using random() and current timestamp)
    reset_token_value := encode(sha256((random()::text || extract(epoch from now())::text)::bytea), 'hex');
    
    -- Set expiry to 1 hour from now
    token_expiry := NOW() + INTERVAL '1 hour';
    
    -- Update customer with reset token
    UPDATE public.customers
    SET 
        password_reset_token = reset_token_value,
        password_reset_expires_at = token_expiry,
        password_reset_requested_at = NOW()
    WHERE id = found_customer_id;
    
    RETURN QUERY SELECT true, 'Password reset token generated successfully'::TEXT, reset_token_value, found_customer_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to validate and use password reset token
CREATE OR REPLACE FUNCTION validate_password_reset_token(
    reset_token TEXT
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    customer_id INTEGER,
    customer_email TEXT
) AS $$
DECLARE
    found_customer_id INTEGER;
    found_customer_email TEXT;
    token_expiry TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Find customer with valid token
    SELECT c.id, c.email, c.password_reset_expires_at
    INTO found_customer_id, found_customer_email, token_expiry
    FROM public.customers c
    WHERE c.password_reset_token = reset_token
    AND c.is_active = true;
    
    IF found_customer_id IS NULL THEN
        RETURN QUERY SELECT false, 'Invalid or expired reset token'::TEXT, NULL::INTEGER, NULL::TEXT;
        RETURN;
    END IF;
    
    -- Check if token has expired
    IF token_expiry < NOW() THEN
        -- Clean up expired token
        UPDATE public.customers
        SET 
            password_reset_token = NULL,
            password_reset_expires_at = NULL
        WHERE id = found_customer_id;
        
        RETURN QUERY SELECT false, 'Reset token has expired'::TEXT, NULL::INTEGER, NULL::TEXT;
        RETURN;
    END IF;
    
    RETURN QUERY SELECT true, 'Token is valid'::TEXT, found_customer_id, found_customer_email;
END;
$$ LANGUAGE plpgsql;

-- Create function to reset password using token
CREATE OR REPLACE FUNCTION reset_password_with_token(
    reset_token TEXT,
    new_password_hash TEXT
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT
) AS $$
DECLARE
    found_customer_id INTEGER;
    token_expiry TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Validate token first
    SELECT customer_id INTO found_customer_id
    FROM validate_password_reset_token(reset_token)
    WHERE success = true;
    
    IF found_customer_id IS NULL THEN
        RETURN QUERY SELECT false, 'Invalid or expired reset token'::TEXT;
        RETURN;
    END IF;
    
    -- Update password and clear reset token
    UPDATE public.customers
    SET 
        password = new_password_hash,
        password_reset_token = NULL,
        password_reset_expires_at = NULL,
        password_reset_requested_at = NULL,
        must_change_password = false,
        updated_at = NOW()
    WHERE id = found_customer_id;
    
    RETURN QUERY SELECT true, 'Password reset successfully'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION clean_expired_password_reset_tokens() TO authenticated;
GRANT EXECUTE ON FUNCTION generate_password_reset_token(VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_password_reset_token(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION reset_password_with_token(TEXT, TEXT) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION generate_password_reset_token(VARCHAR) IS 'Generates a password reset token for a customer email';
COMMENT ON FUNCTION validate_password_reset_token(TEXT) IS 'Validates a password reset token and returns customer info if valid';
COMMENT ON FUNCTION reset_password_with_token(TEXT, TEXT) IS 'Resets password using a valid reset token';
COMMENT ON FUNCTION clean_expired_password_reset_tokens() IS 'Cleans up expired password reset tokens';
