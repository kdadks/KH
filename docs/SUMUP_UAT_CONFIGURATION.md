# SumUp Sandbox Configuration - UAT Testing

## ✅ Configuration Complete

### Netlify Environment Variables Configured:

#### **Frontend Variables (Build-time)**
- `VITE_SUMUP_SANDBOX_API_KEY` - Sandbox API Secret Key
- `VITE_SUMUP_SANDBOX_APP_ID` - Sandbox App ID / Public Key  
- `VITE_SUMUP_SANDBOX_MERCHANT_CODE` - Sandbox Merchant Code

#### **Backend Variables (Runtime - Netlify Functions)**
- `SUMUP_UAT_ACCESS_TOKEN` - Sandbox API Secret Key (same as VITE_SUMUP_SANDBOX_API_KEY)
- `SUMUP_WEBHOOK_SECRET_UAT` - Webhook secret for verifying SumUp webhook calls

---

## 🔄 How Environment Detection Works

The system automatically detects the environment based on the deployment domain:

### **Production Environment** (`https://khtherapy.ie`)
- Uses: `VITE_SUMUP_PRODUCTION_*` variables
- Uses: `SUMUP_ACCESS_TOKEN` and `SUMUP_WEBHOOK_SECRET_PROD`
- Real payments processed

### **UAT/Sandbox Environment** (All other domains)
- Includes: `*.netlify.app`, localhost, preview deployments
- Uses: `VITE_SUMUP_SANDBOX_*` variables  
- Uses: `SUMUP_UAT_ACCESS_TOKEN` and `SUMUP_WEBHOOK_SECRET_UAT`
- Test payments in sandbox mode

---

## 🧪 Testing Steps

### 1. **Deploy UAT Branch**
```bash
git push origin uat
```
This will trigger a Netlify deployment with sandbox credentials.

### 2. **Configure SumUp Webhook**
Go to SumUp Developer Portal → Webhooks and configure:
- **Webhook URL**: `https://YOUR-UAT-SITE.netlify.app/.netlify/functions/sumup-return`
- **Webhook Secret**: Use the same value as `SUMUP_WEBHOOK_SECRET_UAT`
- **Events**: Select `CHECKOUT_STATUS_CHANGED`

### 3. **Test Payment Flow**
1. Visit your UAT site: `https://YOUR-UAT-SITE.netlify.app`
2. Book a service/session
3. Proceed to payment (20% deposit)
4. Complete payment using SumUp sandbox test cards
5. Verify webhook is triggered
6. Check payment status updates in database

### 4. **Verify Webhook Processing**
Check Netlify Function logs:
- Go to Netlify Dashboard → Functions → sumup-return
- Look for logs showing:
  ```
  🔍 Processing webhook with data: { checkoutId, event_type, status }
  ✅ Payment found by checkout_id
  ✅ Payment updated from webhook
  ```

---

## 🐛 Debugging Tips

### Check Environment Detection
Open browser console on UAT site and look for:
```
UAT/Staging environment detected - Forcing sandbox mode
Using sandbox SumUp credentials
```

### Verify Netlify Environment Variables
1. Go to Netlify Dashboard
2. Site Settings → Environment Variables
3. Verify all `VITE_SUMUP_SANDBOX_*` and `SUMUP_UAT_*` variables are set
4. Make sure they're enabled for the UAT branch deployment

### Test Webhook Endpoint
```bash
curl -X POST https://YOUR-UAT-SITE.netlify.app/.netlify/functions/sumup-return \
  -H "Content-Type: application/json" \
  -d '{"id":"test-checkout-id","status":"SUCCESSFUL","event_type":"CHECKOUT_STATUS_CHANGED"}'
```

Should return: `{"status":"success"}` (not 500 error)

---

## 🚀 Production Deployment

When ready to deploy to production:

1. **Merge UAT to Main** (after successful testing)
```bash
git checkout main
git merge uat
git push origin main
```

2. **Verify Production Environment Variables**
- `VITE_SUMUP_PRODUCTION_API_KEY`
- `VITE_SUMUP_PRODUCTION_APP_ID`
- `VITE_SUMUP_PRODUCTION_MERCHANT_CODE`
- `SUMUP_ACCESS_TOKEN` (production)
- `SUMUP_WEBHOOK_SECRET_PROD`

3. **Update Production Webhook**
- Webhook URL: `https://khtherapy.ie/.netlify/functions/sumup-return`
- Use production webhook secret

---

## 📋 Key Changes Made

### Fixed in This Update:
- ✅ SumUp webhook now handles flat JSON structure `{id, status, event_type}`
- ✅ Webhook fetches full checkout details from SumUp API
- ✅ Proper environment detection for sandbox vs production
- ✅ Separate credential sets for UAT and production
- ✅ Multi-patient booking system fully functional
- ✅ Quick Schedule Generator defaults to day mode

---

## 📞 Support

If webhook still fails:
1. Check Netlify Function logs
2. Verify webhook secret matches exactly
3. Ensure SumUp webhook is configured for sandbox environment
4. Check that checkout ID exists in payment_requests table

Last Updated: October 12, 2025
