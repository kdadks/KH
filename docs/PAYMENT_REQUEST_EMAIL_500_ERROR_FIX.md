# Payment Request Email 500 Error Fix

## Problem
After successfully sending a payment request email, the console shows:
```
✅ Payment request email sent successfully
❌ Failed to process through SumUp handler: Error: SumUp endpoint returned 500
```

## Root Cause Analysis

### What's Happening
1. User selects payment type (deposit or full)
2. Payment request amount is updated in database
3. `sendPaymentRequestNotification()` is called
4. Email is sent successfully with correct amount
5. BUT then `processPaymentRequest()` is being called
6. `processPaymentRequest()` routes through the webhook endpoint (`/.netlify/functions/sumup-return`)
7. Webhook endpoint returns 500 error

### Why the 500 Error Occurs

The webhook endpoint (`sumup-return.cjs`) has this check:

```javascript
if (!webhookSecret && !isTestMode) {
  return 500;
}
```

Where `isTestMode` is true if:
- Running in sandbox/UAT environment (not production)
- AND one of:
  - No webhook secret configured
  - Has `x-test-webhook` header
  - Body contains `test_webhook_payload`
  - Is an internal call from `PaymentRequestUtils`

### The Issue
The internal call detection looks for:
1. `User-Agent` header containing `PaymentRequestUtils`
2. OR request body containing `INTERNAL_PROCESSING`

The `processPaymentRequest()` function DOES set these:
```typescript
headers: {
  'Content-Type': 'application/json',
  'User-Agent': 'PaymentRequestUtils/Processing'
}
```

And includes `merchant_code: 'INTERNAL_PROCESSING'` in the body.

However, the detection was failing due to:
1. Potential header casing issues (Netlify normalizes to lowercase)
2. Lack of debugging visibility

## Solution

### Immediate Fix
Enhanced the internal call detection and added comprehensive logging:

```javascript
// Improved header checking
const userAgent = event.headers['user-agent'] || event.headers['User-Agent'] || '';
const hasInternalMarker = event.body?.includes('INTERNAL_PROCESSING');
const isInternalCall = userAgent.includes('PaymentRequestUtils') || hasInternalMarker;

// Added detailed logging
console.log('🔍 Internal call detection:', {
  userAgent,
  bodyPreview: event.body?.substring(0, 200),
  hasInternalMarker,
  isInternalCall,
  isProduction,
  hasWebhookSecret: !!webhookSecret
});

console.log('🧪 Test mode evaluation:', {
  isTestMode,
  isProduction,
  hasWebhookSecret: !!webhookSecret,
  hasTestHeader: event.headers['x-test-webhook'] === 'true',
  hasTestPayload: !!event.body?.includes('test_webhook_payload'),
  isInternalCall
});
```

### Long-term Solution
Add the UAT webhook secret to Netlify environment variables:

```bash
# Via Netlify CLI
netlify env:set SUMUP_WEBHOOK_SECRET_UAT "your_uat_webhook_secret"

# Or via Netlify Dashboard
Site Settings → Environment Variables → Add variable
Key: SUMUP_WEBHOOK_SECRET_UAT
Value: <your UAT webhook secret from SumUp dashboard>
Scopes: All scopes
```

## Why This Matters

### Current Behavior
- **Sandbox/UAT**: Internal calls should bypass webhook secret requirement
- **Production**: Webhook secret is REQUIRED for security

### Without UAT Webhook Secret
- Internal calls rely on detection logic working correctly
- Any detection failure causes 500 errors
- Less secure than having proper webhook authentication

### With UAT Webhook Secret
- Proper webhook signature verification
- More secure testing environment
- Matches production security model
- Internal calls still work but with proper authentication

## Testing Plan

1. **Deploy current fix** with enhanced logging
2. **Test payment flow** in sandbox environment
3. **Check console logs** for internal call detection
4. **Verify** no more 500 errors
5. **Add UAT webhook secret** for long-term security

## Related Files
- `netlify/functions/sumup-return.cjs` - Webhook endpoint
- `src/utils/paymentRequestUtils.ts` - `processPaymentRequest()` function
- `src/components/shared/PaymentModal.tsx` - `handlePaymentComplete()` caller

## Status
- ✅ Enhanced internal call detection
- ✅ Added comprehensive logging
- 🔄 Testing in progress
- ⏳ UAT webhook secret pending

## Next Steps
1. Commit and deploy webhook changes
2. Test payment flow and check logs
3. Add `SUMUP_WEBHOOK_SECRET_UAT` environment variable
4. Re-test with proper webhook authentication
5. Document UAT webhook secret in secure location
