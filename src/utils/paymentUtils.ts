// SumUp Payment Configuration - Using Vite environment variables  
const SUMUP_APP_ID = import.meta.env.VITE_SUMUP_APP_ID || 'demo-app-id';
const SUMUP_MERCHANT_CODE = import.meta.env.VITE_SUMUP_MERCHANT_CODE || 'DEMO-MERCHANT-001';
const SUMUP_ENVIRONMENT = import.meta.env.VITE_SUMUP_ENVIRONMENT || 'sandbox'; // 'sandbox' or 'production'

export interface SumUpPaymentRequest {
  amount: number;
  currency: string;
  description: string;
  checkout_reference: string;
  customer_id?: string;
  merchant_code: string;
}

export interface SumUpPaymentResponse {
  success: boolean;
  transaction_id?: string;
  checkout_reference?: string;
  error?: string;
  status?: string;
}

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  description: string;
  status: 'pending' | 'processing' | 'succeeded' | 'failed';
  checkout_reference: string;
}

// Initialize SumUp SDK
export const initializeSumUp = (): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    // In development mode with demo config, always resolve successfully
    if (import.meta.env.DEV && SUMUP_MERCHANT_CODE === 'DEMO-MERCHANT-001') {
      console.log('Using demo SumUp configuration for development');
      resolve(true);
      return;
    }

    if (!SUMUP_APP_ID || !SUMUP_MERCHANT_CODE) {
      console.error('SumUp configuration missing. Please set VITE_SUMUP_APP_ID and VITE_SUMUP_MERCHANT_CODE');
      reject(new Error('SumUp configuration missing'));
      return;
    }

    // Load SumUp SDK script
    const script = document.createElement('script');
    script.src = SUMUP_ENVIRONMENT === 'production' 
      ? 'https://gateway.sumup.com/gateway/ecom/card/v2/sdk.js'
      : 'https://gateway.sumup.com/gateway/ecom/card/v2/sdk.js'; // Same for sandbox
    
    script.onload = () => {
      console.log('SumUp SDK loaded successfully');
      resolve(true);
    };
    
    script.onerror = () => {
      console.error('Failed to load SumUp SDK');
      reject(new Error('Failed to load SumUp SDK'));
    };
    
    document.head.appendChild(script);
  });
};

// Create SumUp checkout URL for redirect
export const createSumUpCheckoutUrl = async (
  amount: number, 
  currency: string = 'EUR',
  description: string,
  checkoutReference: string,
  customerEmail?: string
): Promise<string> => {
  try {
    // In development mode with demo config, create a demo checkout URL
    if (import.meta.env.DEV && SUMUP_MERCHANT_CODE === 'DEMO-MERCHANT-001') {
      console.log('Creating demo SumUp checkout for development');
      
      const demoCheckoutUrl = `https://gateway.sumup.com/gateway/checkout?` +
        `amount=${Math.round(amount * 100)}&currency=${currency}&` +
        `description=${encodeURIComponent(description)}&` +
        `checkout_reference=${checkoutReference}&` +
        `merchant_code=DEMO-MERCHANT-001&` +
        `return_url=${encodeURIComponent(`${window.location.origin}/payment-success`)}&` +
        `cancel_url=${encodeURIComponent(`${window.location.origin}/payment-cancelled`)}`;

      return demoCheckoutUrl;
    }

    if (!SUMUP_MERCHANT_CODE || SUMUP_MERCHANT_CODE === 'DEMO-MERCHANT-001') {
      throw new Error('SumUp merchant code not configured for production use');
    }

    // For production, this would create a real SumUp checkout session
    // For demo purposes, we'll create a mock checkout URL
    const checkoutData = {
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      description,
      checkout_reference: checkoutReference,
      merchant_code: SUMUP_MERCHANT_CODE,
      customer_email: customerEmail,
      return_url: `${window.location.origin}/payment-success`,
      cancel_url: `${window.location.origin}/payment-cancelled`
    };

    console.log('Creating SumUp checkout with data:', checkoutData);

    // In production, make API call to SumUp to create checkout session
    // const response = await fetch('https://api.sumup.com/v0.1/checkouts', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${SUMUP_API_TOKEN}`,
    //     'Content-Type': 'application/json'
    //   },
    //   body: JSON.stringify(checkoutData)
    // });
    // const result = await response.json();
    // return result.checkout_url;

    // For demo, return a mock URL with payment parameters
    const mockCheckoutUrl = `https://gateway.sumup.com/gateway/checkout?` +
      `amount=${checkoutData.amount}&currency=${checkoutData.currency}&` +
      `description=${encodeURIComponent(checkoutData.description)}&` +
      `checkout_reference=${checkoutData.checkout_reference}&` +
      `merchant_code=${checkoutData.merchant_code}&` +
      `return_url=${encodeURIComponent(checkoutData.return_url)}&` +
      `cancel_url=${encodeURIComponent(checkoutData.cancel_url)}`;

    return mockCheckoutUrl;
  } catch (error) {
    console.error('Error creating SumUp checkout URL:', error);
    throw new Error('Failed to create payment checkout');
  }
};

