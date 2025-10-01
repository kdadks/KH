# Environment-Specific SumUp Configuration Guide

## Domain-Based Environment Detection

The application now automatically detects whether to use production or sandbox mode based on the domain:

- **Production**: `https://khtherapy.ie/` (Live payments)
- **Sandbox**: All other domains including `localhost`, Netlify previews, etc. (Test payments)

## Environment Variables Setup

Add these variables to your `.env` file for different environments:

### Production Environment Variables
```bash
# Production SumUp Configuration (used when domain = khtherapy.ie)
VITE_SUMUP_PRODUCTION_API_KEY=your_production_api_key_here
VITE_SUMUP_PRODUCTION_MERCHANT_CODE=your_production_merchant_code_here
VITE_SUMUP_PRODUCTION_APP_ID=your_production_app_id_here
```

### Sandbox Environment Variables
```bash
# Sandbox SumUp Configuration (used for localhost and other domains)
VITE_SUMUP_SANDBOX_API_KEY=your_sandbox_api_key_here
VITE_SUMUP_SANDBOX_MERCHANT_CODE=your_sandbox_merchant_code_here  
VITE_SUMUP_SANDBOX_APP_ID=your_sandbox_app_id_here
```

### Fallback Configuration (Backward Compatibility)
```bash
# These are used as fallbacks if environment-specific variables are not set
VITE_SUMUP_API_KEY=your_api_key_here
VITE_SUMUP_MERCHANT_CODE=your_merchant_code_here
VITE_SUMUP_APP_ID=your_app_id_here
```

## Netlify Environment Variables

Set these in your Netlify dashboard under "Site settings" > "Environment variables":

### For Production Deployment
```
VITE_SUMUP_PRODUCTION_API_KEY = your_production_key
VITE_SUMUP_PRODUCTION_MERCHANT_CODE = your_production_merchant
```

### For Preview/Branch Deployments  
```
VITE_SUMUP_SANDBOX_API_KEY = your_sandbox_key
VITE_SUMUP_SANDBOX_MERCHANT_CODE = your_sandbox_merchant
```

## How Environment Detection Works

### Client-Side (React Components)
- Checks `window.location.hostname`
- If hostname is `khtherapy.ie` with HTTPS → Production mode
- All other hostnames → Sandbox mode

### Server-Side (Netlify Functions/Webhooks)
- Checks `CONTEXT` environment variable (Netlify deployment context)
- Checks `URL` environment variable (deployment URL)
- If context is "production" and URL contains "khtherapy.ie" → Production mode
- Otherwise → Sandbox mode

## Visual Indicators

The application will show environment indicators:

### Production Mode
- Minimal green indicator: "Live Payments"
- Only shown when explicitly requested

### Sandbox/Test Mode
- Prominent yellow indicator: "🧪 Test Mode"
- Always visible with pulsing animation
- Shows "No real money will be charged"

## Testing the Implementation

### Local Development (Sandbox)
```bash
# Start development server
npm run dev

# Will automatically use sandbox mode
# Shows test mode indicators
# Uses VITE_SUMUP_SANDBOX_* variables
```

### Production Testing
```bash
# Deploy to production with khtherapy.ie domain
# Automatically switches to production mode
# Uses VITE_SUMUP_PRODUCTION_* variables
# Shows minimal live payment indicators
```

## Webhook Configuration

### SumUp Dashboard Setup
1. **Sandbox Webhooks**: Point to your development/staging URL
   - `https://your-staging-site.netlify.app/.netlify/functions/sumup-webhook`

2. **Production Webhooks**: Point to your production URL
   - `https://khtherapy.ie/.netlify/functions/sumup-webhook`

### Webhook Behavior
- Webhooks automatically detect environment based on deployment context
- Sandbox webhooks log `[TEST]` in console
- Production webhooks log `[LIVE]` in console

## Database Configuration

The system can also use database-stored configuration with environment filtering:

```sql
-- Example: Insert production configuration
INSERT INTO payment_gateways (provider, environment, api_key, merchant_id, is_active) 
VALUES ('sumup', 'production', 'prod_api_key', 'PROD_MERCHANT', true);

-- Example: Insert sandbox configuration  
INSERT INTO payment_gateways (provider, environment, api_key, merchant_id, is_active)
VALUES ('sumup', 'sandbox', 'sandbox_api_key', 'SANDBOX_MERCHANT', true);
```

## Migration from Old System

If you have existing environment variables without the new naming:

1. **Keep existing variables** for backward compatibility
2. **Add new environment-specific variables** for enhanced control
3. **System will automatically use appropriate configuration** based on domain

## Troubleshooting

### Issue: Wrong environment detected
- Check domain exactly matches `khtherapy.ie`
- Verify HTTPS is being used in production
- Check browser console for environment detection logs

### Issue: API keys not working
- Ensure you're using the correct API key for the detected environment
- Verify API keys are valid in SumUp developer dashboard
- Check environment variable names match exactly

### Issue: Test mode not showing
- Confirm you're not on the production domain
- Check that environment indicator components are imported correctly
- Verify React components are rendering the indicators

## Security Notes

- **Never commit real API keys** to version control
- **Use different API keys** for production and sandbox
- **Environment variables** are the recommended way to manage secrets
- **Database storage** should encrypt sensitive API keys

This setup ensures you can safely test payments locally while automatically using live payments only on your production domain.