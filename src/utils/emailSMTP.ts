// New email utility using Netlify Functions with SMTP
// This replaces the EmailJS implementation with a server-side solution

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

// Get the base URL for the Netlify function
const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return process.env.VITE_SITE_URL || 'http://localhost:5173';
};

// Generic email sending function
const sendEmail = async (
  emailType: string,
  recipientEmail: string,
  data: EmailData,
  customSubject?: string
): Promise<boolean> => {
  try {
    const response = await fetch(`${getBaseUrl()}/.netlify/functions/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        emailType,
        recipientEmail,
        data,
        subject: customSubject
      }),
    });

    const result = await response.json();
    
    if (!response.ok) {
      console.error(`Failed to send ${emailType} email:`, result.error);
      return false;
    }

    console.log(`${emailType} email sent successfully to ${recipientEmail}`);
    return true;
  } catch (error) {
    console.error(`Error sending ${emailType} email:`, error);
    return false;
  }
};

// Initialize email service (replaces EmailJS initialization)
export const initializeEmailService = (): boolean => {
  // No initialization needed for SMTP service
  // Just verify we have the necessary environment setup
  const baseUrl = getBaseUrl();
  console.log('Email service initialized with base URL:', baseUrl);
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

// Backward compatibility exports (these will replace the existing EmailJS functions)
export {
  initializeEmailService as initializeEmailJS
};
