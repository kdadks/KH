# Debugging UAT Webhook Columns Issue

## 🔍 Current Status
The webhook columns (`webhook_processed_at`, `sumup_event_type`, `sumup_event_id`) are still not updating in UAT after implementing the SumUp return handler.

## 🛠️ Debugging Steps

### 1. Check Netlify Function Logs
Go to your Netlify dashboard and check the function logs:
1. Visit: https://app.netlify.com/sites/[your-site]/functions
2. Look for `sumup-return` function logs
3. Check if the function is being called during payment simulation

**Expected logs to look for:**
```
🎯 SumUp return URL called [TEST]: {...}
📡 Processing SumUp webhook data
🔍 Searching for payment record with: {...}
```

### 2. Test Payment Flow
1. Go to UAT URL and create a test payment
2. Use the simulation buttons on the checkout page
3. Check browser network tab for calls to `/.netlify/functions/sumup-return`
4. Verify the response from the return handler

### 3. Database Investigation
Check the payments table structure and data:

```sql
-- Check if payments table has the required columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'payments' 
AND column_name IN ('webhook_processed_at', 'sumup_event_type', 'sumup_event_id');

-- Check recent payment records
SELECT 
  id, 
  payment_request_id,
  sumup_checkout_id,
  sumup_checkout_reference,
  webhook_processed_at,
  sumup_event_type,
  sumup_event_id,
  status,
  created_at
FROM payments 
ORDER BY created_at DESC 
LIMIT 5;

-- Check what's stored when payment is created
SELECT 
  sumup_checkout_id,
  sumup_checkout_reference,
  payment_request_id
FROM payments 
WHERE payment_request_id IS NOT NULL
ORDER BY created_at DESC 
LIMIT 3;
```

### 4. Simulation Verification
The simulation should now call the correct endpoint. Check that:
- Simulation calls `/.netlify/functions/sumup-return` (not `sumup-webhook`)
- Payload format matches SumUp's expected structure
- Browser console shows successful webhook calls

### 5. Payment Record Matching
The new debugging logs will show:
- What data the webhook is searching for
- Whether payment records are found
- Which search method works (checkout_reference, checkout_id, or payment_request_id)

## 🔧 Most Likely Issues & Fixes

### Issue 1: Column Names Mismatch
If the database columns are named differently:
```sql
-- Check actual column names
DESCRIBE payments;
-- or
\d payments
```

### Issue 2: Payment Record Not Found
The webhook might not find the payment record because:
- `sumup_checkout_reference` is stored differently than expected
- `sumup_checkout_id` doesn't match the simulated checkout ID
- Payment is created after webhook processing

### Issue 3: Function Not Being Called
If `sumup-return` function isn't called:
- Check if simulation is sending requests to the right URL
- Verify Netlify function is deployed correctly
- Check for CORS or network issues

## 📊 Quick Test Commands

### Test Return Handler Directly:
```bash
curl -X POST https://uat--khtherapy.netlify.app/.netlify/functions/sumup-return \
  -H "Content-Type: application/json" \
  -d '{
    "id": "evt_test_123",
    "type": "checkout.completed", 
    "data": {
      "id": "checkout_test_456",
      "checkout_reference": "payment-request-123-1234567890",
      "status": "COMPLETED",
      "amount": 15.00,
      "currency": "EUR"
    }
  }'
```

### Test Webhook Handler (Old):
```bash
curl -X POST https://uat--khtherapy.netlify.app/.netlify/functions/sumup-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "id": "evt_test_123",
    "type": "checkout.completed", 
    "data": {
      "id": "checkout_test_456", 
      "checkout_reference": "payment-request-123-1234567890",
      "status": "COMPLETED"
    }
  }'
```

## 🎯 Next Steps

1. **Check Netlify Logs First** - This will tell us if the function is being called
2. **Verify Payment Record Creation** - Make sure payments are created with the right IDs
3. **Test Manual Webhook Call** - Use curl to test if the handler works independently
4. **Check Database Permissions** - Ensure Supabase service role key can update payments table

Let me know what you find in the Netlify function logs and I can help narrow down the specific issue! 🔍