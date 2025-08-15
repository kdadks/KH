// User Management Types for Customer Portal System

export interface UserCustomer {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  county?: string;
  eircode?: string;
  country?: string;
  date_of_birth?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  medical_notes?: string;
  is_active?: boolean;
  auth_user_id?: string;
  is_email_verified?: boolean;
  email_verification_token?: string;
  email_verification_sent_at?: string;
  password?: string;
  password_change_required?: boolean;
  must_change_password?: boolean;
  first_login?: boolean;
  last_login?: string;
  password_reset_token?: string;
  password_reset_expires_at?: string;
  password_reset_requested_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface UserInvoice {
  id: number;
  invoice_number: string;
  customer_id: number;
  booking_id?: string;
  invoice_date: string;
  due_date: string;
  subtotal: number;
  vat_rate: number;
  vat_amount: number;
  total_amount: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  payment_method?: string;
  payment_date?: string;
  payment_request_sent?: boolean;
  payment_request_sent_at?: string;
  last_payment_reminder_sent?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  // Calculated fields
  days_overdue?: number;
  is_overdue?: boolean;
  // Related data
  items?: UserInvoiceItem[];
  payments?: UserPayment[];
  booking?: UserBooking;
}

export interface UserInvoiceItem {
  id: number;
  invoice_id: number;
  service_id?: number;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at?: string;
}

export interface UserPayment {
  id: number;
  invoice_id: number;
  customer_id: number;
  sumup_transaction_id?: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'paid' | 'failed' | 'refunded' | 'cancelled';
  payment_method?: string;
  sumup_checkout_id?: string;
  sumup_payment_type?: string;
  failure_reason?: string;
  refund_amount?: number;
  refund_reason?: string;
  payment_date?: string;
  created_at?: string;
  updated_at?: string;
  notes?: string;
  // Related data
  invoice?: UserInvoice;
}

export interface PaymentRequest {
  id: number;
  invoice_id: number;
  customer_id: number;
  request_token: string;
  sumup_checkout_url?: string;
  amount: number;
  currency: string;
  status: 'sent' | 'opened' | 'expired' | 'completed' | 'cancelled';
  expires_at: string;
  sent_at?: string;
  opened_at?: string;
  completed_at?: string;
  created_at?: string;
  updated_at?: string;
  // Related data
  invoice?: UserInvoice;
}

export interface UserBooking {
  id: string;
  customer_id: number;
  package_name: string;
  booking_date?: string;
  timeslot_start_time?: string;
  timeslot_end_time?: string;
  notes?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface UserSession {
  id: number;
  customer_id: number;
  auth_user_id: string;
  session_token: string;
  expires_at: string;
  created_at?: string;
  last_accessed_at?: string;
  ip_address?: string;
  user_agent?: string;
}

// Form Data Types
export interface UserRegistrationData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password: string;
  confirmPassword: string;
}

export interface UserLoginData {
  email: string;
  password: string;
}

export interface UserProfileUpdateData {
  first_name: string;
  last_name: string;
  phone?: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  county?: string;
  eircode?: string;
  country?: string;
  date_of_birth?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
}

export interface UserPasswordChangeData {
  currentPassword?: string;
  newPassword: string;
  confirmPassword: string;
}

export interface PasswordResetRequestData {
  email: string;
}

export interface PasswordResetData {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

// Dashboard Data Types
export interface UserDashboardData {
  customer: UserCustomer;
  recentInvoices: UserInvoice[];
  overdueInvoices: UserInvoice[];
  recentPayments: UserPayment[];
  totalOutstanding: number;
  upcomingBookings: UserBooking[];
  stats: {
    totalInvoices: number;
    totalPaid: number;
    totalOutstanding: number;
    overdueCount: number;
  };
}

// SumUp Integration Types
export interface SumUpCheckoutRequest {
  checkout_reference: string;
  amount: number;
  currency: string;
  pay_to_email: string;
  description: string;
  return_url?: string;
  cancel_url?: string;
  customer_id?: string;
  customer_email?: string;
}

export interface SumUpCheckoutResponse {
  id: string;
  checkout_reference: string;
  amount: number;
  currency: string;
  status: string;
  date: string;
  merchant_code: string;
  description: string;
  return_url?: string;
  cancel_url?: string;
}

export interface SumUpWebhookPayload {
  id: string;
  event_type: 'CHECKOUT_COMPLETED' | 'CHECKOUT_FAILED' | 'REFUND_COMPLETED';
  resource_type: 'CHECKOUT' | 'REFUND';
  resource_id: string;
  summary: string;
  body: {
    id: string;
    checkout_reference?: string;
    amount: number;
    currency: string;
    status: string;
    payment_type?: string;
    installments_count?: number;
    date: string;
    merchant_code: string;
    description?: string;
    transactions?: Array<{
      id: string;
      transaction_code: string;
      amount: number;
      currency: string;
      timestamp: string;
      status: string;
      payment_type: string;
      entry_mode: string;
      authorization_code?: string;
    }>;
  };
}

// API Response Types
export interface UserApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Email Template Types
export interface EmailVerificationTemplate {
  to_email: string;
  to_name: string;
  verification_link: string;
  customer_name: string;
}

export interface PaymentRequestTemplate {
  to_email: string;
  to_name: string;
  invoice_number: string;
  amount: number;
  due_date: string;
  payment_link: string;
  customer_name: string;
}

export interface PaymentConfirmationTemplate {
  to_email: string;
  to_name: string;
  invoice_number: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  transaction_id: string;
  customer_name: string;
}

// Utility Types
export type UserPortalTab = 'dashboard' | 'profile' | 'invoices' | 'payments' | 'bookings';

export interface UserPortalNavigation {
  currentTab: UserPortalTab;
  setCurrentTab: (tab: UserPortalTab) => void;
}

export interface OverdueInvoice {
  id: number;
  invoice_number: string;
  total_amount: number;
  due_date: string;
  days_overdue: number;
}

export interface PaymentHistoryItem {
  id: number;
  invoice_number: string;
  amount: number;
  status: string;
  payment_date?: string;
  payment_method?: string;
}

// Authentication Context Types
export interface UserAuthContext {
  user: UserCustomer | null;
  authUser: any | null; // Supabase auth user
  loading: boolean;
  isAdmin: boolean; // Admin detection based on authUser without customer profile
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  register: (data: UserRegistrationData) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (data: UserProfileUpdateData) => Promise<{ success: boolean; error?: string }>;
  changePassword: (data: UserPasswordChangeData) => Promise<{ success: boolean; error?: string }>;
  requestPasswordReset: (email: string) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (data: PasswordResetData) => Promise<{ success: boolean; error?: string }>;
  validateResetToken: (token: string) => Promise<{ success: boolean; error?: string; customerEmail?: string }>;
  refreshUser: () => Promise<void>;
}

// Error Types
export interface UserManagementError {
  code: string;
  message: string;
  field?: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

// Constants
export const PAYMENT_STATUSES = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  PAID: 'paid',
  FAILED: 'failed',
  REFUNDED: 'refunded',
  CANCELLED: 'cancelled'
} as const;

export const INVOICE_STATUSES = {
  DRAFT: 'draft',
  SENT: 'sent',
  PAID: 'paid',
  OVERDUE: 'overdue',
  CANCELLED: 'cancelled'
} as const;

export const PAYMENT_REQUEST_STATUSES = {
  SENT: 'sent',
  OPENED: 'opened',
  EXPIRED: 'expired',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
} as const;
