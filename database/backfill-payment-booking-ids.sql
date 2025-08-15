-- Backfill existing payments with booking_id from their payment_requests
-- This will fix existing payments that don't have booking_id set

-- Update existing payments by matching them to payment_requests via customer_id and amount
-- This is safe because we're matching by customer and exact amount
UPDATE public.payments 
SET booking_id = pr.booking_id
FROM public.payment_requests pr
WHERE payments.customer_id = pr.customer_id
  AND payments.amount = pr.amount
  AND payments.booking_id IS NULL  -- Only update payments without booking_id
  AND pr.booking_id IS NOT NULL    -- Only use payment_requests that have booking_id
  AND payments.created_at >= pr.created_at  -- Payment should be created after the request
  AND payments.created_at <= pr.created_at + INTERVAL '7 days'  -- Within reasonable timeframe
;

-- Check how many payments were updated
SELECT 
  COUNT(*) as updated_payments
FROM public.payments 
WHERE booking_id IS NOT NULL;

-- Verify the updates by showing payments with their booking details
SELECT 
  p.id as payment_id,
  p.amount,
  p.status,
  p.booking_id,
  p.created_at as payment_created,
  pr.id as payment_request_id,
  pr.created_at as request_created
FROM public.payments p
LEFT JOIN public.payment_requests pr ON p.booking_id = pr.booking_id
WHERE p.booking_id IS NOT NULL
ORDER BY p.created_at DESC
LIMIT 10;
