# Email Delivery Troubleshooting Guide

## Current Issue: Admin Emails Not Reaching Inbox

### Problem Description
- Customer emails are being delivered successfully
- Admin notification emails (info@khtherapy.ie) show 200 success but don't reach inbox
- Email appears to be a same-domain delivery issue

### Root Causes Identified

1. **Same-Domain Email Filtering**
   - Emails from info@khtherapy.ie to info@khtherapy.ie may be filtered by email client
   - SMTP providers sometimes have restrictions on self-delivery

2. **Email Client Spam Filtering**
   - Automated emails might be caught by spam filters
   - Missing proper email authentication headers

3. **SMTP Provider Restrictions**
   - Hostinger might have limitations on same-domain delivery

### Solutions Implemented

#### 1. Enhanced Email Headers
```javascript
'Message-ID': '<unique-id@khtherapy.ie>',
'Return-Path': 'info@khtherapy.ie',
'X-Auto-Response-Suppress': 'OOF, AutoReply',
'List-Unsubscribe': '<mailto:noreply@khtherapy.ie?subject=unsubscribe>',
'Precedence': 'special-delivery'
```

#### 2. Alternative Sender Address
- Changed admin notification sender from `info@khtherapy.ie` to `noreply@khtherapy.ie`
- Added `Sender` header pointing back to main address
- Maintains deliverability while avoiding same-domain issues

#### 3. BCC Backup Delivery (Optional)
Set environment variable:
```bash
ADMIN_BCC_EMAIL=backup-admin@example.com
```

### Testing Steps

1. **Check Email Headers**
   - Look for delivery confirmations in SMTP logs
   - Verify Message-ID is being generated correctly

2. **Test Alternative Addresses**
   - Try sending admin notifications to different email addresses
   - Test with Gmail, Outlook, other providers

3. **Verify Spam Folders**
   - Check spam/junk folders in email client
   - Look for blocked sender notifications

4. **SMTP Authentication**
   - Ensure SMTP credentials are correct
   - Verify SSL/TLS settings

### Environment Variables Needed

```bash
# Required
SMTP_USER=info@khtherapy.ie
SMTP_PASS=your_email_password

# Optional - Alternative admin email for BCC
ADMIN_BCC_EMAIL=backup-admin@gmail.com

# Optional - Alternative admin notification address
ADMIN_ALT_EMAIL=admin-notifications@khtherapy.ie
```

### Next Steps if Issue Persists

1. **Contact Hostinger Support**
   - Ask about same-domain email delivery restrictions
   - Request SMTP delivery logs

2. **Email Authentication Setup**
   - Implement SPF, DKIM, DMARC records
   - Verify domain email authentication

3. **Alternative Email Provider**
   - Consider using SendGrid, Mailgun, or AWS SES
   - Dedicated transactional email service

4. **Email Client Configuration**
   - Check if info@khtherapy.ie email client has auto-filtering rules
   - Verify inbox settings and blocked sender lists

### Quick Test Commands

```bash
# Test email delivery manually
curl -X POST your-netlify-function-url \
  -H "Content-Type: application/json" \
  -d '{"type":"test","to":"your-test-email@gmail.com"}'
```

### Monitoring & Logging

Current logs show:
- ✅ Message-ID generation
- ✅ SMTP connection success  
- ✅ Email acceptance by server
- ❌ Inbox delivery confirmation missing

### Contact Information

If delivery issues persist, escalate to:
- Hostinger SMTP Support
- Domain registrar for DNS/email routing
- IT administrator for email client configuration
