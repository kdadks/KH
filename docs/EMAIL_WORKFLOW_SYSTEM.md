# KH Therapy Booking Email Automation Workflow

## Overview

This document describes the complete email automation workflow implementation for the KH Therapy booking system. The system follows the specified requirements and ensures that appropriate emails are sent at each stage of the booking and payment process.

## Email Templates Implemented

### ✅ 1. Booking Request Received (`booking_captured`)
**Trigger:** User submits booking request  
**Subject:** "📋 Booking Received!"  
**Template:** `booking_captured`  
**Features:**
- Confirms request receipt
- Mentions confirmation to follow
- Includes first login steps and account details
- Shows appointment details and next steps

### ✅ 2. Deposit Payment Received (`deposit_payment_received`)
**Trigger:** User pays 20% deposit  
**Subject:** "Deposit Payment Received"  
**Template:** `deposit_payment_received` (NEW)  
**Features:**
- Confirms deposit payment
- Shows remaining balance
- Provides appointment preparation instructions
- Includes transaction details

### ✅ 3. Full Payment Received (`payment_receipt`)
**Trigger:** User pays complete amount  
**Subject:** "Payment Receipt"  
**Template:** `payment_receipt`  
**Features:**
- Payment confirmation
- Transaction receipt details
- Tax and insurance documentation note

### ✅ 4. Payment Request (`payment_request`)
**Trigger:** System auto-creates payment request OR admin creates manual request  
**Subject:** "Complete your booking payment"  
**Template:** `payment_request`  
**Features:**
- Secure payment link
- Payment options (deposit/full)
- Due date information
- Professional branding

### ✅ 5. Booking Confirmation (`admin_booking_confirmation`)
**Trigger:** Admin confirms booking  
**Subject:** "Booking Confirmed: [Customer Name] - [Service]"  
**Template:** `admin_booking_confirmation`  
**Features:**
- Sends to BOTH customer and admin
- Attached .ics calendar file
- Professional appointment details
- 15-minute reminder notification

### ✅ 6. Admin Notifications (`admin_notification`)
**Trigger:** New booking request  
**Subject:** "🔔 Admin Alert: New Booking - [Customer Name]"  
**Template:** `admin_notification`  
**Features:**
- Sent to info@khtherapy.ie
- Short, factual booking details
- Customer contact information
- Booking ID and reference

### ✅ 7. Booking Cancellation (`booking_cancelled`)
**Trigger:** Admin cancels booking in admin panel  
**Subject:** "Booking Cancellation - [Service Name]"  
**Template:** `booking_cancelled` (NEW)  
**Features:**
- Professional apology for cancellation
- Cancellation reason and explanation
- Automatic payment request cancellation
- Refund information when applicable
- Rescheduling guidance and contact information
- Integrates with admin booking management interface

### ✅ 8. Booking Rescheduled (`booking_rescheduled`)
**Trigger:** Admin or customer reschedules booking  
**Subject:** "Booking Rescheduled - [Service Name]"  
**Template:** `booking_rescheduled` (NEW)  
**Features:**
- Shows old vs new appointment details clearly
- Includes rescheduling reason and additional notes
- Professional styling with clear status indicators
- New calendar file attachment for updated appointment
- Preparation reminders and contact information
- Supports both admin-initiated and customer-initiated reschedules

## Email Workflow Logic

### 1. Booking Creation Workflow
```
User submits booking request
    ↓
Send "Booking Request Received" email to customer
    ↓
Send "Admin Notification" email to info@khtherapy.ie
    ↓
IF payment required:
    Create payment request
    ↓
    Send "Payment Request" email to customer
```

### 2. Payment Processing Workflow
```
Customer makes payment
    ↓
IF deposit payment (< 30% of service cost):
    Send "Deposit Payment Received" email
    ↓
    Update booking status to "deposit_paid"
    
IF full payment (≥ 30% of service cost):
    Send "Full Payment Received" email
    ↓
    Update booking status to "confirmed"
```

