/**
 * Server-side Customer Bookings Retrieval Function
 * Fetches bookings for customer(s) using service role key (bypasses RLS)
 */

import { createClient } from '@supabase/supabase-js';

interface GetBookingsRequest {
  customerIds: number[];
}

export const handler = async (event: any): Promise<any> => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ success: false, error: 'Server configuration error' })
      };
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const body: GetBookingsRequest = JSON.parse(event.body || '{}');
    
    if (!body.customerIds || !Array.isArray(body.customerIds) || body.customerIds.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Valid customer IDs array is required' })
      };
    }

    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('*')
      .in('customer_id', body.customerIds)
      .in('status', ['pending', 'confirmed'])
      .order('booking_date', { ascending: false });

    if (error) {
      console.error('Error fetching bookings:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ success: false, bookings: [], error: error.message })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, bookings: bookings || [] })
    };

  } catch (error) {
    console.error('Get customer bookings error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, bookings: [], error: 'Failed to fetch bookings' })
    };
  }
};
