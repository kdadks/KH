# Auto User Account Creation with Default Password Feature

## Overview

This feature automatically creates user accounts when customers submit bookings through the frontend, with default passwords matching their email addresses. Users are required to change their password on first login.

## How It Works

### 1. Booking Submission
- When a customer submits a booking through any frontend form (BookingPage, BookingForm, Admin Console)
- The system calls `createBookingWithCustomer()` which uses `findOrCreateCustomer()`
- If the customer doesn't exist, a new customer record is created with:
  - **Default Password**: Same as their email address (lowercase)
  - **Must Change Password**: Set to `true`
  - **First Login**: Set to `true`

### 2. User Login
- Customer can log in using their email address and email as password
- Upon successful login, the system checks if `password === email`
- If true, the `must_change_password` flag is automatically set to `true`

### 3. Password Change Modal
- The `UserPortal` component automatically shows `FirstLoginPasswordChange` modal when `user.must_change_password === true`
- Modal appears every time the user logs in until they change their password
- Once password is changed successfully:
  - `must_change_password` is set to `false`
  - User can access the full portal functionality

## Implementation Details

### Modified Files

#### `src/utils/customerBookingUtils.ts`
- **Updated `Customer` interface**: Added `password`, `must_change_password`, `first_login` fields
- **Modified `findOrCreateCustomer()`**: Sets default password when creating new customers

#### `src/contexts/UserAuthContext.tsx`
- **Enhanced login logic**: Checks if password equals email and sets `must_change_password` flag
- **Password change handling**: Updates database and local state when password is changed

#### `src/components/UserPortal.tsx`
- **Password change detection**: Shows `FirstLoginPasswordChange` modal when needed
- **Automatic redirect**: Forces password change before allowing portal access

### Database Schema Requirements

The `customers` table should have these columns:
```sql
password VARCHAR -- Stores the user password
must_change_password BOOLEAN DEFAULT FALSE -- Force password change flag
first_login BOOLEAN DEFAULT TRUE -- Track first login status
```

### Security Considerations

1. **Default Password Security**: Default passwords are temporary and must be changed immediately
2. **Password Validation**: The password change form enforces strong password requirements
3. **Persistent Modal**: Users cannot bypass password change - modal appears on every login
4. **Database Updates**: All password changes are tracked and flags are properly updated

## Usage for Existing Customers

For customers who already exist without passwords, use the utility script:

```bash
node update-existing-customers-passwords.js
```

**Note**: Update the Supabase credentials in the script before running.

## User Experience Flow

1. **Customer Books Appointment** → Account automatically created with email as password
2. **Customer Receives Notification** → (Future enhancement: Email with login instructions)
3. **Customer Logs In** → Uses email as both username and password
4. **Password Change Modal** → Required before accessing any portal features
5. **New Password Set** → Full access to user portal (dashboard, invoices, bookings, etc.)

## Testing the Feature

1. Submit a new booking with a new customer email
2. Check the customers table - new record should have:
   - `password` = email address
   - `must_change_password` = true
   - `first_login` = true
3. Try logging in with email/email combination
4. Verify that password change modal appears
5. Change password and confirm `must_change_password` becomes false

## Future Enhancements

1. **Welcome Email**: Send email with login instructions when account is created
2. **Password Strength**: Implement server-side password hashing
3. **Password Reset**: Add forgot password functionality
4. **Account Notifications**: Notify customers when their account is created