### 3. Admin Confirmation Workflow
```
Admin confirms booking in admin panel
    ↓
Send "Booking Confirmation" email to customer (with .ics file)
    ↓
Send "Booking Confirmation" email to admin (with .ics file)
    ↓
Update booking status to "confirmed"
```

### 4. Booking Cancellation Workflow
```
Admin cancels booking in admin panel
    ↓
Check for active payment requests
    ↓
IF payment request exists:
    Update payment_requests.is_cancelled = true
    ↓
Send "Booking Cancellation" email to customer
    ↓
Include refund information if payment was made
    ↓
Update booking status to "cancelled"
    ↓
Restore availability slot for rebooking
```

### 5. Booking Rescheduling Workflow
```
Admin or customer initiates reschedule
    ↓
Store old appointment details (date & time)
    ↓
Update booking with new appointment details
    ↓
Send "Booking Rescheduled" email to customer
    ↓
Include old vs new appointment comparison
    ↓
Attach new calendar file (.ics) for updated appointment
    ↓
IF admin-initiated:
    Send copy to admin email
    ↓
Update booking status and refresh availability
```

## Technical Implementation

### Files Created/Modified

#### 1. **NEW:** `src/utils/bookingEmailWorkflow.ts`
- Centralized email workflow orchestrator
- All email trigger functions including rescheduling
- Payment type determination logic
- Data validation functions

#### 2. **NEW:** `src/utils/emailWorkflowIntegration.ts`
- Integration functions for payment processing
- Integration functions for booking creation
- Integration functions for admin confirmation
- Integration functions for booking cancellation
- Integration functions for booking rescheduling
- Payment request status management
- Test utilities

#### 3. **MODIFIED:** `netlify/functions/send-email.cjs`
- Added `deposit_payment_received` template
- Added `booking_cancelled` template
- Added `booking_rescheduled` template
- Enhanced calendar file generation
- Professional email styling

#### 4. **MODIFIED:** `src/utils/emailSMTP.ts`
- Added `sendDepositPaymentEmail` function
- Added `sendBookingCancellationEmail` function
- Added `sendBookingRescheduledEmail` function
- Enhanced payment email handling

#### 5. **MODIFIED:** `src/utils/emailUtils.ts`
- Added wrapper functions for new templates
- Added `sendBookingRescheduledEmail` wrapper
- Integration with SMTP service

#### 6. **MODIFIED:** `src/components/admin/Bookings.tsx`
- Enhanced `handleCancelBooking` function
- Enhanced `handleRescheduleComplete` function
- Added `handleAdminReschedule` function
- Integrated email workflow for cancellations and rescheduling
- Customer notification system

#### 7. **NEW:** `src/utils/testBookingCancellation.ts`
- Comprehensive test suite for cancellation workflow
- Email template validation
- Integration testing functions

### Key Functions

#### Email Workflow Orchestrator
```typescript
processBookingEmailWorkflow(
  trigger: 'booking_created' | 'deposit_paid' | 'full_paid' | 'payment_requested' | 'admin_confirmed' | 'booking_cancelled' | 'booking_rescheduled',
  bookingData: BookingEmailData,
  paymentData?: PaymentEmailData,
  adminEmail?: string,
  cancellationOptions?: CancellationEmailOptions,
  reschedulingOptions?: ReschedulingEmailData
): Promise<{ success: boolean; results: any; errors: string[] }>
```

#### Integration Functions
```typescript
// For payment processing
integratePaymentEmailWorkflow(paymentRequestId, paymentData, totalServiceCost)

// For booking creation  
integrateBookingCreationEmailWorkflow(bookingId, customerId, paymentRequestId?)

// For admin confirmation
integrateAdminConfirmationEmailWorkflow(bookingId, adminEmail?)

// For booking cancellation
integrateBookingCancellationWorkflow(bookingId, cancellationReason, refundInfo?)

// For booking rescheduling
integrateBookingReschedulingWorkflow(bookingId, newDate, newTime, reschedulingOptions?)
```

### Calendar File (.ics) Implementation

The system automatically generates and attaches calendar files to booking confirmation emails:

