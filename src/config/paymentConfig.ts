// Payment Configuration
// This file contains all configurable payment-related settings

export const PAYMENT_CONFIG = {
  // Deposit percentage for payment requests (0.20 = 20%)
  DEPOSIT_PERCENTAGE: 0.20,
  
  // Default currency
  DEFAULT_CURRENCY: 'EUR',
  
  // Currency symbol
  CURRENCY_SYMBOL: '€',
  
  // Payment status options
  PAYMENT_STATUS: {
    PENDING: 'pending',
    PAID: 'paid',
    CANCELLED: 'cancelled',
    REFUNDED: 'refunded'
  },
  
  // Payment request status options
  PAYMENT_REQUEST_STATUS: {
    PENDING: 'pending',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled'
  }
} as const;

export type PaymentStatus = typeof PAYMENT_CONFIG.PAYMENT_STATUS[keyof typeof PAYMENT_CONFIG.PAYMENT_STATUS];
export type PaymentRequestStatus = typeof PAYMENT_CONFIG.PAYMENT_REQUEST_STATUS[keyof typeof PAYMENT_CONFIG.PAYMENT_REQUEST_STATUS];
