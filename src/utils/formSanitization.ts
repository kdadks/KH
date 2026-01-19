import { sanitizeName, sanitizeEmail, sanitizePhone, sanitizeText } from './sanitization';

/**
 * Input sanitization for form fields
 * Combines validation with sanitization to prevent XSS and ensure data integrity
 */

export interface SanitizedFormData {
  [key: string]: string | number | boolean | null | undefined;
}

/**
 * Sanitize form data object
 * @param formData - Raw form data from user input
 * @param fieldTypes - Map of field names to their types for proper sanitization
 * @returns Sanitized form data
 */
export const sanitizeFormData = (
  formData: Record<string, any>,
  fieldTypes: Record<string, 'name' | 'email' | 'phone' | 'text' | 'number' | 'boolean'>
): SanitizedFormData => {
  const sanitized: SanitizedFormData = {};

  for (const [key, value] of Object.entries(formData)) {
    if (value === null || value === undefined) {
      sanitized[key] = value;
      continue;
    }

    const fieldType = fieldTypes[key] || 'text';

    switch (fieldType) {
      case 'name':
        sanitized[key] = typeof value === 'string' ? sanitizeName(value) : '';
        break;
      case 'email':
        sanitized[key] = typeof value === 'string' ? sanitizeEmail(value) : '';
        break;
      case 'phone':
        sanitized[key] = typeof value === 'string' ? sanitizePhone(value) : '';
        break;
      case 'number':
        sanitized[key] = typeof value === 'number' ? value : parseInt(String(value), 10) || 0;
        break;
      case 'boolean':
        sanitized[key] = Boolean(value);
        break;
      case 'text':
      default:
        sanitized[key] = typeof value === 'string' ? sanitizeText(value) : '';
        break;
    }
  }

  return sanitized;
};

/**
 * Sanitize customer form data
 * @param formData - Customer form data
 * @returns Sanitized customer data
 */
export const sanitizeCustomerFormData = (formData: {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  eircode?: string;
  medical_notes?: string;
  [key: string]: any;
}): any => {
  return {
    ...formData,
    first_name: formData.first_name ? sanitizeName(formData.first_name) : undefined,
    last_name: formData.last_name ? sanitizeName(formData.last_name) : undefined,
    email: formData.email ? sanitizeEmail(formData.email) : undefined,
    phone: formData.phone ? sanitizePhone(formData.phone) : undefined,
    address: formData.address ? sanitizeText(formData.address) : undefined,
    eircode: formData.eircode ? sanitizeText(formData.eircode) : undefined,
    medical_notes: formData.medical_notes ? sanitizeText(formData.medical_notes) : undefined,
  };
};

/**
 * Sanitize booking form data
 * @param formData - Booking form data
 * @returns Sanitized booking data
 */
export const sanitizeBookingFormData = (formData: {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  notes?: string;
  service?: string;
  [key: string]: any;
}): any => {
  return {
    ...formData,
    firstName: formData.firstName ? sanitizeName(formData.firstName) : undefined,
    lastName: formData.lastName ? sanitizeName(formData.lastName) : undefined,
    email: formData.email ? sanitizeEmail(formData.email) : undefined,
    phone: formData.phone ? sanitizePhone(formData.phone) : undefined,
    notes: formData.notes ? sanitizeText(formData.notes) : undefined,
    service: formData.service ? sanitizeText(formData.service) : undefined,
  };
};

/**
 * Sanitize payment request notes
 * @param notes - Payment request notes
 * @returns Sanitized notes
 */
export const sanitizePaymentNotes = (notes: string | null | undefined): string => {
  if (!notes) return '';
  return sanitizeText(notes);
};

/**
 * React hook for sanitizing form input on change
 * @param sanitizeFunction - Function to use for sanitization
 * @returns onChange handler that sanitizes input
 */
export const useSanitizedInput = (
  sanitizeFunction: (value: string) => string,
  onChange?: (value: string) => void
) => {
  return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const sanitized = sanitizeFunction(e.target.value);
    if (onChange) {
      onChange(sanitized);
    }
    return sanitized;
  };
};
