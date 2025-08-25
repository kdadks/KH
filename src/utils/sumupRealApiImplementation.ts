// Real SumUp API Implementation following official documentation
// This implements the exact API flow from SumUp developer portal

const SUMUP_API_BASE = 'https://api.sumup.com';

// Import function to get gateway configuration from database
import { getActiveSumUpGateway } from './paymentManagementUtils';

export interface SumUpCreateCheckoutRequest {
  checkout_reference: string;
  amount: number; // Amount in EUR (e.g., 10 for €10.00)
  currency: string;
  merchant_code: string;
  description: string;
}

export interface SumUpCreateCheckoutResponse {
  checkout_reference: string;
  amount: number;
  currency: string;
  merchant_code: string;
  description: string;
  id: string; // UUID for the checkout session
  status: 'PENDING' | 'PAID' | 'FAILED';
  date: string; // ISO date
  transactions: any[];
}

export interface SumUpProcessPaymentRequest {
  payment_type: 'card';
  card: {
    name: string;
    number: string;
    expiry_month: string;
    expiry_year: string;
    cvv: string;
  };
}

export interface SumUpProcessPaymentResponse {
  checkout_reference: string;
  amount: number;
  currency: string;
  merchant_code: string;
  description: string;
  id: string;
  status: 'PAID' | 'FAILED';
  date: string;
  transaction_code?: string;
  transaction_id?: string;
  transactions: SumUpTransaction[];
}

export interface SumUpTransaction {
  id: string;
  transaction_code: string;
  merchant_code: string;
  amount: number;
  vat_amount: number;
  tip_amount: number;
  currency: string;
  timestamp: string;
  status: 'SUCCESSFUL' | 'FAILED';
  payment_type: 'ECOM';
  entry_mode: 'CUSTOMER_ENTRY';
  installments_count: number;
  auth_code: string;
  internal_id: number;
}

/**
 * Step 1: Create a checkout session
 * POST https://api.sumup.com/v0.1/checkouts
 */
