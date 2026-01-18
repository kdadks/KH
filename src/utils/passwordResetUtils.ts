import { supabase } from '../supabaseClient';
import { hashPassword } from './passwordUtils';
import { sendPasswordResetEmail } from './emailUtils';
import { PasswordResetData } from '../types/userManagement';

// Generate a secure random token
const generateResetToken = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

// Request password reset - generates token and sends email
export const requestPasswordReset = async (email: string): Promise<{ success: boolean; error?: string }> => {
  try {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return { success: false, error: 'Please enter a valid email address' };
    }

    const normalizedEmail = email.toLowerCase();

    // ============ SECURITY: Check if customer exists ============
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, first_name, last_name, email, is_active')
      .eq('email', normalizedEmail)
      .eq('is_active', true)
      .single();

    // Log error details for debugging (don't expose to user)
    if (customerError) {
      console.warn('Customer lookup in password reset:', {
        email: normalizedEmail,
        code: customerError.code,
        message: customerError.message
      });
    }

    // ============ VALIDATION: Email must exist in system ============
    if (!customer || customerError) {
      // Email doesn't exist or account is inactive
      return { 
        success: false, 
        error: 'No account found with this email address. Please check the email or create a new account.' 
      };
    }

    // Generate reset token
    const resetToken = generateResetToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiry

    // Store reset token in database
    const { error: updateError } = await supabase
      .from('customers')
      .update({
        password_reset_token: resetToken,
        password_reset_expires_at: expiresAt.toISOString(),
        password_reset_requested_at: new Date().toISOString()
      })
      .eq('id', customer.id);

    if (updateError) {
      console.error('Error storing reset token:', {
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint,
        code: updateError.code
      });
      return { success: false, error: 'Failed to process password reset request' };
    }

    // Send password reset email
    const resetUrl = `${window.location.origin}/reset-password?token=${resetToken}`;
    const emailResult = await sendPasswordResetEmail({
      customer_name: `${customer.first_name} ${customer.last_name}`,
      customer_email: customer.email,
      reset_url: resetUrl
    });

    if (!emailResult.success) {
      console.error('Failed to send password reset email:', {
        error: emailResult.error,
        email: customer.email
      });
      // Clean up the token if email failed
      await supabase
        .from('customers')
        .update({
          password_reset_token: null,
          password_reset_expires_at: null,
          password_reset_requested_at: null
        })
        .eq('id', customer.id);
      
      return { success: false, error: 'Failed to send password reset email. Please try again.' };
    }

    console.info('Password reset requested successfully:', {
      email: normalizedEmail,
      customerId: customer.id
    });

    return { success: true };
  } catch (error) {
    console.error('Exception in requestPasswordReset:', error);
    return { success: false, error: 'Unexpected error occurred during password reset request' };
  }
};

// Validate password reset token
export const validatePasswordResetToken = async (token: string): Promise<{ success: boolean; error?: string; customerEmail?: string }> => {
  try {
    if (!token) {
      return { success: false, error: 'Reset token is required' };
    }

    // Find customer with valid token
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, email, first_name, last_name, password_reset_expires_at')
      .eq('password_reset_token', token)
      .eq('is_active', true)
      .single();

    if (customerError || !customer) {
      return { success: false, error: 'Invalid or expired reset token' };
    }

    // Check if token has expired
    const expiresAt = new Date(customer.password_reset_expires_at);
    const now = new Date();

    if (expiresAt < now) {
      // Clean up expired token
      await supabase
        .from('customers')
        .update({
          password_reset_token: null,
          password_reset_expires_at: null
        })
        .eq('id', customer.id);

      return { success: false, error: 'Reset token has expired' };
    }

    return { 
      success: true, 
      customerEmail: customer.email 
    };
  } catch (error) {
    console.error('Exception in validatePasswordResetToken:', error);
    return { success: false, error: 'Unexpected error occurred' };
  }
};

// Reset password using token
export const resetPasswordWithToken = async (data: PasswordResetData): Promise<{ success: boolean; error?: string }> => {
  try {
    // Validate passwords match
    if (data.newPassword !== data.confirmPassword) {
      return { success: false, error: 'Passwords do not match' };
    }

    // Validate password strength
    if (data.newPassword.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters long' };
    }

    // Validate token first
    const tokenValidation = await validatePasswordResetToken(data.token);
    if (!tokenValidation.success) {
      return { success: false, error: tokenValidation.error };
    }

    // Find customer with token
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, email')
      .eq('password_reset_token', data.token)
      .eq('is_active', true)
      .single();

    if (customerError || !customer) {
      return { success: false, error: 'Invalid reset token' };
    }

    // Hash the new password
    const hashedPassword = await hashPassword(data.newPassword);

    // Update password and clear reset token
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
      console.error('Error updating password:', updateError);
      return { success: false, error: 'Failed to reset password' };
    }

    return { success: true };
  } catch (error) {
    console.error('Exception in resetPasswordWithToken:', error);
    return { success: false, error: 'Unexpected error occurred' };
  }
};

// Clean up expired password reset tokens (utility function)
export const cleanupExpiredResetTokens = async (): Promise<{ success: boolean; cleaned: number }> => {
  try {
    const { data, error } = await supabase
      .from('customers')
      .update({
        password_reset_token: null,
        password_reset_expires_at: null
      })
      .lt('password_reset_expires_at', new Date().toISOString())
      .select('id');

    if (error) {
      console.error('Error cleaning up expired tokens:', error);
      return { success: false, cleaned: 0 };
    }

    return { success: true, cleaned: data?.length || 0 };
  } catch (error) {
    console.error('Exception in cleanupExpiredResetTokens:', error);
    return { success: false, cleaned: 0 };
  }
};
