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
import { PaymentRecord } from '../services/invoiceService';
import { decryptCustomerPII, encryptSensitiveData, isDataEncrypted } from './gdprUtils';
import { decryptCustomerPIIServer, encryptSensitiveDataServer, isDataEncrypted as isDataEncryptedServer } from './encryptionServerWrapper';

/**
 * Get customer by auth user ID
 */
export const getCustomerByAuthId = async (authUserId: string): Promise<{ customer: UserCustomer | null; error?: string }> => {
  try {
    // Optimized query with timeout for production
    const queryPromise = supabase
      .from('customers')
      .select('*')
      .eq('auth_user_id', authUserId)
      .eq('is_active', true)
      .single();

    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Database query timeout')), 8000)
    );

    const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching customer by auth ID:', error);
      return { customer: null, error: error.message };
    }

    if (data) {
      // Decrypt customer PII data for profile display (server-side decryption)
      const decryptedCustomer = await decryptCustomerPIIServer(data);
      return { customer: decryptedCustomer };
    }

    return { customer: data };
  } catch (error) {
    console.error('Exception in getCustomerByAuthId:', error);
    return { customer: null, error: 'Unexpected error occurred' };
  }
};

/**
 * Get customer by email (for custom authentication)
 * Handles multiple customers with same email by returning the most recently active one
 * For backwards compatibility with single-patient login
 */
export const getCustomerByEmail = async (email: string): Promise<{ customer: UserCustomer | null; error?: string }> => {
  try {
    const { patients, error } = await getAllPatientsByEmail(email);
    
    if (error) {
      return { customer: null, error };
    }

    if (!patients || patients.length === 0) {
      return { customer: null };
    }

    // Return the primary patient (most recently active)
    return { customer: patients[0] };
  } catch (error) {
    console.error('Exception in getCustomerByEmail:', error);
    return { customer: null, error: 'Unexpected error occurred' };
  }
};

/**
 * Get all patients/customers associated with an email address
 * This is the main function for multi-patient support
 */
