# SumUp Webhook Configuration Guide

## Environment Variables Required

Add these environment variables to your Netlify deployment:

### Required Variables
```bash
# Supabase Configuration (should already exist)
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### Note on SumUp Webhook Security
Unlike other payment providers, **SumUp does not provide a webhook secret** in their merchant dashboard. Instead, SumUp uses the `x-payload-signature` header for internal verification. The webhook endpoint validates the payload structure and event types instead of HMAC signature verification.

## Netlify Environment Setup

### Option 1: Netlify Dashboard
1. Go to your Netlify site dashboard
2. Navigate to **Site settings** → **Environment variables**
3. Add the new variable:
   - **Key**: `SUMUP_WEBHOOK_SECRET`
   - **Value**: Your SumUp webhook secret (get from SumUp dashboard)

### Option 2: Netlify CLI
```bash
# Set environment variable via CLI
netlify env:set SUMUP_WEBHOOK_SECRET "your_webhook_secret"

# List current environment variables
netlify env:list

# Deploy with new environment
netlify deploy --prod
```

### Option 3: netlify.toml Configuration
Add to your `netlify.toml` file (for non-sensitive variables):
```toml
[build.environment]
  # Add other non-sensitive variables here
  # Note: Don't add secrets to netlify.toml as it's tracked in git
```

## SumUp Webhook Configuration

### 1. Configure SumUp Webhooks
1. Log in to your SumUp merchant dashboard
2. Navigate to **Settings** → **Developer** or **Integrations** → **Webhooks**
3. Create a new webhook endpoint
4. Note: SumUp does not provide a webhook secret like other providers

### 2. Set Webhook URL
Configure your webhook endpoint URL in SumUp dashboard:
```
Production: https://your-netlify-site.netlify.app/.netlify/functions/sumup-webhook
Development: https://your-dev-site.netlify.app/.netlify/functions/sumup-webhook
```

### 3. Configure Event Types
Enable these webhook events in your SumUp dashboard:
- ✅ `checkout.completed` - Payment successfully completed
- ✅ `checkout.failed` - Payment failed or declined
- ✅ `checkout.pending` - Payment is being processed
- ✅ `transaction.successful` - Transaction confirmed
- ✅ `transaction.failed` - Transaction failed

## Webhook Security

### Signature Verification
SumUp webhook security works differently than other providers:
- Header: `x-payload-signature` (SumUp's internal signature)
- Algorithm: SumUp uses their own signature format (not HMAC SHA-256 with shared secret)
- Validation: Webhook validates payload structure and event types instead
- Security: Ensures requests contain valid SumUp event data

## Testing Webhook

### Manual Test
Use curl to test your webhook endpoint:
```bash
# Test webhook endpoint (without signature for development)
curl -X POST https://your-site.netlify.app/.netlify/functions/sumup-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-event-123",
    "type": "checkout.completed",
    "data": {
      "id": "checkout-456",
      "status": "PAID",
      "amount": 2500,
      "currency": "EUR",
      "checkout_reference": "payment-request-123-20241221",
      "transaction_id": "txn-789",
      "payment_type": "card"
    }
  }'
```

### SumUp Test Events
Use SumUp's webhook testing tools in their merchant dashboard to send test events to your endpoint.

## Monitoring and Debugging

### Netlify Function Logs
View webhook processing logs:
1. Go to Netlify dashboard → **Functions**
2. Click on `sumup-webhook`
3. View **Function log** for debugging information

### Database Verification
Run the validation script to check webhook processing:
```sql
-- Check recent webhook events
SELECT 
  id, 
  amount, 
  status, 
  sumup_event_type,
  sumup_event_id,
  webhook_processed_at,
  created_at
FROM payments 
WHERE webhook_processed_at IS NOT NULL
ORDER BY webhook_processed_at DESC
LIMIT 10;
```

### Error Handling
The webhook endpoint handles various scenarios:
- ✅ Invalid signatures → Returns 401
- ✅ Malformed JSON → Returns 400
- ✅ Missing payment records → Creates new records when possible
- ✅ Database errors → Returns 500 with error details
- ✅ Duplicate events → Updates existing records

## Troubleshooting

### Common Issues

#### 1. Webhook Returns 400 (Bad Request)
- Check that payload contains valid JSON
- Verify the request includes expected SumUp event structure
- Ensure event type is one of: checkout.completed, checkout.failed, etc.

#### 2. Payment Record Not Found
- Check `sumup_checkout_id` field in payments table
- Verify `checkout_reference` format in SumUp checkout
- Ensure payment record exists before webhook fires

#### 3. Database Update Fails
- Check Supabase RLS policies allow service role updates
- Verify `SUPABASE_SERVICE_ROLE_KEY` has proper permissions
- Check database connection and table schema

#### 4. Environment Variables Not Available
```bash
# Redeploy with environment variables
netlify env:import .env
netlify deploy --prod

# Set Supabase variables
netlify env:set SUPABASE_URL "your_supabase_url"
netlify env:set SUPABASE_SERVICE_ROLE_KEY "your_supabase_key"
```

## Next Steps

1. **Deploy webhook endpoint**: Push changes and deploy to Netlify
2. **Set environment variables**: Add `SUMUP_WEBHOOK_SECRET` to Netlify
3. **Configure SumUp webhooks**: Set endpoint URL and enable events
4. **Test with real payments**: Verify webhook processes payments correctly
5. **Monitor logs**: Check Netlify function logs for any issues

## Production Checklist

- [ ] Supabase environment variables set (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`)
- [ ] Webhook endpoint URL configured in SumUp dashboard
- [ ] Required webhook events enabled in SumUp
- [ ] Payload validation working (no error logs)
- [ ] Test payments updating database correctly
- [ ] Error handling tested with invalid payloads
- [ ] Monitoring and logging configured