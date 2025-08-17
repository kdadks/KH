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
    
    console.log(`📧 Sending ${emailType} email to ${recipientEmail}`);
    console.log('📧 Customer:', displayCustomerName);
    console.log('📧 Subject:', emailSubject);
    console.log('📧 Email data:', { ...data, customer_name: displayCustomerName });
    
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
    console.log(`📧 Response status: ${response.status}, Response text: ${responseText}`);
    
    let result;
    try {
      result = responseText ? JSON.parse(responseText) : {};
    } catch (parseError) {
      console.error('Failed to parse email function response:', parseError);
      console.error('Response text was:', responseText);
      return false;
    }
    
    if (!response.ok) {
      console.error(`Failed to send ${emailType} email:`, result.error || 'Unknown error');
      console.error('Full response:', result);
      return false;
    }

    console.log(`✅ Successfully sent ${emailType} email to ${recipientEmail}`);
    return true;
  } catch (error) {
    console.error(`Error sending ${emailType} email:`, error);
    // Log more details about the error
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
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

// Invoice notification email
export const sendInvoiceNotificationEmail = async (
  customerEmail: string,
  invoiceData: {
    customer_name: string;
    invoice_number: string;
    amount: number;
    due_date: string;
    payment_url?: string;
  }
): Promise<boolean> => {
  return sendEmail('payment_request', customerEmail, {
    customer_name: invoiceData.customer_name,
    amount: invoiceData.amount,
    service_name: `Invoice ${invoiceData.invoice_number}`,
    due_date: invoiceData.due_date,
    invoice_number: invoiceData.invoice_number,
    payment_url: invoiceData.payment_url
  }, `Invoice ${invoiceData.invoice_number} - Payment Due`);
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
    payment_date: new Date().toLocaleDateString(),
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
    console.log('📧 Starting admin booking confirmation email process...');
    console.log('📧 Customer email:', customerEmail);
    console.log('📧 Booking data:', bookingData);
    
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
    
    console.log('📧 Sending customer confirmation email...');
    // Send to customer
    const customerSuccess = await sendEmail('admin_booking_confirmation', customerEmail, emailData, subject);
    console.log('📧 Customer email result:', customerSuccess);
    
    // Send to admin (info@khtherapy.ie)
    const adminEmailAddress = adminEmail || 'info@khtherapy.ie';
    const adminEmailData = {
      ...emailData,
      customer_name: `Admin Notification: ${decryptedCustomerName}'s booking has been confirmed`
    };
    const adminSubject = `Booking Confirmed: ${decryptedCustomerName} - ${emailData.service_name}`;
    
    console.log('📧 Sending admin notification email...');
    const adminSuccess = await sendEmail('admin_booking_confirmation', adminEmailAddress, adminEmailData, adminSubject);
    console.log('📧 Admin email result:', adminSuccess);
    
    console.log('📧 Final results:', { customerSuccess, adminSuccess });
    
    return { customerSuccess, adminSuccess };
  } catch (error) {
    console.error('❌ Error in sendAdminBookingConfirmationEmail:', error);
    if (error instanceof Error) {
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
    }
    return { customerSuccess: false, adminSuccess: false };
  }
};

// Backward compatibility exports (these will replace the existing EmailJS functions)
export {
  initializeEmailService as initializeEmailJS
};
