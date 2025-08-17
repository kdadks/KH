// New email utility using Netlify Functions with SMTP
// This replaces the EmailJS implementation with a server-side solution

import { decryptSensitiveData, isDataEncrypted } from './gdprUtils';

export interface EmailData {
  customer_name: string;
  customer_email?: string;
  [key: string]: any;
}

export interface BookingConfirmationData extends EmailData {
  service_name: string;
  appointment_date: string;
  appointment_time: string;
  total_amount: number;
  booking_reference: string;
  therapist_name?: string;
  clinic_address?: string;
  special_instructions?: string;
}

export interface PaymentReceiptData extends EmailData {
  transaction_id: string;
  payment_amount: number;
  payment_date: string;
  service_name?: string;
}

export interface PaymentRequestData extends EmailData {
  amount: number;
  service_name: string;
  due_date: string;
  invoice_number?: string;
  payment_url?: string;
}

export interface BookingReminderData extends EmailData {
  service_name: string;
  appointment_date: string;
  appointment_time: string;
  booking_reference: string;
}

export interface AdminNotificationData extends EmailData {
  notification_type: string;
  message: string;
  details?: Record<string, any>;
}

export interface WelcomeEmailData extends EmailData {
  login_url?: string;
}

export interface PasswordResetData extends EmailData {
  reset_url: string;
}

