-- Add missing fields to payments table for webhook processing
-- These fields are required for the SumUp webhook handler to find payment records

-- Add sumup_checkout_reference field
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS sumup_checkout_reference character varying(255) NULL;

-- Add payment_request_id field  
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS payment_request_id integer NULL;

-- Add foreign key constraint for payment_request_id (check if it exists first)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'payments_payment_request_id_fkey'
        AND table_name = 'payments'
    ) THEN
        ALTER TABLE public.payments 
        ADD CONSTRAINT payments_payment_request_id_fkey 
        FOREIGN KEY (payment_request_id) REFERENCES payment_requests (id) ON DELETE SET NULL;
    END IF;
END
$$;

-- Add indexes for efficient webhook lookups
CREATE INDEX IF NOT EXISTS idx_payments_sumup_checkout_reference 
ON public.payments USING btree (sumup_checkout_reference) 
TABLESPACE pg_default
WHERE (sumup_checkout_reference IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_payments_payment_request_id 
ON public.payments USING btree (payment_request_id) 
TABLESPACE pg_default 
WHERE (payment_request_id IS NOT NULL);

-- Add index for sumup_checkout_id (should already exist but ensure it's there)
CREATE INDEX IF NOT EXISTS idx_payments_sumup_checkout_id 
ON public.payments USING btree (sumup_checkout_id) 
TABLESPACE pg_default
WHERE (sumup_checkout_id IS NOT NULL);

-- Verify the columns were added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'payments' 
AND column_name IN ('sumup_checkout_reference', 'payment_request_id', 'sumup_checkout_id')
ORDER BY column_name;