// Create SumUp payment intent
export const createPaymentIntent = async (
  amount: number, 
  currency: string = 'EUR',
  description: string,
  checkoutReference: string,
  customerId?: string
): Promise<PaymentIntent> => {
  try {
    const paymentRequest: SumUpPaymentRequest = {
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      description,
      checkout_reference: checkoutReference,
      customer_id: customerId,
      merchant_code: SUMUP_MERCHANT_CODE
    };

    // For now, we'll create a mock payment intent
    // In production, this would make an API call to SumUp
    const paymentIntent: PaymentIntent = {
      id: `pi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      amount: paymentRequest.amount,
      currency: paymentRequest.currency,
      description: paymentRequest.description,
      status: 'pending',
      checkout_reference: paymentRequest.checkout_reference
    };

    return paymentIntent;
  } catch (error) {
    console.error('Error creating payment intent:', error);
    throw new Error('Failed to create payment intent');
  }
};

// Process SumUp payment
export const processSumUpPayment = async (
  paymentIntent: PaymentIntent
): Promise<SumUpPaymentResponse> => {
  try {
    // This would integrate with SumUp's actual API
    // For demonstration, we'll simulate the payment process
    console.log('Processing SumUp payment:', paymentIntent);

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // For demo purposes, randomly succeed or fail
    const success = Math.random() > 0.1; // 90% success rate

    if (success) {
      return {
        success: true,
        transaction_id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        checkout_reference: paymentIntent.checkout_reference,
        status: 'succeeded'
      };
    } else {
      return {
        success: false,
        error: 'Payment declined',
        status: 'failed'
      };
    }
  } catch (error) {
    console.error('Error processing SumUp payment:', error);
    return {
      success: false,
      error: 'Payment processing failed'
    };
  }
};

// Get payment status
export const getPaymentStatus = async (transactionId: string): Promise<SumUpPaymentResponse> => {
  try {
    // This would query SumUp's API for payment status
    console.log('Checking payment status for transaction:', transactionId);
    
    // Mock response
    return {
      success: true,
      transaction_id: transactionId,
      status: 'succeeded'
    };
  } catch (error) {
    console.error('Error checking payment status:', error);
    return {
      success: false,
      error: 'Failed to check payment status'
    };
  }
};

// Refund payment
export const refundPayment = async (transactionId: string, amount?: number): Promise<SumUpPaymentResponse> => {
  try {
    console.log('Processing refund for transaction:', transactionId, 'Amount:', amount);
    
    // This would call SumUp's refund API
    // Mock response
    return {
      success: true,
      transaction_id: `refund_${Date.now()}`,
      status: 'refunded'
    };
  } catch (error) {
    console.error('Error processing refund:', error);
    return {
      success: false,
      error: 'Refund processing failed'
    };
  }
};

// Format currency for display
export const formatCurrency = (amount: number, currency: string = 'EUR'): string => {
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: currency,
  }).format(amount / 100); // Convert from cents
};

// Validate payment amount
export const validatePaymentAmount = (amount: number): boolean => {
  return amount > 0 && amount <= 99999900; // Max €999,999.00
};

// Generate checkout reference
export const generateCheckoutReference = (bookingId?: string): string => {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substr(2, 6);
  return bookingId ? `booking_${bookingId}_${timestamp}` : `checkout_${timestamp}_${random}`;
};
