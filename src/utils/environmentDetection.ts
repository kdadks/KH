/**
 * Environment Detection Utility
 * Determines if the application is running in production or sandbox mode
 * based on the current domain/hostname
 */

import logger from './logger';

export type PaymentEnvironment = 'production' | 'sandbox';

// Cache the environment detection result to avoid repeated computation and logging
let cachedEnvironment: PaymentEnvironment | null = null;

/**
 * Clear the cached environment (useful for testing or if environment changes)
 */
export const clearEnvironmentCache = (): void => {
  cachedEnvironment = null;
};

/**
 * Get the current payment environment based on domain
 * Production: https://khtherapy.ie/
 * Sandbox: All other domains (localhost, netlify previews, etc.)
 */
export const getPaymentEnvironment = (): PaymentEnvironment => {
  // Return cached result if available
  if (cachedEnvironment) {
    return cachedEnvironment;
  }

  // Check if we're in a server-side environment (Node.js)
  if (typeof window === 'undefined') {
    // For server-side rendering or Netlify functions
    // Check environment variables or default to sandbox
    const nodeEnv = process.env.NODE_ENV;
    const netlifyContext = process.env.CONTEXT; // Netlify deployment context
    
    // If explicitly set to production via environment
    if (nodeEnv === 'production' && netlifyContext === 'production') {
      cachedEnvironment = 'production';
      return 'production';
    }
    
    cachedEnvironment = 'sandbox';
    return 'sandbox';
  }

  // Client-side environment detection
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  const fullDomain = `${protocol}//${hostname}`;

  // Only log once when environment is first detected
  logger.debug('Detecting payment environment:', {
    hostname,
    protocol,
    fullDomain,
    href: window.location.href
  });

  // Production domain check - ONLY exact production domains
  const productionDomains = [
    'khtherapy.ie',
    'www.khtherapy.ie'
  ];

  // UAT/Staging/Preview domains should always be sandbox
  const isUATOrStaging = (
    hostname.includes('netlify.app') ||
    hostname.includes('staging') ||
    hostname.includes('uat') ||
    hostname.includes('preview') ||
    hostname.includes('dev') ||
    hostname.includes('test') ||
    hostname === 'localhost'
  );

  const isExactProductionDomain = productionDomains.includes(hostname) && protocol === 'https:';

  if (isUATOrStaging) {
    logger.info('UAT/Staging environment detected - Forcing sandbox mode');
    cachedEnvironment = 'sandbox';
    return 'sandbox';
  }

  if (isExactProductionDomain) {
    logger.info('Production payment environment detected - Using live SumUp integration');
    cachedEnvironment = 'production';
    return 'production';
  } else {
    logger.debug('Sandbox payment environment detected', { hostname, productionDomains });
    cachedEnvironment = 'sandbox';
    return 'sandbox';
  }
};

/**
 * Check if currently running in production environment
 */
export const isProductionEnvironment = (): boolean => {
  return getPaymentEnvironment() === 'production';
};

/**
 * Check if currently running in sandbox environment
 */
export const isSandboxEnvironment = (): boolean => {
  return getPaymentEnvironment() === 'sandbox';
};

/**
 * Get environment-specific configuration
 */
export const getEnvironmentConfig = () => {
  const environment = getPaymentEnvironment();
  
  return {
    environment,
    isProduction: environment === 'production',
    isSandbox: environment === 'sandbox',
    displayName: environment === 'production' ? 'Live Payments' : 'Test Mode',
    apiBase: 'https://api.sumup.com', // SumUp uses same API base for both
    webhookNote: environment === 'production' 
      ? 'Processing live payments' 
      : 'Test mode - No real money will be charged'
  };
};

/**
 * Get environment-appropriate SumUp configuration
 */
export const getSumUpEnvironmentConfig = () => {
  const environment = getPaymentEnvironment();
  
  if (environment === 'production') {
    return {
      environment: 'production' as const,
      apiKey: import.meta.env.VITE_SUMUP_PRODUCTION_API_KEY || import.meta.env.VITE_SUMUP_API_KEY,
      merchantCode: import.meta.env.VITE_SUMUP_PRODUCTION_MERCHANT_CODE || import.meta.env.VITE_SUMUP_MERCHANT_CODE,
      appId: import.meta.env.VITE_SUMUP_PRODUCTION_APP_ID || import.meta.env.VITE_SUMUP_APP_ID
    };
  } else {
    // Sandbox mode: Use temporary keys that trigger mock/simulation behavior
    return {
      environment: 'sandbox' as const,
      apiKey: import.meta.env.VITE_SUMUP_SANDBOX_API_KEY || 'sandbox-test-key-for-workflow-testing',
      merchantCode: import.meta.env.VITE_SUMUP_SANDBOX_MERCHANT_CODE || 'SANDBOX_TEST',
      appId: import.meta.env.VITE_SUMUP_SANDBOX_APP_ID || 'sandbox-app-id'
    };
  }
};

/**
 * Development helper - log current environment details
 */
export const logEnvironmentInfo = () => {
  const config = getEnvironmentConfig();
  const sumupConfig = getSumUpEnvironmentConfig();
  
  console.group('💳 Payment Environment Information');
  console.log('Environment:', config.environment);
  console.log('Display Name:', config.displayName);
  console.log('Is Production:', config.isProduction);
  console.log('Is Sandbox:', config.isSandbox);
  console.log('API Base:', config.apiBase);
  console.log('SumUp Config:', {
    environment: sumupConfig.environment,
    hasApiKey: !!sumupConfig.apiKey,
    hasMerchantCode: !!sumupConfig.merchantCode,
    hasAppId: !!sumupConfig.appId
  });
  console.log('Webhook Note:', config.webhookNote);
  console.groupEnd();
};

// Auto-log environment on module load in development
if (import.meta.env.DEV) {
  // Delay to ensure DOM is ready
  setTimeout(() => {
    if (typeof window !== 'undefined') {
      logEnvironmentInfo();
    }
  }, 1000);
}