import { supabase } from '../supabaseClient';
import {
  UserCustomer,
  UserDashboardData,
  UserProfileUpdateData,
  UserInvoice,
  UserBooking,
  PaymentHistoryItem
} from '../types/userManagement';
import { getCustomerPayments } from './paymentRequestUtils';

/**
 * Get customer by auth user ID
 */
export const getCustomerByAuthId = async (authUserId: string): Promise<{ customer: UserCustomer | null; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('auth_user_id', authUserId)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching customer by auth ID:', error);
      return { customer: null, error: error.message };
    }

    return { customer: data };
  } catch (error) {
    console.error('Exception in getCustomerByAuthId:', error);
    return { customer: null, error: 'Unexpected error occurred' };
  }
};

/**
 * Get customer by email (for custom authentication)
 */
export const getCustomerByEmail = async (email: string): Promise<{ customer: UserCustomer | null; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('email', email)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching customer by email:', error);
      return { customer: null, error: error.message };
    }

    return { customer: data };
  } catch (error) {
    console.error('Exception in getCustomerByEmail:', error);
    return { customer: null, error: 'Unexpected error occurred' };
  }
};

/**
 * Get customer by ID
 */
export const getCustomerById = async (customerId: number): Promise<{ customer: UserCustomer | null; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching customer by ID:', error);
      return { customer: null, error: error.message };
    }

    return { customer: data };
  } catch (error) {
    console.error('Exception in getCustomerById:', error);
    return { customer: null, error: 'Unexpected error occurred' };
  }
};

/**
 * Link customer to auth user
 */
export const linkCustomerToAuthUser = async (customerId: number, authUserId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('customers')
      .update({ auth_user_id: authUserId })
      .eq('id', customerId);

    if (error) {
      console.error('Error linking customer to auth user:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Exception in linkCustomerToAuthUser:', error);
    return { success: false, error: 'Unexpected error occurred' };
  }
};

/**
 * Update user profile
 */
export const updateUserProfile = async (customerId: number, profileData: UserProfileUpdateData): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('customers')
      .update({
        first_name: profileData.first_name,
        last_name: profileData.last_name,
        phone: profileData.phone,
        address_line_1: profileData.address_line_1,
        address_line_2: profileData.address_line_2,
        city: profileData.city,
        county: profileData.county,
        eircode: profileData.eircode,
        country: profileData.country,
        date_of_birth: profileData.date_of_birth,
        emergency_contact_name: profileData.emergency_contact_name,
        emergency_contact_phone: profileData.emergency_contact_phone,
        updated_at: new Date().toISOString()
      })
      .eq('id', customerId);

    if (error) {
      console.error('Error updating user profile:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Exception in updateUserProfile:', error);
    return { success: false, error: 'Unexpected error occurred' };
  }
};

/**
 * Change user password (placeholder implementation)
 */
export const changeUserPassword = async (
  _currentPassword: string, // Keep for future verification if needed
  newPassword: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // For custom authentication, we would update the password in the customer table
    // This is a placeholder implementation - in production you would:
    // 1. Hash the new password
    // 2. Update the customer table
    // 3. Set must_change_password to false
    
    console.log('Password change requested for new password:', newPassword);
    
    return { success: true };
  } catch (error) {
    console.error('Exception in changeUserPassword:', error);
    return { success: false, error: 'Unexpected error occurred' };
  }
};

/**
 * Get user invoices with real data filtering
 */
