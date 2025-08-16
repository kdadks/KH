-- Create payment_gateways table for managing payment gateway configurations
CREATE TABLE IF NOT EXISTS payment_gateways (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    provider VARCHAR(20) NOT NULL CHECK (provider IN ('sumup', 'stripe', 'paypal')),
    environment VARCHAR(20) NOT NULL DEFAULT 'sandbox' CHECK (environment IN ('sandbox', 'production')),
    api_key TEXT NOT NULL,
    secret_key TEXT,
    webhook_url TEXT,
    merchant_id VARCHAR(100),
    client_id VARCHAR(100),
    is_active BOOLEAN DEFAULT false,
    configuration JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add RLS policies for payment_gateways
ALTER TABLE payment_gateways ENABLE ROW LEVEL SECURITY;

-- Allow admins to manage payment gateways
CREATE POLICY "Allow admin access to payment gateways" ON payment_gateways
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admins 
            WHERE admins.email = auth.jwt() ->> 'email'
        )
    );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payment_gateways_provider ON payment_gateways(provider);
CREATE INDEX IF NOT EXISTS idx_payment_gateways_is_active ON payment_gateways(is_active);
CREATE INDEX IF NOT EXISTS idx_payment_gateways_environment ON payment_gateways(environment);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_payment_gateways_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payment_gateways_updated_at
    BEFORE UPDATE ON payment_gateways
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_gateways_updated_at();

-- Insert default SumUp gateway configuration (inactive by default)
INSERT INTO payment_gateways (name, provider, environment, api_key, is_active) VALUES
('Default SumUp Gateway', 'sumup', 'sandbox', 'your-sumup-api-key-here', false)
ON CONFLICT DO NOTHING;
