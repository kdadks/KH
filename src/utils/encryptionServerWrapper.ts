/**
 * GDPR Encryption/Decryption Wrapper Functions
 * These functions call server-side Netlify functions for encryption/decryption
 * CRITICAL: Encryption key is NEVER exposed to the client
 * 
 * SECURITY IMPROVEMENT:
 * - Moved from client-side AES encryption to server-side encryption
 * - Encryption key is stored only on server environment variables
 * - Client sends plaintext over HTTPS to server for encryption
 * - Server returns encrypted data for storage
 */

/**
 * Call server-side encryption function
 * @param data - The plaintext data to encrypt
 * @param field - Optional field name for tracking
 * @returns Encrypted data
 */
export const encryptSensitiveDataServer = async (data: string, field?: string): Promise<string> => {
  if (!data) return '';

  try {
    const siteUrl = import.meta.env.VITE_SITE_URL || window.location.origin;
    const functionUrl = `${siteUrl}/.netlify/functions/encrypt-data`;

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ data, field })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Encryption error:', errorData);
      throw new Error(`Encryption failed: ${errorData.error || 'Unknown error'}`);
    }

    const result = await response.json();
    return result.encrypted;
  } catch (error) {
    console.error('Error encrypting data:', error);
    throw error; // CRITICAL: Never return plaintext on failure - throw error instead
  }
};

/**
 * Call server-side decryption function
 * @param encrypted - The encrypted data to decrypt
 * @param field - Optional field name for tracking
 * @returns Decrypted plaintext data
 */
export const decryptSensitiveDataServer = async (encrypted: string, field?: string): Promise<string> => {
  if (!encrypted) return '';

  try {
    const siteUrl = import.meta.env.VITE_SITE_URL || window.location.origin;
    const functionUrl = `${siteUrl}/.netlify/functions/decrypt-data`;

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ encrypted, field })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Decryption error:', errorData);
      throw new Error(`Decryption failed: ${errorData.error || 'Unknown error'}`);
    }

    const result = await response.json();
    return result.decrypted;
  } catch (error) {
    console.error('Error decrypting data:', error);
    throw error; // CRITICAL: Never return encrypted data on failure - throw error instead
  }
};

/**
 * Check if data appears to be encrypted
 */
export const isDataEncrypted = (data: string): boolean => {
  // AES encrypted data typically starts with specific patterns
  return Boolean(data && (data.includes('U2FsdGVkX1') || data.length > 100));
};

/**
 * Encrypt customer PII fields on the server
 */
export const encryptCustomerPIIServer = async (customer: any) => {
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

  for (const field of sensitiveFields) {
    if (encryptedCustomer[field] && !isDataEncrypted(encryptedCustomer[field])) {
      try {
        encryptedCustomer[field] = await encryptSensitiveDataServer(encryptedCustomer[field], field);
      } catch (error) {
        console.error(`Failed to encrypt field ${field}:`, error);
        throw error; // Don't silently fail
      }
    }
  }

  return encryptedCustomer;
};

/**
 * Decrypt customer PII fields on the server
 */
export const decryptCustomerPIIServer = async (customer: any) => {
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

  for (const field of sensitiveFields) {
    if (decryptedCustomer[field] && isDataEncrypted(decryptedCustomer[field])) {
      try {
        decryptedCustomer[field] = await decryptSensitiveDataServer(decryptedCustomer[field], field);
      } catch (error) {
        console.error(`Failed to decrypt field ${field}:`, error);
        throw error; // Don't silently fail
      }
    }
  }

  return decryptedCustomer;
};
