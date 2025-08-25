# SumUp Payment Integration Guide

## Overview
This guide explains how to use the SumUp payment integration that has been set up for KH Therapy. The integration allows you to process payments using your actual SumUp merchant account.

## Configuration
Your SumUp integration is configured with the following settings:

- **App ID**: `sup_pk_irIpBP97NHeXabYDKg1rbYxTGekkJRqBL`
- **Merchant Code**: `MQEKWZR0`
- **Environment**: `sandbox` (for testing)

These are configured in your `.env` file:
```
VITE_SUMUP_APP_ID=sup_pk_irIpBP97NHeXabYDKg1rbYxTGekkJRqBL
VITE_SUMUP_MERCHANT_CODE=MQEKWZR0
VITE_SUMUP_ENVIRONMENT=sandbox
```

## Testing the Integration

### 1. Access the Test Page
- Navigate to `/sumup-test` in your application
- Or use the link in the Admin Console under Help → Development & Testing Tools
- URL: `http://localhost:5173/sumup-test`

### 2. Test Payment Options
The test page provides several predefined payment amounts:
- €23.00 - Test Deposit Payment
- €92.00 - Test Balance Payment  
- €115.00 - Test Full Payment
- €50.00 - Test Custom Payment

### 3. Create a Checkout
1. Click "Create Checkout" on any test payment
2. The system will generate a SumUp checkout session
3. You'll see the checkout details including:
   - Checkout ID
   - Reference number
   - Amount and description
   - Checkout URL

### 4. Complete the Payment
1. Click "Open Checkout" to go to the SumUp payment page
2. Use SumUp test card numbers for sandbox testing
3. Or use the "Simulate Success/Failure" buttons for quick testing

## SumUp Test Card Numbers
For sandbox testing, SumUp provides these test card numbers:

### Successful Payments
- **Visa**: `4000000000000002`
- **Mastercard**: `5555555555554444`
- **Expiry**: Any future date (e.g., `12/25`)
- **CVC**: Any 3 digits (e.g., `123`)

### Failed Payments
- **Declined Card**: `4000000000000069`
- **Insufficient Funds**: `4000000000009995`
- **Invalid CVC**: Use `000` as CVC

## Payment Flow

### 1. Checkout Creation
```typescript
const response = await createSumUpCheckout(
  amount,        // Amount in EUR (e.g., 23.00)
  'EUR',         // Currency
  description,   // Payment description
  reference,     // Unique reference
  email         // Customer email (optional)
);
```

### 2. Payment Processing
- Customer is redirected to SumUp's secure payment page
- SumUp handles all payment processing securely
- Customer completes payment with card details
- SumUp redirects back to your success/cancel URLs

### 3. Payment Confirmation
- Success: `/payment-success?transaction_id=xxx&amount=xxx`
- Cancellation: `/payment-cancelled?reason=xxx`
- Your system updates payment status accordingly

## Integration Features

### Security
- All payments processed through SumUp's secure gateway
- No sensitive card data handled by your system
- PCI DSS compliant payment processing

### User Experience
- Clean, professional checkout interface
- Mobile-optimized payment forms
- Real-time payment status updates
- Automatic redirects after payment

### Admin Features
- Payment tracking and reporting
- Transaction history
- Failed payment notifications
- Refund processing capabilities

## Production Deployment

### 1. Environment Configuration
For production, update your `.env` file:
```
VITE_SUMUP_ENVIRONMENT=production
# Keep the same App ID and Merchant Code
```

### 2. Webhook Setup
Configure SumUp webhooks to receive payment notifications:
- Webhook URL: `https://yourdomain.com/api/sumup-webhook`
- Events: `checkout.paid`, `checkout.failed`

### 3. API Integration
For full integration, you'll need:
- SumUp API access token
- Server-side webhook handling
- Database payment status updates

## Troubleshooting

### Common Issues

1. **"Configuration Missing" Error**
   - Check your `.env` file has all required variables
   - Restart the development server after changes

2. **Checkout Creation Failed**
   - Verify your SumUp App ID and Merchant Code
   - Check network connectivity
   - Review browser console for error details

3. **Payment Not Completing**
   - Use correct test card numbers for sandbox
   - Check SumUp's sandbox environment status
   - Verify return URLs are correctly configured

### Development Tips

1. **Console Logging**
   - All payment parameters are logged to browser console
   - Check Network tab for API calls
   - Monitor payment status changes

2. **Test Scenarios**
   - Test both successful and failed payments
   - Verify return URL handling
   - Test payment cancellation flows

3. **Error Handling**
   - All errors are displayed in the UI
   - Toast notifications show status updates
   - Failed payments are logged for debugging

## Support and Documentation

### SumUp Resources
- [SumUp Developer Documentation](https://developer.sumup.com/)
- [API Reference](https://developer.sumup.com/docs/api/)
- [Test Cards](https://developer.sumup.com/docs/testing/)

### KH Therapy Integration
- Source code: `src/utils/sumupApi.ts`
- Test page: `src/pages/SumUpTestPage.tsx`
- Payment utilities: `src/utils/paymentUtils.ts`

## Next Steps

1. **Test Thoroughly**: Use the test page to verify all payment scenarios
2. **Configure Webhooks**: Set up webhook handling for production
3. **Monitor Payments**: Use the admin console to track payment status
4. **Go Live**: Switch to production environment when ready

---

*Last Updated: December 2024*
*Version: SumUp Integration v1.0*
