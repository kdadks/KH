-- Enhanced Payment System Schema with Webhook Support and Retry Mechanism
-- Add fields to track webhook events, retry attempts, and payment status updates

-- Add webhook tracking fields to payments table
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS webhook_received_at TIMESTAMP WITH TIME ZONE NULL,
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_status_check TIMESTAMP WITH TIME ZONE NULL,
ADD COLUMN IF NOT EXISTS payment_request_id INTEGER NULL REFERENCES public.payment_requests(id),
ADD COLUMN IF NOT EXISTS status_history JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS webhook_data JSONB NULL;

-- Add webhook tracking fields to payment_requests table  
ALTER TABLE public.payment_requests
ADD COLUMN IF NOT EXISTS sumup_checkout_id VARCHAR(255) NULL,
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE NULL,
ADD COLUMN IF NOT EXISTS last_webhook_at TIMESTAMP WITH TIME ZONE NULL,
ADD COLUMN IF NOT EXISTS webhook_failures INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS next_status_check TIMESTAMP WITH TIME ZONE NULL;

-- Create payment_failures table for tracking failed webhook processing
CREATE TABLE IF NOT EXISTS public.payment_failures (
    id SERIAL PRIMARY KEY,
    checkout_reference VARCHAR(255) NULL,
    transaction_id VARCHAR(255) NULL,
    event_type VARCHAR(50) NULL,
    error_message TEXT NOT NULL,
    retry_count INTEGER DEFAULT 0,
    webhook_data JSONB NULL,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create payment_status_checks table for polling mechanism
CREATE TABLE IF NOT EXISTS public.payment_status_checks (
    id SERIAL PRIMARY KEY,
    payment_request_id INTEGER NOT NULL REFERENCES public.payment_requests(id) ON DELETE CASCADE,
    checkout_id VARCHAR(255) NOT NULL,
    check_count INTEGER DEFAULT 0,
    max_checks INTEGER DEFAULT 20, -- Check for ~2 hours (every 6 minutes)
    next_check_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed', 'cancelled')),
    last_sumup_status VARCHAR(50) NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create webhook_events table for audit trail
CREATE TABLE IF NOT EXISTS public.webhook_events (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    provider VARCHAR(20) DEFAULT 'sumup',
    checkout_reference VARCHAR(255) NULL,
    transaction_id VARCHAR(255) NULL,
    payload JSONB NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    error_message TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_payments_webhook_received ON public.payments(webhook_received_at);
CREATE INDEX IF NOT EXISTS idx_payments_retry_count ON public.payments(retry_count);
CREATE INDEX IF NOT EXISTS idx_payments_payment_request_id ON public.payments(payment_request_id);
CREATE INDEX IF NOT EXISTS idx_payments_last_status_check ON public.payments(last_status_check);

CREATE INDEX IF NOT EXISTS idx_payment_requests_sumup_checkout_id ON public.payment_requests(sumup_checkout_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_next_status_check ON public.payment_requests(next_status_check);

CREATE INDEX IF NOT EXISTS idx_payment_failures_resolved ON public.payment_failures(resolved);
CREATE INDEX IF NOT EXISTS idx_payment_failures_created_at ON public.payment_failures(created_at);

CREATE INDEX IF NOT EXISTS idx_payment_status_checks_next_check ON public.payment_status_checks(next_check_at);
CREATE INDEX IF NOT EXISTS idx_payment_status_checks_status ON public.payment_status_checks(status);

CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON public.webhook_events(processed);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON public.webhook_events(created_at);

-- Enable RLS on new tables
ALTER TABLE public.payment_failures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_status_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payment_failures (admin access only)
CREATE POLICY "Admins can view payment failures" 
ON public.payment_failures FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM public.admins 
    WHERE email = auth.jwt() ->> 'email' AND is_active = true
));

CREATE POLICY "System can manage payment failures" 
ON public.payment_failures FOR ALL 
USING (true);

-- RLS Policies for payment_status_checks (admin access only)
CREATE POLICY "Admins can view payment status checks" 
ON public.payment_status_checks FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM public.admins 
    WHERE email = auth.jwt() ->> 'email' AND is_active = true
));

CREATE POLICY "System can manage payment status checks" 
ON public.payment_status_checks FOR ALL 
USING (true);

-- RLS Policies for webhook_events (admin access only)
CREATE POLICY "Admins can view webhook events" 
ON public.webhook_events FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM public.admins 
    WHERE email = auth.jwt() ->> 'email' AND is_active = true
));

CREATE POLICY "System can manage webhook events" 
ON public.webhook_events FOR ALL 
USING (true);

-- Grant permissions
GRANT ALL ON public.payment_failures TO authenticated;
GRANT ALL ON public.payment_status_checks TO authenticated;
GRANT ALL ON public.webhook_events TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE payment_failures_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE payment_status_checks_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE webhook_events_id_seq TO authenticated;

-- Create function to update status history
CREATE OR REPLACE FUNCTION update_payment_status_history()
RETURNS TRIGGER AS $$
BEGIN
    -- Add status change to history
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        NEW.status_history = COALESCE(OLD.status_history, '[]'::jsonb) || 
            jsonb_build_object(
                'from_status', OLD.status,
                'to_status', NEW.status,
                'changed_at', NOW(),
                'webhook_received', NEW.webhook_received_at IS NOT NULL
            );
    END IF;
    
    -- Update timestamps
    NEW.updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for payment status history
DROP TRIGGER IF EXISTS payment_status_history_trigger ON public.payments;
CREATE TRIGGER payment_status_history_trigger
    BEFORE UPDATE ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_status_history();

-- Create function to cleanup old webhook events (run periodically)
CREATE OR REPLACE FUNCTION cleanup_old_webhook_events(days_to_keep INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.webhook_events 
    WHERE created_at < NOW() - (days_to_keep || ' days')::INTERVAL
    AND processed = true;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE public.payment_failures IS 'Tracks failed webhook processing attempts for manual review and resolution';
COMMENT ON TABLE public.payment_status_checks IS 'Manages polling schedule for payments when webhooks fail or are delayed';
COMMENT ON TABLE public.webhook_events IS 'Audit trail of all webhook events received from payment providers';

COMMENT ON COLUMN public.payments.webhook_received_at IS 'Timestamp when webhook notification was received for this payment';
COMMENT ON COLUMN public.payments.retry_count IS 'Number of retry attempts for processing this payment';
COMMENT ON COLUMN public.payments.status_history IS 'JSON array tracking all status changes with timestamps';
COMMENT ON COLUMN public.payments.payment_request_id IS 'Links payment to originating payment request';

COMMENT ON COLUMN public.payment_requests.sumup_checkout_id IS 'SumUp checkout session ID for tracking payment status';
COMMENT ON COLUMN public.payment_requests.next_status_check IS 'Next scheduled time to poll payment status if webhook fails';
COMMENT ON COLUMN public.payment_requests.webhook_failures IS 'Count of failed webhook processing attempts';