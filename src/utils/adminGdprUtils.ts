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
 * This should be enhanced with proper role-based access control
 */
export const hasAdminDataAccess = async (userId: string): Promise<boolean> => {
  try {
    // Check if user is in admins table
    const { data, error } = await supabase
      .from('admins')
      .select('id, is_active')
      .eq('email', userId)
      .eq('is_active', true)
      .single();

    return !error && !!data;
  } catch (error) {
    console.error('Error checking admin access:', error);
    return false;
  }
};

/**
 * Log admin data access for GDPR audit trail
 */
export const logAdminDataAccess = async (
  adminUserId: string | number | null = null, 
  action: string, 
  customerIds: number[], 
  purpose: string = 'Administrative access'
) => {
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
      console.error('Failed to log admin data access:', error);
    }
  } catch (error) {
    console.error('Error logging admin data access:', error);
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
