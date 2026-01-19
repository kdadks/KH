// Payment Request Types matching existing database schema
export interface PaymentRequest {
  id: number;
  customer_id: number;
  invoice_id?: number | null;
  booking_id?: string | null; // UUID type to match bookings.id
  amount: number;
  currency: string; // Default 'EUR'
  status: PaymentRequestStatus;
  email_sent_at?: string | null;
  payment_due_date?: string | null; // Use payment_due_date to match database column name
  notes?: string | null;
  created_by_admin_email?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: number;
  invoice_id?: number | null;
  customer_id: number;
  booking_id?: string | null; // UUID type to match bookings.id
  sumup_transaction_id?: string | null;
  amount: number;
  currency: string; // Default 'EUR'
  status: PaymentStatus;
  payment_method?: string | null;
  sumup_checkout_id?: string | null;
  sumup_payment_type?: string | null;
  failure_reason?: string | null;
  refund_amount?: number | null;
  refund_reason?: string | null;
  payment_date?: string | null;
  created_at: string;
  updated_at: string;
  notes?: string | null;
}

export type PaymentRequestStatus = 'pending' | 'sent' | 'paid' | 'expired' | 'cancelled';
export type PaymentStatus = 'pending' | 'processing' | 'paid' | 'failed' | 'refunded' | 'cancelled';

// Extended interfaces for UI display with customer/booking information
export interface PaymentRequestWithCustomer extends PaymentRequest {
  customer: {
    first_name: string;
    last_name: string;
    email: string;
  };
  service_name?: string;
  booking_date?: string;
  payment_type?: 'deposit' | 'full';
  visit_type?: 'clinic' | 'home' | 'online';
}

export interface PaymentWithCustomer extends Payment {
  customer: {
    first_name: string;
    last_name: string;
    email: string;
  };
  invoice_number?: string;
}

export interface BookingWithPayment {
  // Booking information from existing schema
  id: string;
  booking_reference?: string; // New field for human-readable booking reference (YYYY-MM-DD-000)
  customer_id: number;
  package_name: string;
  booking_date: string;
  timeslot_start_time: string;
  timeslot_end_time: string;
  status: string;
  notes?: string;
  created_at: string;
  
  // Customer information
  customer: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
  
  // Payment information  
  payment_request?: PaymentRequest;
  total_cost: number;
  deposit_amount: number; // 20% of total_cost
}

export interface ServicePricing {
  service_name: string;
  base_cost: number;
  currency: string;
  deposit_percentage: number; // Usually 20%
}

// Admin dashboard types
export interface AdminPaymentOverview {
  booking_id: string;
  customer_name: string;
  service_name: string;
  booking_date: string;
  total_amount: number;
  deposit_requested: number;
  amount_paid: number;
  payment_status: 'unpaid' | 'deposit_paid' | 'fully_paid';
  payment_requests: PaymentRequest[];
  payments: Payment[];
}

// API request/response types
export interface CreatePaymentRequestData {
  customer_id: number;
  invoice_id?: number | null;
  booking_id?: string | null; // UUID type to match bookings.id
  service_name?: string; // Add service_name field
  amount: number;
  currency?: string;
  payment_due_date?: string; // Use payment_due_date to match existing database column
  notes?: string;
  created_by_admin_email?: string;
}

export interface ProcessPaymentData {
  payment_request_id: number;
  sumup_checkout_id: string;
  sumup_checkout_reference?: string;
  sumup_transaction_id?: string;
  payment_method?: string;
  sumup_payment_type?: string;
}

// Payment status display helpers
export interface PaymentStatusInfo {
  text: string;
  color: 'green' | 'yellow' | 'red' | 'blue' | 'gray';
  icon: string;
}

export const PAYMENT_REQUEST_STATUS_INFO: Record<PaymentRequestStatus, PaymentStatusInfo> = {
  pending: { text: 'Pending', color: 'gray', icon: 'clock' },
  sent: { text: 'Sent', color: 'blue', icon: 'mail' },
  paid: { text: 'Paid', color: 'green', icon: 'check' },
  expired: { text: 'Expired', color: 'red', icon: 'x' },
  cancelled: { text: 'Cancelled', color: 'red', icon: 'x' }
};

export const PAYMENT_STATUS_INFO: Record<PaymentStatus, PaymentStatusInfo> = {
  pending: { text: 'Pending', color: 'gray', icon: 'clock' },
  processing: { text: 'Processing', color: 'blue', icon: 'loader' },
  paid: { text: 'Paid', color: 'green', icon: 'check' },
  failed: { text: 'Failed', color: 'red', icon: 'x' },
  refunded: { text: 'Refunded', color: 'yellow', icon: 'refresh' },
  cancelled: { text: 'Cancelled', color: 'red', icon: 'x' }
};