**Features:**
- Standard ICS format compatible with all major calendar applications
- 1-hour appointment duration (configurable)
- Automatic 15-minute reminder notification
- Proper timezone handling
- Appointment details and location

**Generated For:**
- Customer booking confirmations
- Admin booking confirmations
- Both receive identical calendar files

## Email Dynamic Placeholders

All email templates support dynamic placeholders:

### Customer Data
- `{customer_name}` - Full customer name
- `{customer_email}` - Customer email address

### Booking Data
- `{service_name}` - Type of therapy session
- `{appointment_date}` - Formatted appointment date
- `{appointment_time}` - Appointment time
- `{booking_reference}` - Unique booking identifier (KH-[ID])
- `{therapist_name}` - Assigned therapist (default: "KH Therapy Team")
- `{clinic_address}` - Clinic location
- `{special_instructions}` - Custom booking notes

### Payment Data
- `{payment_amount}` - Amount paid or requested
- `{remaining_balance}` - Balance remaining after deposit
- `{transaction_id}` - Payment transaction reference
- `{payment_url}` - Secure payment link

### Cancellation Data
- `{cancellation_reason}` - Reason for booking cancellation
- `{has_payment_request}` - Whether there was an associated payment request
- `{refund_info}` - Information about refund processing (if applicable)

### Rescheduling Data
- `{old_appointment_date}` - Original appointment date
- `{old_appointment_time}` - Original appointment time
- `{reschedule_reason}` - Reason for rescheduling
- `{reschedule_note}` - Additional notes about the reschedule
- `{rescheduled_by}` - Who initiated the reschedule (admin/customer)
- `{due_date}` - Payment due date

## Configuration

### Environment Variables
```env
VITE_ADMIN_EMAIL=info@khtherapy.ie
VITE_SITE_URL=https://khtherapy.netlify.app
```

### Default Settings
- Admin email: `info@khtherapy.ie`
- Payment due date: 7 days from request
- Calendar reminder: 15 minutes before appointment
- Appointment duration: 1 hour
- Deposit threshold: 30% of service cost

## Usage Examples

### Triggering Booking Request Email
```typescript
import { processBookingEmailWorkflow } from './utils/bookingEmailWorkflow';

const bookingData = {
  customer_name: 'John Doe',
  customer_email: 'john@example.com',
  service_name: 'Physiotherapy Session',
  appointment_date: '2024-01-15',
  appointment_time: '10:00',
  booking_reference: 'KH-123'
};

const result = await processBookingEmailWorkflow('booking_created', bookingData);
```

### Triggering Payment Confirmation Email
```typescript
import { integratePaymentEmailWorkflow } from './utils/emailWorkflowIntegration';

const result = await integratePaymentEmailWorkflow(
  paymentRequestId: 456,
  paymentData: {
    amount: 30,
    transactionId: 'TXN-789',
    customerId: 123,
    bookingId: '456'
  },
  totalServiceCost: 150
);
```

### Triggering Admin Confirmation Email
```typescript
import { integrateAdminConfirmationEmailWorkflow } from './utils/emailWorkflowIntegration';

const result = await integrateAdminConfirmationEmailWorkflow(
  bookingId: 123,
  adminEmail: 'admin@khtherapy.ie'
);
```

## Error Handling

The email workflow system includes comprehensive error handling:

### Validation
- Email format validation
- Required field validation
- Payment amount validation
- Date format validation

### Fallbacks
- Default values for missing data
- Graceful degradation for failed emails
- Detailed error logging
- Retry mechanisms for critical emails

### Monitoring
- Success/failure tracking for each email type
- Detailed error messages
- Integration with existing logging system

## GDPR Compliance

All email processing follows GDPR requirements:

- Customer name decryption where needed
- Secure data handling
- Minimal data collection

## Testing and Validation

### Test Suite
The system includes a comprehensive test suite in `src/utils/testBookingCancellation.ts`:

**Test Functions:**
- `testBookingCancellationEmail()` - Tests email template rendering
- `testCompleteCancellationWorkflow()` - Tests complete integration workflow
- `validateCancellationEmailTemplate()` - Validates template structure
- `runAllCancellationTests()` - Runs full test suite

