# Production Webhook Setup Guide

## ✅ UAT Issue Resolution

### Problem
In UAT environment, payments were successful but the payments table wasn't updating these columns:
- `webhook_processed_at`
- `sumup_event_type` 
- `sumup_event_id`

### Root Cause
UAT was using sandbox/simulation mode but wasn't triggering webhook events, so the webhook handler never processed payment updates.

### Solution Implemented
- **UAT/Sandbox**: Added webhook simulation that triggers after successful/failed payments
- **Production**: Will use real SumUp webhooks (no simulation)

---

## 🚀 Production Setup Requirements

### 1. SumUp Webhook Configuration
In your **SumUp production dashboard**, configure webhooks:

```
Webhook URL: https://khtherapy.ie/.netlify/functions/sumup-webhook
Events to subscribe:
- checkout.completed
- checkout.failed
- checkout.pending
- transaction.successful
- transaction.failed
```

### 2. Environment Variables
Ensure these are set in **Netlify production environment**:

```env
# Production SumUp credentials
VITE_SUMUP_PRODUCTION_API_KEY=your_production_api_key
VITE_SUMUP_PRODUCTION_MERCHANT_CODE=your_production_merchant_code
VITE_SUMUP_PRODUCTION_APP_ID=your_production_app_id

# Supabase (same for all environments)
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Netlify deployment context
CONTEXT=production
NODE_ENV=production
```

### 3. Domain-Based Environment Detection

The system automatically detects environment:

| Domain | Environment | Webhook Source |
|--------|-------------|----------------|
| `https://khtherapy.ie/` | Production | Real SumUp webhooks |
| UAT/Netlify previews | Sandbox | Simulated webhooks |
| `localhost` | Sandbox | Simulated webhooks |

---

## 🔧 How It Works

### UAT/Sandbox Mode
1. User completes payment simulation
2. `simulateWebhookEvent()` triggers
3. Sends webhook to `/.netlify/functions/sumup-webhook`
4. Webhook updates payments table with:
   - `webhook_processed_at: current_timestamp`
   - `sumup_event_type: 'checkout.completed'`
   - `sumup_event_id: 'evt_sandbox_12345'`

### Production Mode  
1. User completes real payment via SumUp
2. **SumUp servers** send webhook to your configured URL
3. Webhook handler processes real SumUp event
4. Updates payments table with real event data

---

## 🧪 Testing Guide

### UAT Testing (Current)
- Payments now update all webhook columns ✅
- Use simulation buttons to test success/failure scenarios
- Check payments table to verify webhook processing

### Production Testing (When Live)
1. **Test with small amounts** ($0.50 - $1.00)
2. Monitor webhook logs in Netlify Functions dashboard
3. Verify payments table updates with real SumUp event data
4. Check email notifications are sent correctly

---

## 🔍 Monitoring & Debugging

### Webhook Logs Location
- **Netlify Functions**: https://app.netlify.com/sites/[your-site]/functions
- **Console logs**: Check webhook function logs for processing details

### Key Log Messages
```javascript
// Environment detection
🌐 Webhook environment detection: production/sandbox

// Sandbox simulation
🧪 Processing sandbox webhook simulation

// Real webhook processing  
🎯 SumUp webhook received [LIVE]: {...}

// Payment updates
📝 Updating existing payment record: 123
✅ Payment webhook processed successfully
```

### Troubleshooting Production

If webhooks aren't working in production:

1. **Check SumUp Dashboard**: Verify webhook URL is registered
2. **Check Netlify Logs**: Look for incoming webhook requests
3. **Verify Environment**: Ensure domain detection shows 'production'
4. **Test Webhook Endpoint**: Use Postman to test webhook URL directly

---

## 📋 Production Deployment Checklist

- [ ] SumUp production webhook URL configured
- [ ] Production environment variables set in Netlify
- [ ] Domain `khtherapy.ie` resolves to production deployment
- [ ] Webhook endpoint accessible publicly 
- [ ] Test payments with small amounts
- [ ] Monitor webhook processing logs
- [ ] Verify payments table updates correctly
- [ ] Confirm email notifications work

---

## 🎯 Expected Behavior

### UAT Environment
- ✅ Payments work with simulation
- ✅ Webhook columns get updated via simulation
- ✅ Email notifications sent
- ✅ Complete workflow testing possible

### Production Environment  
- ✅ Real SumUp payments processed
- ✅ Real webhooks update payments table
- ✅ All payment data accurately recorded
- ✅ Customer receives real payment confirmations

The system is now production-ready with proper webhook handling for both environments! 🚀