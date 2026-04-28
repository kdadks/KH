/**
 * Server-side Customer Invoice Retrieval Function
 * Fetches invoices for a customer using service role key (bypasses RLS)
 * 
 * Since the app uses custom authentication (not Supabase Auth),
 * the customer portal's Supabase client has no auth session.
 * RLS policies that rely on auth.uid() block all queries.
 * This function uses the service role key to bypass RLS safely.
 */

import { createClient } from '@supabase/supabase-js';

interface GetInvoicesRequest {
  customerId: number;
}

export const handler = async (event: any): Promise<any> => {
  // CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Get Supabase credentials from server environment
    const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      console.error('CRITICAL: Supabase credentials not configured');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          success: false,
          error: 'Server configuration error'
        })
      };
    }

    // Create Supabase client with service role key (bypasses RLS)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Parse request body
    const body: GetInvoicesRequest = JSON.parse(event.body || '{}');
    
    if (!body.customerId || typeof body.customerId !== 'number') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false,
          error: 'Valid customer ID is required'
        })
      };
    }

    // Fetch invoices for this customer with their items
    const { data: invoicesData, error: invoicesError } = await supabase
      .from('invoices')
      .select(`
        *,
        items:invoice_items(*)
      `)
      .eq('customer_id', body.customerId)
      .in('status', ['sent', 'paid'])
      .order('invoice_date', { ascending: false });

    if (invoicesError) {
      console.error('Error fetching invoices:', invoicesError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          success: false,
          invoices: [],
          error: invoicesError.message
        })
      };
    }

    // Fetch payments for this customer
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
      .eq('customer_id', body.customerId)
      .order('created_at', { ascending: false });

    if (paymentsError) {
      console.error('Error fetching payments (non-fatal):', paymentsError);
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
        if (invoice.booking_id && payment.booking_id === invoice.booking_id) {
          return true;
        }
        if (payment.invoice_id === invoice.id) {
          return true;
        }
        return false;
      }) || [];
      
      const mappedPayments = invoicePayments.map((p: any) => ({
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

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        invoices
      })
    };

  } catch (error) {
    console.error('Get customer invoices error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false,
        invoices: [],
        error: 'Failed to fetch invoices'
      })
    };
  }
};
