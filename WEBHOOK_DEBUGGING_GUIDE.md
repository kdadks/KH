# Webhook Debugging Guide

## Problem
The webhook columns `webhook_processed_at`, `sumup_event_type`, and `sumup_event_id` are not being updated in the UAT environment after successful payments.

## Debugging Features Added

### 1. Enhanced Console Logging
- Added comprehensive logging to `simulateWebhookEvent()` function
- Logs include request details, response status, and error information
- Errors are stored in localStorage to survive page redirects

### 2. localStorage Debug Storage
The system now stores debug information in localStorage:
- `last_webhook_success`: Last successful webhook simulation details
- `last_webhook_failure`: Last failed webhook simulation details  
- `webhook_simulation_errors`: Any errors that occurred during simulation

### 3. Post-Redirect Debug Logging
When returning from SumUp (checkout page with `?checkout-id=xxx&success=true`):
- Automatically logs all stored debug information to console
- Shows whether webhook simulation succeeded or failed
- Displays any errors that occurred

### 4. Manual Debug Check
Added a "🐛 Check Debug" button on the payment page that:
- Displays current debug status in an alert
- Logs full details to console
- Available both as button and globally via `window.checkWebhookDebugInfo()`

## How to Debug

### Step 1: Test Payment Flow
1. Navigate to a payment page (e.g., UAT environment)
2. Use "✅ Simulate Success" to trigger payment simulation
3. Watch console logs for webhook simulation details

### Step 2: Check Debug Info After Redirect
After being redirected back from SumUp:
1. Open browser console (F12)
2. Look for "=== POST-REDIRECT DEBUG INFO ===" section
3. Check if webhook success/failure/errors are logged

### Step 3: Manual Debug Check
At any time, you can:
- Click the "🐛 Check Debug" button for quick status
- Run `checkWebhookDebugInfo()` in browser console for full details
- Check localStorage manually in DevTools > Application > Local Storage

### Step 4: Inspect Network Traffic
1. Open DevTools > Network tab
2. Trigger payment simulation
3. Look for calls to `/netlify/functions/sumup-return`
4. Check request payload and response

## Expected Debug Output

### Successful Webhook Simulation
```
🔄 Starting webhook simulation for checkout: checkout_abc123
📤 Sending webhook simulation request to: /.netlify/functions/sumup-return
📋 Request payload: {"event_type":"checkout.completed","checkout_reference":"checkout_abc123",...}
✅ Webhook simulation successful, response: Success message
```

### Failed Webhook Simulation  
```
🔄 Starting webhook simulation for checkout: checkout_abc123
📤 Sending webhook simulation request to: /.netlify/functions/sumup-return
📋 Request payload: {...}
❌ Webhook simulation failed: [status] [error message]
```

## Troubleshooting Steps

### If No Debug Info is Found
- Check if `simulateWebhookEvent()` is being called
- Verify network connectivity to webhook endpoint  
- Check browser console for JavaScript errors

### If Webhook Simulation Fails
- Check the response status and error message
- Verify the webhook endpoint URL is correct
- Test the endpoint directly with curl/Postman

### If Database Columns Still Not Updated
- Verify the database migration was successful
- Check Netlify function logs for server-side errors
- Test the webhook handler independently

## Test Endpoint Verification
You mentioned the test endpoint works. To verify:
```bash
curl https://your-uat-domain/.netlify/functions/test-webhook
```
Should return "Test endpoint is working!"

## Next Steps for Investigation
1. Use the debugging features to determine if webhook simulation is being called
2. Check network logs to see if requests reach the webhook endpoint  
3. Examine webhook endpoint logs for processing errors
4. Verify database connection and update queries in the webhook handler