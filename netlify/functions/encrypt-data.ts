/**
 * Server-side Encryption Function
 * Encrypts sensitive PII data using server-side encryption key
 * CRITICAL: Encryption key never exposed to client
 */

import * as CryptoJS from 'crypto-js';

interface EncryptRequest {
  data: string;
  field?: string;
}

interface EncryptResponse {
  encrypted: string;
  field?: string;
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
    // Get encryption key from server environment (NOT exposed to client)
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
    
    if (!ENCRYPTION_KEY) {
      console.error('CRITICAL: ENCRYPTION_KEY not configured in server environment');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Encryption key not configured',
          code: 'ENCRYPTION_KEY_MISSING'
        })
      };
    }

    // Parse request body
    const body: EncryptRequest = JSON.parse(event.body || '{}');
    
    if (!body.data) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Data field is required',
          code: 'INVALID_REQUEST'
        })
      };
    }

    // Validate data is a string
    if (typeof body.data !== 'string') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Data must be a string',
          code: 'INVALID_DATA_TYPE'
        })
      };
    }

    // Encrypt the data using AES encryption
    const encrypted = CryptoJS.AES.encrypt(body.data, ENCRYPTION_KEY).toString();

    const response: EncryptResponse = {
      encrypted,
      field: body.field
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response)
    };

  } catch (error) {
    console.error('Encryption error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Encryption failed',
        code: 'ENCRYPTION_ERROR'
      })
    };
  }
};
