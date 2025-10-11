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
  customer?: {
    customer_id?: string;
    email?: string;
    name?: string;
    phone?: string;
    address?: {
      line_1?: string;
      line_2?: string;
      city?: string;
      postal_code?: string;
      country?: string;
    };
  };
  pay_to_email?: string; // Alternative email field
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

    // Sandbox mode - return mock response for testing complete workflow
    if (currentEnvironment === 'sandbox' && (effectiveConfig.api_key === 'development-mode' || effectiveConfig.api_key.includes('sandbox') || effectiveConfig.api_key === 'sandbox-test-key-for-workflow-testing')) {
      console.warn(`🧪 ${environmentConfig.displayName}: Creating mock SumUp checkout session with full workflow testing`);
      
      // Log customer information if provided
      if (checkoutData.customer) {
        console.log('📧 Customer information included in checkout:', {
          name: checkoutData.customer.name,
          email: checkoutData.customer.email
        });
      }
      
      const mockResponse: SumUpCreateCheckoutResponse = {
        checkout_reference: checkoutData.checkout_reference,
        amount: checkoutData.amount,
        currency: checkoutData.currency,
        merchant_code: effectiveConfig.merchant_id,
        description: checkoutData.description,
        id: `${currentEnvironment}-mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        status: 'PENDING',
        date: new Date().toISOString(),
        // Create short URL for testing (similar to production SumUp URLs)
        checkout_url: `/sumup-checkout?ref=${checkoutData.checkout_reference}&id=${currentEnvironment}-mock-${Date.now()}&test=1`,
        transactions: []
      };

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));      return mockResponse;
    }

    // Real SumUp API (production or sandbox)
    console.log(`🚀 Using real SumUp API in ${currentEnvironment} mode`);
    
    // Prepare the API payload
    const apiPayload = {
      checkout_reference: checkoutData.checkout_reference,
      amount: checkoutData.amount,
      currency: checkoutData.currency,
      merchant_code: effectiveConfig.merchant_id,
      description: checkoutData.description,
      hosted_checkout: {
        enabled: true
      },
      ...(checkoutData.return_url ? { return_url: checkoutData.return_url } : {}),
      ...(checkoutData.cancel_url ? { cancel_url: checkoutData.cancel_url } : {}),
      // Add customer information at root level for SumUp
      ...(checkoutData.customer?.email ? { customer_email: checkoutData.customer.email } : {}),
      ...(checkoutData.customer?.name ? { customer_name: checkoutData.customer.name } : {}),
      ...(checkoutData.pay_to_email ? { pay_to_email: checkoutData.pay_to_email } : {}),
      // Also include nested customer object for compatibility
      ...(checkoutData.customer ? { customer: checkoutData.customer } : {})
    };

    // Log customer data being sent for debugging
    if (checkoutData.customer) {
      console.log('📧 Sending customer data to SumUp API:', {
        customer_email: apiPayload.customer_email,
        customer_name: apiPayload.customer_name,
        customer: apiPayload.customer,
        pay_to_email: apiPayload.pay_to_email
      });
    }
    
    const response = await fetch(`${SUMUP_API_BASE}/v0.1/checkouts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${effectiveConfig.api_key}`,
        'Content-Type': 'application/json',
        'X-Environment': currentEnvironment, // Custom header for tracking
      },
      body: JSON.stringify(apiPayload)
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

    // Sandbox mode - return mock response for testing complete workflow
    if (currentEnvironment === 'sandbox' && (effectiveConfig.api_key === 'development-mode' || effectiveConfig.api_key.includes('sandbox') || effectiveConfig.api_key === 'sandbox-test-key-for-workflow-testing')) {
      console.warn(`🧪 ${environmentConfig.displayName}: Processing mock SumUp payment with database updates`);
      
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

    // Sandbox mode - return mock response for testing complete workflow
    if (currentEnvironment === 'sandbox' && (effectiveConfig.api_key === 'development-mode' || effectiveConfig.api_key.includes('sandbox') || effectiveConfig.api_key === 'sandbox-test-key-for-workflow-testing')) {
      console.warn(`🧪 ${environmentConfig.displayName}: Getting mock SumUp checkout status with workflow testing`);
      
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

