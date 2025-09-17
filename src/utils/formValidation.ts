/**
 * Form validation utilities for booking forms
 * Provides consistent validation rules across all booking modals and pages
 */

// Email validation - RFC 5322 compliant pattern
export const emailValidation = {
  required: 'Email is required',
  pattern: {
    value: /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
    message: 'Please enter a valid email address'
  }
};

// Phone validation - only numeric values and + sign allowed
export const phoneValidation = {
  required: 'Phone number is required',
  pattern: {
    value: /^[\+]?[0-9\s\-\(\)]*$/,
    message: 'Phone number can only contain numbers, spaces, hyphens, parentheses, and + sign'
  },
  minLength: {
    value: 10,
    message: 'Phone number must be at least 10 digits'
  },
  maxLength: {
    value: 15,
    message: 'Phone number cannot exceed 15 digits'
  }
};

// First name validation - no numbers or special characters except apostrophe
export const firstNameValidation = {
  required: 'First name is required',
  pattern: {
    value: /^[a-zA-Z\s']+$/,
    message: 'First name can only contain letters, spaces, and apostrophes'
  },
  minLength: {
    value: 2,
    message: 'First name must be at least 2 characters'
  },
  maxLength: {
    value: 50,
    message: 'First name cannot exceed 50 characters'
  }
};

// Last name validation - no numbers or special characters except apostrophe
export const lastNameValidation = {
  required: 'Last name is required',
  pattern: {
    value: /^[a-zA-Z\s']+$/,
    message: 'Last name can only contain letters, spaces, and apostrophes'
  },
  minLength: {
    value: 2,
    message: 'Last name must be at least 2 characters'
  },
  maxLength: {
    value: 50,
    message: 'Last name cannot exceed 50 characters'
  }
};

// Notes validation - max 1000 alphanumeric characters
export const notesValidation = {
  maxLength: {
    value: 1000,
    message: 'Notes cannot exceed 1000 characters'
  },
  pattern: {
    value: /^[a-zA-Z0-9\s.,!?;:()\-'"]*$/,
    message: 'Notes can only contain letters, numbers, spaces, and basic punctuation'
  }
};

// Optional validation for when notes field is not required
export const optionalNotesValidation = {
  ...notesValidation,
  required: false
};

// Service validation
export const serviceValidation = {
  required: 'Please select a service'
};

// Date validation
export const dateValidation = {
  required: 'Please select a date'
};

// Time validation
export const timeValidation = {
  required: 'Please select a time slot'
};

// Real-time validation functions that return error messages
export const validatePhoneRealTime = (value: string): string => {
  if (!value) return '';
  const phoneRegex = /^[\+]?[0-9\s\-\(\)]*$/;
  if (!phoneRegex.test(value)) {
    return 'Phone number can only contain numbers, spaces, hyphens, parentheses, and + sign';
  }
  if (value.replace(/[^\d]/g, '').length < 10 && value.length > 0) {
    return 'Phone number must be at least 10 digits';
  }
  if (value.replace(/[^\d]/g, '').length > 15) {
    return 'Phone number cannot exceed 15 digits';
  }
  return '';
};

export const validateNameRealTime = (value: string, fieldName: string = 'Name'): string => {
  if (!value) return `${fieldName} is required`;
  const nameRegex = /^[a-zA-Z\s']*$/;
  if (!nameRegex.test(value)) {
    return `${fieldName} can only contain letters, spaces, and apostrophes`;
  }
  if (value.length < 2) {
    return `${fieldName} must be at least 2 characters`;
  }
  if (value.length > 50) {
    return `${fieldName} cannot exceed 50 characters`;
  }
  return '';
};

export const validateEmailRealTime = (value: string): string => {
  if (!value) return 'Email is required';
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  if (!emailRegex.test(value)) {
    return 'Please enter a valid email address';
  }
  return '';
};

export const validateNotesRealTime = (value: string): string => {
  if (!value) return '';
  const notesRegex = /^[a-zA-Z0-9\s.,!?;:()\-'"]*$/;
  if (!notesRegex.test(value)) {
    return 'Notes can only contain letters, numbers, spaces, and basic punctuation';
  }
  if (value.length > 1000) {
    return 'Notes cannot exceed 1000 characters';
  }
  return '';
};

// Legacy helper functions (keep for backward compatibility)
export const validatePhoneNumber = (value: string): boolean => {
  const phoneRegex = /^[\+]?[0-9\s\-\(\)]*$/;
  return phoneRegex.test(value);
};

export const validateName = (value: string): boolean => {
  const nameRegex = /^[a-zA-Z\s']*$/;
  return nameRegex.test(value);
};

export const validateEmail = (value: string): boolean => {
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(value);
};

export const validateNotes = (value: string): boolean => {
  const notesRegex = /^[a-zA-Z0-9\s.,!?;:()\-'"]*$/;
  return notesRegex.test(value) && value.length <= 1000;
};