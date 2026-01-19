/**
 * Server-side Password Update Function
 * Updates customer password securely using service role key
 * This bypasses RLS policies for the password update operation
 */

import { createClient } from '@supabase/supabase-js';

interface UpdatePasswordRequest {
  customerId: number;
  hashedPassword: string;
}

interface UpdatePasswordResponse {
  success: boolean;
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
    const body: UpdatePasswordRequest = JSON.parse(event.body || '{}');
    
    if (!body.customerId || !body.hashedPassword) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false,
          error: 'Customer ID and hashed password are required'
        })
      };
    }

    // Validate the hashed password looks like a bcrypt hash
    const bcryptPattern = /^\$2[aby]\$\d{2}\$.{53}$/;
    if (!bcryptPattern.test(body.hashedPassword)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false,
          error: 'Invalid password format - must be pre-hashed'
        })
      };
    }

    // Update the password
    const { data, error: updateError } = await supabase
      .from('customers')
      .update({ 
        password: body.hashedPassword,
        must_change_password: false 
      })
      .eq('id', body.customerId)
      .select('id, must_change_password');

    if (updateError) {
      console.error('Password update error:', updateError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          success: false,
          error: updateError.message
        })
      };
    }

    if (!data || data.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ 
          success: false,
          error: 'Customer not found'
        })
      };
    }

    const response: UpdatePasswordResponse = {
      success: true
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response)
    };

  } catch (error) {
    console.error('Update password error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: 'Password update failed'
      })
    };
  }
};
