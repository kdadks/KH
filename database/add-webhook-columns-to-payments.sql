-- Add Webhook Processing Columns to Payments Table
-- Run this in Supabase SQL Editor to prepare for SumUp webhook integration

-- Add webhook processing columns
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS webhook_processed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS sumup_event_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS sumup_event_id VARCHAR(255);

-- Add comments for documentation
COMMENT ON COLUMN payments.webhook_processed_at IS 'Timestamp when SumUp webhook was processed for this payment';
COMMENT ON COLUMN payments.sumup_event_type IS 'SumUp webhook event type (e.g., checkout.completed, checkout.failed)';
COMMENT ON COLUMN payments.sumup_event_id IS 'Unique SumUp webhook event ID for tracking and deduplication';

-- Create index on webhook_processed_at for monitoring queries
CREATE INDEX IF NOT EXISTS idx_payments_webhook_processed_at 
ON payments(webhook_processed_at) 
WHERE webhook_processed_at IS NOT NULL;

-- Create index on sumup_event_id for webhook deduplication
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_sumup_event_id 
ON payments(sumup_event_id) 
WHERE sumup_event_id IS NOT NULL;

-- Create index on sumup_event_type for filtering webhook events
CREATE INDEX IF NOT EXISTS idx_payments_sumup_event_type 
ON payments(sumup_event_type) 
WHERE sumup_event_type IS NOT NULL;

-- Verify the columns were added successfully
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'payments'
AND column_name IN ('webhook_processed_at', 'sumup_event_type', 'sumup_event_id')
ORDER BY column_name;

-- Show summary of webhook-ready payments
SELECT 
    'Webhook Columns Added Successfully' as status,
    COUNT(*) as total_payments,
    COUNT(sumup_checkout_id) as payments_with_checkout_id,
    COUNT(webhook_processed_at) as payments_processed_via_webhook
FROM payments;