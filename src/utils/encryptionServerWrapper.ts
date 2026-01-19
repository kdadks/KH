/**
 * GDPR Encryption/Decryption Wrapper Functions
 * These functions call server-side Netlify functions for encryption/decryption
 * CRITICAL: Encryption key is NEVER exposed to the client in production
 * 
 * SECURITY IMPROVEMENT:
 * - Moved from client-side AES encryption to server-side encryption
 * - Encryption key is stored only on server environment variables
 * - Client sends plaintext over HTTPS to server for encryption
 * - Server returns encrypted data for storage
 * 
 * DEVELOPMENT MODE:
 * - In localhost/development, uses VITE_ENCRYPTION_KEY for client-side decryption
 * - This enables local development and testing
 * - Key is ONLY used in development, NOT in production
 */

import * as CryptoJS from 'crypto-js';

/**
 * Check if running in development mode
 */
const isDevelopment = (): boolean => {
  return import.meta.env.DEV || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
};

/**
 * Get encryption key for client-side decryption (development only)
 */
const getClientEncryptionKey = (): string | null => {
  if (!isDevelopment()) {
    return null; // Never use client-side key in production
  }
  return import.meta.env.VITE_ENCRYPTION_KEY || null;
};

/**
 * Client-side decryption (development mode only)
 */
const decryptDataClientSide = (encrypted: string): string => {
  try {
    const key = getClientEncryptionKey();
    if (!key) {
      console.warn('No encryption key available for client-side decryption');
      return encrypted;
    }

    const bytes = CryptoJS.AES.decrypt(encrypted, key);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);

    if (!decrypted) {
      console.warn('Client-side decryption resulted in empty string');
      return encrypted;
    }

    return decrypted;
  } catch (error) {
    console.error('Client-side decryption error:', error);
    return encrypted;
  }
};

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
 * Falls back to client-side decryption in development mode
 * @param encrypted - The encrypted data to decrypt
 * @param field - Optional field name for tracking
 * @returns Decrypted plaintext data
 */
export const decryptSensitiveDataServer = async (encrypted: string, field?: string): Promise<string> => {
  if (!encrypted) return '';

  // Check if data doesn't look encrypted - return as-is (might be plaintext from before encryption was implemented)
  if (!isDataEncrypted(encrypted)) {
    return encrypted;
  }

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

    // Check for empty response first
    const responseText = await response.text();
    if (!responseText) {
      console.warn(`Decryption returned empty response for field ${field}. Netlify function may not be available. Trying client-side decryption...`);
      
      // In development or if function is unavailable, try client-side decryption
      if (isDevelopment()) {
        console.log(`Using client-side decryption for field ${field}`);
        return decryptDataClientSide(encrypted);
      }
      
      return encrypted;
    }

    // Parse the JSON
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error(`Failed to parse decryption response for field ${field}:`, responseText);
      
      // Try client-side decryption as fallback
      if (isDevelopment()) {
        console.log(`Falling back to client-side decryption for field ${field}`);
        return decryptDataClientSide(encrypted);
      }
      
      return encrypted;
    }

    if (!response.ok) {
      console.error('Decryption error:', result);
      
      // Try client-side decryption as fallback
      if (isDevelopment()) {
        console.log(`Server decryption failed, using client-side decryption for field ${field}`);
        return decryptDataClientSide(encrypted);
      }
      
      return encrypted;
    }

    return result.decrypted || encrypted;
  } catch (error) {
    console.error('Error decrypting data:', error);
    
    // Try client-side decryption as fallback in development
    if (isDevelopment()) {
      console.log(`Exception during decryption, falling back to client-side for field ${field}`);
      return decryptDataClientSide(encrypted);
    }
    
    return encrypted;
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
        // Don't throw - keep original data and continue
      }
    }
  }

  return decryptedCustomer;
};
