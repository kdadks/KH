// Real SumUp API Implementation following official documentation
// This implements the exact API flow from SumUp developer portal

const SUMUP_API_BASE = 'https://api.sumup.com';

// Import environment detection and gateway configuration
import { getActiveSumUpGateway } from './paymentManagementUtils';
import { 
  getPaymentEnvironment, 
  getSumUpEnvironmentConfig, 
  getEnvironmentConfig
} from './environmentDetection';

export interface SumUpCreateCheckoutRequest {
  checkout_reference: string;
  amount: number; // Amount in EUR (e.g., 10 for €10.00)
  currency: string;
  merchant_code: string;
  description: string;
  return_url?: string;
  cancel_url?: string;
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
  checkout_url?: string; // URL for the checkout page (development mode)
  transactions: SumUpTransaction[];
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
  try {
    // Detect current environment based on domain
    const currentEnvironment = getPaymentEnvironment();
    const environmentConfig = getEnvironmentConfig();
    const sumupEnvConfig = getSumUpEnvironmentConfig();
    
    console.log(`💳 Creating SumUp checkout in ${environmentConfig.displayName} mode`);
    
    // Get SumUp configuration from database (this will be overridden by domain detection)
    const gatewayConfig = await getActiveSumUpGateway();
    
    // Use environment-specific configuration
    const effectiveConfig = {
      api_key: sumupEnvConfig.apiKey || gatewayConfig?.api_key || 'development-mode',
      merchant_id: sumupEnvConfig.merchantCode || gatewayConfig?.merchant_id || 'SANDBOX',
      environment: currentEnvironment
    };
    
    if (!effectiveConfig.api_key || effectiveConfig.api_key === 'your-api-key-here') {
      throw new Error(`SumUp ${currentEnvironment} configuration not found. Please configure ${currentEnvironment.toUpperCase()} API credentials.`);
    }

    // Development/Sandbox mode - return mock response for localhost/testing
    if (currentEnvironment === 'sandbox' && (effectiveConfig.api_key === 'development-mode' || effectiveConfig.api_key.includes('sandbox') || typeof window !== 'undefined' && window.location.hostname === 'localhost')) {
      console.warn(`🧪 ${environmentConfig.displayName}: Creating mock SumUp checkout session`);
      
      const mockResponse: SumUpCreateCheckoutResponse = {
        checkout_reference: checkoutData.checkout_reference,
        amount: checkoutData.amount,
        currency: checkoutData.currency,
        merchant_code: effectiveConfig.merchant_id,
        description: checkoutData.description,
        id: `${currentEnvironment}-mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        status: 'PENDING',
        date: new Date().toISOString(),
        checkout_url: `/sumup-checkout?checkout_reference=${checkoutData.checkout_reference}&amount=${checkoutData.amount}&currency=${checkoutData.currency}&description=${encodeURIComponent(checkoutData.description)}&merchant_code=${effectiveConfig.merchant_id}&checkout_id=${currentEnvironment}-mock-${Date.now()}&env=${currentEnvironment}${checkoutData.return_url ? `&return_url=${encodeURIComponent(checkoutData.return_url)}` : ''}${checkoutData.cancel_url ? `&cancel_url=${encodeURIComponent(checkoutData.cancel_url)}` : ''}`,
        transactions: []
      };

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));      return mockResponse;
    }

    // Real SumUp API (production or sandbox)
    console.log(`🚀 Using real SumUp API in ${currentEnvironment} mode`);
    
    const response = await fetch(`${SUMUP_API_BASE}/v0.1/checkouts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${effectiveConfig.api_key}`,
        'Content-Type': 'application/json',
        'X-Environment': currentEnvironment, // Custom header for tracking
      },
      body: JSON.stringify({
        checkout_reference: checkoutData.checkout_reference,
        amount: checkoutData.amount,
        currency: checkoutData.currency,
        merchant_code: effectiveConfig.merchant_id,
        description: checkoutData.description,
        hosted_checkout: {
          enabled: true
        },
        ...(checkoutData.return_url ? { return_url: checkoutData.return_url } : {}),
        ...(checkoutData.cancel_url ? { cancel_url: checkoutData.cancel_url } : {})
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      
      if (response.status === 401) {
        throw new Error(`SumUp API Authentication Failed (401): Invalid API key. Please check your SumUp API credentials at https://developer.sumup.com`);
      }
      
      throw new Error(`SumUp API Error: ${response.status} - ${errorData.message || 'Unknown error'}`);
    }

    const result = await response.json();    return result;

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
  try {
    // Detect current environment based on domain
    const currentEnvironment = getPaymentEnvironment();
    const environmentConfig = getEnvironmentConfig();
    const sumupEnvConfig = getSumUpEnvironmentConfig();
    
    // Get SumUp configuration from database (this will be overridden by domain detection)
    const gatewayConfig = await getActiveSumUpGateway();
    
    // Use environment-specific configuration
    const effectiveConfig = {
      api_key: sumupEnvConfig.apiKey || gatewayConfig?.api_key || 'development-mode',
      merchant_id: sumupEnvConfig.merchantCode || gatewayConfig?.merchant_id || 'SANDBOX',
      environment: currentEnvironment
    };
    
    if (!effectiveConfig.api_key || effectiveConfig.api_key === 'your-api-key-here') {
      throw new Error(`SumUp ${currentEnvironment} configuration not found. Please configure ${currentEnvironment.toUpperCase()} API credentials.`);
    }

    // Development/Sandbox mode - return mock response for localhost/testing
    if (currentEnvironment === 'sandbox' && (effectiveConfig.api_key === 'development-mode' || effectiveConfig.api_key.includes('sandbox') || typeof window !== 'undefined' && window.location.hostname === 'localhost')) {
      console.warn(`🧪 ${environmentConfig.displayName}: Processing mock SumUp payment`);
      
      const mockResponse: SumUpProcessPaymentResponse = {
        id: checkoutId,
        checkout_reference: `${currentEnvironment}-payment-${Date.now()}`,
        amount: 0, // Will be updated based on checkout
        currency: 'EUR',
        status: 'PAID',
        date: new Date().toISOString(),
        merchant_code: effectiveConfig.merchant_id,
        description: 'Development mode payment',
        transaction_id: `dev-txn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        transaction_code: `DEV${Date.now()}`,
        transactions: []
      };

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));      return mockResponse;
    }

    // Real SumUp API (production or sandbox)
    console.log(`🚀 Processing payment via SumUp API in ${currentEnvironment} mode`);
    
    const response = await fetch(`${SUMUP_API_BASE}/v0.1/checkouts/${checkoutId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${effectiveConfig.api_key}`,
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

    const result = await response.json();    return result;

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
    // Detect current environment based on domain
    const currentEnvironment = getPaymentEnvironment();
    const environmentConfig = getEnvironmentConfig();
    const sumupEnvConfig = getSumUpEnvironmentConfig();
    
    // Get SumUp configuration from database (this will be overridden by domain detection)
    const gatewayConfig = await getActiveSumUpGateway();
    
    // Use environment-specific configuration
    const effectiveConfig = {
      api_key: sumupEnvConfig.apiKey || gatewayConfig?.api_key || 'development-mode',
      merchant_id: sumupEnvConfig.merchantCode || gatewayConfig?.merchant_id || 'SANDBOX',
      environment: currentEnvironment
    };
    
    if (!effectiveConfig.api_key || effectiveConfig.api_key === 'your-api-key-here') {
      throw new Error(`SumUp ${currentEnvironment} configuration not found. Please configure ${currentEnvironment.toUpperCase()} API credentials.`);
    }

    // Development/Sandbox mode - return mock response for localhost/testing
    if (currentEnvironment === 'sandbox' && (effectiveConfig.api_key === 'development-mode' || effectiveConfig.api_key.includes('sandbox') || typeof window !== 'undefined' && window.location.hostname === 'localhost')) {
      console.warn(`🧪 ${environmentConfig.displayName}: Getting mock SumUp checkout status`);
      
      const mockResponse: SumUpCreateCheckoutResponse = {
        checkout_reference: `${currentEnvironment}-status-${Date.now()}`,
        amount: 0,
        currency: 'EUR',
        merchant_code: effectiveConfig.merchant_id,
        description: `${environmentConfig.displayName} checkout status`,
        id: checkoutId,
        status: 'PENDING',
        date: new Date().toISOString(),
        transactions: []
      };

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 300));
      return mockResponse;
    }

    // Real SumUp API (production or sandbox)
    console.log(`🔍 Checking SumUp checkout status in ${currentEnvironment} mode`);
    
    const response = await fetch(`${SUMUP_API_BASE}/v0.1/checkouts/${checkoutId}`, {
      headers: {
        'Authorization': `Bearer ${effectiveConfig.api_key}`,
        'X-Environment': currentEnvironment,
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

