import React, { useEffect } from 'react';
import { CheckCircle, ArrowLeft, Home } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';

const PaymentSuccessPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const transactionId = searchParams.get('transaction_id');
  const checkoutReference = searchParams.get('checkout_reference');
  const amount = searchParams.get('amount');
  const currency = searchParams.get('currency') || 'EUR';

  useEffect(() => {
    // Log the payment success for debugging
    console.log('Payment success page loaded with params:', {
      transactionId,
      checkoutReference,
      amount,
      currency
    });

    // In a real application, you would:
    // 1. Verify the payment with SumUp API
    // 2. Update your database with the payment status
    // 3. Send confirmation emails
    // 4. Update the user's account
  }, [transactionId, checkoutReference, amount, currency]);

  const formatAmount = (amountStr: string | null) => {
    if (!amountStr) return '€0.00';
    const amountNum = parseInt(amountStr) / 100; // Convert from cents
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency: currency
    }).format(amountNum);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          {/* Success Icon */}
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>

          {/* Title */}
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Payment Successful!
          </h2>
          <p className="text-gray-600 mb-8">
            Your payment has been processed successfully.
          </p>

          {/* Payment Details */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Details</h3>
            <div className="space-y-3 text-sm">
              {amount && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-medium text-gray-900">{formatAmount(amount)}</span>
                </div>
              )}
              {transactionId && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Transaction ID:</span>
                  <span className="font-mono text-xs text-gray-900">{transactionId}</span>
                </div>
              )}
              {checkoutReference && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Reference:</span>
                  <span className="font-mono text-xs text-gray-900">{checkoutReference}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className="text-green-600 font-medium">Completed</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Date:</span>
                <span className="text-gray-900">{new Date().toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Next Steps */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
            <h4 className="font-medium text-blue-900 mb-2">What's Next?</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• A confirmation email will be sent to you shortly</li>
              <li>• Your booking is now confirmed</li>
              <li>• You can view your payment history in your account</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              to="/my-account"
              className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
            >
              <Home className="w-4 h-4 mr-2" />
              Go to My Account
            </Link>
            <Link
              to="/"
              className="flex-1 bg-gray-200 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors flex items-center justify-center"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Link>
          </div>

          {/* Test Mode Notice */}
          {import.meta.env.DEV && (
            <div className="mt-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-xs text-yellow-800">
                <strong>Development Mode:</strong> This is a test payment. No actual money was charged.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccessPage;
