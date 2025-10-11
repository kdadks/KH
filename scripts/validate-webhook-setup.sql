-- SumUp Webhook Validation Queries
-- Run these queries to verify webhook implementation readiness

-- 1. Check payments table schema for SumUp webhook fields
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'payments' 
  AND table_schema = 'public'
  AND column_name LIKE '%sumup%' OR column_name LIKE '%webhook%'
ORDER BY ordinal_position;

-- 2. Check if payments table exists and has required fields
DO $$
BEGIN
  -- Check if required columns exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payments' 
      AND column_name = 'sumup_checkout_id'
  ) THEN
    RAISE NOTICE 'Missing column: sumup_checkout_id';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payments' 
      AND column_name = 'sumup_event_type'
  ) THEN
    RAISE NOTICE 'Missing column: sumup_event_type';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payments' 
      AND column_name = 'webhook_processed_at'
  ) THEN
    RAISE NOTICE 'Missing column: webhook_processed_at';
  END IF;
  
  RAISE NOTICE 'Webhook validation columns check completed';
END $$;

-- 3. Sample webhook test data insertion (for validation)
-- Note: This creates a test payment record using existing references
DO $$
DECLARE
  test_customer_id INTEGER;
  test_booking_id UUID;
BEGIN
  -- Get an existing customer_id or use 1 if none exist
  SELECT COALESCE(MAX(id), 1) INTO test_customer_id FROM customers LIMIT 1;
  
  -- Try to get an existing booking_id, or set to NULL if none exist
  SELECT id INTO test_booking_id FROM bookings ORDER BY created_at DESC LIMIT 1;
  
  -- Delete any existing test payment first to avoid duplicates
  DELETE FROM payments WHERE sumup_checkout_id = 'checkout_webhook_test_001';
  
  -- Insert test payment record
  IF test_booking_id IS NOT NULL THEN
    -- Insert with valid booking_id
    INSERT INTO payments (
      customer_id,
      booking_id,
      amount,
      currency,
      status,
      payment_method,
      sumup_checkout_id,
      sumup_transaction_id,
      sumup_payment_type,
      sumup_event_type,
      sumup_event_id,
      webhook_processed_at,
      notes,
      created_at,
      updated_at
    ) VALUES (
      test_customer_id,
      test_booking_id,
      25.00,
      'EUR',
      'paid',
      'card',
      'checkout_webhook_test_001',
      'txn_webhook_test_001',
      'card',
      'checkout.completed',
      'evt_webhook_test_001',
      NOW(),
      'Test payment created for webhook validation with existing booking',
      NOW(),
      NOW()
    );
    RAISE NOTICE 'Test payment created with customer_id: %, booking_id: %', test_customer_id, test_booking_id;
  ELSE
    -- Insert without booking_id if none exist (if column allows NULL)
    INSERT INTO payments (
      customer_id,
      amount,
      currency,
      status,
      payment_method,
      sumup_checkout_id,
      sumup_transaction_id,
      sumup_payment_type,
      sumup_event_type,
      sumup_event_id,
      webhook_processed_at,
      notes,
      created_at,
      updated_at
    ) VALUES (
      test_customer_id,
      25.00,
      'EUR',
      'paid',
      'card',
      'checkout_webhook_test_001',
      'txn_webhook_test_001',
      'card',
      'checkout.completed',
      'evt_webhook_test_001',
      NOW(),
      'Test payment created for webhook validation without booking reference',
      NOW(),
      NOW()
    );
    RAISE NOTICE 'Test payment created with customer_id: %, booking_id: NULL (no bookings found)', test_customer_id;
  END IF;
END $$;

-- 4. Verify the test payment was created
SELECT 
  id,
  customer_id,
  booking_id,
  amount,
  currency,
  status,
  sumup_checkout_id,
  sumup_event_type,
  webhook_processed_at,
  created_at
FROM payments 
WHERE sumup_checkout_id = 'checkout_webhook_test_001';

-- 5. Check payment_requests table compatibility
SELECT COUNT(*) as payment_requests_count,
       COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_count,
       COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_count
FROM payment_requests;

-- 6. Validate RLS policies allow webhook updates
-- Check if service role can update payments table
SELECT 
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'payments';

-- 7. Test webhook payload structure simulation
-- This creates a sample record as if processed by webhook
WITH webhook_simulation AS (
  SELECT 
    'evt_test_' || gen_random_uuid() as event_id,
    'checkout.completed' as event_type,
    'checkout_' || gen_random_uuid() as checkout_id,
    'txn_' || gen_random_uuid() as transaction_id,
    2500 as amount_cents, -- €25.00
    'EUR' as currency,
    'PAID' as sumup_status
)
SELECT 
  event_id,
  event_type,
  checkout_id,
  transaction_id,
  amount_cents / 100.0 as amount_euros,
  currency,
  sumup_status,
  CASE 
    WHEN sumup_status = 'PAID' THEN 'paid'
    WHEN sumup_status = 'FAILED' THEN 'failed'
    WHEN sumup_status = 'PENDING' THEN 'processing'
    ELSE 'unknown'
  END as mapped_status
FROM webhook_simulation;

-- 8. Clean up test data (optional)
-- DELETE FROM payments WHERE sumup_checkout_id = 'checkout_webhook_test_001';

-- 9. Summary validation query
SELECT 
  'Webhook Readiness Check' as validation_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') 
    THEN '✓ Payments table exists'
    ELSE '✗ Payments table missing'
  END as payments_table_status,
  
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'payments' 
        AND column_name IN ('sumup_checkout_id', 'sumup_event_type', 'webhook_processed_at')
      HAVING COUNT(*) = 3
    )
    THEN '✓ Required SumUp columns exist'
    ELSE '✗ Missing SumUp webhook columns'
  END as webhook_columns_status,
  
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_requests')
    THEN '✓ Payment requests table exists'
    ELSE '✗ Payment requests table missing'
  END as payment_requests_status;

-- 10. Expected webhook endpoint response format
-- This is what the webhook should return to SumUp
SELECT 
  '200' as expected_status_code,
  'application/json' as content_type,
  jsonb_build_object(
    'success', true,
    'message', 'Webhook processed successfully',
    'eventId', 'evt_example_123',
    'result', jsonb_build_object(
      'success', true,
      'action', 'updated',
      'paymentId', 456
    )
  ) as expected_response_body;