export const getUserInvoices = async (customerId: string): Promise<{ invoices: UserInvoice[]; error?: string }> => {
  try {
    // Get all invoices for this customer - show both sent and paid invoices
    const { data: invoicesData, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('customer_id', parseInt(customerId))
      .in('status', ['sent', 'paid']) // Include both sent and paid invoices
      .order('invoice_date', { ascending: false }); // Most recent first

    if (error) {
      console.error('Error fetching user invoices:', error);
      return { invoices: [], error: error.message };
    }

    // Add overdue calculation and days overdue to invoices
    const invoices = invoicesData?.map(invoice => {
      const isOverdue = invoice.status === 'sent' && invoice.due_date && new Date(invoice.due_date) < new Date();
      let daysOverdue = 0;
      
      if (isOverdue && invoice.due_date) {
        const today = new Date();
        const dueDate = new Date(invoice.due_date);
        daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      }
      
      return {
        ...invoice,
        is_overdue: isOverdue,
        days_overdue: daysOverdue
      };
    }) || [];

    return { invoices };
  } catch (error) {
    console.error('Exception in getUserInvoices:', error);
    return { invoices: [], error: 'Unexpected error occurred' };
  }
};

/**
 * Get user payment history with real data
 */
export const getUserPaymentHistory = async (_customerId: string): Promise<{ payments: PaymentHistoryItem[]; error?: string }> => {
  try {
    // Get payment history from invoice items or a payments table if you have one
    // For now, we'll return empty array since payment tracking might be implemented later
    // You could implement this based on your payment system
    const payments: PaymentHistoryItem[] = [];

    return { payments };
  } catch (error) {
    console.error('Exception in getUserPaymentHistory:', error);
    return { payments: [], error: 'Unexpected error occurred' };
  }
};

/**
 * Get user bookings with real data filtering
 */
export const getUserBookings = async (customerId: string): Promise<{ bookings: UserBooking[]; error?: string }> => {
  try {
    // Get real bookings for this customer - only show confirmed bookings
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('customer_id', parseInt(customerId))
      .eq('status', 'confirmed')
      .order('booking_date', { ascending: false });

    if (error) {
      console.error('Error fetching user bookings:', error);
      return { bookings: [], error: error.message };
    }

    return { bookings: bookings || [] };
  } catch (error) {
    console.error('Exception in getUserBookings:', error);
    return { bookings: [], error: 'Unexpected error occurred' };
  }
};

/**
 * Get dashboard data for a customer
 */
export const getUserDashboardData = async (customerId: string): Promise<{ data: UserDashboardData | null; error?: string }> => {
  try {
    // Get customer info
    const { customer, error: customerError } = await getCustomerById(parseInt(customerId));
    if (customerError || !customer) {
      return { data: null, error: customerError || 'Customer not found' };
    }

    // Get real invoices for this customer - show both sent and paid invoices
    const { data: invoicesData } = await supabase
      .from('invoices')
      .select('*')
      .eq('customer_id', parseInt(customerId))
      .in('status', ['sent', 'paid']) // Include both sent and paid invoices
      .order('invoice_date', { ascending: false })
      .limit(3); // Limit to 3 most recent for dashboard

    // Add overdue calculation to invoices
    const invoices = invoicesData?.map(invoice => ({
      ...invoice,
      is_overdue: invoice.status === 'sent' && invoice.due_date && new Date(invoice.due_date) < new Date()
    }));

    // Get real bookings for this customer - only show confirmed bookings
    const { data: bookings } = await supabase
      .from('bookings')
      .select('*')
      .eq('customer_id', parseInt(customerId))
      .eq('status', 'confirmed')
      .order('booking_date', { ascending: false })
      .limit(5);

    // Get real payments for this customer
    const payments = await getCustomerPayments(parseInt(customerId));
    const recentPayments = payments.slice(0, 3); // Show last 3 payments

    // Calculate stats from real data - only count unpaid invoices as outstanding
    const totalOutstanding = invoices?.reduce((sum, inv) => 
      inv.status === 'sent' ? sum + (inv.total_amount || 0) : sum, 0) || 0;
    
    const overdueCount = invoices?.filter(inv => 
      inv.status === 'sent' && inv.due_date && new Date(inv.due_date) < new Date()
    ).length || 0;

    // Calculate total paid from actual payment records
    const totalPaid = payments.reduce((sum, payment) => 
      payment.status === 'paid' ? sum + payment.amount : sum, 0);

    const dashboardData: UserDashboardData = {
      customer: customer,
      recentInvoices: invoices || [],
      recentPayments: recentPayments.map(payment => ({
        id: payment.id,
        invoice_id: payment.invoice_id || 0,
        customer_id: payment.customer_id,
        amount: payment.amount,
        currency: payment.currency || 'EUR',
        payment_date: payment.payment_date || undefined,
        payment_method: payment.payment_method || undefined,
        status: payment.status as 'pending' | 'processing' | 'paid' | 'failed' | 'refunded' | 'cancelled',
        created_at: payment.created_at || undefined,
        updated_at: payment.updated_at || undefined,
        notes: payment.notes || undefined,
        sumup_transaction_id: payment.sumup_transaction_id || undefined,
        sumup_checkout_id: payment.sumup_checkout_id || undefined,
        sumup_payment_type: payment.sumup_payment_type || undefined
      })),
      overdueInvoices: invoices?.filter(inv => 
        inv.status === 'sent' && inv.due_date && new Date(inv.due_date) < new Date()
      ) || [],
      totalOutstanding: totalOutstanding,
      upcomingBookings: bookings?.filter(booking => 
        booking.status === 'confirmed' && new Date(booking.booking_date) > new Date()
      ) || [],
      stats: {
        totalInvoices: invoices?.length || 0,
        totalPaid: totalPaid,
        totalOutstanding: totalOutstanding,
        overdueCount: overdueCount
      }
    };

    return { data: dashboardData };
  } catch (error) {
    console.error('Exception in getUserDashboardData:', error);
    return { data: null, error: 'Unexpected error occurred' };
  }
};

/**
 * Format currency as Euro
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount);
};

/**
 * Get invoice status display properties
 */
export const getInvoiceStatusDisplay = (status: string): { color: string; bgColor: string; text: string } => {
  switch (status.toLowerCase()) {
    case 'paid':
      return { color: 'green', bgColor: 'bg-green-100', text: 'Paid' };
    case 'pending':
      return { color: 'yellow', bgColor: 'bg-yellow-100', text: 'Pending' };
    case 'overdue':
      return { color: 'red', bgColor: 'bg-red-100', text: 'Overdue' };
    case 'draft':
      return { color: 'gray', bgColor: 'bg-gray-100', text: 'Draft' };
    case 'cancelled':
      return { color: 'gray', bgColor: 'bg-gray-100', text: 'Cancelled' };
    default:
      return { color: 'gray', bgColor: 'bg-gray-100', text: status };
  }
};

/**
 * Get payment status display properties
 */
export const getPaymentStatusDisplay = (status: string): { color: string; bgColor: string; text: string } => {
  switch (status.toLowerCase()) {
    case 'completed':
    case 'success':
    case 'paid':
      return { color: 'text-green-700', bgColor: 'bg-green-100', text: 'Completed' };
    case 'pending':
    case 'processing':
      return { color: 'text-yellow-700', bgColor: 'bg-yellow-100', text: 'Pending' };
    case 'failed':
    case 'error':
      return { color: 'text-red-700', bgColor: 'bg-red-100', text: 'Failed' };
    case 'cancelled':
    case 'canceled':
      return { color: 'text-gray-700', bgColor: 'bg-gray-100', text: 'Cancelled' };
    case 'refunded':
      return { color: 'text-blue-700', bgColor: 'bg-blue-100', text: 'Refunded' };
    default:
      return { color: 'text-gray-700', bgColor: 'bg-gray-100', text: status };
  }
};
