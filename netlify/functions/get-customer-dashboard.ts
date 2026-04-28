/**
 * Server-side Customer Dashboard Data Retrieval Function
 * Fetches dashboard data (invoices, bookings, payments) using service role key (bypasses RLS)
 * 
 * Since the app uses custom authentication (not Supabase Auth),
 * the customer portal's Supabase client has no auth session.
 * RLS policies that rely on auth.uid() block all queries.
 */

import { createClient } from '@supabase/supabase-js';

interface GetDashboardRequest {
  customerIds: number[]; // Support multi-patient by passing multiple customer IDs
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
    const body: GetDashboardRequest = JSON.parse(event.body || '{}');
    
    if (!body.customerIds || !Array.isArray(body.customerIds) || body.customerIds.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false,
          error: 'Valid customer IDs array is required'
        })
      };
    }

    // Fetch invoices for all customer IDs
    const { data: invoicesData, error: invoicesError } = await supabase
      .from('invoices')
      .select('*')
      .in('customer_id', body.customerIds)
      .in('status', ['sent', 'paid'])
      .order('invoice_date', { ascending: false });

    if (invoicesError) {
      console.error('Error fetching invoices:', invoicesError);
    }

    // Add overdue calculation to invoices
    const invoices = invoicesData?.map(invoice => ({
      ...invoice,
      is_overdue: invoice.status === 'sent' && invoice.due_date && new Date(invoice.due_date) < new Date(),
      days_overdue: (() => {
        if (invoice.status === 'sent' && invoice.due_date && new Date(invoice.due_date) < new Date()) {
          return Math.floor((new Date().getTime() - new Date(invoice.due_date).getTime()) / (1000 * 60 * 60 * 24));
        }
        return 0;
      })()
    })) || [];

    // Fetch bookings for all customer IDs
    const { data: bookingsData, error: bookingsError } = await supabase
      .from('bookings')
      .select('*')
      .in('customer_id', body.customerIds)
      .in('status', ['pending', 'confirmed'])
      .order('booking_date', { ascending: false });

    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError);
    }

    // Fetch payments for all customer IDs
    const { data: paymentsData, error: paymentsError } = await supabase
      .from('payments')
      .select('*')
      .in('customer_id', body.customerIds)
      .order('created_at', { ascending: false });

    if (paymentsError) {
      console.error('Error fetching payments:', paymentsError);
    }

    // Fetch payment requests for all customer IDs
    const { data: paymentRequestsData, error: paymentRequestsError } = await supabase
      .from('payment_requests')
      .select('*')
      .in('customer_id', body.customerIds)
      .order('created_at', { ascending: false });

    if (paymentRequestsError) {
      console.error('Error fetching payment requests:', paymentRequestsError);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        invoices: invoices || [],
        bookings: bookingsData || [],
        payments: paymentsData || [],
        paymentRequests: paymentRequestsData || []
      })
    };

  } catch (error) {
    console.error('Get customer dashboard data error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: 'Failed to fetch dashboard data'
      })
    };
  }
};
