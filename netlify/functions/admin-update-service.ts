/**
 * Admin Service Update Function
 * Updates service details using service role key
 * This bypasses RLS policies for admin operations
 */

import { createClient } from '@supabase/supabase-js';

interface UpdateServiceRequest {
  serviceId: number;
  name: string;
  category?: string[];
  price?: number | null;
  in_hour_price?: number | null;
  out_of_hour_price?: number | null;
  features?: string[];
  description?: string;
  booking_type?: string;
  visit_type?: string;
  is_active?: boolean;
}

interface UpdateServiceResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export const handler = async (event: any): Promise<any> => {
  // CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  try {
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
        body: JSON.stringify({ success: false, error: 'Method not allowed' })
      };
    }

    console.log('admin-update-service: Received request');

    // Get Supabase credentials from server environment
    const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    console.log('admin-update-service: Config check', {
      hasUrl: !!SUPABASE_URL,
      hasKey: !!SUPABASE_SERVICE_KEY
    });

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      console.error('CRITICAL: Supabase credentials not configured');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          success: false,
          error: 'Server configuration error: Missing Supabase credentials'
        })
      };
    }

    // Create Supabase client with service role key (bypasses RLS)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Parse request body
    const body: UpdateServiceRequest = JSON.parse(event.body || '{}');
    
    console.log('admin-update-service: Parsed body', { serviceId: body.serviceId, name: body.name });

    if (!body.serviceId || !body.name) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false,
          error: 'Service ID and name are required'
        })
      };
    }

    // Build update object with only provided fields
    const updateData: any = {
      name: body.name.trim(),
      category: body.category || null,
      price: body.price || null,
      in_hour_price: body.in_hour_price || null,
      out_of_hour_price: body.out_of_hour_price || null,
      features: body.features || [],
      description: body.description || null,
      booking_type: body.booking_type || 'book_now',
      visit_type: body.visit_type || 'clinic',
      is_active: body.is_active !== undefined ? body.is_active : true,
      updated_at: new Date().toISOString()
    };

    console.log('admin-update-service: Update data', { serviceId: body.serviceId, ...updateData });

    // Update the service in database
    const { data, error } = await supabase
      .from('services')
      .update(updateData)
      .eq('id', body.serviceId)
      .select()
      .single();

    console.log('admin-update-service: Update result', { error: error?.message, hasData: !!data });

    if (error) {
      console.error('Database update error:', error);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false,
          error: error.message || 'Failed to update service'
        })
      };
    }

    const response = {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: data
      })
    };

    console.log('admin-update-service: Sending success response');
    return response;
  } catch (error: any) {
    console.error('Error in admin-update-service:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message || 'Internal server error'
      })
    };
  }
};