**Running Tests:**
```typescript
// Import the test suite
import { runCancellationTestsInConsole } from './src/utils/testBookingCancellation';

// Run in browser console or Node.js environment
runCancellationTestsInConsole();
```

### Validation Features
- Email template structure validation
- Required placeholder verification
- Payment request status checking
- Database integration testing
- Error handling validation

## Admin Usage Guide

### Booking Cancellation Workflow

**When to Use:**
- Customer requests cancellation
- Schedule conflicts arise
- Service unavailable
- Emergency situations

**Steps:**
1. Navigate to Admin > Bookings
2. Find the booking to cancel
3. Click "Cancel" button
4. Provide cancellation reason
5. Add refund information if applicable
6. Confirm cancellation

**Automatic Actions:**
- Customer receives cancellation email
- Payment requests are marked as cancelled
- Availability slots are restored
- Booking status updated to "cancelled"

### Booking Rescheduling Workflow

**When to Use:**
- Customer requests different time/date
- Therapist availability changes
- Schedule optimization
- Avoiding conflicts

**Steps:**
1. Navigate to Admin > Bookings
2. Find the booking to reschedule
3. Click "Reschedule" button
4. Select new date and time
5. Provide rescheduling reason (optional)
6. Add additional notes if needed
7. Confirm rescheduling

**Automatic Actions:**
- Customer receives rescheduling email with old vs new details
- New calendar invite attached to email
- Booking updated with new appointment details
- Old and new appointment times clearly displayed
- Admin receives copy if admin-initiated

**Email Features:**
- Professional comparison of old vs new appointments
- Cancellation of old appointment details
- Confirmation of new appointment details
- Rescheduling reason and additional notes
- Updated calendar file attachment
- Contact information for further changes

### Email Monitoring

**Success Indicators:**
- Email delivery confirmations
- Customer acknowledgments
- Payment status updates
- No error logs

**Troubleshooting:**
- Check email templates in `netlify/functions/send-email.cjs`
- Verify SMTP configuration in environment variables
- Review error logs in browser console
- Test with validation functions

### Best Practices

**For Cancellations:**
- Always provide clear cancellation reason
- Include specific refund timeline information
- Offer rescheduling assistance
- Follow up with personal call if needed

**For Email Management:**
- Monitor delivery rates
- Keep templates up to date
- Test new features thoroughly
- Maintain professional tone

## System Maintenance

### Regular Checks
- Email delivery rates
- Template functionality
- Payment integration status
- Customer feedback

### Updates Required
- Template content updates
- New email types
- Integration enhancements
- Performance optimizations

### Backup Procedures
- Email template backups
- Configuration backups
- Test data maintenance
- Documentation updates
- Clear unsubscribe options (where applicable)
- Data retention policies

## Testing

### Manual Testing
Use the test function to validate the workflow:
```typescript
import { testEmailWorkflowIntegration } from './utils/emailWorkflowIntegration';

const testResult = await testEmailWorkflowIntegration();
console.log('Test results:', testResult);
```

### Integration Testing
- Test with actual booking creation
- Test with real payment processing
- Test admin confirmation flow
- Verify calendar file generation

## Future Enhancements

### Potential Improvements
- SMS notifications integration
- Multiple reminder times (24 hours, 1 hour, 15 minutes)
- Custom appointment duration based on service type
- Timezone handling for international customers
- Email templates for different service types
- Automatic rescheduling calendar updates
- Email analytics and tracking

### Template Customization
- Service-specific email templates
- Seasonal/promotional email variations
- Multi-language support
- Custom branding per service type

## Support and Maintenance

### Regular Maintenance Tasks
- Monitor email delivery success rates
- Update email templates as needed
- Review and update placeholder data
- Verify calendar file compatibility
- Update SMTP configuration as needed

### Troubleshooting Common Issues
- Email delivery failures → Check SMTP configuration
- Invalid calendar files → Verify date/time format
- Missing placeholders → Check data validation
- Template rendering issues → Review email client compatibility

For technical support or questions about this email workflow system, contact the development team.