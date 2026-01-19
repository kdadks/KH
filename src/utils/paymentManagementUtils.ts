import { supabase } from '../supabaseClient';
import { decryptSensitiveData, isDataEncrypted } from './gdprUtils';
import { decryptSensitiveDataServer, isDataEncrypted as isDataEncryptedServer } from './encryptionServerWrapper';
import { getPaymentEnvironment, getSumUpEnvironmentConfig } from './environmentDetection';

export interface PaymentRequest {
  id: number; // Changed from string to number to match SERIAL
  customer_id: number;
  customer_name: string;
  customer_email: string;
  service_name: string;
  visit_type?: 'home' | 'online' | 'clinic'; // Added visit type
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'failed' | 'cancelled';
  due_date: string;
  created_at: string;
  booking_id?: string; // UUID as string
  invoice_id?: number;
  notes?: string; // Added for additional notes
}

export interface Payment {
  id: string; // UUID
  payment_request_id: number; // Changed from string to number
  amount: number;
  currency: string;
  status: 'completed' | 'failed' | 'pending' | 'paid';
  payment_method: string;
  transaction_id: string;
  created_at: string;
  customer_name?: string; // Added for display
  customer_email?: string; // Added for display
  service_name?: string; // Added for display
  visit_type?: 'home' | 'online' | 'clinic'; // Added visit type
  payment_date?: string; // Added for actual payment date
  // Extended fields from Supabase payments table
  customer_id?: number;
  invoice_id?: number | null;
  booking_id?: string | null;
  sumup_transaction_id?: string | null;
  sumup_checkout_id?: string | null;
  sumup_checkout_reference?: string | null;
  sumup_payment_type?: 'deposit' | 'full' | null;
  failure_reason?: string | null;
  refund_amount?: string | null;
  refund_reason?: string | null;
  notes?: string | null;
  updated_at?: string;
  webhook_processed_at?: string | null;
  sumup_event_type?: string | null;
  sumup_event_id?: string | null;
}

export interface InvoiceWithPayments {
  id: number;
  customer_id: number;
  customer_name: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  status: string;
  created_at: string;
}

export interface BookingWithoutPayment {
  id: string;
  customer_id: number;
  customer_name: string;
  customer_email: string;
  package_name: string;
  visit_type?: 'home' | 'online' | 'clinic';
  status: string;
  booking_date: string;
  has_payment_request: boolean;
}

export interface PaymentGateway {
  id: string;
  name: string;
  provider: 'sumup' | 'stripe' | 'paypal';
  environment: 'sandbox' | 'production';
  api_key: string;
  secret_key?: string;
  webhook_url?: string;
  merchant_id?: string;
  client_id?: string;
  is_active: boolean;
  created_at: string;
}

/**
 * Get all payment requests with customer information
 */
