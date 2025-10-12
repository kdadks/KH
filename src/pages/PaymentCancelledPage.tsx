import React, { useEffect } from 'react';
import { XCircle, ArrowLeft, Home, RefreshCw } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';

const PaymentCancelledPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const checkoutReference = searchParams.get('checkout_reference');
  const reason = searchParams.get('reason') || 'cancelled';

  useEffect(() => {
    // Log the payment cancellation for debugging
    console.log('Payment cancelled page loaded with params:', {
      checkoutReference,
      reason
    });

    // In a real application, you would:
    // 1. Update your database with the cancellation
    // 2. Log the cancellation reason
    // 3. Potentially send notification emails
    // 4. Clean up any pending payment requests
    
    // Auto-redirect to account/payments page after 5 seconds
    const redirectTimer = setTimeout(() => {
      window.location.href = '/my-account?tab=payments';
    }, 5000);
    
    return () => clearTimeout(redirectTimer);
  }, [checkoutReference, reason]);

  const getReason = () => {
    switch (reason.toLowerCase()) {
      case 'timeout':
        return 'Payment session timed out';
      case 'user_cancelled':
        return 'Payment was cancelled by user';
      case 'failed':
        return 'Payment processing failed';
      case 'invalid_card':
        return 'Invalid card details';
      case 'insufficient_funds':
        return 'Insufficient funds';
      default:
        return 'Payment was cancelled';
    }
  };

  const getAdvice = () => {
    switch (reason.toLowerCase()) {
      case 'timeout':
        return 'Please try again with a fresh payment session.';
      case 'invalid_card':
        return 'Please check your card details and try again.';
      case 'insufficient_funds':
        return 'Please check your account balance or try a different payment method.';
      default:
        return 'You can try the payment again or contact us for assistance.';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          {/* Cancellation Icon */}
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
            <XCircle className="h-10 w-10 text-red-600" />
          </div>

          {/* Title */}
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Payment Cancelled
          </h2>
          <p className="text-gray-600 mb-8">
            {getReason()}
          </p>

          {/* Cancellation Details */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Cancellation Details</h3>
            <div className="space-y-3 text-sm">
              {checkoutReference && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Reference:</span>
                  <span className="font-mono text-xs text-gray-900">{checkoutReference}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className="text-red-600 font-medium">Cancelled</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Reason:</span>
                <span className="text-gray-900 capitalize">{reason.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Date:</span>
                <span className="text-gray-900">{new Date().toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Advice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
            <h4 className="font-medium text-blue-900 mb-2">What You Can Do</h4>
            <p className="text-sm text-blue-800 mb-3">{getAdvice()}</p>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Check your payment details</li>
              <li>• Try a different payment method</li>
              <li>• Contact us if you need assistance</li>
              <li>• Your booking is still pending payment</li>
            </ul>
            <p className="text-xs text-blue-600 mt-3 italic">
              Redirecting to your account in 5 seconds...
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => window.history.back()}
              className="flex-1 bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Payment Again
            </button>
            <Link
              to="/my-account"
              className="flex-1 bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center"
            >
              <Home className="w-4 h-4 mr-2" />
              Go to My Account
            </Link>
          </div>

          <div className="mt-4">
            <Link
              to="/"
              className="text-gray-600 hover:text-gray-800 transition-colors flex items-center justify-center"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Home
            </Link>
          </div>

          {/* Test Mode Notice */}
          {import.meta.env.DEV && (
            <div className="mt-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-xs text-yellow-800">
                <strong>Development Mode:</strong> This is a test payment cancellation.
              </p>
            </div>
          )}

          {/* Contact Information */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Need help? Contact us at{' '}
              <a href="mailto:info@khtherapy.ie" className="text-blue-600 hover:text-blue-800">
                info@khtherapy.ie
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentCancelledPage;
