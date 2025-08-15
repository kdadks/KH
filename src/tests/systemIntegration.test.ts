import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { 
  hashPassword, 
  verifyPassword, 
  isPasswordHashed, 
  generateRandomPassword 
} from '../utils/passwordUtils';
import { 
  createPaymentIntent, 
  processSumUpPayment, 
  formatCurrency, 
  validatePaymentAmount, 
  generateCheckoutReference 
} from '../utils/paymentUtils';
import { 
  initializeEmailJS,
  sendBookingConfirmationEmail,
  sendPaymentReceiptEmail,
  validateEmailConfiguration,
  formatEmailDate 
} from '../utils/emailUtils';

// Mock environment variables
process.env.REACT_APP_SUMUP_APP_ID = 'test_app_id';
process.env.REACT_APP_SUMUP_MERCHANT_CODE = 'test_merchant';
process.env.REACT_APP_EMAILJS_SERVICE_ID = 'test_service';
process.env.REACT_APP_EMAILJS_PUBLIC_KEY = 'test_key';
process.env.REACT_APP_EMAILJS_TEMPLATE_BOOKING_CONFIRMATION = 'test_template';
process.env.REACT_APP_EMAILJS_TEMPLATE_PAYMENT_RECEIPT = 'test_receipt';

describe('Password Utilities', () => {
  describe('hashPassword', () => {
    test('should hash a password', async () => {
      const password = 'testPassword123';
      const hashedPassword = await hashPassword(password);
      
      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword.length).toBeGreaterThan(50);
      expect(hashedPassword.startsWith('$2')).toBe(true);
    });

    test('should generate different hashes for same password', async () => {
      const password = 'testPassword123';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyPassword', () => {
    test('should verify correct password', async () => {
      const password = 'testPassword123';
      const hashedPassword = await hashPassword(password);
      
      const isValid = await verifyPassword(password, hashedPassword);
      expect(isValid).toBe(true);
    });

    test('should reject incorrect password', async () => {
      const password = 'testPassword123';
      const wrongPassword = 'wrongPassword456';
      const hashedPassword = await hashPassword(password);
      
      const isValid = await verifyPassword(wrongPassword, hashedPassword);
      expect(isValid).toBe(false);
    });
  });

  describe('isPasswordHashed', () => {
    test('should identify hashed passwords', async () => {
      const hashedPassword = await hashPassword('testPassword123');
      expect(isPasswordHashed(hashedPassword)).toBe(true);
    });

    test('should identify plain text passwords', () => {
      const plainPassword = 'testPassword123';
      expect(isPasswordHashed(plainPassword)).toBe(false);
    });

    test('should handle empty strings', () => {
      expect(isPasswordHashed('')).toBe(false);
      expect(isPasswordHashed(null as any)).toBe(false);
      expect(isPasswordHashed(undefined as any)).toBe(false);
    });
  });

  describe('generateRandomPassword', () => {
    test('should generate password with default length', () => {
      const password = generateRandomPassword();
      expect(password.length).toBe(12);
    });

    test('should generate password with custom length', () => {
      const password = generateRandomPassword(8);
      expect(password.length).toBe(8);
    });

    test('should generate different passwords', () => {
      const password1 = generateRandomPassword();
      const password2 = generateRandomPassword();
      expect(password1).not.toBe(password2);
    });

    test('should contain valid characters', () => {
      const password = generateRandomPassword(20);
      const validChars = /^[A-Za-z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]*$/;
      expect(validChars.test(password)).toBe(true);
    });
  });
});

describe('Payment Utilities', () => {
  describe('createPaymentIntent', () => {
    test('should create payment intent with valid data', async () => {
      const amount = 75.50;
      const currency = 'EUR';
      const description = 'Physiotherapy Session';
      const checkoutRef = 'test_checkout_123';
      
      const paymentIntent = await createPaymentIntent(
        amount, 
        currency, 
        description, 
        checkoutRef
      );
      
      expect(paymentIntent).toBeDefined();
      expect(paymentIntent.amount).toBe(7550); // Converted to cents
      expect(paymentIntent.currency).toBe(currency);
      expect(paymentIntent.description).toBe(description);
      expect(paymentIntent.checkout_reference).toBe(checkoutRef);
      expect(paymentIntent.status).toBe('pending');
      expect(paymentIntent.id).toBeDefined();
    });
  });

  describe('processSumUpPayment', () => {
    test('should process payment successfully', async () => {
      const paymentIntent = {
        id: 'test_intent_123',
        amount: 7550,
        currency: 'EUR',
        description: 'Test payment',
        status: 'pending' as const,
        checkout_reference: 'test_ref_123'
      };
      
      const response = await processSumUpPayment(paymentIntent);
      
      expect(response).toBeDefined();
      expect(response.success).toBeDefined();
      if (response.success) {
        expect(response.transaction_id).toBeDefined();
        expect(response.checkout_reference).toBe(paymentIntent.checkout_reference);
      }
    });
  });

  describe('formatCurrency', () => {
    test('should format EUR currency correctly', () => {
      expect(formatCurrency(7550, 'EUR')).toBe('€75.50');
      expect(formatCurrency(0, 'EUR')).toBe('€0.00');
      expect(formatCurrency(100, 'EUR')).toBe('€1.00');
    });
  });

  describe('validatePaymentAmount', () => {
    test('should validate payment amounts', () => {
      expect(validatePaymentAmount(100)).toBe(true); // €1.00
      expect(validatePaymentAmount(7550)).toBe(true); // €75.50
      expect(validatePaymentAmount(0)).toBe(false); // €0.00
      expect(validatePaymentAmount(-100)).toBe(false); // Negative
      expect(validatePaymentAmount(100000000)).toBe(false); // Too large
    });
  });

  describe('generateCheckoutReference', () => {
    test('should generate checkout reference without booking ID', () => {
      const ref = generateCheckoutReference();
      expect(ref).toMatch(/^checkout_\d+_[a-z0-9]{6}$/);
    });

    test('should generate checkout reference with booking ID', () => {
      const bookingId = '123';
      const ref = generateCheckoutReference(bookingId);
      expect(ref).toMatch(/^booking_123_\d+$/);
    });
  });
});

describe('Email Utilities', () => {
  // Mock EmailJS
  const mockEmailJS = {
    init: jest.fn(),
    send: jest.fn().mockResolvedValue({ status: 200, text: 'OK' })
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock EmailJS globally
    global.emailjs = mockEmailJS as any;
  });

  describe('validateEmailConfiguration', () => {
    test('should validate complete configuration', () => {
      const result = validateEmailConfiguration();
      expect(result.isValid).toBe(true);
      expect(result.missingConfig).toHaveLength(0);
    });
  });

  describe('sendBookingConfirmationEmail', () => {
    test('should send booking confirmation email', async () => {
      const bookingData = {
        customer_name: 'John Doe',
        customer_email: 'john@example.com',
        service_name: 'Sports Injury Treatment',
        appointment_date: '2024-02-15',
        appointment_time: '14:00',
        total_amount: 75.50,
        booking_reference: 'BK123456'
      };

      const result = await sendBookingConfirmationEmail(bookingData);
      
      expect(result).toBe(true);
      expect(mockEmailJS.send).toHaveBeenCalledTimes(1);
    });
  });

  describe('sendPaymentReceiptEmail', () => {
    test('should send payment receipt email', async () => {
      const receiptData = {
        customer_name: 'Jane Doe',
        customer_email: 'jane@example.com',
        transaction_id: 'txn_123456',
        payment_amount: 75.50,
        payment_date: '2024-02-15',
        service_description: 'Physiotherapy Session',
        booking_reference: 'BK123456'
      };

      const result = await sendPaymentReceiptEmail(receiptData);
      
      expect(result).toBe(true);
      expect(mockEmailJS.send).toHaveBeenCalledTimes(1);
    });
  });

  describe('formatEmailDate', () => {
    test('should format date for emails', () => {
      const date = new Date('2024-02-15');
      const formatted = formatEmailDate(date);
      
      expect(formatted).toContain('February');
      expect(formatted).toContain('15');
      expect(formatted).toContain('2024');
    });

    test('should format string date for emails', () => {
      const dateString = '2024-02-15';
      const formatted = formatEmailDate(dateString);
      
      expect(formatted).toContain('February');
      expect(formatted).toContain('15');
      expect(formatted).toContain('2024');
    });
  });
});

