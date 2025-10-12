# SumUp Webhook Configuration Summary

## ✅ Webhook Endpoint Status: **PROPERLY CONFIGURED**

### Endpoint Details
- **URL**: `https://[your-domain]/.netlify/functions/sumup-return`
- **Methods**: 
  - `POST` - For SumUp webhooks
  - `GET` - For return URLs after payment

### What the Endpoint Does

#### POST Requests (Webhooks from SumUp):
1. **Signature Verification** - Validates requests using HMAC SHA-256
2. **Duplicate Prevention** - Checks for existing payments before creating
3. **Payment Processing** - Creates/updates payment records
4. **Status Mapping** - Maps SumUp statuses to internal statuses
5. **Database Updates** - Updates payment_requests and payments tables

#### GET Requests (User Returns):
1. **Processes query parameters** from SumUp redirect
2. **Shows user-friendly success/cancel page**
3. **Auto-redirects** to payment success/cancelled pages

## Configuration Requirements

### Environment Variables (Netlify)
```bash
# Required for all environments
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Webhook secrets (environment-specific)
SUMUP_WEBHOOK_SECRET_UAT=your_uat_webhook_secret
SUMUP_WEBHOOK_SECRET_PROD=your_prod_webhook_secret

# SumUp API credentials
SUMUP_ACCESS_TOKEN=your_sumup_access_token (production)
SUMUP_UAT_ACCESS_TOKEN=your_sumup_uat_access_token (sandbox)
```

### SumUp Dashboard Webhook Configuration
1. Go to SumUp Developer Dashboard
2. Navigate to your application
3. Add Webhook URL: `https://uat--khtherapy.netlify.app/.netlify/functions/sumup-return` (for UAT)
4. Select event: `checkout.status_changed`
5. Copy the webhook secret and add to Netlify as `SUMUP_WEBHOOK_SECRET_UAT`

## How It Works

### 1. Payment Initiation
```
User → Selects Payment Option → PaymentModal → Creates SumUp Checkout
```

### 2. SumUp Checkout
```
PaymentModal → redirect_url (success page)
            → cancel_url (cancel page)
            → return_url (webhook endpoint)
```

### 3. Payment Completion (Real Flow)
```
User Completes Payment in SumUp → SumUp sends webhook (POST) → Creates payment record
                                → User clicks "Back to merchant" → redirect_url
```

### 4. Payment Success Page
```
PaymentSuccessPage → Verifies payment status
                   → Processes payment if needed
                   → Auto-redirects to /my-account after 2 seconds
```

## Current Implementation Status

### ✅ Implemented Features
- [x] Webhook signature verification (HMAC SHA-256)
- [x] Duplicate payment prevention
- [x] Internal call detection (X-Internal-Call header)
- [x] Environment-based configuration (sandbox/production)
- [x] Payment status mapping (SumUp → Internal)
- [x] Payment type tracking (deposit/full)
- [x] Automatic payment record creation from payment_requests
- [x] Comprehensive debug logging
- [x] Auto-redirect from success/cancel pages

### 🔧 How Webhook Creates Payment Records

When SumUp webhook is received:

1. **Receives POST** with checkout status
2. **Verifies signature** (except internal calls)
3. **Searches for payment** by:
   - checkout_id
   - checkout_reference
   - payment_request_id (from internal calls)
4. **If no payment found**, searches payment_requests table
5. **Creates payment record** with:
   ```javascript
   {
     customer_id: from payment_request,
     amount: from payment_request,
     currency: 'EUR',
     status: 'paid',
     payment_method: 'sumup',
     sumup_checkout_id: checkout_id,
     sumup_transaction_id: checkout_id (or transaction_id),
     sumup_checkout_reference: checkout_reference,
     sumup_payment_type: 'deposit' or 'full' (from payment_request notes),
     payment_date: current timestamp,
     booking_id: from payment_request,
     payment_request_id: payment_request.id,
     notes: 'Payment created from webhook for payment_request #X'
   }
   ```
6. **Updates payment_request** status to 'paid'
7. **Booking status remains 'pending'** (requires admin confirmation)

## Testing Checklist

### ✅ Before Testing
- [ ] Verify Netlify environment variables are set
- [ ] Verify SumUp webhook is configured in dashboard
- [ ] Deploy latest code to UAT
- [ ] Check webhook endpoint is accessible: `curl https://uat--khtherapy.netlify.app/.netlify/functions/sumup-return`

### 🧪 Test Real SumUp Flow
1. Create a test booking
2. Select deposit or full payment option
3. Complete payment in SumUp sandbox checkout
   - Use test card: `4444 3333 2222 1111`
   - Any future expiry date
   - Any 3-digit CVV
4. Click "Back to merchant" button
5. Verify redirect to payment success page
6. Wait for auto-redirect (2 seconds)
7. Check SumUp sandbox dashboard for transaction
8. Check Supabase payments table for record

### 🔍 Verify Payment Record
Expected in `payments` table:
- `sumup_checkout_id`: Should match SumUp transaction
- `sumup_payment_type`: 'deposit' or 'full'
- `sumup_checkout_reference`: 'payment-request-{id}-{timestamp}'
- `status`: 'paid'
- `amount`: Correct amount (deposit or full)
- `booking_id`: Linked to booking
- `payment_request_id`: Linked to payment request

### 🔍 Verify Booking Status
Expected in `bookings` table:
- `status`: Should remain 'pending'
- Why? Admin must manually confirm bookings

## Troubleshooting

### Issue: Payments not appearing in SumUp dashboard
**Cause**: Using mock/internal checkout flow  
**Solution**: Deploy code with real SumUp checkout enabled (already done)

### Issue: Webhook not receiving POST from SumUp
**Possible causes**:
1. Webhook URL not configured in SumUp dashboard
2. Webhook secret mismatch
3. Network/firewall blocking SumUp requests

**Check**:
```bash
# View Netlify function logs
netlify functions:log sumup-return
```

### Issue: Payment record not created
**Possible causes**:
1. Webhook signature verification failed
2. payment_request not found
3. Database permissions issue

**Check webhook logs** in Netlify function logs

### Issue: Auto-redirect not working
**Cause**: JavaScript blocked or slow network  
**Solution**: Manual "Go to My Account" button provided as fallback

## Support
For issues, check:
1. Netlify function logs: `netlify functions:log`
2. Browser console (Network tab)
3. Supabase logs (Database → Logs)
4. SumUp dashboard (Webhooks section)
