import emailjs from 'emailjs-com';

// EmailJS Configuration - Using Vite environment variables
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || '';
const EMAILJS_TEMPLATE_BOOKING_CONFIRMATION = import.meta.env.VITE_EMAILJS_TEMPLATE_BOOKING_CONFIRMATION || '';
const EMAILJS_TEMPLATE_BOOKING_REMINDER = import.meta.env.VITE_EMAILJS_TEMPLATE_BOOKING_REMINDER || '';
const EMAILJS_TEMPLATE_PAYMENT_RECEIPT = import.meta.env.VITE_EMAILJS_TEMPLATE_PAYMENT_RECEIPT || '';
const EMAILJS_TEMPLATE_ADMIN_NOTIFICATION = import.meta.env.VITE_EMAILJS_TEMPLATE_ADMIN_NOTIFICATION || '';
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || '';

// Email template interfaces
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
  service_description: string;
  booking_reference: string;
}

export interface BookingReminderData {
  customer_name: string;
  customer_email: string;
  service_name: string;
  appointment_date: string;
  appointment_time: string;
  therapist_name?: string;
  clinic_address?: string;
  booking_reference: string;
}

export interface AdminNotificationData {
  admin_email: string;
  notification_type: 'new_booking' | 'payment_received' | 'cancellation';
  customer_name: string;
  service_name: string;
  appointment_date: string;
  appointment_time: string;
  booking_reference: string;
  additional_info?: string;
}

export interface PasswordResetEmailData {
  customer_name: string;
  customer_email: string;
  reset_url: string;
  expires_in_hours: number;
}

// Initialize EmailJS
export const initializeEmailJS = (): boolean => {
  if (!EMAILJS_PUBLIC_KEY) {
    console.log('EmailJS public key not configured - email sending will be skipped');
    return false;
  }
  
  try {
    emailjs.init(EMAILJS_PUBLIC_KEY);
    console.log('EmailJS initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize EmailJS:', error);
    return false;
  }
};

// Send booking confirmation email
export const sendBookingConfirmationEmail = async (data: BookingConfirmationData): Promise<boolean> => {
  try {
    if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_BOOKING_CONFIRMATION) {
      throw new Error('EmailJS booking confirmation template not configured');
    }

    const templateParams = {
      to_email: data.customer_email,
      to_name: data.customer_name,
      service_name: data.service_name,
      appointment_date: data.appointment_date,
      appointment_time: data.appointment_time,
      total_amount: `€${data.total_amount.toFixed(2)}`,
      booking_reference: data.booking_reference,
      therapist_name: data.therapist_name || 'KH Therapy Team',
      clinic_address: data.clinic_address || 'Dublin, Ireland',
      special_instructions: data.special_instructions || 'None',
      year: new Date().getFullYear()
    };

    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_BOOKING_CONFIRMATION,
      templateParams
    );

    console.log('Booking confirmation email sent:', response.status, response.text);
    return response.status === 200;
  } catch (error) {
    console.error('Error sending booking confirmation email:', error);
    return false;
  }
};

// Send payment receipt email
export const sendPaymentReceiptEmail = async (data: PaymentReceiptData): Promise<boolean> => {
  try {
    if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_PAYMENT_RECEIPT) {
      throw new Error('EmailJS payment receipt template not configured');
    }

    const templateParams = {
      to_email: data.customer_email,
      to_name: data.customer_name,
      transaction_id: data.transaction_id,
      payment_amount: `€${data.payment_amount.toFixed(2)}`,
      payment_date: data.payment_date,
      service_description: data.service_description,
      booking_reference: data.booking_reference,
      year: new Date().getFullYear()
    };

    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_PAYMENT_RECEIPT,
      templateParams
    );

    console.log('Payment receipt email sent:', response.status, response.text);
    return response.status === 200;
  } catch (error) {
    console.error('Error sending payment receipt email:', error);
    return false;
  }
};

// Send booking reminder email
export const sendBookingReminderEmail = async (data: BookingReminderData): Promise<boolean> => {
  try {
    if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_BOOKING_REMINDER) {
      throw new Error('EmailJS booking reminder template not configured');
    }

    const templateParams = {
      to_email: data.customer_email,
      to_name: data.customer_name,
      service_name: data.service_name,
      appointment_date: data.appointment_date,
      appointment_time: data.appointment_time,
      therapist_name: data.therapist_name || 'KH Therapy Team',
      clinic_address: data.clinic_address || 'Dublin, Ireland',
      booking_reference: data.booking_reference,
      year: new Date().getFullYear()
    };

    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_BOOKING_REMINDER,
      templateParams
    );

    console.log('Booking reminder email sent:', response.status, response.text);
    return response.status === 200;
  } catch (error) {
    console.error('Error sending booking reminder email:', error);
    return false;
  }
};

