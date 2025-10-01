-- Database Schema Validation Script for Payments Table
-- Run this in Supabase SQL Editor to validate current schema and data

-- 1. Get payments table schema
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length,
    numeric_precision,
    numeric_scale
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'payments'
ORDER BY ordinal_position;

-- 2. Get payments table constraints
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
LEFT JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_schema = 'public'
AND tc.table_name = 'payments';

-- 3. Get indexes on payments table
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'payments' 
AND schemaname = 'public';

-- 4. Check current payment records structure (latest 10)
SELECT 
    id,
    customer_id,
    invoice_id,
    booking_id,
    sumup_transaction_id,
    sumup_checkout_id,
    amount,
    currency,
    status,
    payment_method,
    sumup_payment_type,
    payment_date,
    failure_reason,
    refund_amount,
    refund_reason,
    notes,
    created_at,
    updated_at
FROM payments 
ORDER BY created_at DESC 
LIMIT 10;

-- 5. Get payment status distribution
SELECT 
    status,
    COUNT(*) as count,
    MIN(created_at) as first_created,
    MAX(created_at) as last_created
FROM payments 
GROUP BY status 
ORDER BY count DESC;

-- 6. Check SumUp-related fields usage
SELECT 
    COUNT(*) as total_payments,
    COUNT(sumup_transaction_id) as with_transaction_id,
    COUNT(sumup_checkout_id) as with_checkout_id,
    COUNT(sumup_payment_type) as with_payment_type,
    COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_count,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
    COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_count,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count,
    COUNT(CASE WHEN status = 'refunded' THEN 1 END) as refunded_count,
    COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_count
FROM payments;

-- 7. Check payment_requests table schema (for webhook correlation)
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'payment_requests'
ORDER BY ordinal_position;

-- 8. Check relationship between payments and payment_requests
SELECT 
    pr.id as payment_request_id,
    pr.status as pr_status,
    pr.amount as pr_amount,
    pr.booking_id as pr_booking_id,
    COUNT(p.id) as payment_count,
    STRING_AGG(p.status, ', ') as payment_statuses,
    STRING_AGG(p.sumup_checkout_id, ', ') as payment_checkout_ids
FROM payment_requests pr
LEFT JOIN payments p ON p.booking_id = pr.booking_id
WHERE pr.created_at > NOW() - INTERVAL '7 days'
GROUP BY pr.id, pr.status, pr.amount, pr.booking_id
ORDER BY pr.created_at DESC
LIMIT 20;

-- 9. Identify webhook-ready payments (with SumUp checkout IDs)
SELECT 
    id,
    customer_id,
    booking_id,
    sumup_checkout_id,
    sumup_transaction_id,
    amount,
    currency,
    status,
    payment_date,
    created_at
FROM payments 
WHERE sumup_checkout_id IS NOT NULL
ORDER BY created_at DESC
LIMIT 20;

-- 10. Check for missing columns needed for webhook processing
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'payments' 
            AND column_name = 'webhook_processed_at'
        ) THEN 'webhook_processed_at EXISTS'
        ELSE 'webhook_processed_at MISSING - ADD: ALTER TABLE payments ADD COLUMN webhook_processed_at TIMESTAMP WITH TIME ZONE;'
    END as webhook_processed_at_status,
    
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'payments' 
            AND column_name = 'sumup_event_type'
        ) THEN 'sumup_event_type EXISTS'
        ELSE 'sumup_event_type MISSING - ADD: ALTER TABLE payments ADD COLUMN sumup_event_type VARCHAR(50);'
    END as sumup_event_type_status,
    
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'payments' 
            AND column_name = 'sumup_event_id'
        ) THEN 'sumup_event_id EXISTS'
        ELSE 'sumup_event_id MISSING - ADD: ALTER TABLE payments ADD COLUMN sumup_event_id VARCHAR(255);'
    END as sumup_event_id_status;

-- 11. Sample webhook payload structure reference
/*
Expected SumUp Webhook Payload Structure:
{
  "id": "evt_123...",
  "type": "checkout.completed" | "checkout.failed" | "checkout.pending",
  "data": {
    "id": "checkout_id_123",
    "status": "PAID" | "FAILED" | "PENDING",
    "amount": 1500,
    "currency": "EUR",
    "transaction_id": "txn_123...",
    "payment_type": "card",
    "merchant_code": "MQEKWZR0",
    "timestamp": "2025-01-01T12:00:00Z"
  }
}
*/