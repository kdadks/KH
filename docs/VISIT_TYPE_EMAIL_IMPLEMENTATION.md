-- =====================================================
-- IMPLEMENTATION: Add Visit Type to All Customer Emails
-- =====================================================

-- OVERVIEW
-- The booking system now supports three visit types:
-- 1. 🏥 Clinic Visit (in-person at clinic)
-- 2. 🏠 Home Visit (therapist travels to customer)
-- 3. 💻 Online (virtual appointment)
--
-- Visit type is stored in: bookings.visit_type
-- This needs to be included in:
--   1. Booking confirmation emails
--   2. Payment request emails
--   3. Booking rescheduled emails
--   4. Booking reminder emails
--   5. Payment receipt emails
--   6. Admin notifications

-- FILES TO UPDATE
-- ===============

-- 1. DATABASE: Add visit_type to email data interfaces
--    File: src/utils/emailUtils.ts
--    Change: Add visit_type to BookingConfirmationData, BookingWithPaymentData, BookingReminderData
--
--    export interface BookingConfirmationData {
--      customer_name: string;
--      customer_email: string;
--      service_name: string;
--      appointment_date: string;
--      appointment_time: string;
--      total_amount: number;
--      booking_reference: string;
--      visit_type?: 'clinic' | 'home' | 'online';  // ADD THIS
--      therapist_name?: string;
--      clinic_address?: string;
--      special_instructions?: string;
--    }

-- 2. EMAIL WORKFLOW: Pass visit_type through email workflow
--    File: src/utils/bookingEmailWorkflow.ts
--    Change: Add visit_type to BookingEmailData interface and all email functions
--
--    export interface BookingEmailData {
--      customer_name: string;
--      customer_email: string;
--      service_name: string;
--      appointment_date: string;
--      appointment_time: string;
--      booking_reference: string;
--      visit_type?: 'clinic' | 'home' | 'online';  // ADD THIS
--      booking_id?: string;
--      ...
--    }

-- 3. EMAIL SERVICE: Update SMTP service to handle visit_type
--    File: src/utils/emailSMTP.ts
--    Change: Add visit_type parameter to all sendBooking* functions
--
--    export const sendBookingWithPaymentEmail = async (
--      customerEmail: string,
--      bookingData: BookingConfirmationData & {
--        visit_type?: 'clinic' | 'home' | 'online';  // ADD THIS
--        ...
--      }
--    )

-- 4. BOOKING CREATION: Extract and pass visit_type
--    File: src/utils/customerBookingUtils.ts
--    Change: Include visit_type when creating email data
--
--    const emailData = {
--      customer_name,
--      customer_email,
--      service_name,
--      appointment_date,
--      appointment_time,
--      booking_reference,
--      visit_type: bookingData.visit_type,  // ADD THIS
--      ...
--    }

-- 5. BOOKING PAGE: Include visit_type in email workflow
--    File: src/pages/BookingPage.tsx
--    Change: Pass visitType to email function
--
--    const emailWorkflowData = {
--      ...bookingData,
--      visit_type: visitType,  // ADD THIS
--    }

-- 6. EMAIL TEMPLATES: Display visit type in HTML emails
--    File: netlify/functions/send-email.cjs
--    Change: Add visit type display in email templates
--
--    TEMPLATES TO UPDATE:
--      - booking_confirmation
--      - booking_captured
--      - booking_rescheduled
--      - payment_request
--      - payment_receipt
--      - booking_reminder
--      - admin_booking_confirmation
--
--    EXAMPLE HTML TO ADD:
--    <p><strong>Visit Type:</strong> 
--      ${data.visit_type === 'clinic' ? '🏥 Clinic Visit' :
--        data.visit_type === 'home' ? '🏠 Home Visit' : 
--        '💻 Online'}
--    </p>

-- 7. ICS CALENDAR: Include visit type in event description
--    File: netlify/functions/send-email.cjs (generateICS function)
--    Change: Add visit type to DESCRIPTION field
--
--    const visitTypeLabel = 
--      data.visit_type === 'clinic' ? '🏥 Clinic' :
--      data.visit_type === 'home' ? '🏠 Home' :
--      '💻 Online';
--    
--    `DESCRIPTION:${visitTypeLabel} - ${description}`,

-- 8. RESCHEDULING: Pass visit_type in rescheduling emails
--    File: src/utils/reschedulingEmailNotifications.ts
--    Change: Include visit_type in rescheduling email data

-- 9. PAYMENT REQUEST: Include visit type
--    File: src/utils/paymentRequestUtils.ts
--    Change: Pass visit_type to payment request emails

-- 10. EMAIL INTEGRATION: Update integration layer
--     File: src/utils/emailWorkflowIntegration.ts
--     Change: Ensure visit_type flows through all integration points

-- FIELDS AFFECTED IN EMAIL DATA
-- =============================
-- Database booking record:  bookings.visit_type
-- Customer sees in email:   "Visit Type: 🏥 Clinic / 🏠 Home / 💻 Online"
-- Admin sees in email:      Same as customer
-- Calendar event:           Included in description
--
-- VISIT TYPE DISPLAY FORMAT
-- =========================
-- Clinic:  🏥 Clinic Visit (at KH Therapy Clinic)
-- Home:    🏠 Home Visit (we'll visit your location)
-- Online:  💻 Online Session (video call)

-- VALIDATION IN FORMS
-- ===================
-- Already implemented in BookingPage.tsx (visitType state)
-- Already stored in database (bookings.visit_type)
-- Just needs to be passed to email functions

print('✅ IMPLEMENTATION GUIDE: Visit Type in Emails');
print('See comments above for 10 files to update');
print('Email templates will show: 🏥 Clinic / 🏠 Home / 💻 Online');
