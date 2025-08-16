import { supabase } from '../supabaseClient';

export interface PaymentRequest {
  id: number; // Changed from string to number to match SERIAL
  customer_id: number;
  customer_name: string;
  customer_email: string;
  service_name: string;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'failed' | 'cancelled';
  due_date: string;
  created_at: string;
  booking_id?: string; // UUID as string
  invoice_id?: number;
}

export interface Payment {
  id: string; // UUID
  payment_request_id: number; // Changed from string to number
  amount: number;
  currency: string;
  status: 'completed' | 'failed' | 'pending';
  payment_method: string;
  transaction_id: string;
  created_at: string;
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
  customer_name: string;
  customer_email: string;
  package_name: string;
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
    const { data, error } = await supabase
      .from('payment_requests')
      .select(`
        *,
        customers:customer_id (
          name,
          email
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching payment requests:', error);
      return [];
    }

    return data?.map(pr => ({
      id: pr.id,
      customer_id: pr.customer_id,
      customer_name: pr.customers?.name || 'Unknown',
      customer_email: pr.customers?.email || 'Unknown',
      service_name: pr.service_name || 'Unknown Service',
      amount: pr.amount,
      currency: pr.currency || 'EUR',
      status: pr.status,
      due_date: pr.due_date,
      created_at: pr.created_at,
      booking_id: pr.booking_id,
      invoice_id: pr.invoice_id
    })) || [];
  } catch (error) {
    console.error('Error in getAllPaymentRequests:', error);
    return [];
  }
};

/**
 * Get all payments with related information
 */
export const getAllPayments = async (): Promise<Payment[]> => {
  try {
    const { data, error } = await supabase
      .from('payments_tracking') // Updated to use the new table name
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching payments:', error);
      return [];
    }

    return data || [];
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
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        customers:customer_id (
          name
        ),
        payments:payment_requests (
          amount,
          status
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching invoices with payments:', error);
      return [];
    }

    return data?.map(invoice => {
      const paidPayments = invoice.payments?.filter(p => p.status === 'paid') || [];
      const paidAmount = paidPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      
      return {
        id: invoice.id,
        customer_id: invoice.customer_id,
        customer_name: invoice.customers?.name || 'Unknown',
        total_amount: invoice.total_amount,
        paid_amount: paidAmount,
        remaining_amount: invoice.total_amount - paidAmount,
        status: invoice.status,
        created_at: invoice.created_at
      };
    }) || [];
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
    // First get all bookings with customer info
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select(`
        id,
        package_name,
        status,
        booking_date,
        customers:customer_id (
          name,
          email
        )
      `)
      .order('booking_date', { ascending: false });

    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError);
      return [];
    }

    // Get all payment requests to check which bookings already have them
    const { data: paymentRequests, error: prError } = await supabase
      .from('payment_requests')
      .select('booking_id')
      .not('booking_id', 'is', null);

    if (prError) {
      console.error('Error fetching payment requests:', prError);
      return [];
    }

    const bookingIdsWithPayments = new Set(paymentRequests?.map(pr => pr.booking_id) || []);

    return bookings?.filter(booking => !bookingIdsWithPayments.has(booking.id))
      .map(booking => ({
        id: booking.id,
        customer_name: booking.customers?.name || 'Unknown',
        customer_email: booking.customers?.email || 'Unknown',
        package_name: booking.package_name,
        status: booking.status,
        booking_date: booking.booking_date,
        has_payment_request: false
      })) || [];
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
        due_date: requestData.due_date,
        booking_id: requestData.booking_id,
        created_at: new Date().toISOString()
      }])
      .select(`
        *,
        customers:customer_id (
          name,
          email
        )
      `)
      .single();

    if (error) {
      console.error('Error creating payment request:', error);
      return null;
    }

    return {
      id: data.id,
      customer_id: data.customer_id,
      customer_name: data.customers?.name || 'Unknown',
      customer_email: data.customers?.email || 'Unknown',
      service_name: data.service_name,
      amount: data.amount,
      currency: data.currency,
      status: data.status,
      due_date: data.due_date,
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
    const paidAmount = paymentRequests.filter(pr => pr.status === 'paid').reduce((sum, pr) => sum + pr.amount, 0);
    const outstandingAmount = totalAmount - paidAmount;

    const paymentRate = totalRequests > 0 ? (paidRequests / totalRequests * 100) : 0;

    return {
      totalRequests,
      pendingRequests,
      paidRequests,
      failedRequests,
      totalAmount,
      paidAmount,
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
