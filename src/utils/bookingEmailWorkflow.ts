/**
 * Booking Email Automation Workflow
 * 
 * This module handles all email automation for the booking process according to the requirements:
 * 1. Booking Request Received
 * 2. Deposit Payment Received
 * 3. Full Payment Received  
 * 4. Payment Request
 * 5. Booking Confirmation (with calendar file)
 * 6. Admin Notifications
 */

import { 
  sendBookingCapturedEmail as smtpSendBookingCaptured,
  sendPaymentReceiptEmail as smtpSendPaymentReceipt,
  sendPaymentRequestEmail as smtpSendPaymentRequest,
  sendAdminBookingConfirmationEmail,
  sendAdminNotificationEmail
} from './emailSMTP';

import {
  sendDepositPaymentEmail as utilsSendDepositPayment,
  sendBookingCancellationEmail as utilsSendBookingCancellation,
  sendBookingRescheduledEmail as utilsSendBookingRescheduled
} from './emailUtils';

/**
 * Interface for booking data used across email workflows
 */
export interface BookingEmailData {
  customer_name: string;
  customer_email: string;
  service_name: string;
  appointment_date: string;
  appointment_time: string;
  booking_reference: string;
  visit_type?: 'clinic' | 'home' | 'online';
  booking_id?: string;
  customer_id?: number;
  therapist_name?: string;
  clinic_address?: string;
  special_instructions?: string;
  notes?: string;
  // For rescheduling
  old_appointment_date?: string;
  old_appointment_time?: string;
}

/**
 * Interface for payment data
 */
export interface PaymentEmailData {
  payment_amount: number;
  payment_type: 'deposit' | 'full';
  transaction_id?: string;
  remaining_balance?: number;
  payment_url?: string;
  due_date?: string;
}

/**
 * Interface for rescheduling data
 */
export interface ReschedulingEmailData {
  reschedule_reason?: string;
  reschedule_note?: string;
  rescheduled_by?: 'admin' | 'customer';
  is_admin_initiated?: boolean;
}

/**
 * 1. Booking Request Received Email
 * Triggered when user submits booking request
 */
