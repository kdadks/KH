import { Customer } from '../types';

/**
 * Utility function to get the full display name for a customer
 * Ensures consistent concatenation of first name and last name
 */
export const getCustomerDisplayName = (customer: Customer | null | undefined): string => {
  if (!customer) return '';
  
  const firstName = customer.first_name?.trim() || '';
  const lastName = customer.last_name?.trim() || '';
  
  if (!firstName && !lastName) return '';
  if (!firstName) return lastName;
  if (!lastName) return firstName;
  
  return `${firstName} ${lastName}`;
};

/**
 * Utility function to split a full name into first and last name
 * Used for migrating legacy data or handling single name fields
 */
export const splitFullName = (fullName: string): { firstName: string; lastName: string } => {
  if (!fullName || !fullName.trim()) {
    return { firstName: '', lastName: '' };
  }
  
  const trimmedName = fullName.trim();
  const spaceIndex = trimmedName.indexOf(' ');
  
  if (spaceIndex === -1) {
    // No space found, treat entire string as first name
    return { firstName: trimmedName, lastName: '' };
  }
  
  const firstName = trimmedName.substring(0, spaceIndex);
  const lastName = trimmedName.substring(spaceIndex + 1);
  
  return { firstName, lastName };
};

/**
 * Utility function to validate that both first name and last name are provided
 */
export const validateCustomerName = (firstName: string, lastName: string): boolean => {
  return !!(firstName?.trim() && lastName?.trim());
};
