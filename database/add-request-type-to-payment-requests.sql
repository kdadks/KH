-- Add request_type column to payment_requests table to track deposit vs full payment
-- This will be used by the payment processing to correctly set sumup_payment_type

ALTER TABLE public.payment_requests 
ADD COLUMN IF NOT EXISTS request_type VARCHAR(20) NULL CHECK (request_type IN ('deposit', 'full'));

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_payment_requests_request_type ON public.payment_requests(request_type);

-- Backfill existing payment requests based on notes field
UPDATE public.payment_requests
SET request_type = CASE
    WHEN notes ILIKE '%full payment%' THEN 'full'
    WHEN notes ILIKE '%20%%' OR notes ILIKE '%deposit%' THEN 'deposit'
    ELSE 'deposit' -- Default to deposit for legacy records
END
WHERE request_type IS NULL;

-- Add comment
COMMENT ON COLUMN public.payment_requests.request_type IS 'Type of payment request: deposit (20%) or full (100%). Used to set sumup_payment_type in payments table.';
