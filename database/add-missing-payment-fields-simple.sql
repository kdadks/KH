-- Simple migration to add missing payment fields
-- Run these commands one by one if there are any syntax issues

-- 1. Add sumup_checkout_reference field
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS sumup_checkout_reference character varying(255) NULL;

-- 2. Add payment_request_id field  
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS payment_request_id integer NULL;

-- 3. Add indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_payments_sumup_checkout_reference 
ON public.payments USING btree (sumup_checkout_reference) 
WHERE (sumup_checkout_reference IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_payments_payment_request_id 
ON public.payments USING btree (payment_request_id) 
WHERE (payment_request_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_payments_sumup_checkout_id 
ON public.payments USING btree (sumup_checkout_id) 
WHERE (sumup_checkout_id IS NOT NULL);

-- 4. Verify columns were added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'payments' 
AND column_name IN ('sumup_checkout_reference', 'payment_request_id', 'sumup_checkout_id')
ORDER BY column_name;

-- 5. (Optional) Add foreign key constraint manually if needed:
-- ALTER TABLE public.payments 
-- ADD CONSTRAINT payments_payment_request_id_fkey 
-- FOREIGN KEY (payment_request_id) REFERENCES payment_requests (id) ON DELETE SET NULL;