// Send admin notification email
export const sendAdminNotificationEmail = async (data: AdminNotificationData): Promise<boolean> => {
  try {
    if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ADMIN_NOTIFICATION) {
      throw new Error('EmailJS admin notification template not configured');
    }

    const templateParams = {
      to_email: data.admin_email,
      notification_type: data.notification_type,
      customer_name: data.customer_name,
      service_name: data.service_name,
      appointment_date: data.appointment_date,
      appointment_time: data.appointment_time,
      booking_reference: data.booking_reference,
      additional_info: data.additional_info || '',
      timestamp: new Date().toLocaleString('en-IE'),
      year: new Date().getFullYear()
    };

    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ADMIN_NOTIFICATION,
      templateParams
    );

    console.log('Admin notification email sent:', response.status, response.text);
    return response.status === 200;
  } catch (error) {
    console.error('Error sending admin notification email:', error);
    return false;
  }
};

// Send welcome email for new user accounts
export const sendWelcomeEmail = async (customerName: string, customerEmail: string): Promise<boolean> => {
  try {
    // Using booking confirmation template for welcome email with adjusted content
    const templateParams = {
      to_email: customerEmail,
      to_name: customerName,
      service_name: 'Account Registration',
      appointment_date: 'Welcome to KH Therapy',
      appointment_time: 'Your account has been created',
      total_amount: '',
      booking_reference: `Welcome Package for ${customerName}`,
      therapist_name: 'KH Therapy Team',
      clinic_address: 'Dublin, Ireland',
      special_instructions: 'You can now access your customer portal to view bookings, invoices, and manage your appointments.',
      year: new Date().getFullYear()
    };

    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_BOOKING_CONFIRMATION,
      templateParams
    );

    console.log('Welcome email sent:', response.status, response.text);
    return response.status === 200;
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return false;
  }
};

