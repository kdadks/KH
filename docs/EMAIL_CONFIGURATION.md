# Email Configuration Setup Guide

This guide explains how to configure email functionality for the KH Therapy application using Hostinger SMTP and Netlify Functions.

## Overview

The application has been migrated from EmailJS to a server-side SMTP solution using:
- **SMTP Provider**: Hostinger (smtp.hostinger.com)
- **From Email**: info@khtherapy.ie
- **Server Environment**: Netlify Functions

## SMTP Configuration Details

```
SMTP Server: smtp.hostinger.com
SSL/TLS Port: 465
STARTTLS Port: 587
Authentication: Required
From Email: info@khtherapy.ie
```

## Setup Instructions

### 1. Netlify Environment Variables

In your Netlify dashboard, go to **Site settings > Environment variables** and add:

```
SMTP_USER=info@khtherapy.ie
SMTP_PASS=your_email_password_here
```

**Important**: 
- Do NOT add these to your `.env` file or commit them to version control
- These are server-side variables for the Netlify function

### 2. Site URL Configuration

Add your site URL to environment variables (both local and Netlify):

**Local `.env` file:**
```
VITE_SITE_URL=http://localhost:5173
```

**Netlify environment variables:**
```
VITE_SITE_URL=https://your-site.netlify.app
```

### 3. Email Templates

The system includes built-in email templates for:

- **Booking Confirmation**: Sent when a customer books an appointment
- **Payment Receipt**: Sent when a payment is processed
- **Payment Request**: Sent when requesting payment from customers
- **Booking Reminder**: Sent before appointments
- **Admin Notifications**: Sent to admin for various events
- **Welcome Email**: Sent to new customers
- **Password Reset**: Sent for account password resets
- **Invoice Notifications**: Sent with invoice details

### 4. Email Function Endpoint

The Netlify function is accessible at:
```
https://your-site.netlify.app/.netlify/functions/send-email
```

### 5. Testing Email Functionality

#### Local Development
```bash
# Start the development server
npm run dev

# Test email sending through the application
# Emails will be sent via the deployed Netlify function
```

#### Production Testing
```bash
# Deploy to Netlify
npm run build
# Push to your git repository connected to Netlify

# Test email functionality through your deployed application
```

## Email Function Usage

### Function Request Format
```javascript
POST https://your-site.netlify.app/.netlify/functions/send-email

{
  "emailType": "booking_confirmation",
  "recipientEmail": "customer@example.com",
  "data": {
    "customer_name": "John Doe",
    "service_name": "Physiotherapy Session",
    "appointment_date": "2025-08-20",
    "appointment_time": "10:00 AM",
    "total_amount": 80,
    "booking_reference": "BK123456"
  },
  "subject": "Optional custom subject"
}
```

### Available Email Types
- `booking_confirmation`
- `payment_receipt`
- `payment_request`
- `booking_reminder`
- `admin_notification`
- `welcome`
- `password_reset`

## Security Features

### CORS Protection
The function includes CORS headers to allow requests from your domain.

### Environment Variable Security
- SMTP credentials are stored securely in Netlify environment variables
- No sensitive data is exposed in client-side code

### Error Handling
- Comprehensive error logging
- Graceful fallbacks for email failures
- Rate limiting through Netlify's built-in protections

## Troubleshooting

### Common Issues

1. **Emails not sending**
   - Check Netlify environment variables are set correctly
   - Verify SMTP credentials with Hostinger
   - Check Netlify function logs

2. **CORS errors**
   - Ensure VITE_SITE_URL matches your actual domain
   - Check that requests are coming from the correct origin

3. **Template rendering issues**
   - Verify all required data fields are provided
   - Check console for template errors

### Checking Netlify Function Logs
1. Go to Netlify Dashboard
2. Select your site
3. Go to **Functions** tab
4. Click on `send-email` function
5. View logs for errors and debugging info

### Testing SMTP Connection
You can test your SMTP settings using any email client with these settings:
- Host: smtp.hostinger.com
- Port: 465 (SSL) or 587 (STARTTLS)
- Username: info@khtherapy.ie
- Password: [your password]

## Migration from EmailJS

The application has been fully migrated from EmailJS to SMTP. Key changes:

1. **Server-side processing**: Emails are now sent server-side for better security
2. **Professional templates**: Built-in HTML email templates
3. **Better deliverability**: Direct SMTP ensures better email delivery
4. **No client-side credentials**: Email credentials are secure on the server

### Backward Compatibility
All existing email function calls remain the same - only the underlying implementation has changed.

## Email Template Customization

To customize email templates, edit the `getEmailTemplate` function in:
```
netlify/functions/send-email.js
```

Each template includes:
- Professional HTML styling
- Company branding (KH Therapy)
- Responsive design
- Clear call-to-action buttons

## Performance Considerations

- **Batch Processing**: Emails are processed in batches to prevent rate limiting
- **Error Retry**: Failed emails are logged but don't block the application
- **Async Processing**: All email sending is asynchronous

## Support

For email-related issues:
1. Check Netlify function logs
2. Verify Hostinger SMTP settings
3. Test with a simple email client first
4. Contact Hostinger support if SMTP issues persist