export const getAllPatientsByEmail = async (email: string): Promise<{ patients: UserCustomer[] | null; error?: string }> => {
  try {
    // Query with all customer fields including address data for complete user profile
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('is_active', true)
      .order('last_login', { ascending: false, nullsFirst: false })
      .order('updated_at', { ascending: false })
      .order('first_name', { ascending: true }); // Secondary sort by name for consistency

    if (error) {
      console.error('Error fetching patients by email:', error);
      return { patients: null, error: error.message };
    }

    if (!data || data.length === 0) {
      return { patients: null };
    }

    // Decrypt all patient PII data (server-side decryption)
    const decryptedPatients = await Promise.all(
      data.map(patient => decryptCustomerPIIServer(patient))
    );
    return { patients: decryptedPatients };
  } catch (error) {
    console.error('Exception in getAllPatientsByEmail:', error);
    return { patients: null, error: 'Unexpected error occurred' };
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

    if (data) {
      // Decrypt customer PII data for display (server-side decryption)
      const decryptedCustomer = await decryptCustomerPIIServer(data);
      return { customer: decryptedCustomer };
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
    // Prepare the update data
    const updateData: Record<string, string | null | undefined> = {
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
    };

    // Encrypt sensitive fields before saving (server-side encryption)
    const sensitiveFields = [
      'first_name', 
      'last_name', 
      'phone', 
      'address_line_1', 
      'address_line_2', 
      'city', 
      'county', 
      'eircode',
      'date_of_birth',
      'emergency_contact_name',
      'emergency_contact_phone'
    ];

    for (const field of sensitiveFields) {
      if (updateData[field] && !isDataEncryptedServer(updateData[field])) {
        try {
          updateData[field] = await encryptSensitiveDataServer(updateData[field], field);
        } catch (encryptError) {
          console.error(`Failed to encrypt field ${field}:`, encryptError);
          throw encryptError;
        }
      }
    }

    const { error } = await supabase
      .from('customers')
      .update(updateData)
      .eq('id', customerId);

    if (error) {
      console.error('Error updating user profile:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        customerId: customerId
      });
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
    if (!newPassword) {
      return { success: false, error: 'New password is required' };
    }
    // Simulate using newPassword to avoid unused variable error
    void newPassword;
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
    // Get all invoices for this customer with their items
    const { data: invoicesData, error: invoicesError } = await supabase
      .from('invoices')
      .select(`
        *,
        items:invoice_items(*)
      `)
      .eq('customer_id', parseInt(customerId))
      .in('status', ['sent', 'paid']) // Include both sent and paid invoices
      .order('invoice_date', { ascending: false }); // Most recent first

    if (invoicesError) {
      console.error('Error fetching user invoices:', invoicesError);
      return { invoices: [], error: invoicesError.message };
    }

    // Then, get all payments for this customer
    const { data: paymentsData, error: paymentsError } = await supabase
      .from('payments')
      .select(`
        id,
        invoice_id,
        customer_id,
        booking_id,
        amount,
        currency,
        status,
        payment_method,
        sumup_checkout_id,
        sumup_payment_type,
        payment_date,
        notes,
        created_at
      `)
      .eq('customer_id', parseInt(customerId))
      .order('created_at', { ascending: false });

    if (paymentsError) {
      console.error('Error fetching user payments:', paymentsError);
      // Continue without payments data rather than failing completely
    }

    // Add overdue calculation and combine invoices with their payments
    const invoices = invoicesData?.map(invoice => {
      const isOverdue = invoice.status === 'sent' && invoice.due_date && new Date(invoice.due_date) < new Date();
      let daysOverdue = 0;
      
      if (isOverdue && invoice.due_date) {
        const today = new Date();
        const dueDate = new Date(invoice.due_date);
        daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      }
      
      // Find payments for this invoice by booking_id (for deposits) OR invoice_id (for additional payments)
      const invoicePayments = paymentsData?.filter(payment => {
        // Match by booking_id (for deposits) if invoice has booking_id
        if (invoice.booking_id && payment.booking_id === invoice.booking_id) {
          return true;
        }
        // Match by invoice_id (for additional payments)
        if (payment.invoice_id === invoice.id) {
          return true;
        }
        return false;
      }) || [];
      
      const mappedPayments = invoicePayments.map((p: PaymentRecord) => ({
        id: p.id,
        amount: p.amount,
        status: p.status,
        booking_id: p.booking_id,
        invoice_id: p.invoice_id,
        notes: p.notes,
        payment_method: p.payment_method,
        sumup_checkout_id: p.sumup_checkout_id,
        matchedBy: (invoice.booking_id && p.booking_id === invoice.booking_id) ? 'booking_id' : 'invoice_id'
      }));
      
      return {
        ...invoice,
        is_overdue: isOverdue,
        days_overdue: daysOverdue,
        payments: mappedPayments
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
export const getUserPaymentHistory = async (customerId: string): Promise<{ payments: PaymentHistoryItem[]; error?: string }> => {
  try {
    // Get payment history from invoice items or a payments table if you have one
    // For now, we'll return empty array since payment tracking might be implemented later
    // You could implement this based on your payment system
    // TODO: Use customerId to fetch actual payment history
    const payments: PaymentHistoryItem[] = [];
    // Fetching payment history for customer

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
    // Get real bookings for this customer - show pending and confirmed bookings
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('customer_id', parseInt(customerId))
      .in('status', ['pending', 'confirmed'])
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

    // Get real bookings for this customer - show pending and confirmed bookings
    const { data: bookings } = await supabase
      .from('bookings')
      .select('*')
      .eq('customer_id', parseInt(customerId))
      .in('status', ['pending', 'confirmed'])
      .order('booking_date', { ascending: false })
      .limit(5);

    // Get real payments for this customer
    const payments = await getCustomerPayments(parseInt(customerId));
    const recentPayments = payments.slice(0, 3); // Show last 3 payments

    // Get payment requests for this customer
    const { getCustomerPaymentRequests } = await import('./paymentRequestUtils');
    const paymentRequests = await getCustomerPaymentRequests(parseInt(customerId));

    // Calculate stats from real data - include both invoices and payment requests
    const outstandingInvoices = invoices?.reduce((sum, inv) => 
      inv.status === 'sent' ? sum + (inv.total_amount || 0) : sum, 0) || 0;
    const outstandingPaymentRequests = paymentRequests?.reduce((sum, req) => 
      (req.status === 'pending' || req.status === 'sent') ? sum + (req.amount || 0) : sum, 0) || 0;
    const totalOutstanding = outstandingInvoices + outstandingPaymentRequests;
    
    const overdueInvoices = invoices?.filter(inv => 
      inv.status === 'sent' && inv.due_date && new Date(inv.due_date) < new Date()
    ).length || 0;
    const overduePaymentRequests = paymentRequests?.filter(req => 
      (req.status === 'pending' || req.status === 'sent') &&
      req.payment_due_date && 
      new Date(req.payment_due_date) < new Date()
    ).length || 0;
    const overdueCount = overdueInvoices + overduePaymentRequests;

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
        (booking.status === 'confirmed' || booking.status === 'pending') && new Date(booking.booking_date) > new Date()
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
 * Get consolidated dashboard data for multiple patients
 */
export const getConsolidatedDashboardData = async (patients: UserCustomer[]): Promise<{ data: UserDashboardData | null; error?: string }> => {
  try {
    if (patients.length === 0) {
      return { data: null, error: 'No patients provided' };
    }

    // Use the first patient as the primary customer for display purposes
    const primaryCustomer = patients[0];
    
    // Collect data from all patients
    let allInvoices: any[] = [];
    let allBookings: any[] = [];
    let allPayments: any[] = [];
    let allPaymentRequests: any[] = [];

    for (const patient of patients) {
      // Get invoices for this patient
      const { data: invoicesData } = await supabase
        .from('invoices')
        .select('*')
        .eq('customer_id', patient.id)
        .in('status', ['sent', 'paid'])
        .order('invoice_date', { ascending: false });

      if (invoicesData) {
        const invoicesWithOverdue = invoicesData.map(invoice => ({
          ...invoice,
          is_overdue: invoice.status === 'sent' && invoice.due_date && new Date(invoice.due_date) < new Date(),
          patient_name: `${patient.first_name} ${patient.last_name}` // Add patient name for reference
        }));
        allInvoices = [...allInvoices, ...invoicesWithOverdue];
      }

      // Get bookings for this patient
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select('*')
        .eq('customer_id', patient.id)
        .in('status', ['pending', 'confirmed'])
        .order('booking_date', { ascending: false });

      if (bookingsData) {
        const bookingsWithPatient = bookingsData.map(booking => ({
          ...booking,
          patient_name: `${patient.first_name} ${patient.last_name}`
        }));
        allBookings = [...allBookings, ...bookingsWithPatient];
      }

      // Get payments for this patient
      const payments = await getCustomerPayments(patient.id);
      const paymentsWithPatient = payments.map(payment => ({
        ...payment,
        patient_name: `${patient.first_name} ${patient.last_name}`
      }));
      allPayments = [...allPayments, ...paymentsWithPatient];

      // Get payment requests for this patient
      const { getCustomerPaymentRequests } = await import('./paymentRequestUtils');
      const paymentRequests = await getCustomerPaymentRequests(patient.id);
      const paymentRequestsWithPatient = paymentRequests.map(req => ({
        ...req,
        patient_name: `${patient.first_name} ${patient.last_name}`
      }));
      allPaymentRequests = [...allPaymentRequests, ...paymentRequestsWithPatient];
    }

    // Sort all data by date (most recent first)
    allInvoices.sort((a, b) => new Date(b.invoice_date || 0).getTime() - new Date(a.invoice_date || 0).getTime());
    allBookings.sort((a, b) => new Date(b.booking_date || 0).getTime() - new Date(a.booking_date || 0).getTime());
    allPayments.sort((a, b) => new Date(b.payment_date || b.created_at || 0).getTime() - new Date(a.payment_date || a.created_at || 0).getTime());

    // Calculate consolidated stats
    const outstandingInvoices = allInvoices.reduce((sum, inv) => 
      inv.status === 'sent' ? sum + (inv.total_amount || 0) : sum, 0);
    const outstandingPaymentRequests = allPaymentRequests.reduce((sum, req) => 
      (req.status === 'pending' || req.status === 'sent') ? sum + (req.amount || 0) : sum, 0);
    const totalOutstanding = outstandingInvoices + outstandingPaymentRequests;
    
    const overdueInvoices = allInvoices.filter(inv => 
      inv.status === 'sent' && inv.due_date && new Date(inv.due_date) < new Date()
    ).length;
    const overduePaymentRequests = allPaymentRequests.filter(req => 
      (req.status === 'pending' || req.status === 'sent') &&
      req.payment_due_date && 
      new Date(req.payment_due_date) < new Date()
    ).length;
    const overdueCount = overdueInvoices + overduePaymentRequests;

    const totalPaid = allPayments.reduce((sum, payment) => 
      payment.status === 'paid' ? sum + payment.amount : sum, 0);

    const dashboardData: UserDashboardData = {
      customer: primaryCustomer,
      recentInvoices: allInvoices.slice(0, 5), // Show top 5 most recent
      recentPayments: allPayments.slice(0, 5).map(payment => ({
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
        sumup_payment_type: payment.sumup_payment_type || undefined,
        patient_name: payment.patient_name // Add patient name
      })),
      overdueInvoices: allInvoices.filter(inv => 
        inv.status === 'sent' && inv.due_date && new Date(inv.due_date) < new Date()
      ),
      totalOutstanding: totalOutstanding,
      upcomingBookings: allBookings.filter(booking =>
        (booking.status === 'confirmed' || booking.status === 'pending') && new Date(booking.booking_date) > new Date()
      ).slice(0, 5), // Show top 5 upcoming
      stats: {
        totalInvoices: allInvoices.length,
        totalPaid: totalPaid,
        totalOutstanding: totalOutstanding,
        overdueCount: overdueCount
      }
    };

    return { data: dashboardData };
  } catch (error) {
    console.error('Exception in getConsolidatedDashboardData:', error);
    return { data: null, error: 'Unexpected error occurred' };
  }
};

/**
 * Format currency as Euro with proper spacing
 */
export const formatCurrency = (amount: number): string => {
  const formatted = new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount);
  
  // Add space between currency symbol and amount for consistency
  return formatted.replace(/^€/, '€ ');
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

