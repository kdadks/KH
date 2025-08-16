-- Create payment_gateways table with exact schema
CREATE TABLE IF NOT EXISTS public.payment_gateways (
  id uuid not null default gen_random_uuid (),
  name character varying(100) not null,
  provider character varying(20) not null,
  environment character varying(20) not null default 'sandbox'::character varying,
  api_key text not null,
  secret_key text null,
  webhook_url text null,
  merchant_id character varying(100) null,
  client_id character varying(100) null,
  is_active boolean null default false,
  configuration jsonb null default '{}'::jsonb,
  created_at timestamp with time zone null default CURRENT_TIMESTAMP,
  updated_at timestamp with time zone null default CURRENT_TIMESTAMP,
  constraint payment_gateways_pkey primary key (id),
  constraint payment_gateways_environment_check check (
    (
      (environment)::text = any (
        (
          array[
            'sandbox'::character varying,
            'production'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint payment_gateways_provider_check check (
    (
      (provider)::text = any (
        (
          array[
            'sumup'::character varying,
            'stripe'::character varying,
            'paypal'::character varying
          ]
        )::text[]
      )
    )
  )
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payment_gateways_provider ON public.payment_gateways USING btree (provider);
CREATE INDEX IF NOT EXISTS idx_payment_gateways_is_active ON public.payment_gateways USING btree (is_active);
CREATE INDEX IF NOT EXISTS idx_payment_gateways_environment ON public.payment_gateways USING btree (environment);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_payment_gateways_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger
DROP TRIGGER IF EXISTS payment_gateways_updated_at ON payment_gateways;
CREATE TRIGGER payment_gateways_updated_at 
    BEFORE UPDATE ON payment_gateways 
    FOR EACH ROW 
    EXECUTE FUNCTION update_payment_gateways_updated_at();

-- Create RLS policy for admin access
ALTER TABLE payment_gateways ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin access to payment_gateways" ON payment_gateways;
CREATE POLICY "Admin access to payment_gateways" ON payment_gateways
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admins 
            WHERE admins.email = auth.jwt() ->> 'email'
        )
    );

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON payment_gateways TO authenticated;

-- Insert default SumUp gateway
INSERT INTO payment_gateways (name, provider, environment, api_key, merchant_id, is_active) 
VALUES ('SumUp Demo Gateway', 'sumup', 'sandbox', 'demo-api-key-replace-with-real', 'DEMO-MERCHANT-001', false)
ON CONFLICT (id) DO NOTHING;

SELECT 'Payment gateways table created successfully!' as result;
