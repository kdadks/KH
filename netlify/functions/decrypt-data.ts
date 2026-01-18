/**
 * Server-side Decryption Function
 * Decrypts sensitive PII data using server-side encryption key
 * CRITICAL: Encryption key never exposed to client
 */

import * as CryptoJS from 'crypto-js';

interface DecryptRequest {
  encrypted: string;
  field?: string;
}

interface DecryptResponse {
  decrypted: string;
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
    const body: DecryptRequest = JSON.parse(event.body || '{}');
    
    if (!body.encrypted) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Encrypted field is required',
          code: 'INVALID_REQUEST'
        })
      };
    }

    // Validate data is a string
    if (typeof body.encrypted !== 'string') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Encrypted data must be a string',
          code: 'INVALID_DATA_TYPE'
        })
      };
    }

    // Decrypt the data using AES decryption
    const bytes = CryptoJS.AES.decrypt(body.encrypted, ENCRYPTION_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);

    // Validate decryption was successful (if decryption fails, result is empty)
    if (!decrypted) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Decryption failed - invalid encrypted data or key',
          code: 'DECRYPTION_FAILED'
        })
      };
    }

    const response: DecryptResponse = {
      decrypted,
      field: body.field
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response)
    };

  } catch (error) {
    console.error('Decryption error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Decryption failed',
        code: 'DECRYPTION_ERROR'
      })
    };
  }
};