export const getAllPaymentRequests = async (): Promise<PaymentRequest[]> => {
  try {
    // First, let's try a simpler approach by getting payment requests and customers separately
    const { data: paymentRequestsData, error: prError } = await supabase
      .from('payment_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (prError) {
      console.error('Error fetching payment requests:', prError);
      return [];
    }

    if (!paymentRequestsData || paymentRequestsData.length === 0) {
      return [];
    }

    // Get unique customer IDs
    const customerIds = [...new Set(paymentRequestsData.map(pr => pr.customer_id))];
    
    // Fetch customer data
    const { data: customersData, error: customersError } = await supabase
      .from('customers')
      .select('id, first_name, last_name, email')
      .in('id', customerIds);

    if (customersError) {
      console.error('Error fetching customers:', customersError);
      // Return payment requests without customer names if customer fetch fails
      return paymentRequestsData.map(pr => ({
        id: pr.id,
        customer_id: pr.customer_id,
        customer_name: 'Unknown',
        customer_email: 'Unknown',
        service_name: pr.service_name || 'Unknown Service',
        amount: pr.amount || 0,
        currency: pr.currency || 'EUR',
        status: pr.status || 'pending',
        due_date: pr.payment_due_date, // Use payment_due_date column from database
        created_at: pr.created_at,
        booking_id: pr.booking_id,
        invoice_id: pr.invoice_id
      }));
    }

    // Create customer lookup map with decrypted data
    const customerMap = new Map();
    customersData?.forEach(customer => {
      // Decrypt customer name fields
      const decryptedFirstName = customer.first_name && isDataEncrypted(customer.first_name) 
        ? decryptSensitiveData(customer.first_name) 
        : customer.first_name || '';
      const decryptedLastName = customer.last_name && isDataEncrypted(customer.last_name) 
        ? decryptSensitiveData(customer.last_name) 
        : customer.last_name || '';
      
      customerMap.set(customer.id, {
        ...customer,
        name: `${decryptedFirstName} ${decryptedLastName}`.trim() || 'Unknown',
        email: customer.email || 'Unknown'
      });
    });

    // Get unique booking IDs to fetch visit_type
    const bookingIds = [...new Set(paymentRequestsData.map(pr => pr.booking_id).filter(Boolean))];
    
    // Fetch booking data to get visit_type
    const bookingMap = new Map();
    if (bookingIds.length > 0) {
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select('id, package_name, visit_type')
        .in('id', bookingIds);
      
      bookingsData?.forEach(booking => {
        bookingMap.set(booking.id, {
          package_name: booking.package_name,
          visit_type: booking.visit_type
        });
      });
    }

    // Combine payment requests with customer data
    return paymentRequestsData.map(pr => {
      const customer = customerMap.get(pr.customer_id);
      const booking = bookingMap.get(pr.booking_id);
      
      // Extract service name - try service_name column first, then parse from notes
      let serviceName = pr.service_name;
      if (!serviceName && pr.notes) {
        // Extract service name from notes for legacy records
        const depositMatch = pr.notes.match(/deposit for (.+?) appointment/);
        const paymentMatch = pr.notes.match(/Payment for (.+?) -/);
        serviceName = depositMatch?.[1] || paymentMatch?.[1] || 'Unknown Service';
      }
      
      return {
        id: pr.id,
        customer_id: pr.customer_id,
        customer_name: customer?.name || 'Unknown',
        customer_email: customer?.email || 'Unknown',
        service_name: serviceName || booking?.package_name || 'Unknown Service',
        amount: pr.amount || 0,
        currency: pr.currency || 'EUR',
        status: pr.status || 'pending',
        due_date: pr.payment_due_date, // Use payment_due_date column from database
        created_at: pr.created_at,
        booking_id: pr.booking_id,
        invoice_id: pr.invoice_id,
        visit_type: booking?.visit_type
      };
    });

  } catch (error) {
    console.error('Error in getAllPaymentRequests:', error);
    return [];
  }
};

/**
 * Get recent payments with customer and service details
 */
