/**
 * GDPR Compliance Utilities
 * Handles "Right to be Forgotten", Data Portability, and Privacy Controls
 */

import { supabase } from '../supabaseClient';
import CryptoJS from 'crypto-js';

// Encryption key for sensitive data (should be in environment variables)
const ENCRYPTION_KEY = import.meta.env.VITE_ENCRYPTION_KEY || 'default-fallback-key-change-in-production';

/**
 * Encrypt sensitive data using AES encryption
 */
export const encryptSensitiveData = (data: string): string => {
  try {
    return CryptoJS.AES.encrypt(data, ENCRYPTION_KEY).toString();
  } catch (error) {
    console.error('Encryption error:', error);
    return data; // Fallback to unencrypted data
  }
};

/**
 * Decrypt sensitive data
 */
export const decryptSensitiveData = (encryptedData: string): string => {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('Decryption error:', error);
    return encryptedData; // Fallback to encrypted data if decryption fails
  }
};

/**
 * Check if data appears to be encrypted (starts with encryption markers)
 */
export const isDataEncrypted = (data: string): boolean => {
  // AES encrypted data typically starts with specific patterns
  return Boolean(data && (data.includes('U2FsdGVkX1') || data.length > 100));
};

/**
 * Encrypt customer PII fields
 */
export const encryptCustomerPII = (customer: any) => {
  const encryptedCustomer = { ...customer };
  
  // Encrypt sensitive fields
  const sensitiveFields = [
    'first_name', 
    'last_name', 
    'phone', 
    'address_line_1', 
    'address_line_2', 
    'city', 
    'county', 
    'eircode',
    'date_of_birth',
    'emergency_contact_name',
    'emergency_contact_phone',
    'medical_notes'
  ];

  sensitiveFields.forEach(field => {
    if (encryptedCustomer[field] && !isDataEncrypted(encryptedCustomer[field])) {
      encryptedCustomer[field] = encryptSensitiveData(encryptedCustomer[field]);
    }
  });

  return encryptedCustomer;
};

/**
 * Decrypt customer PII fields
 */
export const decryptCustomerPII = (customer: any) => {
  const decryptedCustomer = { ...customer };
  
  const sensitiveFields = [
    'first_name', 
    'last_name', 
    'phone', 
    'address_line_1', 
    'address_line_2', 
    'city', 
    'county', 
    'eircode',
    'date_of_birth',
    'emergency_contact_name',
    'emergency_contact_phone',
    'medical_notes'
  ];

  sensitiveFields.forEach(field => {
    if (decryptedCustomer[field] && isDataEncrypted(decryptedCustomer[field])) {
      decryptedCustomer[field] = decryptSensitiveData(decryptedCustomer[field]);
    }
  });

  return decryptedCustomer;
};

/**
 * Export all user data for GDPR data portability
 */
export const exportUserData = async (customerId: number): Promise<{ success: boolean; data?: any; error?: string }> => {
  try {
    // Get customer data
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single();

    if (customerError) {
      return { success: false, error: 'Failed to fetch customer data' };
    }

    // Get bookings
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('*')
      .eq('customer_id', customerId);

    // Get invoices
    const { data: invoices, error: invoicesError } = await supabase
      .from('invoices')
      .select(`
        *,
        items:invoice_items(*)
      `)
      .eq('customer_id', customerId);

    // Get payments
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('*')
      .eq('customer_id', customerId);

    // Get user sessions
    const { data: sessions, error: sessionsError } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('customer_id', customerId);

    // Decrypt customer PII for export
    const decryptedCustomer = decryptCustomerPII(customer);

    const exportData = {
      exportDate: new Date().toISOString(),
      customerId: customerId,
      personalData: {
        ...decryptedCustomer,
        // Remove sensitive internal fields
        password: '[REDACTED]',
        password_reset_token: '[REDACTED]',
        auth_user_id: '[REDACTED]'
      },
      bookings: bookings || [],
      invoices: invoices || [],
      payments: payments || [],
      sessions: sessions?.map(session => ({
        ...session,
        session_token: '[REDACTED]' // Don't export session tokens
      })) || [],
      errors: {
        bookingsError: bookingsError?.message,
        invoicesError: invoicesError?.message,
        paymentsError: paymentsError?.message,
        sessionsError: sessionsError?.message
      }
    };

    return { success: true, data: exportData };
  } catch (error) {
    console.error('Error exporting user data:', error);
    return { success: false, error: 'Unexpected error during data export' };
  }
};

/**
 * Anonymize customer data (preserving referential integrity)
 */
