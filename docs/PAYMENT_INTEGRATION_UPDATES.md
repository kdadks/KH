# Payment Integration Updates for booking_id

## Problem
When payments are processed (via SumUp or other processors), they need to include the `booking_id` to properly link to specific bookings.

## Current Payment Flow Analysis

Based on the codebase analysis:

1. **Payment Requests** → Created with `booking_id` ✅ (Already fixed)
2. **Payment Processing** → External (SumUp, etc.) 
3. **Payment Recording** → Needs `booking_id` inclusion ❌ (Needs update)

## Required Updates

### 1. When Payment Webhooks/Callbacks Process Payments

If your system has webhook handlers for payment completion, they should extract the `booking_id` from the payment request and include it when creating the payment record.

**Example webhook logic needed:**
```typescript
// When a payment is completed via SumUp or other processor
async function handlePaymentWebhook(paymentData: any) {
  // Find the related payment request
  const { data: paymentRequest } = await supabase
    .from('payment_requests')
    .select('booking_id, customer_id')
    .eq('sumup_checkout_id', paymentData.checkout_id)
    .single();

  // Create payment record with booking_id
  const { data: payment } = await supabase
    .from('payments')
    .insert({
      customer_id: paymentRequest.customer_id,
      booking_id: paymentRequest.booking_id, // ← Include this!
      amount: paymentData.amount,
      status: 'paid',
      payment_method: paymentData.method,
      sumup_transaction_id: paymentData.transaction_id,
      payment_date: new Date().toISOString(),
      notes: `Payment for payment request #${paymentRequest.id}`
    });
}
```

### 2. Manual Payment Entry (if applicable)

If admins can manually record payments, ensure the booking_id is included:

```typescript
// Example admin payment creation
const createPayment = async (paymentData: {
  customer_id: number;
  booking_id: string;
  amount: number;
  // ... other fields
}) => {
  const { data: payment } = await supabase
    .from('payments')
    .insert({
      ...paymentData,
      booking_id: paymentData.booking_id // Ensure this is included
    });
};
```

### 3. Update Payment Processing Logic

Search your codebase for any functions that insert into the `payments` table and ensure they include `booking_id`.

**Files to check:**
- Look for webhook handlers (SumUp, Stripe, etc.)
- Search for `supabase.from('payments').insert`
- Check payment completion functions

### 4. Migration for Existing Payments

Use the SQL from `COMPLETE_BOOKING_ID_MIGRATION.md` to link existing payments to bookings via payment_requests relationships.

## Testing

1. **Create a new booking** → Should generate payment request with `booking_id`
2. **Complete payment** → Should create payment record with same `booking_id`
3. **Check admin interface** → Should show correct payment amounts per service
4. **Multiple services from same customer** → Should show different amounts

## Verification Query

```sql
-- Check if payments are properly linked to bookings
SELECT 
  b.package_name,
  p.amount,
  p.booking_id,
  b.id as booking_id_check,
  CASE 
    WHEN p.booking_id = b.id THEN 'LINKED'
    ELSE 'UNLINKED'
  END as status
FROM payments p
JOIN bookings b ON b.customer_id = p.customer_id
WHERE p.status = 'paid'
ORDER BY p.created_at DESC;
```

## Expected Result

After implementing these updates:
- ✅ Each payment will be linked to specific booking
- ✅ Admin interface shows correct payment amounts per service
- ✅ No more confusion between services from same customer
- ✅ Proper audit trail for booking → payment request → payment