export const getRecentPayments = async (limit: number = 5): Promise<Payment[]> => {
  try {
    // Get recent payments from the main payments table (actual completed payments)
    const { data: paymentsData, error: paymentsError } = await supabase
      .from('payments')
      .select(`
        id,
        amount,
        currency,
        status,
        payment_method,
        sumup_transaction_id,
        payment_date,
        created_at,
        customer_id,
        invoice_id,
        booking_id
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (paymentsError) {
      console.error('Error fetching recent payments:', paymentsError);
      return [];
    }

    if (!paymentsData || paymentsData.length === 0) {
      return [];
    }

    // Get customer details for these payments
    const customerIds = [...new Set(paymentsData.map(p => p.customer_id))];
    const { data: customersData, error: customersError } = await supabase
      .from('customers')
      .select('id, first_name, last_name, email')
      .in('id', customerIds);

    if (customersError) {
      console.error('Error fetching customers for payments:', customersError);
    }

    // Get booking details to determine service names
    const bookingIds = [...new Set(paymentsData.map(p => p.booking_id).filter(Boolean))];
    let bookingsData: any[] = [];
    if (bookingIds.length > 0) {
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .select('id, package_name, visit_type')
        .in('id', bookingIds);
      
      if (!bookingError) {
        bookingsData = bookingData || [];
      }
    }

    // Create lookup maps
    const customerMap = new Map();
    customersData?.forEach(customer => {
      // Decrypt customer name fields if needed
      const decryptedFirstName = customer.first_name && isDataEncrypted(customer.first_name) 
        ? decryptSensitiveData(customer.first_name) 
        : customer.first_name || '';
      const decryptedLastName = customer.last_name && isDataEncrypted(customer.last_name) 
        ? decryptSensitiveData(customer.last_name) 
        : customer.last_name || '';
      
      customerMap.set(customer.id, {
        name: `${decryptedFirstName} ${decryptedLastName}`.trim() || 'Unknown Customer',
        email: customer.email || 'Unknown'
      });
    });

    const bookingMap = new Map();
    bookingsData.forEach(booking => {
      bookingMap.set(booking.id, {
        package_name: booking.package_name || 'Payment',
        visit_type: booking.visit_type
      });
    });

    // Combine payment data with customer and service information
    return paymentsData.map(payment => ({
      id: payment.id?.toString() || '',
      payment_request_id: 0, // Not applicable for direct payments
      amount: payment.amount || 0,
      currency: payment.currency || 'EUR',
      status: 'completed' as const,
      payment_method: payment.payment_method || 'Unknown',
      transaction_id: payment.sumup_transaction_id || '',
      created_at: payment.created_at || '',
      customer_name: customerMap.get(payment.customer_id)?.name || 'Unknown Customer',
      customer_email: customerMap.get(payment.customer_id)?.email || 'Unknown',
      service_name: bookingMap.get(payment.booking_id)?.package_name || 'Payment',
      visit_type: bookingMap.get(payment.booking_id)?.visit_type,
      payment_date: payment.payment_date || payment.created_at
    }));

  } catch (error) {
    console.error('Error in getRecentPayments:', error);
    return [];
  }
};

/**
 * Get all payments with related information
 */
export const getAllPayments = async (): Promise<Payment[]> => {
  try {
    // Get payments from the main payments table (actual completed payments)
    const { data: paymentsData, error: paymentsError } = await supabase
      .from('payments')
      .select(`
        id,
        amount,
        currency,
        status,
        payment_method,
        sumup_transaction_id,
        sumup_checkout_id,
        sumup_checkout_reference,
        sumup_payment_type,
        payment_date,
        created_at,
        updated_at,
        customer_id,
        invoice_id,
        booking_id,
        payment_request_id,
        failure_reason,
        refund_amount,
        refund_reason,
        notes,
        webhook_processed_at,
        sumup_event_type,
        sumup_event_id
      `)
      .order('created_at', { ascending: false });

    if (paymentsError) {
      console.error('Error fetching payments:', paymentsError);
      return [];
    }

    if (!paymentsData || paymentsData.length === 0) {
      return [];
    }

    // Get customer details for these payments
    const customerIds = [...new Set(paymentsData.map(p => p.customer_id))];
    const { data: customersData, error: customersError } = await supabase
      .from('customers')
      .select('id, first_name, last_name, email')
      .in('id', customerIds);

    if (customersError) {
      console.error('Error fetching customers for payments:', customersError);
    }

    // Get booking details to determine service names
    const bookingIds = [...new Set(paymentsData.map(p => p.booking_id).filter(Boolean))];
    let bookingsData: any[] = [];
    if (bookingIds.length > 0) {
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .select('id, package_name, visit_type')
        .in('id', bookingIds);
      
      if (!bookingError) {
        bookingsData = bookingData || [];
      }
    }

    // Create lookup maps
    const customerMap = new Map();
    customersData?.forEach(customer => {
      // Decrypt customer name fields if needed
      const decryptedFirstName = customer.first_name && isDataEncrypted(customer.first_name) 
        ? decryptSensitiveData(customer.first_name) 
        : customer.first_name || '';
      const decryptedLastName = customer.last_name && isDataEncrypted(customer.last_name) 
        ? decryptSensitiveData(customer.last_name) 
        : customer.last_name || '';
      
      customerMap.set(customer.id, {
        name: `${decryptedFirstName} ${decryptedLastName}`.trim() || 'Unknown Customer',
        email: customer.email || 'Unknown'
      });
    });

    const bookingMap = new Map();
    bookingsData.forEach(booking => {
      bookingMap.set(booking.id, {
        package_name: booking.package_name || 'Payment',
        visit_type: booking.visit_type
      });
    });

    // Combine payment data with customer and service information
    return paymentsData.map(payment => ({
      id: payment.id?.toString() || '',
      payment_request_id: payment.payment_request_id || 0,
      amount: payment.amount || 0,
      currency: payment.currency || 'EUR',
      status: payment.status === 'paid' ? 'completed' as const : payment.status as 'completed' | 'failed' | 'pending' | 'paid',
      payment_method: payment.payment_method || 'Unknown',
      transaction_id: payment.sumup_transaction_id || '', // Use sumup_transaction_id as transaction_id
      created_at: payment.created_at || '',
      customer_name: customerMap.get(payment.customer_id)?.name || 'Unknown Customer',
      customer_email: customerMap.get(payment.customer_id)?.email || 'Unknown',
      service_name: bookingMap.get(payment.booking_id)?.package_name || 'Payment',
      visit_type: bookingMap.get(payment.booking_id)?.visit_type,
      payment_date: payment.payment_date || payment.created_at,
      // Extended fields
      customer_id: payment.customer_id,
      invoice_id: payment.invoice_id,
      booking_id: payment.booking_id,
      sumup_transaction_id: payment.sumup_transaction_id,
      sumup_checkout_id: payment.sumup_checkout_id,
      sumup_checkout_reference: payment.sumup_checkout_reference,
      sumup_payment_type: payment.sumup_payment_type,
      failure_reason: payment.failure_reason,
      refund_amount: payment.refund_amount,
      refund_reason: payment.refund_reason,
      notes: payment.notes,
      updated_at: payment.updated_at,
      webhook_processed_at: payment.webhook_processed_at,
      sumup_event_type: payment.sumup_event_type,
      sumup_event_id: payment.sumup_event_id
    }));

  } catch (error) {
    console.error('Error in getAllPayments:', error);
    return [];
  }
};

/**
 * Get invoices with payment tracking information
 */
export const getInvoicesWithPaymentTracking = async (): Promise<InvoiceWithPayments[]> => {
  try {
    // First get all invoices
    const { data: invoicesData, error: invoicesError } = await supabase
      .from('invoices')
      .select('*')
      .order('created_at', { ascending: false });

    if (invoicesError) {
      console.error('Error fetching invoices:', invoicesError);
      return [];
    }

    if (!invoicesData || invoicesData.length === 0) {
      return [];
    }

    // Get unique customer IDs
    const customerIds = [...new Set(invoicesData.map(inv => inv.customer_id))];
    
    // Fetch customer data
    const { data: customersData, error: customersError } = await supabase
      .from('customers')
      .select('id, name')
      .in('id', customerIds);

    if (customersError) {
      console.error('Error fetching customers for invoices:', customersError);
    }

    // Get payment requests for these invoices
    const invoiceIds = invoicesData.map(inv => inv.id);
    const { data: paymentRequestsData, error: prError } = await supabase
      .from('payment_requests')
      .select('invoice_id, amount, status')
      .in('invoice_id', invoiceIds);

    if (prError) {
      console.error('Error fetching payment requests for invoices:', prError);
    }

    // Create lookup maps
    const customerMap = new Map();
    customersData?.forEach(customer => {
      customerMap.set(customer.id, customer);
    });

    const paymentsByInvoice = new Map();
    paymentRequestsData?.forEach(pr => {
      if (!paymentsByInvoice.has(pr.invoice_id)) {
        paymentsByInvoice.set(pr.invoice_id, []);
      }
      paymentsByInvoice.get(pr.invoice_id).push(pr);
    });

    return invoicesData.map(invoice => {
      const customer = customerMap.get(invoice.customer_id);
      const payments = paymentsByInvoice.get(invoice.id) || [];
      const paidAmount = payments
        .filter((p: any) => p.status === 'paid')
        .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
      
      return {
        id: invoice.id,
        customer_id: invoice.customer_id,
        customer_name: customer?.name || 'Unknown',
        total_amount: invoice.total_amount,
        paid_amount: paidAmount,
        remaining_amount: invoice.total_amount - paidAmount,
        status: invoice.status,
        created_at: invoice.created_at
      };
    });
  } catch (error) {
    console.error('Error in getInvoicesWithPaymentTracking:', error);
    return [];
  }
};

/**
 * Get bookings that don't have payment requests yet
 */
export const getBookingsWithoutPaymentRequests = async (): Promise<BookingWithoutPayment[]> => {
  try {
    // First get all bookings
    const { data: bookingsData, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, booking_reference, package_name, visit_type, status, booking_date, customer_id')
      .order('booking_date', { ascending: false });

    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError);
      return [];
    }

    if (!bookingsData || bookingsData.length === 0) {
      return [];
    }

    // Get all payment requests to check which bookings already have them
    const { data: paymentRequestsData, error: prError } = await supabase
      .from('payment_requests')
      .select('booking_id')
      .not('booking_id', 'is', null);

    if (prError) {
      console.error('Error fetching payment requests:', prError);
      return [];
    }

    const bookingIdsWithPayments = new Set(paymentRequestsData?.map(pr => pr.booking_id) || []);

    // Filter bookings without payment requests
    const bookingsWithoutPayments = bookingsData.filter(booking => 
      !bookingIdsWithPayments.has(booking.id)
    );

    if (bookingsWithoutPayments.length === 0) {
      return [];
    }

    // Get customer data for the filtered bookings
    const customerIds = [...new Set(bookingsWithoutPayments.map(b => b.customer_id))];
    const { data: customersData, error: customersError } = await supabase
      .from('customers')
      .select('id, first_name, last_name, email')
      .in('id', customerIds);

    if (customersError) {
      console.error('Error fetching customers for bookings:', customersError);
    }

    // Create customer lookup map
    const customerMap = new Map();
    customersData?.forEach(customer => {
      // Decrypt customer names if they are encrypted
      const decryptedFirstName = customer.first_name && isDataEncrypted(customer.first_name) 
        ? decryptSensitiveData(customer.first_name) 
        : customer.first_name || '';
      const decryptedLastName = customer.last_name && isDataEncrypted(customer.last_name) 
        ? decryptSensitiveData(customer.last_name) 
        : customer.last_name || '';
      
      customerMap.set(customer.id, {
        name: `${decryptedFirstName} ${decryptedLastName}`.trim() || 'Unknown Customer',
        email: customer.email || 'Unknown'
      });
    });

    return bookingsWithoutPayments.map(booking => {
      const customer = customerMap.get(booking.customer_id);
      return {
        id: booking.id,
        customer_id: booking.customer_id,
        customer_name: customer?.name || 'Unknown',
        customer_email: customer?.email || 'Unknown',
        package_name: booking.package_name,
        visit_type: booking.visit_type,
        status: booking.status,
        booking_date: booking.booking_date,
        has_payment_request: false
      };
    });
  } catch (error) {
    console.error('Error in getBookingsWithoutPaymentRequests:', error);
    return [];
  }
};

/**
 * Get all configured payment gateways
 */
export const getAllPaymentGateways = async (): Promise<PaymentGateway[]> => {
  try {
    const { data, error } = await supabase
      .from('payment_gateways')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching payment gateways:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getAllPaymentGateways:', error);
    return [];
  }
};

/**
 * Create a new payment request manually
 */
export const createManualPaymentRequest = async (requestData: {
  customer_id: number;
  service_name: string;
  amount: number;
  currency?: string;
  due_date: string;
  booking_id?: string;
}): Promise<PaymentRequest | null> => {
  try {
    const { data, error } = await supabase
      .from('payment_requests')
      .insert([{
        customer_id: requestData.customer_id,
        service_name: requestData.service_name,
        amount: requestData.amount,
        currency: requestData.currency || 'EUR',
        status: 'pending',
        payment_due_date: requestData.due_date, // Insert into payment_due_date column
        booking_id: requestData.booking_id,
        created_at: new Date().toISOString()
      }])
      .select('*')
      .single();

    if (error) {
      console.error('Error creating payment request:', error);
      return null;
    }

    // Fetch customer data separately
    const { data: customerData, error: customerError } = await supabase
      .from('customers')
      .select('name, email')
      .eq('id', requestData.customer_id)
      .single();

    if (customerError) {
      console.error('Error fetching customer data:', customerError);
    }

    return {
      id: data.id,
      customer_id: data.customer_id,
      customer_name: customerData?.name || 'Unknown',
      customer_email: customerData?.email || 'Unknown',
      service_name: data.service_name,
      amount: data.amount,
      currency: data.currency,
      status: data.status,
      due_date: data.payment_due_date, // Use payment_due_date column from database
      created_at: data.created_at,
      booking_id: data.booking_id
    };
  } catch (error) {
    console.error('Error in createManualPaymentRequest:', error);
    return null;
  }
};

/**
 * Update payment request status
 */
export const updatePaymentRequestStatus = async (
  requestId: number, // Changed from string to number
  status: 'pending' | 'paid' | 'failed' | 'cancelled'
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('payment_requests')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', requestId);

    if (error) {
      console.error('Error updating payment request status:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in updatePaymentRequestStatus:', error);
    return false;
  }
};

/**
 * Update payment request with comprehensive data
 */
export const updatePaymentRequest = async (
  requestId: number,
  updateData: {
    amount?: number;
    due_date?: string;
    notes?: string;
    status?: 'pending' | 'paid' | 'failed' | 'cancelled';
  }
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('payment_requests')
      .update({ ...updateData, updated_at: new Date().toISOString() })
      .eq('id', requestId);

    if (error) {
      console.error('Error updating payment request:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in updatePaymentRequest:', error);
    return false;
  }
};

/**
 * Delete a payment request
 */
export const deletePaymentRequest = async (requestId: number): Promise<boolean> => { // Changed from string to number
  try {
    const { error } = await supabase
      .from('payment_requests')
      .delete()
      .eq('id', requestId);

    if (error) {
      console.error('Error deleting payment request:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deletePaymentRequest:', error);
    return false;
  }
};

/**
 * Save or update payment gateway configuration
 */
export const savePaymentGateway = async (gateway: Partial<PaymentGateway>): Promise<PaymentGateway | null> => {
  try {
    const gatewayData = {
      name: gateway.name,
      provider: gateway.provider,
      environment: gateway.environment,
      api_key: gateway.api_key,
      secret_key: gateway.secret_key,
      webhook_url: gateway.webhook_url,
      merchant_id: gateway.merchant_id,
      client_id: gateway.client_id,
      is_active: gateway.is_active || false,
      updated_at: new Date().toISOString()
    };

    let result;
    if (gateway.id) {
      // Update existing gateway
      const { data, error } = await supabase
        .from('payment_gateways')
        .update(gatewayData)
        .eq('id', gateway.id)
        .select()
        .single();
      
      result = { data, error };
    } else {
      // Create new gateway
      const { data, error } = await supabase
        .from('payment_gateways')
        .insert([{ ...gatewayData, created_at: new Date().toISOString() }])
        .select()
        .single();
      
      result = { data, error };
    }

    if (result.error) {
      console.error('Error saving payment gateway:', result.error);
      return null;
    }

    return result.data;
  } catch (error) {
    console.error('Error in savePaymentGateway:', error);
    return null;
  }
};

/**
 * Delete a payment gateway
 */
export const deletePaymentGateway = async (gatewayId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('payment_gateways')
      .delete()
      .eq('id', gatewayId);

    if (error) {
      console.error('Error deleting payment gateway:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deletePaymentGateway:', error);
    return false;
  }
};

/**
 * Get payment statistics for overview
 */
export const getPaymentStatistics = async () => {
  try {
    const [paymentRequests, payments] = await Promise.all([
      getAllPaymentRequests(),
      getAllPayments()
    ]);

    const totalRequests = paymentRequests.length;
    const pendingRequests = paymentRequests.filter(pr => pr.status === 'pending').length;
    const paidRequests = paymentRequests.filter(pr => pr.status === 'paid').length;
    const failedRequests = paymentRequests.filter(pr => pr.status === 'failed').length;

    const totalAmount = paymentRequests.reduce((sum, pr) => sum + pr.amount, 0);
    // Calculate actual paid amount from completed payments
    const actualPaidAmount = payments
      .filter(payment => payment.status === 'completed')
      .reduce((sum, payment) => sum + payment.amount, 0);
    
    // Use the higher of the two (payment requests marked as paid vs actual payments)
    const paidAmount = Math.max(
      paymentRequests.filter(pr => pr.status === 'paid').reduce((sum, pr) => sum + pr.amount, 0),
      actualPaidAmount
    );
    
    const outstandingAmount = totalAmount - paidAmount;

    const paymentRate = totalRequests > 0 ? (paidRequests / totalRequests * 100) : 0;

    return {
      totalRequests,
      pendingRequests,
      paidRequests,
      failedRequests,
      totalAmount,
      paidAmount: actualPaidAmount, // Show actual payments made
      outstandingAmount,
      paymentRate: parseFloat(paymentRate.toFixed(1)),
      totalPayments: payments.length,
      recentActivity: paymentRequests.slice(0, 10) // Last 10 for recent activity
    };
  } catch (error) {
    console.error('Error getting payment statistics:', error);
    return {
      totalRequests: 0,
      pendingRequests: 0,
      paidRequests: 0,
      failedRequests: 0,
      totalAmount: 0,
      paidAmount: 0,
      outstandingAmount: 0,
      paymentRate: 0,
      totalPayments: 0,
      recentActivity: []
    };
  }
};

/**
 * Get the active SumUp payment gateway configuration
 * Now enhanced with domain-based environment detection
 */
export const getActiveSumUpGateway = async (): Promise<{
  api_key: string;
  merchant_id: string;
  environment: 'sandbox' | 'production';
} | null> => {
  try {
    // First, detect the current environment based on domain
    const currentEnvironment = getPaymentEnvironment();
    const sumupEnvConfig = getSumUpEnvironmentConfig();
    
    console.log(`🔍 Getting SumUp gateway config for ${currentEnvironment} environment`);
    
    // Try to get environment-specific configuration from database
    const { data, error } = await supabase
      .from('payment_gateways')
      .select('api_key, merchant_id, environment')
      .eq('provider', 'sumup')
      .eq('environment', currentEnvironment) // Filter by detected environment
      .eq('is_active', true)
      .single();

    if (error || !data) {
      if (error?.code === 'PGRST116' || error?.code === 'PGRST123') {
        console.warn('No active SumUp gateway accessible via Supabase (likely blocked by RLS or no matching row). Falling back to environment variables.');
      } else if (error) {
        console.warn('Failed to fetch SumUp gateway from database:', error.message || error);
        console.warn('Falling back to environment variables.');
      } else {
        console.warn('No active SumUp gateway found in database, falling back to environment variables');
      }
      
      // Fallback to environment variables with domain-based configuration
      const envApiKey = sumupEnvConfig.apiKey || import.meta.env.VITE_SUMUP_API_KEY;
      const envMerchantId = sumupEnvConfig.merchantCode || import.meta.env.VITE_SUMUP_MERCHANT_CODE;
      const envEnvironment = currentEnvironment; // Use detected environment
      
      if (!envApiKey || !envMerchantId) {
        console.error(`❌ SumUp ${currentEnvironment} configuration missing in both database and environment variables`);
        console.error(`📝 Please set VITE_SUMUP_${currentEnvironment.toUpperCase()}_API_KEY and VITE_SUMUP_${currentEnvironment.toUpperCase()}_MERCHANT_CODE in .env file`);
        console.error('🔗 Get your API key from: https://developer.sumup.com');
        return null;
      }
      
      if (envApiKey.includes('your-real-sumup') || envApiKey.includes('dev-mode-placeholder') || envApiKey === 'development-mode') {
        console.warn('⚠️ Using development mode - placeholder API key detected');
        console.warn('🔑 For production, replace with real API key from SumUp developer portal');
        console.warn('🔗 Get your API key from: https://developer.sumup.com');
        
        // Return config for development mode
        return {
          api_key: 'development-mode',
          merchant_id: envMerchantId,
          environment: envEnvironment as 'sandbox' | 'production'
        };
      }
      
      if (envApiKey.length < 10) {
        console.error('❌ Invalid SumUp API key detected - too short');
        console.error('🔑 Please replace with real API key from SumUp developer portal');
        console.error('🔗 Get your API key from: https://developer.sumup.com');
        return null;
      }
      
      if (envApiKey && envMerchantId) {
        console.log(`Using SumUp ${currentEnvironment} configuration from environment variables`);
        return {
          api_key: envApiKey,
          merchant_id: envMerchantId,
          environment: currentEnvironment
        };
      }
      
      console.error('No SumUp configuration found in database or environment variables');
      return null;
    }

    console.log(`Using SumUp ${currentEnvironment} configuration from database`);
    return {
      api_key: data.api_key,
      merchant_id: data.merchant_id,
      environment: currentEnvironment // Use detected environment instead of database value
    };
  } catch (error) {
    console.error('Error in getActiveSumUpGateway:', error);
    
    // Fallback to environment variables on error
    const envApiKey = import.meta.env.VITE_SUMUP_API_KEY;
    const envMerchantId = import.meta.env.VITE_SUMUP_MERCHANT_CODE;
    const envEnvironment = import.meta.env.VITE_SUMUP_ENVIRONMENT || 'sandbox';
    
    if (!envApiKey || !envMerchantId) {
      console.error('❌ SumUp configuration missing in both database and environment variables');
      return null;
    }
    
    if (envApiKey.includes('your-real-sumup') || envApiKey.length < 10) {
      console.error('❌ Invalid SumUp API key detected - appears to be placeholder');
      return null;
    }
    
    if (envApiKey && envMerchantId) {
      console.log('Using SumUp configuration from environment variables (fallback)');
      return {
        api_key: envApiKey,
        merchant_id: envMerchantId,
        environment: envEnvironment as 'sandbox' | 'production'
      };
    }
    
    return null;
  }
};
