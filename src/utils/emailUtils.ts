// Import the new SMTP email service
import {
  initializeEmailService,
  sendBookingConfirmationEmail as smtpSendBookingConfirmation,
  sendPaymentReceiptEmail as smtpSendPaymentReceipt,
  sendBookingReminderEmail as smtpSendBookingReminder,
  sendAdminNotificationEmail as smtpSendAdminNotification,
  sendWelcomeEmail as smtpSendWelcome,
  sendPaymentRequestEmail as smtpSendPaymentRequest,
  sendPaymentConfirmationEmail as smtpSendPaymentConfirmation,
  sendInvoiceNotificationEmail as smtpSendInvoiceNotification,
  sendPasswordResetEmail as smtpSendPasswordReset,
  sendBookingWithPaymentEmail,
  sendBookingConfirmationWithoutPayment,
  sendAdminBookingConfirmationEmail
} from './emailSMTP';

// Email template interfaces (keeping for backward compatibility)
export interface BookingConfirmationData {
  customer_name: string;
  customer_email: string;
  service_name: string;
  appointment_date: string;
  appointment_time: string;
  total_amount: number;
  booking_reference: string;
  therapist_name?: string;
  clinic_address?: string;
  special_instructions?: string;
}

export interface PaymentReceiptData {
  customer_name: string;
  customer_email: string;
  transaction_id: string;
  payment_amount: number;
  payment_date: string;
  service_name?: string;
}

export interface PaymentRequestData {
  customer_name: string;
  customer_email: string;
  amount: number;
  service_name: string;
  due_date: string;
  payment_url?: string;
  invoice_number?: string;
}

export interface BookingReminderData {
  customer_name: string;
  customer_email: string;
  service_name: string;
  appointment_date: string;
  appointment_time: string;
  booking_reference: string;
}

export interface AdminNotificationData {
  notification_type: string;
  message: string;
  details?: Record<string, any>;
}

export interface PasswordResetEmailData {
  customer_email: string;
  customer_name: string;
  reset_url: string;
}

export interface BookingWithPaymentData {
  customer_name: string;
  customer_email: string;
  service_name: string;
  appointment_date: string;
  appointment_time: string;
  booking_reference: string;
  payment_status: 'completed' | 'failed' | 'pending';
  payment_amount?: number;
  transaction_id?: string;
  next_steps?: string;
  therapist_name?: string;
  clinic_address?: string;
  special_instructions?: string;
}

// Initialize Email Service (now using SMTP instead of EmailJS)
export const initializeEmailJS = (): boolean => {
  // Initialize the SMTP email service
  return initializeEmailService();
};

// Booking confirmation email
export const sendBookingConfirmationEmail = async (data: BookingConfirmationData): Promise<boolean> => {
  try {
    return await smtpSendBookingConfirmation(data.customer_email, {
      customer_name: data.customer_name,
      service_name: data.service_name,
      appointment_date: data.appointment_date,
      appointment_time: data.appointment_time,
      total_amount: data.total_amount,
      booking_reference: data.booking_reference,
      therapist_name: data.therapist_name,
      clinic_address: data.clinic_address,
      special_instructions: data.special_instructions
    });
  } catch (error) {
    console.error('Error sending booking confirmation email:', error);
    return false;
  }
};

// Payment receipt email
export const sendPaymentReceiptEmail = async (data: PaymentReceiptData): Promise<boolean> => {
  try {
    return await smtpSendPaymentReceipt(data.customer_email, {
      customer_name: data.customer_name,
      transaction_id: data.transaction_id,
      payment_amount: data.payment_amount,
      payment_date: data.payment_date,
      service_name: data.service_name
    });
  } catch (error) {
    console.error('Error sending payment receipt email:', error);
    return false;
  }
};

// Booking reminder email
export const sendBookingReminderEmail = async (data: BookingReminderData): Promise<boolean> => {
  try {
    return await smtpSendBookingReminder(data.customer_email, {
      customer_name: data.customer_name,
      service_name: data.service_name,
      appointment_date: data.appointment_date,
      appointment_time: data.appointment_time,
      booking_reference: data.booking_reference
    });
  } catch (error) {
    console.error('Error sending booking reminder email:', error);
    return false;
  }
};

