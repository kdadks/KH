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
    
    if (!gatewayConfig || !gatewayConfig.api_key) {
      throw new Error('SumUp gateway configuration not found. Please configure payment gateway in admin panel.');
    }

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
      
      if (response.status === 401) {
        throw new Error(`SumUp API Authentication Failed (401): Invalid API key. Please check your SumUp API credentials at https://developer.sumup.com`);
      }
      
      throw new Error(`SumUp API Error: ${response.status} - ${errorData.message || 'Unknown error'}`);
    }

    const result = await response.json();
    console.log('SumUp checkout session created:', result);
    return result;

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
    
    if (!gatewayConfig || !gatewayConfig.api_key) {
      throw new Error('SumUp gateway configuration not found. Please configure payment gateway in admin panel.');
    }

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
      
      if (response.status === 401) {
        throw new Error(`SumUp API Authentication Failed (401): Invalid API key. Please check your SumUp API credentials at https://developer.sumup.com`);
      }
      
      throw new Error(`SumUp Payment Error: ${response.status} - ${errorData.message || 'Payment failed'}`);
    }

    const result = await response.json();
    console.log('SumUp payment processed:', result);
    return result;

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
    
    if (!gatewayConfig || !gatewayConfig.api_key) {
      throw new Error('SumUp gateway configuration not found. Please configure payment gateway in admin panel.');
    }

    const response = await fetch(`${SUMUP_API_BASE}/v0.1/checkouts/${checkoutId}`, {
      headers: {
        'Authorization': `Bearer ${gatewayConfig.api_key}`,
      }
    });

    if (!response.ok) {
      throw new Error(`SumUp API Error: ${response.status}`);
    }

    return await response.json();

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
  
  if (!gatewayConfig || !gatewayConfig.merchant_id) {
    throw new Error('SumUp gateway configuration not found. Please configure payment gateway in admin panel.');
  }

  // Step 1: Create checkout session
  const checkoutSession = await createSumUpCheckoutSession({
    checkout_reference: checkoutReference,
    amount: amount,
    currency: currency,
    merchant_code: gatewayConfig.merchant_id,
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