// Batch email sending with rate limiting
export const sendBatchEmails = async (
  emails: Array<() => Promise<boolean>>,
  delayMs: number = 1000
): Promise<{ sent: number; failed: number }> => {
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < emails.length; i++) {
    try {
      const success = await emails[i]();
      if (success) {
        sent++;
      } else {
        failed++;
      }
    } catch (error) {
      console.error(`Failed to send email ${i + 1}:`, error);
      failed++;
    }

    // Add delay between emails to avoid rate limiting
    if (i < emails.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return { sent, failed };
};

// Format date for emails
export const formatEmailDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-IE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// Format time for emails
export const formatEmailTime = (time: string): string => {
  return time; // Already in HH:MM format typically
};

// Payment Request Email Interface
export interface PaymentRequestData {
  customerName: string;
  amount: number;
  currency: string;
  dueDate?: string | null;
  paymentUrl: string;
}

// Payment Confirmation Email Interface  
export interface PaymentConfirmationData {
  customerName: string;
  amount: number;
  currency: string;
  transactionId: string;
  paymentDate: string;
}

// Send payment request email
export const sendPaymentRequestEmail = async (
  customerEmail: string,
  data: PaymentRequestData
): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!initializeEmailJS()) {
      return { success: false, error: 'EmailJS not configured' };
    }

    const templateParams = {
      to_email: customerEmail,
      customer_name: data.customerName,
      payment_amount: `${data.currency} ${data.amount.toFixed(2)}`,
      due_date: data.dueDate ? formatEmailDate(data.dueDate) : 'No due date',
      payment_url: data.paymentUrl,
      company_name: 'ITWala Physiotherapy',
      year: new Date().getFullYear().toString()
    };

    await emailjs.send(
      EMAILJS_SERVICE_ID!,
      'template_payment_request', // Payment request template ID
      templateParams,
      EMAILJS_PUBLIC_KEY
    );

    console.log('Payment request email sent successfully to:', customerEmail);
    return { success: true };
  } catch (error) {
    console.error('Failed to send payment request email:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

// Send payment confirmation email
export const sendPaymentConfirmationEmail = async (
  customerEmail: string, 
  data: PaymentConfirmationData
): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!initializeEmailJS()) {
      return { success: false, error: 'EmailJS not configured' };
    }

    const templateParams = {
      to_email: customerEmail,
      customer_name: data.customerName,
      payment_amount: `${data.currency} ${data.amount.toFixed(2)}`,
      transaction_id: data.transactionId,
      payment_date: formatEmailDate(data.paymentDate),
      company_name: 'ITWala Physiotherapy',
      year: new Date().getFullYear().toString()
    };

    await emailjs.send(
      EMAILJS_SERVICE_ID!,
      'template_payment_confirmation', // Payment confirmation template ID
      templateParams,
      EMAILJS_PUBLIC_KEY
    );

    console.log('Payment confirmation email sent successfully to:', customerEmail);
    return { success: true };
  } catch (error) {
    console.error('Failed to send payment confirmation email:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

// Send invoice notification email (simplified version)
export const sendInvoiceNotificationEmail = async (
  customerEmail: string,
  data: {
    customerName: string;
    invoiceNumber: string;
    invoiceAmount: string;
    dueDate: string;
    companyName: string;
  }
): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!initializeEmailJS()) {
      return { success: false, error: 'EmailJS not configured - skipping email' };
    }

    if (!EMAILJS_SERVICE_ID) {
      return { success: false, error: 'EmailJS service ID not configured' };
    }

    const templateParams = {
      to_email: customerEmail,
      to_name: data.customerName,
      invoice_number: data.invoiceNumber,
      invoice_amount: data.invoiceAmount,
      due_date: data.dueDate,
      company_name: data.companyName,
      year: new Date().getFullYear().toString()
    };

    await emailjs.send(
      EMAILJS_SERVICE_ID!,
      'template_invoice_notification', // Invoice notification template ID
      templateParams,
      EMAILJS_PUBLIC_KEY
    );

    console.log('Invoice notification email sent successfully to:', customerEmail);
    return { success: true };
  } catch (error) {
    console.error('Failed to send invoice notification email:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

// Validate email configuration
export const validateEmailConfiguration = (): { isValid: boolean; missingConfig: string[] } => {
  const requiredConfig = [
    { key: 'EMAILJS_SERVICE_ID', value: EMAILJS_SERVICE_ID },
    { key: 'EMAILJS_PUBLIC_KEY', value: EMAILJS_PUBLIC_KEY },
    { key: 'EMAILJS_TEMPLATE_BOOKING_CONFIRMATION', value: EMAILJS_TEMPLATE_BOOKING_CONFIRMATION },
    { key: 'EMAILJS_TEMPLATE_PAYMENT_RECEIPT', value: EMAILJS_TEMPLATE_PAYMENT_RECEIPT }
  ];

  const missingConfig = requiredConfig
    .filter(config => !config.value)
    .map(config => config.key);

  return {
    isValid: missingConfig.length === 0,
    missingConfig
  };
};

// Send password reset email
export const sendPasswordResetEmail = async (data: PasswordResetEmailData): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!initializeEmailJS()) {
      return { success: false, error: 'EmailJS not configured' };
    }

    if (!EMAILJS_SERVICE_ID) {
      return { success: false, error: 'EmailJS service ID not configured' };
    }

    const templateParams = {
      to_email: data.customer_email,
      to_name: data.customer_name,
      reset_url: data.reset_url,
      expires_in_hours: data.expires_in_hours.toString(),
      company_name: 'KH Therapy',
      year: new Date().getFullYear().toString(),
      // Using booking confirmation template structure for now
      service_name: 'Password Reset Request',
      appointment_date: 'Reset your password',
      appointment_time: `This link expires in ${data.expires_in_hours} hour(s)`,
      total_amount: '',
      booking_reference: 'Password Reset',
      therapist_name: 'KH Therapy Support Team',
      clinic_address: 'Dublin, Ireland',
      special_instructions: `Click the following link to reset your password: ${data.reset_url}`
    };

    await emailjs.send(
      EMAILJS_SERVICE_ID!,
      EMAILJS_TEMPLATE_BOOKING_CONFIRMATION, // Using existing template with custom content
      templateParams,
      EMAILJS_PUBLIC_KEY
    );

    console.log('Password reset email sent successfully to:', data.customer_email);
    return { success: true };
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};