export const createSumUpCheckoutSession = async (
  checkoutData: SumUpCreateCheckoutRequest
): Promise<SumUpCreateCheckoutResponse> => {
  
  console.log('Creating SumUp checkout session:', checkoutData);

  try {
    // Get SumUp configuration from database
    const gatewayConfig = await getActiveSumUpGateway();
    
    if (gatewayConfig && gatewayConfig.api_key && gatewayConfig.api_key !== 'demo-api-key') {
      const response = await fetch(`${SUMUP_API_BASE}/v0.1/checkouts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${gatewayConfig.api_key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...checkoutData,
          merchant_code: gatewayConfig.merchant_id
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`SumUp API Error: ${response.status} - ${errorData.message || 'Unknown error'}`);
      }

      const result = await response.json();
      console.log('SumUp checkout session created:', result);
      return result;
    }

    // Mock response for testing (when no real API key is provided)
    console.warn('Using mock SumUp API response - set VITE_SUMUP_API_KEY for real API calls');
    
    const mockResponse: SumUpCreateCheckoutResponse = {
      checkout_reference: checkoutData.checkout_reference,
      amount: checkoutData.amount,
      currency: checkoutData.currency,
      merchant_code: checkoutData.merchant_code,
      description: checkoutData.description,
      id: `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      status: 'PENDING',
      date: new Date().toISOString(),
      transactions: []
    };

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('Mock checkout session created:', mockResponse);
    return mockResponse;

  } catch (error) {
    console.error('Error creating SumUp checkout session:', error);
    throw error;
  }
};

/**
 * Step 2: Process payment with card details
 * PUT https://api.sumup.com/v0.1/checkouts/{checkout_id}
 */
export const processSumUpPayment = async (
  checkoutId: string,
  paymentData: SumUpProcessPaymentRequest
): Promise<SumUpProcessPaymentResponse> => {
  
  console.log('Processing SumUp payment:', { checkoutId, paymentData });

  try {
    // Get SumUp configuration from database
    const gatewayConfig = await getActiveSumUpGateway();
    
    if (gatewayConfig && gatewayConfig.api_key && gatewayConfig.api_key !== 'demo-api-key') {
      const response = await fetch(`${SUMUP_API_BASE}/v0.1/checkouts/${checkoutId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${gatewayConfig.api_key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`SumUp Payment Error: ${response.status} - ${errorData.message || 'Payment failed'}`);
      }

      const result = await response.json();
      console.log('SumUp payment processed:', result);
      return result;
    }

    // Mock response for testing
    console.warn('Using mock SumUp payment processing - set VITE_SUMUP_API_KEY for real API calls');
    
    // Determine payment outcome based on card number (following SumUp test cards)
    const cardNumber = paymentData.card.number.replace(/\s/g, '');
    const isSuccessful = !['4000000000000069', '4000000000009995'].includes(cardNumber);

    if (isSuccessful) {
      const mockResponse: SumUpProcessPaymentResponse = {
        checkout_reference: `CO${Date.now()}`,
        amount: 23.00, // This would come from the original checkout
        currency: 'EUR',
        merchant_code: gatewayConfig?.merchant_id || 'MOCK_MERCHANT',
        description: 'Mock payment processing',
        id: checkoutId,
        status: 'PAID',
        date: new Date().toISOString(),
        transaction_code: `TXN${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        transaction_id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        transactions: [{
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          transaction_code: `TXN${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
          merchant_code: gatewayConfig?.merchant_id || 'MOCK_MERCHANT',
          amount: 23.00,
          vat_amount: 0.0,
          tip_amount: 0.0,
          currency: 'EUR',
          timestamp: new Date().toISOString(),
          status: 'SUCCESSFUL',
          payment_type: 'ECOM',
          entry_mode: 'CUSTOMER_ENTRY',
          installments_count: 1,
          auth_code: Math.random().toString().substr(2, 6),
          internal_id: Math.floor(Math.random() * 10000000)
        }]
      };
      
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('Mock payment processed (success):', mockResponse);
      return mockResponse;
    } else {
      const mockResponse: SumUpProcessPaymentResponse = {
        checkout_reference: `CO${Date.now()}`,
        amount: 23.00,
        currency: 'EUR',
        merchant_code: gatewayConfig?.merchant_id || 'MOCK_MERCHANT',
        description: 'Mock payment processing',
        id: checkoutId,
        status: 'FAILED',
        date: new Date().toISOString(),
        transactions: []
      };
      
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('Mock payment processed (failed):', mockResponse);
      return mockResponse;
    }

  } catch (error) {
    console.error('Error processing SumUp payment:', error);
    throw error;
  }
};

/**
 * Get checkout status
 * GET https://api.sumup.com/v0.1/checkouts/{checkout_id}
 */
export const getSumUpCheckoutStatus = async (checkoutId: string): Promise<SumUpCreateCheckoutResponse> => {
  try {
    // Get SumUp configuration from database
    const gatewayConfig = await getActiveSumUpGateway();
    
    if (gatewayConfig && gatewayConfig.api_key && gatewayConfig.api_key !== 'demo-api-key') {
      const response = await fetch(`${SUMUP_API_BASE}/v0.1/checkouts/${checkoutId}`, {
        headers: {
          'Authorization': `Bearer ${gatewayConfig.api_key}`,
        }
      });

      if (!response.ok) {
        throw new Error(`SumUp API Error: ${response.status}`);
      }

      return await response.json();
    }

    // Mock response
    return {
      checkout_reference: `CO${Date.now()}`,
      amount: 23.00,
      currency: 'EUR',
      merchant_code: gatewayConfig?.merchant_id || 'MOCK_MERCHANT',
      description: 'Mock checkout',
      id: checkoutId,
      status: 'PENDING',
      date: new Date().toISOString(),
      transactions: []
    };

  } catch (error) {
    console.error('Error getting checkout status:', error);
    throw error;
  }
};

/**
 * Complete SumUp payment flow (combines both steps)
 */
export const completeSumUpPaymentFlow = async (
  amount: number,
  currency: string,
  description: string,
  checkoutReference: string,
  cardDetails: {
    name: string;
    number: string;
    expiry_month: string;
    expiry_year: string;
    cvv: string;
  }
): Promise<SumUpProcessPaymentResponse> => {
  
  console.log('Starting complete SumUp payment flow...');

  // Get SumUp configuration from database
  const gatewayConfig = await getActiveSumUpGateway();

  // Step 1: Create checkout session
  const checkoutSession = await createSumUpCheckoutSession({
    checkout_reference: checkoutReference,
    amount: amount,
    currency: currency,
    merchant_code: gatewayConfig?.merchant_id || 'DEMO_MERCHANT',
    description: description
  });

  // Step 2: Process payment
  const paymentResult = await processSumUpPayment(checkoutSession.id, {
    payment_type: 'card',
    card: cardDetails
  });

  return paymentResult;
};

export default {
  createSumUpCheckoutSession,
  processSumUpPayment,
  getSumUpCheckoutStatus,
  completeSumUpPaymentFlow
};