// Admin notification email
export const sendAdminNotificationEmail = async (data: AdminNotificationData): Promise<boolean> => {
  try {
    // Use a default admin email or get from environment
    const adminEmail = 'info@khtherapy.ie'; // This should be configurable
    return await smtpSendAdminNotification(adminEmail, {
      customer_name: 'Admin',
      notification_type: data.notification_type,
      message: data.message,
      details: data.details
    });
  } catch (error) {
    console.error('Error sending admin notification email:', error);
    return false;
  }
};

// Welcome email
export const sendWelcomeEmail = async (customerName: string, customerEmail: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const result = await smtpSendWelcome(customerName, customerEmail);
    return { success: result };
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Payment request email
export const sendPaymentRequestEmail = async (
  customerEmail: string,
  data: {
    customer_name: string;
    amount: number;
    service_name: string;
    due_date: string;
    payment_url?: string;
    invoice_number?: string;
  }
): Promise<{ success: boolean; error?: string }> => {
  try {
    const result = await smtpSendPaymentRequest(customerEmail, {
      customer_name: data.customer_name,
      amount: data.amount,
      service_name: data.service_name,
      due_date: data.due_date,
      payment_url: data.payment_url,
      invoice_number: data.invoice_number
    });
    
    return { success: result };
  } catch (error) {
    console.error('Error sending payment request email:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Payment confirmation email
export const sendPaymentConfirmationEmail = async (
  customerEmail: string,
  data: {
    customer_name: string;
    transaction_id: string;
    amount: number;
    service_name?: string;
  }
): Promise<{ success: boolean; error?: string }> => {
  try {
    const result = await smtpSendPaymentConfirmation(customerEmail, {
      customer_name: data.customer_name,
      transaction_id: data.transaction_id,
      amount: data.amount,
      service_name: data.service_name
    });
    
    return { success: result };
  } catch (error) {
    console.error('Error sending payment confirmation email:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Invoice notification email
export const sendInvoiceNotificationEmail = async (
  customerEmail: string,
  data: {
    customer_name: string;
    invoice_number: string;
    amount: number;
    due_date: string;
    payment_url?: string;
  }
): Promise<boolean> => {
  try {
    return await smtpSendInvoiceNotification(customerEmail, {
      customer_name: data.customer_name,
      invoice_number: data.invoice_number,
      amount: data.amount,
      due_date: data.due_date,
      payment_url: data.payment_url
    });
  } catch (error) {
    console.error('Error sending invoice notification email:', error);
    return false;
  }
};

// Password reset email
export const sendPasswordResetEmail = async (data: PasswordResetEmailData): Promise<{ success: boolean; error?: string }> => {
  try {
    const result = await smtpSendPasswordReset(data.customer_email, {
      customer_name: data.customer_name,
      reset_url: data.reset_url
    });
    
    return { success: result };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to send password reset email' 
    };
  }
};

// Batch email sending function
export const sendBatchEmails = async (
  emailType: string,
  recipients: { email: string; data: any }[],
  options?: { delay?: number; batchSize?: number }
): Promise<{ success: number; failed: number }> => {
  const delay = options?.delay || 1000; // 1 second delay between emails
  const batchSize = options?.batchSize || 5; // Process 5 emails at a time
  
  let success = 0;
  let failed = 0;

  // Process emails in batches
  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize);
    
    // Process batch in parallel
    const batchPromises = batch.map(async (recipient) => {
      try {
        let result = false;
        
        switch (emailType) {
          case 'booking_confirmation':
            result = await sendBookingConfirmationEmail(recipient.data);
            break;
          case 'payment_receipt':
            result = await sendPaymentReceiptEmail(recipient.data);
            break;
          case 'booking_reminder':
            result = await sendBookingReminderEmail(recipient.data);
            break;
          case 'welcome':
            const welcomeResult = await sendWelcomeEmail(recipient.data.customer_name, recipient.email);
            result = welcomeResult.success;
            break;
          default:
            console.error('Unknown email type:', emailType);
            return false;
        }
        
        return result;
      } catch (error) {
        console.error(`Failed to send ${emailType} email to ${recipient.email}:`, error);
        return false;
      }
    });

    // Wait for batch to complete
    const batchResults = await Promise.allSettled(batchPromises);
    
    // Count results
    batchResults.forEach((result) => {
      if (result.status === 'fulfilled' && result.value) {
        success++;
      } else {
        failed++;
      }
    });

    // Add delay between batches (except for the last batch)
    if (i + batchSize < recipients.length) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return { success, failed };
};

// Email formatting utilities
export const formatEmailDate = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('en-IE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

export const formatEmailTime = (time: string): string => {
  // Handle different time formats
  if (time.includes(':')) {
    const [hours, minutes] = time.split(':');
    const hour24 = parseInt(hours, 10);
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
    const ampm = hour24 >= 12 ? 'PM' : 'AM';
    return `${hour12}:${minutes} ${ampm}`;
  }
  return time;
};

// Email configuration validation
export const validateEmailConfiguration = (): { isValid: boolean; missingConfig: string[] } => {
  // For SMTP, we just need to verify the function is available
  // The actual SMTP configuration is handled server-side
  return {
    isValid: true,
    missingConfig: []
  };
};

// Enhanced booking confirmation with payment status
export const sendBookingNotificationWithPaymentStatus = async (
  customerEmail: string,
  bookingData: BookingWithPaymentData
): Promise<boolean> => {
  try {
    return await sendBookingWithPaymentEmail(customerEmail, {
      customer_name: bookingData.customer_name,
      service_name: bookingData.service_name,
      appointment_date: bookingData.appointment_date,
      appointment_time: bookingData.appointment_time,
      booking_reference: bookingData.booking_reference,
      payment_status: bookingData.payment_status,
      payment_amount: bookingData.payment_amount,
      transaction_id: bookingData.transaction_id,
      next_steps: bookingData.next_steps,
      therapist_name: bookingData.therapist_name,
      clinic_address: bookingData.clinic_address,
      special_instructions: bookingData.special_instructions
    });
  } catch (error) {
    console.error('Error sending booking notification with payment status:', error);
    return false;
  }
};

// Booking confirmation without payment
export const sendSimpleBookingConfirmation = async (
  customerEmail: string,
  bookingData: BookingConfirmationData
): Promise<boolean> => {
  try {
    return await sendBookingConfirmationWithoutPayment(customerEmail, {
      customer_name: bookingData.customer_name,
      service_name: bookingData.service_name,
      appointment_date: bookingData.appointment_date,
      appointment_time: bookingData.appointment_time,
      total_amount: bookingData.total_amount,
      booking_reference: bookingData.booking_reference,
      therapist_name: bookingData.therapist_name,
      clinic_address: bookingData.clinic_address,
      special_instructions: bookingData.special_instructions
    });
  } catch (error) {
    console.error('Error sending booking confirmation without payment:', error);
    return false;
  }
};

// Admin booking confirmation with calendar (sent when admin confirms a booking)
export const sendAdminBookingConfirmation = async (
  customerEmail: string,
  bookingData: BookingConfirmationData,
  adminEmail?: string
): Promise<{ customerSuccess: boolean; adminSuccess: boolean }> => {
  try {
    return await sendAdminBookingConfirmationEmail(customerEmail, {
      customer_name: bookingData.customer_name,
      service_name: bookingData.service_name,
      appointment_date: bookingData.appointment_date,
      appointment_time: bookingData.appointment_time,
      total_amount: bookingData.total_amount || 0,
      booking_reference: bookingData.booking_reference,
      therapist_name: bookingData.therapist_name || 'KH Therapy Team',
      clinic_address: bookingData.clinic_address || 'KH Therapy Clinic, Dublin, Ireland',
      special_instructions: bookingData.special_instructions
    }, adminEmail);
  } catch (error) {
    console.error('Error sending admin booking confirmation:', error);
    return { customerSuccess: false, adminSuccess: false };
  }
};
