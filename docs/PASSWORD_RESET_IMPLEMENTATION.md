# Password Reset Implementation

This document describes the password reset functionality implemented for the KH Therapy user portal.

## Overview

The password reset functionality allows users to securely reset their passwords through email verification. The implementation includes:

1. **Database Schema**: Password reset token storage with expiration
2. **Security Features**: Token-based reset with time expiration and email verification
3. **User Interface**: Forgot password form, email verification, and password reset form
4. **Email Integration**: Automated email sending using EmailJS

## Database Changes

### New Columns Added to `customers` Table

```sql
-- Password reset token (unique, random generated)
password_reset_token VARCHAR(255)

-- Token expiration timestamp (1 hour from generation)
password_reset_expires_at TIMESTAMP WITH TIME ZONE

-- Track when reset was requested
password_reset_requested_at TIMESTAMP WITH TIME ZONE
```

### Database Functions

- `generate_password_reset_token(email)`: Generates and stores reset token
- `validate_password_reset_token(token)`: Validates token and returns customer info
- `reset_password_with_token(token, password)`: Resets password using valid token
- `clean_expired_password_reset_tokens()`: Cleanup utility for expired tokens

## Security Features

### Token Generation
- Uses cryptographically secure random tokens (32 bytes, hex encoded)
- Tokens are stored hashed in the database
- Each token is unique and single-use

### Expiration
- Tokens expire after 1 hour
- Expired tokens are automatically cleaned up
- Token validation includes expiration check

### Email Verification
- Reset links are only sent to verified email addresses
- No information disclosure if email doesn't exist (prevents enumeration)
- Reset links contain secure tokens as URL parameters

### Password Requirements
- Minimum 8 characters length
- Password confirmation required
- Passwords are hashed using bcrypt before storage

## User Flow

### 1. Request Password Reset
1. User clicks "Forgot Password" on login page
2. User enters their email address
3. System generates secure token and sends email
4. User receives email with reset link

### 2. Reset Password
1. User clicks reset link in email
2. System validates token (checks existence and expiration)
3. User enters new password (with confirmation)
4. System updates password and clears reset token
5. User is redirected to login page

### 3. Error Handling
- Invalid or expired tokens show appropriate error messages
- Failed email sending cleans up generated tokens
- Network errors are handled gracefully
- All errors are logged for debugging

## Components

### ForgotPassword Component
- `/src/components/user/ForgotPassword.tsx`
- Form for requesting password reset
- Shows success state after email is sent
- Handles errors and loading states

### ResetPassword Component
- `/src/components/user/ResetPassword.tsx`
- Accessible via `/reset-password?token=...` URL
- Validates token on component mount
- Password reset form with confirmation
- Success state with auto-redirect

### Updated UserLogin Component
- Added "Forgot Password" link
- Shows ForgotPassword component when clicked
- Maintains existing login functionality

## API Functions

### UserAuthContext Updates
```typescript
// New methods added to UserAuthContext
requestPasswordReset(email: string): Promise<{success: boolean, error?: string}>
validateResetToken(token: string): Promise<{success: boolean, error?: string, customerEmail?: string}>
resetPassword(data: PasswordResetData): Promise<{success: boolean, error?: string}>
```

### Utility Functions
- `passwordResetUtils.ts`: Core password reset logic
- `emailUtils.ts`: Updated with password reset email template
- `userManagement.ts`: Updated type definitions

## Email Integration

### Email Template
- Uses existing EmailJS booking confirmation template
- Customized content for password reset context
- Includes reset link, expiration time, and company branding

### Email Content
- Subject: Password reset request
- Reset link with token parameter
- Expiration notice (1 hour)
- Support contact information

## Routes

### New Routes Added
```typescript
// Added to App.tsx
<Route path="/reset-password" element={<ResetPassword />} />
```

### URL Structure
- Reset link: `https://domain.com/reset-password?token=<secure_token>`
- Token is validated on page load
- Invalid tokens show error page with navigation options

## Testing

### Manual Testing Steps
1. **Request Reset**: Enter email on forgot password form
2. **Check Email**: Verify reset email is sent and received
3. **Click Link**: Test reset link opens correct page
4. **Validate Token**: Confirm token validation works
5. **Reset Password**: Test password reset form
6. **Login**: Verify new password works for login

### Edge Cases Tested
- Invalid email addresses
- Expired tokens
- Malformed tokens
- Network failures
- Email sending failures

## Maintenance

### Token Cleanup
- Expired tokens are cleaned up automatically during validation
- Manual cleanup can be run using `clean_expired_password_reset_tokens()` function
- Consider setting up periodic cleanup job

### Monitoring
- Password reset requests are logged
- Email sending failures are logged
- Token validation failures are logged

## Security Considerations

### Protection Against Attacks
- **Rate Limiting**: Consider implementing rate limiting for reset requests
- **Email Enumeration**: System doesn't reveal if email exists
- **Token Brute Force**: Tokens are long and random (low probability of guessing)
- **CSRF Protection**: Tokens are validated server-side

### Privacy
- Reset tokens are not stored in browser storage
- Tokens are transmitted only via secure email and HTTPS URLs
- User email addresses are handled securely

## Future Enhancements

### Potential Improvements
1. **Rate Limiting**: Limit reset requests per email/IP
2. **SMS Reset**: Alternative reset method via SMS
3. **Security Questions**: Additional verification step
4. **Password Strength**: Enhanced password requirements
5. **Audit Trail**: Log all password reset activities
6. **Admin Interface**: View/manage reset requests

### Configuration Options
- Token expiration time (currently 1 hour)
- Password complexity requirements
- Email template customization
- Rate limiting parameters

## Deployment Notes

### Environment Variables
Ensure EmailJS configuration is set:
- `VITE_EMAILJS_SERVICE_ID`
- `VITE_EMAILJS_PUBLIC_KEY`
- `VITE_EMAILJS_TEMPLATE_BOOKING_CONFIRMATION`

### Database Migration
Run the password reset database migration:
```sql
-- Execute: /database/add-password-reset-support.sql
```

### Production Checklist
- [ ] Database migration executed
- [ ] EmailJS templates configured
- [ ] HTTPS enabled for reset links
- [ ] Email deliverability tested
- [ ] Error monitoring configured
- [ ] Token cleanup schedule configured

## Support

### Troubleshooting
- **Emails not sending**: Check EmailJS configuration and quotas
- **Invalid tokens**: Verify database migration was successful
- **Expired tokens**: Check system clock and token expiration logic
- **UI issues**: Verify React router configuration

### Common Issues
1. **Reset emails in spam**: Configure SPF/DKIM for better deliverability
2. **Token expiration**: Consider increasing expiration time if needed
3. **Email delays**: Monitor EmailJS service status
4. **Database errors**: Check Supabase connection and permissions