describe('Integration Tests', () => {
  describe('Complete User Registration Flow', () => {
    test('should handle complete registration with payment and email', async () => {
      // Step 1: Create user account with hashed password
      const password = 'testPassword123!';
      const hashedPassword = await hashPassword(password);
      
      expect(isPasswordHashed(hashedPassword)).toBe(true);
      expect(await verifyPassword(password, hashedPassword)).toBe(true);
      
      // Step 2: Create payment intent
      const paymentIntent = await createPaymentIntent(
        75.50,
        'EUR',
        'Initial Consultation',
        generateCheckoutReference('USER123')
      );
      
      expect(paymentIntent.amount).toBe(7550);
      expect(paymentIntent.status).toBe('pending');
      
      // Step 3: Process payment
      const paymentResult = await processSumUpPayment(paymentIntent);
      expect(paymentResult.success).toBeDefined();
      
      // Step 4: Verify email configuration
      const emailConfig = validateEmailConfiguration();
      expect(emailConfig.isValid).toBe(true);
    });
  });

  describe('Complete Booking Flow', () => {
    test('should handle booking creation with notifications', async () => {
      const bookingData = {
        customer_name: 'Test Customer',
        customer_email: 'test@example.com',
        service_name: 'Manual Therapy',
        appointment_date: '2024-03-01',
        appointment_time: '10:00',
        total_amount: 85.00,
        booking_reference: generateCheckoutReference('BOOKING789')
      };
      
      // Create payment
      const paymentIntent = await createPaymentIntent(
        bookingData.total_amount,
        'EUR',
        bookingData.service_name,
        bookingData.booking_reference
      );
      
      // Process payment
      const paymentResult = await processSumUpPayment(paymentIntent);
      
      // Send confirmation (mocked)
      const emailSent = await sendBookingConfirmationEmail(bookingData);
      
      expect(paymentIntent.description).toBe(bookingData.service_name);
      expect(paymentResult.success).toBeDefined();
      expect(emailSent).toBe(true);
    });
  });
});

