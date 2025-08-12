-- Create customers table and update bookings table to reference customers
-- This implementation provides proper customer management with booking relationships

-- Create customers table
CREATE TABLE IF NOT EXISTS public.customers (
  id SERIAL NOT NULL,
  first_name CHARACTER VARYING(255) NOT NULL,
  last_name CHARACTER VARYING(255) NOT NULL,
  email CHARACTER VARYING(255) NOT NULL,
  phone CHARACTER VARYING(50) NULL,
  address_line_1 CHARACTER VARYING(255) NULL,
  address_line_2 CHARACTER VARYING(255) NULL,
  city CHARACTER VARYING(100) NULL,
  county CHARACTER VARYING(100) NULL,
  eircode CHARACTER VARYING(10) NULL,
  country CHARACTER VARYING(100) NULL DEFAULT 'Ireland'::CHARACTER VARYING,
  date_of_birth DATE NULL,
  emergency_contact_name CHARACTER VARYING(255) NULL,
  emergency_contact_phone CHARACTER VARYING(50) NULL,
  medical_notes TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NULL DEFAULT NOW(),
  is_active BOOLEAN NULL DEFAULT TRUE,
  CONSTRAINT customers_pkey PRIMARY KEY (id),
  CONSTRAINT customers_email_key UNIQUE (email)
) TABLESPACE pg_default;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers USING btree (email) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers USING btree (last_name, first_name) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_customers_is_active ON public.customers USING btree (is_active) TABLESPACE pg_default;

-- Create update trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for customers table
DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
CREATE TRIGGER update_customers_updated_at 
    BEFORE UPDATE ON customers 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add customer_id column to bookings table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'bookings' AND column_name = 'customer_id') THEN
        ALTER TABLE public.bookings ADD COLUMN customer_id INTEGER REFERENCES public.customers(id);
        CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON public.bookings (customer_id);
    END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Create policies for customers table
DROP POLICY IF EXISTS "Allow public read access to customers" ON public.customers;
CREATE POLICY "Allow public read access to customers" ON public.customers
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert customers" ON public.customers;
CREATE POLICY "Allow authenticated users to insert customers" ON public.customers
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to update customers" ON public.customers;
CREATE POLICY "Allow authenticated users to update customers" ON public.customers
    FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to delete customers" ON public.customers;
CREATE POLICY "Allow authenticated users to delete customers" ON public.customers
    FOR DELETE USING (true);

-- Grant permissions
GRANT ALL ON public.customers TO authenticated;
GRANT ALL ON public.customers TO anon;
GRANT USAGE, SELECT ON SEQUENCE customers_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE customers_id_seq TO anon;
