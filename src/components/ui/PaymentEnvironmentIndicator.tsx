/**
 * Payment Environment Indicator Component
 * Shows whether the application is running in production or sandbox mode
 */

import React from 'react';
import { getEnvironmentConfig, isProductionEnvironment } from '../../utils/environmentDetection';

interface PaymentEnvironmentIndicatorProps {
  className?: string;
  showFullDetails?: boolean;
}

export const PaymentEnvironmentIndicator: React.FC<PaymentEnvironmentIndicatorProps> = ({ 
  className = '', 
  showFullDetails = false 
}) => {
  const isProduction = isProductionEnvironment();

  if (isProduction) {
    // In production, show minimal or no indicator
    return showFullDetails ? (
      <div className={`inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-md ${className}`}>
        <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
        Live Payments
      </div>
    ) : null;
  }

  // In sandbox/development, always show the indicator
  return (
    <div className={`inline-flex items-center px-3 py-2 text-sm font-medium bg-yellow-100 text-yellow-800 border border-yellow-200 rounded-lg shadow-sm ${className}`}>
      <div className="w-3 h-3 bg-yellow-500 rounded-full mr-3 animate-pulse"></div>
      <div className="flex flex-col">
        <span className="font-semibold">🧪 Test Mode</span>
        {showFullDetails && (
          <span className="text-xs text-yellow-600 mt-1">
            No real money will be charged
          </span>
        )}
      </div>
    </div>
  );
};

/**
 * Compact version for use in headers or small spaces
 */
export const PaymentEnvironmentBadge: React.FC<{ className?: string }> = ({ className = '' }) => {
  const isProduction = isProductionEnvironment();

  if (isProduction) {
    return (
      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full ${className}`}>
        <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5"></span>
        Live
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full ${className}`}>
      <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full mr-1.5 animate-pulse"></span>
      Test
    </span>
  );
};

/**
 * Hook to get environment information for use in components
 */
export const usePaymentEnvironment = () => {
  const config = getEnvironmentConfig();
  
  return {
    ...config,
    indicator: <PaymentEnvironmentIndicator />,
    badge: <PaymentEnvironmentBadge />,
    warningMessage: config.isSandbox ? 'This is a test environment. No real payments will be processed.' : null
  };
};

export default PaymentEnvironmentIndicator;