export const anonymizeCustomerData = async (customerId: number): Promise<{ success: boolean; error?: string }> => {
  try {
    const anonymizedData = {
      first_name: 'Anonymized',
      last_name: 'User',
      email: `anonymized_${customerId}_${Date.now()}@gdpr-deleted.local`,
      phone: null,
      address_line_1: null,
      address_line_2: null,
      city: null,
      county: null,
      eircode: null,
      date_of_birth: null,
      emergency_contact_name: null,
      emergency_contact_phone: null,
      medical_notes: 'Data anonymized per GDPR request',
      password: '[ANONYMIZED]',
      password_reset_token: null,
      password_reset_expires_at: null,
      is_active: false,
      gdpr_anonymized: true,
      gdpr_anonymized_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('customers')
      .update(anonymizedData)
      .eq('id', customerId);

    if (error) {
      return { success: false, error: error.message };
    }

    // Log the anonymization
    await logGdprAction(customerId, 'ANONYMIZE', 'Customer data anonymized per GDPR request');

    return { success: true };
  } catch (error) {
    console.error('Error anonymizing customer data:', error);
    return { success: false, error: 'Unexpected error during data anonymization' };
  }
};

/**
 * Complete data deletion (right to be forgotten)
 */
export const deleteCustomerData = async (customerId: number, preserveBookingHistory: boolean = true): Promise<{ success: boolean; error?: string }> => {
  try {
    if (preserveBookingHistory) {
      // Anonymize instead of delete to preserve business records
      return await anonymizeCustomerData(customerId);
    } else {
      // Complete deletion (only if no business dependencies)
      
      // Check for dependent records
      const { data: bookings } = await supabase
        .from('bookings')
        .select('id')
        .eq('customer_id', customerId)
        .limit(1);

      const { data: invoices } = await supabase
        .from('invoices')
        .select('id')
        .eq('customer_id', customerId)
        .limit(1);

      if (bookings?.length || invoices?.length) {
        // Has business records, must anonymize instead
        return await anonymizeCustomerData(customerId);
      }

      // Safe to delete completely
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerId);

      if (error) {
        return { success: false, error: error.message };
      }

      // Log the deletion
      await logGdprAction(customerId, 'DELETE', 'Customer data completely deleted per GDPR request');

      return { success: true };
    }
  } catch (error) {
    console.error('Error deleting customer data:', error);
    return { success: false, error: 'Unexpected error during data deletion' };
  }
};

/**
 * Log GDPR actions for audit trail
 */
export const logGdprAction = async (customerId: number, action: string, details: string): Promise<void> => {
  try {
    await supabase
      .from('gdpr_audit_log')
      .insert([{
        customer_id: customerId,
        action,
        details,
        timestamp: new Date().toISOString(),
        ip_address: null, // Could be populated from request context
        user_agent: navigator.userAgent
      }]);
  } catch (error) {
    console.error('Error logging GDPR action:', error);
    // Don't throw error - logging failure shouldn't break the main operation
  }
};

/**
 * Check data retention and automatically anonymize old data
 */
export const enforceDataRetentionPolicy = async (): Promise<{ processed: number; errors: number }> => {
  try {
    const retentionYears = 7; // Configurable retention period
    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - retentionYears);

    // Find customers with no activity beyond retention period
    const { data: customersToRetain, error } = await supabase
      .from('customers')
      .select('id, last_login, created_at, is_active')
      .eq('gdpr_anonymized', false)
      .or(`last_login.lt.${cutoffDate.toISOString()},and(last_login.is.null,created_at.lt.${cutoffDate.toISOString()})`)
      .eq('is_active', false);

    if (error) {
      console.error('Error fetching customers for retention policy:', error);
      return { processed: 0, errors: 1 };
    }

    let processed = 0;
    let errors = 0;

    for (const customer of customersToRetain || []) {
      const result = await anonymizeCustomerData(customer.id);
      if (result.success) {
        processed++;
      } else {
        errors++;
      }
    }

    return { processed, errors };
  } catch (error) {
    console.error('Error enforcing data retention policy:', error);
    return { processed: 0, errors: 1 };
  }
};

/**
 * Generate privacy-compliant customer report
 */
export const generatePrivacyReport = async (customerId: number): Promise<{ success: boolean; report?: any; error?: string }> => {
  try {
    const { success, data, error } = await exportUserData(customerId);
    
    if (!success || !data) {
      return { success: false, error: error || 'Failed to generate report' };
    }

    const report = {
      generatedAt: new Date().toISOString(),
      customerId: customerId,
      dataCategories: {
        personalIdentifiers: ['first_name', 'last_name', 'email', 'phone'],
        locationData: ['address_line_1', 'address_line_2', 'city', 'county', 'eircode'],
        healthData: ['medical_notes', 'emergency_contact_name', 'emergency_contact_phone'],
        financialData: data.invoices?.length || 0,
        bookingData: data.bookings?.length || 0,
        sessionData: data.sessions?.length || 0
      },
      dataProcessingBasis: 'Legitimate interest for healthcare service provision',
      retentionPeriod: '7 years from last activity',
      thirdPartySharing: 'Limited to payment processors (SumUp) and email services (EmailJS)',
      userRights: [
        'Right to access',
        'Right to rectification', 
        'Right to erasure',
        'Right to data portability',
        'Right to object',
        'Right to restrict processing'
      ]
    };

    return { success: true, report };
  } catch (error) {
    console.error('Error generating privacy report:', error);
    return { success: false, error: 'Unexpected error generating privacy report' };
  }
};

/**
 * Validate GDPR compliance for customer data
 */
export const validateGdprCompliance = async (customerId: number): Promise<{ compliant: boolean; issues: string[] }> => {
  try {
    const issues: string[] = [];

    // Check if customer data exists
    const { data: customer, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single();

    if (error || !customer) {
      return { compliant: false, issues: ['Customer not found'] };
    }

    // Check for unencrypted sensitive data
    const sensitiveFields = ['first_name', 'last_name', 'phone', 'address_line_1'];
    sensitiveFields.forEach(field => {
      if (customer[field] && !isDataEncrypted(customer[field])) {
        issues.push(`Unencrypted sensitive data in field: ${field}`);
      }
    });

    // Check consent status
    if (!customer.privacy_consent_given) {
      issues.push('Missing privacy consent');
    }

    // Check data retention
    const retentionLimit = new Date();
    retentionLimit.setFullYear(retentionLimit.getFullYear() - 7);
    
    if (customer.created_at && new Date(customer.created_at) < retentionLimit && customer.is_active === false) {
      issues.push('Data beyond retention period - consider anonymization');
    }

    return {
      compliant: issues.length === 0,
      issues
    };
  } catch (error) {
    console.error('Error validating GDPR compliance:', error);
    return { compliant: false, issues: ['Error validating compliance'] };
  }
};