export interface BookingWithPaymentData extends EmailData {
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

// Get the base URL for the Netlify function
const getBaseUrl = () => {
  // In production, use same origin
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return process.env.VITE_SITE_URL || 'https://khtherapy.netlify.app';
};

// Generate proper email subject based on email type
const generateEmailSubject = (emailType: string, customerName: string): string => {
  switch (emailType) {
    case 'booking_welcome':
      return `Welcome to KH Therapy - Booking Confirmation`;
    case 'payment_request':
      return `Payment Request - KH Therapy Services`;
    case 'payment_confirmation':
      return `Payment Received - Thank You ${customerName}`;
    case 'booking_reminder':
      return `Appointment Reminder - KH Therapy`;
    case 'admin_notification':
      return `Admin Notification - KH Therapy`;
    default:
      return `KH Therapy - ${emailType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`;
  }
};

// Generic email sending function
const sendEmail = async (
  emailType: string,
  recipientEmail: string,
  data: EmailData,
  customSubject?: string
): Promise<boolean> => {
  try {
    const baseUrl = getBaseUrl();
    
    // Decrypt customer name for proper display
    let displayCustomerName = data.customer_name;
    if (data.customer_name && isDataEncrypted(data.customer_name)) {
      try {
        displayCustomerName = decryptSensitiveData(data.customer_name);
      } catch (error) {
        console.warn('Failed to decrypt customer name, using original:', error);
      }
    }
    
    // Generate proper email subject
    const emailSubject = customSubject || generateEmailSubject(emailType, displayCustomerName);
    
    const response = await fetch(`${baseUrl}/.netlify/functions/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        emailType,
        recipientEmail,
        data: { ...data, customer_name: displayCustomerName }, // Use decrypted name
        subject: emailSubject
      }),
    });
    
    // Check if response has content before parsing JSON
    const responseText = await response.text();
    
    try {
      if (responseText) {
        JSON.parse(responseText);
      }
      if (!response.ok) {
        return false;
      }
    } catch (parseError) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
};

// Initialize email service (replaces EmailJS initialization)
export const initializeEmailService = (): boolean => {
  // No initialization needed for SMTP service
  // Just verify we have the necessary environment setup
  return true;
};

// Booking confirmation email
export const sendBookingConfirmationEmail = async (
  customerEmail: string,
  bookingData: BookingConfirmationData
): Promise<boolean> => {
  return sendEmail('booking_confirmation', customerEmail, {
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
};

// Payment receipt email
export const sendPaymentReceiptEmail = async (
  customerEmail: string,
  receiptData: PaymentReceiptData
): Promise<boolean> => {
  return sendEmail('payment_receipt', customerEmail, {
    customer_name: receiptData.customer_name,
    transaction_id: receiptData.transaction_id,
    payment_amount: receiptData.payment_amount,
    payment_date: receiptData.payment_date,
    service_name: receiptData.service_name
  });
};

// Payment request email
export const sendPaymentRequestEmail = async (
  customerEmail: string,
  requestData: PaymentRequestData
): Promise<boolean> => {
  return sendEmail('payment_request', customerEmail, {
    customer_name: requestData.customer_name,
    amount: requestData.amount,
    service_name: requestData.service_name,
    due_date: requestData.due_date,
    invoice_number: requestData.invoice_number,
    payment_url: requestData.payment_url
  });
};

// Booking reminder email
export const sendBookingReminderEmail = async (
  customerEmail: string,
  reminderData: BookingReminderData
): Promise<boolean> => {
  return sendEmail('booking_reminder', customerEmail, {
    customer_name: reminderData.customer_name,
    service_name: reminderData.service_name,
    appointment_date: reminderData.appointment_date,
    appointment_time: reminderData.appointment_time,
    booking_reference: reminderData.booking_reference
  });
};

// Admin notification email
export const sendAdminNotificationEmail = async (
  adminEmail: string,
  notificationData: AdminNotificationData
): Promise<boolean> => {
  return sendEmail('admin_notification', adminEmail, {
    customer_name: 'Admin',
    notification_type: notificationData.notification_type,
    message: notificationData.message,
    details: notificationData.details
  });
};

// Welcome email
export const sendWelcomeEmail = async (
  customerName: string,
  customerEmail: string,
  loginUrl?: string
): Promise<boolean> => {
  return sendEmail('welcome', customerEmail, {
    customer_name: customerName,
    login_url: loginUrl
  });
};

// Password reset email
export const sendPasswordResetEmail = async (
  customerEmail: string,
  resetData: PasswordResetData
): Promise<boolean> => {
  return sendEmail('password_reset', customerEmail, {
    customer_name: resetData.customer_name,
    reset_url: resetData.reset_url
  });
};

// Invoice notification email with PDF attachment
export const sendInvoiceNotificationEmail = async (
  customerEmail: string,
  invoiceData: {
    customer_name: string;
    invoice_number: string;
    amount: number;
    due_date: string;
    service_name?: string;
  },
  pdfAttachment?: {
    filename: string;
    content: string; // base64 content
  }
): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = await fetch('/.netlify/functions/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        emailType: 'invoice_notification',
        recipientEmail: customerEmail,
        subject: `Invoice ${invoiceData.invoice_number} - KH Therapy`,
        data: {
          customer_name: invoiceData.customer_name,
          invoice_number: invoiceData.invoice_number,
          amount: invoiceData.amount.toFixed(2),
          due_date: invoiceData.due_date,
          service_name: invoiceData.service_name || 'Therapy Session'
        },
        attachments: pdfAttachment ? [{
          filename: pdfAttachment.filename,
          content: pdfAttachment.content,
          contentType: 'application/pdf'
        }] : undefined
      }),
    });

    if (response.ok) {
      return { success: true };
    } else {
      const errorData = await response.text();
      return { success: false, error: `Failed to send email: ${errorData}` };
    }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error sending email'
    };
  }
};

// Payment confirmation email
export const sendPaymentConfirmationEmail = async (
  customerEmail: string,
  confirmationData: {
    customer_name: string;
    transaction_id: string;
    amount: number;
    service_name?: string;
  }
): Promise<boolean> => {
  return sendEmail('payment_receipt', customerEmail, {
    customer_name: confirmationData.customer_name,
    transaction_id: confirmationData.transaction_id,
    payment_amount: confirmationData.amount,
    payment_date: new Date().toLocaleDateString('en-IE', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    }),
    service_name: confirmationData.service_name
  }, 'Payment Confirmation');
};

// Booking with payment status email
export const sendBookingWithPaymentEmail = async (
  customerEmail: string,
  bookingData: BookingWithPaymentData
): Promise<boolean> => {
  let emailType = 'booking_with_payment_completed';
  
  if (bookingData.payment_status === 'failed') {
    emailType = 'booking_with_payment_failed';
  } else if (bookingData.payment_status === 'pending') {
    emailType = 'booking_with_payment_pending';
  }
  
  return sendEmail(emailType, customerEmail, bookingData);
};

// Booking confirmation without payment
export const sendBookingConfirmationWithoutPayment = async (
  customerEmail: string,
  bookingData: BookingConfirmationData
): Promise<boolean> => {
  return sendEmail('booking_confirmation_no_payment', customerEmail, bookingData);
};

// Admin booking confirmation (sent when admin confirms a booking)
export const sendAdminBookingConfirmationEmail = async (
  customerEmail: string,
  bookingData: BookingConfirmationData,
  adminEmail?: string
): Promise<{ customerSuccess: boolean; adminSuccess: boolean }> => {
  try {
    // Prepare data with proper customer name decryption
    const decryptedCustomerName = isDataEncrypted(bookingData.customer_name) 
      ? decryptSensitiveData(bookingData.customer_name) 
      : bookingData.customer_name;
    
    const emailData = {
      ...bookingData,
      customer_name: decryptedCustomerName
    };
    
    // Generate proper subject for booking confirmation
    const subject = generateEmailSubject('admin_booking_confirmation', decryptedCustomerName);
    
    // Send to customer
    const customerSuccess = await sendEmail('admin_booking_confirmation', customerEmail, emailData, subject);
    
    // Send to admin - try alternative admin email first, then fallback to info@khtherapy.ie
    const adminEmailAddress = adminEmail || 
                              process.env.VITE_ADMIN_EMAIL || 
                              'info@khtherapy.ie';
    
    const adminEmailData = {
      ...emailData,
      customer_name: `Admin Notification: ${decryptedCustomerName}'s booking has been confirmed`,
      // Add admin-specific fields to differentiate the email
      is_admin_notification: true,
      original_customer_name: decryptedCustomerName,
      notification_type: 'booking_confirmation'
    };
    const adminSubject = `🔔 Admin Alert: Booking Confirmed - ${decryptedCustomerName} - ${emailData.service_name}`;
    
    const adminSuccess = await sendEmail('admin_booking_confirmation', adminEmailAddress, adminEmailData, adminSubject);
    
    return { customerSuccess, adminSuccess };
  } catch (error) {
    return { customerSuccess: false, adminSuccess: false };
  }
};

// Backward compatibility exports (these will replace the existing EmailJS functions)
export {
  initializeEmailService as initializeEmailJS
};
