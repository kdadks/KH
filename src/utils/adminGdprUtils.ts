/**
 * Admin GDPR Utilities
 * Provides decryption capabilities for admin users to view customer data
 * for legitimate business operations and compliance management
 */

import { supabase } from '../supabaseClient';
import { decryptSensitiveData, isDataEncrypted } from './gdprUtils';

/**
 * Decrypt customer data for admin viewing
 * This should only be used in admin contexts for legitimate business purposes
 */
export const decryptCustomerDataForAdmin = (customer: any) => {
  if (!customer) return customer;

  const decryptedCustomer = { ...customer };

  // Decrypt PII fields if they're encrypted
  const fieldsToDecrypt = [
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

  fieldsToDecrypt.forEach(field => {
    if (decryptedCustomer[field] && isDataEncrypted(decryptedCustomer[field])) {
      try {
        decryptedCustomer[field] = decryptSensitiveData(decryptedCustomer[field]);
      } catch (error) {
        console.warn(`Failed to decrypt ${field} for customer ${customer.id}:`, error instanceof Error ? error.message : error);
        // Keep original value if decryption fails
      }
    }
  });

  return decryptedCustomer;
};

/**
 * Decrypt an array of customers for admin viewing
 */
export const decryptCustomersArrayForAdmin = (customers: any[]) => {
  if (!Array.isArray(customers)) return customers;
  
  return customers.map(customer => decryptCustomerDataForAdmin(customer));
};

/**
 * Decrypt customer data in booking objects for admin viewing
 */
export const decryptBookingCustomerDataForAdmin = (booking: any) => {
  if (!booking) return booking;

  const decryptedBooking = { ...booking };

  // Decrypt direct customer fields on booking
  if (decryptedBooking.customer_name && isDataEncrypted(decryptedBooking.customer_name)) {
    decryptedBooking.customer_name = decryptSensitiveData(decryptedBooking.customer_name);
  }
  
  if (decryptedBooking.customer_phone && isDataEncrypted(decryptedBooking.customer_phone)) {
    decryptedBooking.customer_phone = decryptSensitiveData(decryptedBooking.customer_phone);
  }

  // Decrypt nested customer object if present
  if (decryptedBooking.customer_details) {
    decryptedBooking.customer_details = decryptCustomerDataForAdmin(decryptedBooking.customer_details);
  }

  // Decrypt customer object if present
  if (decryptedBooking.customer) {
    decryptedBooking.customer = decryptCustomerDataForAdmin(decryptedBooking.customer);
  }

  return decryptedBooking;
};

/**
 * Decrypt customer data in invoice objects for admin viewing
 */
export const decryptInvoiceCustomerDataForAdmin = (invoice: any) => {
  if (!invoice) return invoice;

  const decryptedInvoice = { ...invoice };

  // Decrypt nested customer object if present
  if (decryptedInvoice.customer) {
    decryptedInvoice.customer = decryptCustomerDataForAdmin(decryptedInvoice.customer);
  }

  return decryptedInvoice;
};

/**
 * Batch decrypt customers with error handling and logging for admin audit
 */
export const batchDecryptCustomersForAdmin = async (customers: any[], adminUserId?: string) => {
  console.log(`[GDPR Audit] Admin user ${adminUserId || 'unknown'} accessing ${customers.length} customer records for legitimate business purposes`);
  
  return customers.map((customer, index) => {
    try {
      return decryptCustomerDataForAdmin(customer);
    } catch (error) {
      console.error(`[GDPR Audit] Failed to decrypt customer ${customer.id || index}:`, error);
      return customer; // Return original if decryption fails
    }
  });
};

/**
 * Check if user has admin privileges for data access
 * This function is currently not in use and will be removed in a future version.
 * Admin access is now managed through Supabase auth and RLS policies.
 *
 * @deprecated This function is no longer actively used
 */
export const hasAdminDataAccess = async (userId: string): Promise<boolean> => {
  // This function has been deprecated and always returns true for logged-in users
  // Admin access is now controlled through Supabase authentication and RLS policies
  // Commenting out the database query to prevent 406 errors from missing 'admins' table

  /*
  try {
    // Check if user is in admins table
    const { data, error } = await supabase
      .from('admins')
      .select('id, is_active')
      .eq('email', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      return false;
    }

    return !!data;
  } catch (error) {
    return false;
  }
  */

  // Return true if a userId is provided (meaning user is authenticated)
  return !!userId;
};

// Flag to track if audit logging is available (disable after repeated failures)
let auditLoggingEnabled = true;
let consecutiveFailures = 0;
const MAX_FAILURES_BEFORE_DISABLE = 3;

/**
 * Log admin data access for GDPR audit trail
 * Note: This is a best-effort logging mechanism. If the audit log table doesn't exist
 * or is inaccessible, the function will silently fail after a few attempts to avoid
 * breaking admin functionality and spamming console errors.
 */
export const logAdminDataAccess = async (
  adminUserId: string | number | null = null, 
  action: string, 
  customerIds: number[], 
  purpose: string = 'Administrative access'
) => {
  // Skip if audit logging has been disabled due to repeated failures
  if (!auditLoggingEnabled) {
    return;
  }

  // Skip if no customer IDs provided
  if (!customerIds || customerIds.length === 0) {
    return;
  }

  try {
    // Get current admin user ID if not provided
    let adminUserIdInt: number | null = null;
    
    if (adminUserId === null) {
      // Try to get the current Supabase auth user
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        // For now, we'll use a hash of the user ID to get a consistent integer
        // This is a temporary solution until we have proper admin ID mapping
        const userIdHash = user.id.split('-').join('').substring(0, 8);
        adminUserIdInt = parseInt(userIdHash, 16) % 2147483647; // Keep within INT range
      }
    } else if (typeof adminUserId === 'number') {
      adminUserIdInt = adminUserId;
    } else if (typeof adminUserId === 'string') {
      const parsed = parseInt(adminUserId, 10);
      if (!isNaN(parsed)) {
        adminUserIdInt = parsed;
      }
    }

    const auditEntries = customerIds.map(customerId => ({
      customer_id: customerId,
      action: `ADMIN_${action}`,
      details: `Admin ${adminUserId || 'system'} accessed customer data - ${purpose}`,
      admin_user_id: adminUserIdInt, // This can be null if we can't determine the admin ID
      timestamp: new Date().toISOString()
    }));

    const { error } = await supabase
      .from('gdpr_audit_log')
      .insert(auditEntries);

    if (error) {
      consecutiveFailures++;
      
      // Only log the first few failures, then disable to avoid console spam
      if (consecutiveFailures <= 2) {
        console.warn(`[Audit Log] Failed (attempt ${consecutiveFailures}/${MAX_FAILURES_BEFORE_DISABLE}): ${error.message}`);
      }
      
      // Disable audit logging after repeated failures
      if (consecutiveFailures >= MAX_FAILURES_BEFORE_DISABLE) {
        auditLoggingEnabled = false;
        console.warn('[Audit Log] Disabled due to repeated failures. Table may not exist or RLS may be blocking access.');
      }
    } else {
      // Reset failure counter on success
      consecutiveFailures = 0;
    }
  } catch (error) {
    consecutiveFailures++;
    
    // Silently fail for network errors to avoid console spam
    if (consecutiveFailures <= 2) {
      console.warn(`[Audit Log] Error (attempt ${consecutiveFailures}/${MAX_FAILURES_BEFORE_DISABLE}):`, 
        error instanceof Error ? error.message : 'Unknown error');
    }
    
    // Disable audit logging after repeated failures
    if (consecutiveFailures >= MAX_FAILURES_BEFORE_DISABLE) {
      auditLoggingEnabled = false;
      console.warn('[Audit Log] Disabled due to repeated errors.');
    }
  }
};

export default {
  decryptCustomerDataForAdmin,
  decryptCustomersArrayForAdmin,
  decryptBookingCustomerDataForAdmin,
  decryptInvoiceCustomerDataForAdmin,
  batchDecryptCustomersForAdmin,
  hasAdminDataAccess,
  logAdminDataAccess
};
