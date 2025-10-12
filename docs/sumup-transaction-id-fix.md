# SumUp Transaction ID Fix

## Problem
The `payments` table was storing the same UUID for both `sumup_transaction_id` and `sumup_checkout_id`, instead of the actual SumUp transaction code displayed in the SumUp dashboard.

### Example of Issue
```
Transaction ID: 351e3c5f-40b6-4553-a98a-5c17500b2147  (❌ This is the checkout ID)
Checkout ID:    351e3c5f-40b6-4553-a98a-5c17500b2147  (❌ Same value)
```

The actual transaction ID shown in SumUp dashboard was different (e.g., `TPVVQGAO` or similar format).

## Root Cause
The webhook handler was using fallback logic that defaulted to the `checkout_id` when the actual transaction ID was not found:

```javascript
// OLD CODE (INCORRECT)
sumup_transaction_id: checkoutDetails?.transaction_id || checkoutDetails?.transactions?.[0]?.id || checkoutId
```

This happened because:
1. SumUp API uses `transaction_code` field (not `transaction_id`) in the checkout details response
2. The return URL parameters might send `transaction_code` instead of `transaction_id`
3. We were not checking for the correct field names

## Solution

### 1. Updated Transaction ID Extraction from SumUp API
Changed the webhook handler to check for `transaction_code` first:

```javascript
// NEW CODE (CORRECT)
sumup_transaction_id: checkoutDetails?.transaction_code || 
                      checkoutDetails?.transactions?.[0]?.transaction_code || 
                      checkoutDetails?.transactions?.[0]?.id || 
                      checkoutDetails?.transaction_id || 
                      null  // Don't fallback to checkout_id
```

**Key changes:**
- Check `transaction_code` at the top level first
- Check `transactions[0].transaction_code` in the transactions array
- Remove `checkoutId` fallback (set to `null` instead)
- This allows the actual transaction code to be captured once available

### 2. Updated Return URL Parameter Extraction
Modified the GET request handler to check for `transaction_code` parameter:

```javascript
// Extract both possible parameter names
const {
  checkout_id,
  transaction_id: txId,
  transaction_code,  // NEW: SumUp may send this
  status,
  // ...
} = queryParams;

// Use transaction_code if available, fallback to transaction_id
const transaction_id = transaction_code || txId;
```

### 3. Enhanced Logging
Added comprehensive logging to see what SumUp actually sends:

```javascript
console.log('✅ Fetched checkout details:', {
  checkout_id: checkoutId,
  reference: checkoutReference,
  status: checkoutDetails.status,
  amount: checkoutDetails.amount,
  transactions: checkoutDetails.transactions,
  transaction_code: checkoutDetails.transaction_code,  // NEW
  transaction_id: checkoutDetails.transaction_id
});
```

## Expected Behavior After Fix

### When Payment is Created
1. Initially, `sumup_transaction_id` may be `null` (if transaction not yet available)
2. Checkout ID will be stored correctly in `sumup_checkout_id`

### When Webhook is Received
1. Fetch full checkout details from SumUp API
2. Extract `transaction_code` from the response
3. Update `sumup_transaction_id` with the actual transaction code (e.g., `TPVVQGAO`)

### Result in Database
```
Transaction ID: TPVVQGAO                            (✅ Actual SumUp transaction code)
Checkout ID:    351e3c5f-40b6-4553-a98a-5c17500b2147  (✅ Correct checkout UUID)
```

## Testing Checklist

- [ ] Create a new payment in SumUp sandbox
- [ ] Complete the payment successfully
- [ ] Check Netlify function logs for the checkout details
- [ ] Verify `transaction_code` is logged in the checkout details
- [ ] Check `payments` table in Supabase:
  - `sumup_checkout_id` should be a UUID
  - `sumup_transaction_id` should be the actual transaction code (if available)
  - They should be DIFFERENT values
- [ ] Verify transaction ID in admin console matches SumUp dashboard

## Rollback Plan
If this causes issues, revert to using `checkout_id` as fallback:

```javascript
sumup_transaction_id: checkoutDetails?.transaction_code || 
                      checkoutDetails?.transactions?.[0]?.transaction_code || 
                      checkoutDetails?.transaction_id || 
                      checkoutId  // Restore fallback
```

## Related Files
- `netlify/functions/sumup-return.cjs` - Main webhook and return URL handler
- `src/components/admin/PaymentManagement.tsx` - Admin UI displaying transaction IDs

## Notes
- SumUp's API structure may vary between sandbox and production
- Transaction codes are typically generated after payment processing completes
- If webhook fires before transaction is finalized, `transaction_code` might not be available yet
- Setting to `null` instead of falling back to `checkout_id` allows future updates to populate the correct value
