# Environment Configuration for KH Therapy Website

## Required Environment Variables

Create a `.env` file in the project root with the following variables:

### Supabase Configuration
```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### SumUp Payment Gateway Configuration (Ireland)
```bash
REACT_APP_SUMUP_APP_ID=your_sumup_app_id
REACT_APP_SUMUP_MERCHANT_CODE=your_sumup_merchant_code
REACT_APP_SUMUP_ENVIRONMENT=sandbox  # or 'production' for live payments
```

### EmailJS Configuration
```bash
REACT_APP_EMAILJS_SERVICE_ID=your_emailjs_service_id
REACT_APP_EMAILJS_PUBLIC_KEY=your_emailjs_public_key
REACT_APP_EMAILJS_TEMPLATE_BOOKING_CONFIRMATION=template_booking_confirm
REACT_APP_EMAILJS_TEMPLATE_PAYMENT_RECEIPT=template_payment_receipt
REACT_APP_EMAILJS_TEMPLATE_BOOKING_REMINDER=template_booking_reminder
REACT_APP_EMAILJS_TEMPLATE_ADMIN_NOTIFICATION=template_admin_notify
```

## Setup Instructions

### 1. Supabase Setup
1. Create a new Supabase project at https://supabase.com
2. Copy the project URL and anon key to your `.env` file
3. Run the database migration scripts in the `database/` folder
4. Set up Row Level Security policies for your tables

### 2. SumUp Payment Gateway Setup (Ireland)
1. Register for a SumUp merchant account at https://sumup.ie
2. Get your App ID and Merchant Code from the SumUp developer dashboard
3. Set `REACT_APP_SUMUP_ENVIRONMENT` to `sandbox` for testing or `production` for live payments
4. Configure webhook endpoints for payment notifications

### 3. EmailJS Setup
1. Create an EmailJS account at https://emailjs.com
2. Create email templates for:
   - Booking confirmations
   - Payment receipts
   - Booking reminders
   - Admin notifications
3. Copy the service ID, public key, and template IDs to your `.env` file

### 4. Email Template Examples

#### Booking Confirmation Template
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Booking Confirmation - KH Therapy</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb;">KH Therapy</h1>
            <h2 style="color: #059669;">Booking Confirmation</h2>
        </div>
        
        <p>Dear {{to_name}},</p>
        
        <p>Thank you for booking with KH Therapy. Your appointment has been confirmed:</p>
        
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Appointment Details</h3>
            <p><strong>Service:</strong> {{service_name}}</p>
            <p><strong>Date:</strong> {{appointment_date}}</p>
            <p><strong>Time:</strong> {{appointment_time}}</p>
            <p><strong>Therapist:</strong> {{therapist_name}}</p>
            <p><strong>Location:</strong> {{clinic_address}}</p>
            <p><strong>Total Amount:</strong> {{total_amount}}</p>
            <p><strong>Booking Reference:</strong> {{booking_reference}}</p>
        </div>
        
        <p><strong>Special Instructions:</strong> {{special_instructions}}</p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p>We look forward to seeing you at your appointment.</p>
            <p>If you need to reschedule or have any questions, please contact us.</p>
        </div>
        
        <div style="text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px;">
            <p>© {{year}} KH Therapy. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
```

#### Payment Receipt Template
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Payment Receipt - KH Therapy</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb;">KH Therapy</h1>
            <h2 style="color: #059669;">Payment Receipt</h2>
        </div>
        
        <p>Dear {{to_name}},</p>
        
        <p>Thank you for your payment. Here are your transaction details:</p>
        
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Payment Details</h3>
            <p><strong>Transaction ID:</strong> {{transaction_id}}</p>
            <p><strong>Amount Paid:</strong> {{payment_amount}}</p>
            <p><strong>Payment Date:</strong> {{payment_date}}</p>
            <p><strong>Service:</strong> {{service_description}}</p>
            <p><strong>Booking Reference:</strong> {{booking_reference}}</p>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p>Please keep this receipt for your records.</p>
            <p>If you have any questions about this payment, please contact us.</p>
        </div>
        
        <div style="text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px;">
            <p>© {{year}} KH Therapy. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
```

## Testing Configuration

### 1. Test Environment Variables
Create a `.env.test` file with test values:
```bash
REACT_APP_SUMUP_ENVIRONMENT=sandbox
REACT_APP_SUMUP_APP_ID=test_app_id
REACT_APP_SUMUP_MERCHANT_CODE=test_merchant
REACT_APP_EMAILJS_SERVICE_ID=test_service
REACT_APP_EMAILJS_PUBLIC_KEY=test_key
```

### 2. Running Tests
```bash
npm test                    # Run all tests
npm run test:coverage      # Run tests with coverage
npm run test:integration   # Run integration tests
```

## Security Considerations

### 1. Environment Variables
- Never commit `.env` files to version control
- Use different keys for development, staging, and production
- Regularly rotate API keys and secrets

### 2. Payment Security
- Always use HTTPS in production
- Validate payment amounts on the server side
- Implement proper error handling for payment failures
- Store minimal payment information locally

### 3. Email Security
- Validate email addresses before sending
- Implement rate limiting for email sending
- Use email templates to prevent injection attacks
- Monitor email delivery rates and bounce rates

## Deployment

### 1. Netlify Deployment
The site is configured for Netlify deployment with:
- Build command: `npm run build`
- Publish directory: `dist`
- Environment variables configured in Netlify dashboard

### 2. Environment Variables in Production
Set all required environment variables in your hosting platform's dashboard:
- Netlify: Site Settings > Environment Variables
- Vercel: Project Settings > Environment Variables
- Other platforms: Refer to their documentation

## Troubleshooting

### Common Issues
1. **Payment failures**: Check SumUp credentials and environment setting
2. **Email not sending**: Verify EmailJS configuration and template IDs
3. **Database connection**: Ensure Supabase URL and key are correct
4. **Build failures**: Check for missing environment variables

### Debug Mode
Enable debug logging by setting:
```bash
REACT_APP_DEBUG=true
```

## Support

For technical support or configuration assistance, please:
1. Check the error logs in browser developer tools
2. Verify all environment variables are set correctly
3. Test with sandbox/development settings first
4. Contact the development team with specific error messages
