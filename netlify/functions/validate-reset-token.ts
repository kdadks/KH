/**
 * Server-side Password Reset Token Validation & Password Reset Function
 * Uses service role key to bypass RLS for unauthenticated users
 */

import { createClient } from '@supabase/supabase-js';
import * as bcrypt from 'bcryptjs';
import * as CryptoJS from 'crypto-js';

const decryptField = (encrypted: string | null | undefined): string => {
  if (!encrypted) return '';
  try {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) return '';
    const bytes = CryptoJS.AES.decrypt(encrypted, key);
    return bytes.toString(CryptoJS.enc.Utf8) || '';
  } catch {
    return '';
  }
};

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

export const handler = async (event: any): Promise<any> => {
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
    const body = JSON.parse(event.body || '{}');
    const { action, token, newPassword } = body;

    if (!token) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Token is required' })
      };
    }

    // === VALIDATE TOKEN ===
    if (action === 'validate') {
      const { data: customer, error } = await supabase
        .from('customers')
        .select('id, email, password_reset_expires_at')
        .eq('password_reset_token', token)
        .eq('is_active', true)
        .single();

      if (error || !customer) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: false, error: 'Invalid or expired reset token' })
        };
      }

      const expiresAt = new Date(customer.password_reset_expires_at);
      if (expiresAt < new Date()) {
        // Clean up expired token
        await supabase
          .from('customers')
          .update({ password_reset_token: null, password_reset_expires_at: null })
          .eq('id', customer.id);

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: false, error: 'Reset link has expired. Please request a new one.' })
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, customerEmail: customer.email })
      };
    }

    // === RESET PASSWORD ===
    if (action === 'reset') {
      if (!newPassword || newPassword.length < 8) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: 'Password must be at least 8 characters' })
        };
      }

      // Validate token first
      const { data: customer, error } = await supabase
        .from('customers')
        .select('id, email, first_name, last_name, password_reset_expires_at')
        .eq('password_reset_token', token)
        .eq('is_active', true)
        .single();

      if (error || !customer) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: false, error: 'Invalid or expired reset token' })
        };
      }

      if (new Date(customer.password_reset_expires_at) < new Date()) {
        await supabase
          .from('customers')
          .update({ password_reset_token: null, password_reset_expires_at: null })
          .eq('id', customer.id);

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: false, error: 'Reset link has expired. Please request a new one.' })
        };
      }

      // Hash password server-side
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      // Update password and clear token
      const { error: updateError } = await supabase
        .from('customers')
        .update({
          password: hashedPassword,
          password_reset_token: null,
          password_reset_expires_at: null,
          password_reset_requested_at: null,
          must_change_password: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', customer.id);

      if (updateError) {
        console.error('Error resetting password:', updateError);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: false, error: 'Failed to reset password. Please try again.' })
        };
      }

      // Send success notification email (non-blocking — don't fail the reset if email fails)
      try {
        const firstName = decryptField(customer.first_name);
        const lastName = decryptField(customer.last_name);
        const customerName = `${firstName} ${lastName}`.trim() || customer.email;
        const resetTime = new Date().toLocaleString('en-IE', {
          timeZone: 'Europe/Dublin',
          dateStyle: 'medium',
          timeStyle: 'short'
        });
        const siteUrl = process.env.URL || process.env.VITE_SITE_URL || 'https://khtherapy.ie';
        await fetch(`${siteUrl}/.netlify/functions/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            emailType: 'password_reset_success',
            recipientEmail: customer.email,
            subject: 'KH Therapy - Your Password Has Been Reset',
            data: {
              customer_name: customerName,
              reset_time: resetTime
            }
          })
        });
      } catch (emailErr) {
        console.error('Failed to send password reset success email (non-fatal):', emailErr);
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true })
      };
    }

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, error: 'Invalid action. Use "validate" or "reset".' })
    };

  } catch (error) {
    console.error('validate-reset-token error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: 'Internal server error' })
    };
  }
};