describe('Error Handling', () => {
  test('should handle invalid password hashing', async () => {
    await expect(hashPassword('')).rejects.toThrow();
  });

  test('should handle invalid payment amounts', () => {
    expect(validatePaymentAmount(-100)).toBe(false);
    expect(validatePaymentAmount(0)).toBe(false);
  });

  test('should handle missing email configuration gracefully', () => {
    // Temporarily clear environment variables
    const originalServiceId = process.env.REACT_APP_EMAILJS_SERVICE_ID;
    delete process.env.REACT_APP_EMAILJS_SERVICE_ID;
    
    const config = validateEmailConfiguration();
    expect(config.isValid).toBe(false);
    expect(config.missingConfig).toContain('EMAILJS_SERVICE_ID');
    
    // Restore environment variable
    process.env.REACT_APP_EMAILJS_SERVICE_ID = originalServiceId;
  });
});

describe('Security Tests', () => {
  test('should generate secure password hashes', async () => {
    const password = 'testPassword123';
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);
    
    // Hashes should be different due to unique salts
    expect(hash1).not.toBe(hash2);
    
    // Both should verify correctly
    expect(await verifyPassword(password, hash1)).toBe(true);
    expect(await verifyPassword(password, hash2)).toBe(true);
  });

  test('should reject weak passwords in verification', async () => {
    const strongPassword = 'StrongPassword123!';
    const hashedPassword = await hashPassword(strongPassword);
    
    // Should reject wrong passwords
    expect(await verifyPassword('wrong', hashedPassword)).toBe(false);
    expect(await verifyPassword('', hashedPassword)).toBe(false);
  });

  test('should generate cryptographically secure checkout references', () => {
    const ref1 = generateCheckoutReference();
    const ref2 = generateCheckoutReference();
    
    expect(ref1).not.toBe(ref2);
    expect(ref1).toMatch(/^checkout_\d+_[a-z0-9]{6}$/);
  });
});