export const sendBookingRequestReceived = async (
  bookingData: BookingEmailData
): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('📧 Sending Booking Request Received email to:', bookingData.customer_email);
    
    const result = await smtpSendBookingCaptured(bookingData.customer_email, {
      customer_name: bookingData.customer_name,
      service_name: bookingData.service_name,
      appointment_date: bookingData.appointment_date,
      appointment_time: bookingData.appointment_time,
      booking_reference: bookingData.booking_reference,
      clinic_address: bookingData.clinic_address || 'KH Therapy Clinic, Dublin, Ireland',
      special_instructions: bookingData.special_instructions || bookingData.notes,
      visit_type: bookingData.visit_type
    });

    return result;
  } catch (error) {
    console.error('❌ Error sending booking request received email:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

/**
 * 2. Deposit Payment Received Email
 * Triggered when user pays 20% deposit
 */
export const sendDepositPaymentReceived = async (
  bookingData: BookingEmailData,
  paymentData: PaymentEmailData
): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('📧 Sending Deposit Payment Received email to:', bookingData.customer_email);
    
    const result = await utilsSendDepositPayment(bookingData.customer_email, {
      customer_name: bookingData.customer_name,
      service_name: bookingData.service_name,
      appointment_date: bookingData.appointment_date,
      appointment_time: bookingData.appointment_time,
      booking_reference: bookingData.booking_reference,
      payment_amount: paymentData.payment_amount,
      remaining_balance: paymentData.remaining_balance,
      transaction_id: paymentData.transaction_id,
      therapist_name: bookingData.therapist_name || 'KH Therapy Team',
      clinic_address: bookingData.clinic_address || 'KH Therapy Clinic, Dublin, Ireland',
      special_instructions: bookingData.special_instructions || bookingData.notes
    });

    return { success: result };
  } catch (error) {
    console.error('❌ Error sending deposit payment received email:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

/**
 * 3. Full Payment Received Email
 * Triggered when user pays the complete amount
 */
export const sendFullPaymentReceived = async (
  bookingData: BookingEmailData,
  paymentData: PaymentEmailData
): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('📧 Sending Full Payment Received email to:', bookingData.customer_email);
    
    const result = await smtpSendPaymentReceipt(bookingData.customer_email, {
      customer_name: bookingData.customer_name,
      transaction_id: paymentData.transaction_id || 'PAYMENT-' + Date.now(),
      payment_amount: paymentData.payment_amount,
      payment_date: new Date().toLocaleDateString('en-IE'),
      service_name: bookingData.service_name
    });

    return { success: result };
  } catch (error) {
    console.error('❌ Error sending full payment received email:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

/**
 * 4. Payment Request Email
 * Triggered when admin creates payment request or system auto-creates deposit request
 */
export const sendPaymentRequestWorkflow = async (
  bookingData: BookingEmailData,
  paymentData: PaymentEmailData
): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('📧 Sending Payment Request email to:', bookingData.customer_email);
    
    const result = await smtpSendPaymentRequest(bookingData.customer_email, {
      customer_name: bookingData.customer_name,
      amount: paymentData.payment_amount,
      service_name: bookingData.service_name,
      due_date: paymentData.due_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IE'),
      payment_url: paymentData.payment_url,
      invoice_number: bookingData.booking_reference
    });

    return { success: result };
  } catch (error) {
    console.error('❌ Error sending payment request email:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

/**
 * 5. Booking Confirmation Email (with calendar file)
 * Triggered when admin confirms booking
 */
export const sendBookingConfirmationWithCalendar = async (
  bookingData: BookingEmailData,
  adminEmail?: string
): Promise<{ customerSuccess: boolean; adminSuccess: boolean }> => {
  try {
    console.log('📧 sendBookingConfirmationWithCalendar received:', {
      visit_type: bookingData.visit_type,
      clinic_address: bookingData.clinic_address
    });
    
    const result = await sendAdminBookingConfirmationEmail(
      bookingData.customer_email,
      {
        customer_name: bookingData.customer_name,
        service_name: bookingData.service_name,
        appointment_date: bookingData.appointment_date,
        appointment_time: bookingData.appointment_time,
        total_amount: 0, // Not used in confirmation template
        booking_reference: bookingData.booking_reference,
        therapist_name: bookingData.therapist_name || 'KH Therapy Team',
        clinic_address: bookingData.clinic_address || 'KH Therapy Clinic, Dublin, Ireland',
        special_instructions: bookingData.special_instructions || bookingData.notes,
        visit_type: bookingData.visit_type
      },
      adminEmail || 'info@khtherapy.ie'
    );

    return result;
  } catch (error) {
    return { customerSuccess: false, adminSuccess: false };
  }
};

/**
 * 6. Admin Notification Email
 * Triggered when new booking is created
 */
export const sendAdminBookingNotification = async (
  bookingData: BookingEmailData,
  adminEmail: string = 'info@khtherapy.ie'
): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('📧 Sending Admin Notification email to:', adminEmail);
    
    const result = await sendAdminNotificationEmail(adminEmail, {
      customer_name: `Admin Notification`,
      notification_type: 'new_booking',
      message: `New booking request received from ${bookingData.customer_name}`,
      details: {
        customer_name: bookingData.customer_name,
        customer_email: bookingData.customer_email,
        service_name: bookingData.service_name,
        appointment_date: bookingData.appointment_date,
        appointment_time: bookingData.appointment_time,
        booking_reference: bookingData.booking_reference,
        booking_id: bookingData.booking_id,
        special_instructions: bookingData.special_instructions || bookingData.notes
      }
    });

    return { success: result };
  } catch (error) {
    console.error('❌ Error sending admin notification email:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

/**
 * 7. Booking Cancellation Email
 * Triggered when admin cancels a booking
 */
export const sendBookingCancellationNotification = async (
  bookingData: BookingEmailData,
  cancellationData: {
    cancellation_reason?: string;
    has_payment_request?: boolean;
    refund_info?: string;
  } = {}
): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('📧 Sending Booking Cancellation email to:', bookingData.customer_email);
    
    const result = await utilsSendBookingCancellation(bookingData.customer_email, {
      customer_name: bookingData.customer_name,
      service_name: bookingData.service_name,
      appointment_date: bookingData.appointment_date,
      appointment_time: bookingData.appointment_time,
      booking_reference: bookingData.booking_reference,
      cancellation_reason: cancellationData.cancellation_reason,
      therapist_name: bookingData.therapist_name || 'KH Therapy Team',
      clinic_address: bookingData.clinic_address || 'KH Therapy Clinic, Dublin, Ireland',
      has_payment_request: cancellationData.has_payment_request,
      refund_info: cancellationData.refund_info
    });

    return { success: result };
  } catch (error) {
    console.error('❌ Error sending booking cancellation email:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

/**
 * 8. Booking Rescheduled Email
 * Triggered when admin or customer reschedules a booking
 */
export const sendBookingRescheduledNotification = async (
  bookingData: BookingEmailData,
  reschedulingData: ReschedulingEmailData = {}
): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('📧 Sending Booking Rescheduled email to:', bookingData.customer_email);
    
    const result = await utilsSendBookingRescheduled(
      bookingData.customer_email,
      {
        customer_name: bookingData.customer_name,
        service_name: bookingData.service_name,
        appointment_date: bookingData.appointment_date,
        appointment_time: bookingData.appointment_time,
        booking_reference: bookingData.booking_reference,
        therapist_name: bookingData.therapist_name || 'KH Therapy Team',
        clinic_address: bookingData.clinic_address || 'KH Therapy Clinic, Dublin, Ireland',
        special_instructions: bookingData.special_instructions || bookingData.notes,
        old_appointment_date: bookingData.old_appointment_date,
        old_appointment_time: bookingData.old_appointment_time,
        reschedule_reason: reschedulingData.reschedule_reason,
        reschedule_note: reschedulingData.reschedule_note,
        rescheduled_by: reschedulingData.rescheduled_by || 'admin'
      },
      'info@khtherapy.ie' // Always send to admin regardless of who initiated rescheduling
    );

    return { 
      success: result.customerSuccess, 
      error: result.customerSuccess ? undefined : 'Failed to send rescheduled booking notification' 
    };
  } catch (error) {
    console.error('❌ Error sending booking rescheduled email:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

/**
 * 9. Rescheduling Request Submitted (Customer-initiated with approval workflow)
 * Triggered when customer submits a rescheduling request that requires admin approval
 */
export const sendReschedulingRequestNotification = async (
  bookingData: BookingEmailData,
  requestData: {
    requestId: string;
    newAppointmentDate: string;
    newAppointmentTime: string;
    reschedule_reason?: string;
    customer_notes?: string;
  }
): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('📧 Sending Rescheduling Request notifications for booking:', bookingData.booking_reference);
    
    // Import the new notification functions
    const {
      sendAdminReschedulingNotification,
      sendCustomerReschedulingConfirmation
    } = await import('./reschedulingEmailNotifications');

    // Prepare request details for email notifications
    const requestDetails = {
      id: requestData.requestId,
      bookingId: bookingData.booking_id || '',
      customerId: bookingData.customer_id || 0,
      originalAppointmentDate: bookingData.old_appointment_date || bookingData.appointment_date,
      originalAppointmentTime: bookingData.old_appointment_time || bookingData.appointment_time,
      requestedAppointmentDate: requestData.newAppointmentDate,
      requestedAppointmentTime: requestData.newAppointmentTime,
      rescheduleReason: requestData.reschedule_reason,
      customerNotes: requestData.customer_notes,
      status: 'pending' as const,
      bookingReference: bookingData.booking_reference,
      serviceName: bookingData.service_name,
      bookingStatus: 'confirmed', // Assume confirmed bookings for rescheduling
      customerName: bookingData.customer_name,
      customerEmail: bookingData.customer_email,
      customerPhone: '',
      canReschedule: true
    };

    // Send admin notification
    const adminResult = await sendAdminReschedulingNotification(requestDetails);
    
    // Send customer confirmation
    const customerResult = await sendCustomerReschedulingConfirmation(requestDetails);

    // Return success if at least one email was sent
    const overallSuccess = adminResult.success || customerResult.success;
    
    return { 
      success: overallSuccess, 
      error: overallSuccess ? undefined : 'Failed to send rescheduling request notifications' 
    };
  } catch (error) {
    console.error('❌ Error sending rescheduling request notification:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

/**
 * 10. Rescheduling Request Approved 
 * Triggered when admin approves a customer's rescheduling request
 */
export const sendReschedulingApprovalNotification = async (
  bookingData: BookingEmailData,
  approvalData: {
    requestId: string;
    adminNotes?: string;
    adminUserId: string;
  }
): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('📧 Sending Rescheduling Approval notification for booking:', bookingData.booking_reference);
    
    // Import the approval notification function
    const { sendReschedulingApprovalNotification } = await import('./reschedulingEmailNotifications');

    // Prepare request details for email notification
    const requestDetails = {
      id: approvalData.requestId,
      bookingId: bookingData.booking_id || '',
      customerId: bookingData.customer_id || 0,
      originalAppointmentDate: bookingData.old_appointment_date || '',
      originalAppointmentTime: bookingData.old_appointment_time || '',
      requestedAppointmentDate: bookingData.appointment_date,
      requestedAppointmentTime: bookingData.appointment_time,
      rescheduleReason: '',
      customerNotes: '',
      status: 'approved' as const,
      adminNotes: approvalData.adminNotes,
      adminUserId: approvalData.adminUserId,
      bookingReference: bookingData.booking_reference,
      serviceName: bookingData.service_name,
      bookingStatus: 'confirmed',
      customerName: bookingData.customer_name,
      customerEmail: bookingData.customer_email,
      customerPhone: '',
      canReschedule: true
    };

    // Send approval notification with updated ICS calendar
    const result = await sendReschedulingApprovalNotification(requestDetails);

    return result;
  } catch (error) {
    console.error('❌ Error sending rescheduling approval notification:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

/**
 * 11. Rescheduling Request Rejected
 * Triggered when admin rejects a customer's rescheduling request
 */
export const sendReschedulingRejectionNotification = async (
  bookingData: BookingEmailData,
  rejectionData: {
    requestId: string;
    adminNotes?: string;
    adminUserId: string;
  }
): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('📧 Sending Rescheduling Rejection notification for booking:', bookingData.booking_reference);
    
    // Import the rejection notification function
    const { sendReschedulingRejectionNotification } = await import('./reschedulingEmailNotifications');

    // Prepare request details for email notification
    const requestDetails = {
      id: rejectionData.requestId,
      bookingId: bookingData.booking_id || '',
      customerId: bookingData.customer_id || 0,
      originalAppointmentDate: bookingData.appointment_date,
      originalAppointmentTime: bookingData.appointment_time,
      requestedAppointmentDate: '',
      requestedAppointmentTime: '',
      rescheduleReason: '',
      customerNotes: '',
      status: 'rejected' as const,
      adminNotes: rejectionData.adminNotes,
      adminUserId: rejectionData.adminUserId,
      bookingReference: bookingData.booking_reference,
      serviceName: bookingData.service_name,
      bookingStatus: 'confirmed',
      customerName: bookingData.customer_name,
      customerEmail: bookingData.customer_email,
      customerPhone: '',
      canReschedule: true
    };

    // Send rejection notification
    const result = await sendReschedulingRejectionNotification(requestDetails);

    return result;
  } catch (error) {
    console.error('❌ Error sending rescheduling rejection notification:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

/**
 * Comprehensive Booking Email Workflow Orchestrator
 * Handles the complete email workflow based on booking and payment status
 */
export const processBookingEmailWorkflow = async (
  trigger: 'booking_created' | 'deposit_paid' | 'full_paid' | 'payment_requested' | 'admin_confirmed' | 'booking_cancelled' | 'booking_rescheduled',
  bookingData: BookingEmailData,
  paymentData?: PaymentEmailData,
  adminEmail?: string,
  cancellationData?: {
    cancellation_reason?: string;
    has_payment_request?: boolean;
    refund_info?: string;
  },
  reschedulingData?: ReschedulingEmailData
): Promise<{ success: boolean; results: any; errors: string[] }> => {
  
  const results: any = {};
  const errors: string[] = [];
  let overallSuccess = true;

  try {
    switch (trigger) {
      case 'booking_created':
        // 1. Send booking request received email to customer
        const bookingReceivedResult = await sendBookingRequestReceived(bookingData);
        results.bookingReceived = bookingReceivedResult;
        if (!bookingReceivedResult.success) {
          errors.push(`Booking received email failed: ${bookingReceivedResult.error}`);
          overallSuccess = false;
        }

        // 2. Send admin notification
        const adminNotificationResult = await sendAdminBookingNotification(bookingData, adminEmail);
        results.adminNotification = adminNotificationResult;
        if (!adminNotificationResult.success) {
          errors.push(`Admin notification failed: ${adminNotificationResult.error}`);
          overallSuccess = false;
        }

        // 3. Send payment request if payment data provided
        if (paymentData && paymentData.payment_url) {
          const paymentRequestResult = await sendPaymentRequestWorkflow(bookingData, paymentData);
          results.paymentRequest = paymentRequestResult;
          if (!paymentRequestResult.success) {
            errors.push(`Payment request email failed: ${paymentRequestResult.error}`);
            overallSuccess = false;
          }
        }
        break;

      case 'deposit_paid':
        // Send deposit payment received email
        if (!paymentData) {
          throw new Error('Payment data required for deposit_paid trigger');
        }
        const depositResult = await sendDepositPaymentReceived(bookingData, paymentData);
        results.depositPayment = depositResult;
        if (!depositResult.success) {
          errors.push(`Deposit payment email failed: ${depositResult.error}`);
          overallSuccess = false;
        }
        break;

      case 'full_paid':
        // Send full payment received email
        if (!paymentData) {
          throw new Error('Payment data required for full_paid trigger');
        }
        const fullPaymentResult = await sendFullPaymentReceived(bookingData, paymentData);
        results.fullPayment = fullPaymentResult;
        if (!fullPaymentResult.success) {
          errors.push(`Full payment email failed: ${fullPaymentResult.error}`);
          overallSuccess = false;
        }
        break;

      case 'payment_requested':
        // Send payment request email
        if (!paymentData) {
          throw new Error('Payment data required for payment_requested trigger');
        }
        const paymentReqResult = await sendPaymentRequestWorkflow(bookingData, paymentData);
        results.paymentRequest = paymentReqResult;
        if (!paymentReqResult.success) {
          errors.push(`Payment request email failed: ${paymentReqResult.error}`);
          overallSuccess = false;
        }
        break;

      case 'admin_confirmed':
        // Send booking confirmation with calendar file to customer and admin
        const confirmationResult = await sendBookingConfirmationWithCalendar(bookingData, adminEmail);
        results.bookingConfirmation = confirmationResult;
        if (!confirmationResult.customerSuccess || !confirmationResult.adminSuccess) {
          errors.push(`Booking confirmation failed - Customer: ${confirmationResult.customerSuccess}, Admin: ${confirmationResult.adminSuccess}`);
          overallSuccess = false;
        }
        break;

      case 'booking_cancelled':
        // Send booking cancellation email to customer
        const cancellationResult = await sendBookingCancellationNotification(bookingData, cancellationData || {});
        results.bookingCancellation = cancellationResult;
        if (!cancellationResult.success) {
          errors.push(`Booking cancellation email failed: ${cancellationResult.error}`);
          overallSuccess = false;
        }
        break;

      case 'booking_rescheduled':
        // Send booking rescheduled email to customer
        const rescheduledResult = await sendBookingRescheduledNotification(bookingData, reschedulingData || {});
        results.bookingRescheduled = rescheduledResult;
        if (!rescheduledResult.success) {
          errors.push(`Booking rescheduled email failed: ${rescheduledResult.error}`);
          overallSuccess = false;
        }
        break;

      default:
        throw new Error(`Unknown email workflow trigger: ${trigger}`);
    }

    console.log('✅ Email workflow completed:', trigger, 'Success:', overallSuccess);
    return { success: overallSuccess, results, errors };

  } catch (error) {
    console.error('❌ Email workflow failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown workflow error';
    errors.push(errorMessage);
    return { success: false, results, errors };
  }
};

/**
 * Determine payment type based on amount and service cost
 */
export const determinePaymentType = (paidAmount: number, totalServiceCost: number): 'deposit' | 'full' => {
  const depositThreshold = totalServiceCost * 0.3; // 30% threshold for determining if it's a deposit
  return paidAmount < depositThreshold ? 'deposit' : 'full';
};

/**
 * Helper function to validate email workflow data
 */
export const validateEmailWorkflowData = (
  bookingData: BookingEmailData,
  paymentData?: PaymentEmailData
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Validate booking data
  if (!bookingData.customer_name?.trim()) errors.push('Customer name is required');
  if (!bookingData.customer_email?.trim()) errors.push('Customer email is required');
  if (!bookingData.service_name?.trim()) errors.push('Service name is required');
  if (!bookingData.booking_reference?.trim()) errors.push('Booking reference is required');

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (bookingData.customer_email && !emailRegex.test(bookingData.customer_email)) {
    errors.push('Invalid customer email format');
  }

  // Validate payment data if provided
  if (paymentData) {
    if (typeof paymentData.payment_amount !== 'number' || paymentData.payment_amount <= 0) {
      errors.push('Valid payment amount is required');
    }
    if (!['deposit', 'full'].includes(paymentData.payment_type)) {
      errors.push('Payment type must be either "deposit" or "full"');
    }
  }

  return { isValid: errors.length === 0, errors };
};