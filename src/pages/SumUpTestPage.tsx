import React, { useState, useEffect } from 'react';
import { CreditCard, CheckCircle, AlertCircle, ExternalLink, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { initializeSumUp, formatCurrency } from '../utils/paymentUtils';
import { createSumUpCheckout, SumUpCheckoutResponse } from '../utils/sumupApi';
import { createSumUpCheckoutSession } from '../utils/sumupRealApiImplementation';
import { getActiveSumUpGateway } from '../utils/paymentManagementUtils';
import { useToast } from '../components/shared/toastContext';

interface TestPayment {
  amount: number;
  currency: string;
  description: string;
}

const SumUpTestPage: React.FC = () => {
  const { showSuccess, showError, showInfo } = useToast();
  const [isInitialized, setIsInitialized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'creating' | 'checkout' | 'completed' | 'failed'>('idle');
  const [currentPayment, setCurrentPayment] = useState<TestPayment | null>(null);

  const [checkoutResponse, setCheckoutResponse] = useState<SumUpCheckoutResponse | null>(null);

  // Predefined test payment options
  const testPayments: TestPayment[] = [
    { amount: 23.00, currency: 'EUR', description: 'Test Deposit Payment - Premium Care Service' },
    { amount: 92.00, currency: 'EUR', description: 'Test Balance Payment - Premium Care Service' },
    { amount: 115.00, currency: 'EUR', description: 'Test Full Payment - Premium Care Service' },
    { amount: 50.00, currency: 'EUR', description: 'Test Custom Payment - General Service' },
  ];

  useEffect(() => {
    // Initialize SumUp on component mount
    const init = async () => {
      try {
        setLoading(true);
        const initialized = await initializeSumUp();
        setIsInitialized(initialized);
        
        if (initialized) {
          showSuccess('SumUp Initialized', 'SumUp payment system is ready for testing');
        }
      } catch (error) {
        console.error('Failed to initialize SumUp:', error);
        showError('Initialization Failed', 'Failed to initialize SumUp payment system');
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [showSuccess, showError]);

  const handleCreateCheckout = async (testPayment: TestPayment) => {
    try {
      setPaymentStatus('creating');
      setCurrentPayment(testPayment);
      setLoading(true);

      // Generate unique checkout reference
      const checkoutReference = `test-payment-${Date.now()}`;
      
      showInfo('Creating Checkout', 'Generating SumUp checkout session...');

      // Try real API first, fall back to mock if needed
      let response: SumUpCheckoutResponse;
      
      try {
        console.log('Attempting real SumUp API...');
        
        // Get SumUp configuration from database
        const gatewayConfig = await getActiveSumUpGateway();
        
        const realApiResponse = await createSumUpCheckoutSession({
          checkout_reference: checkoutReference,
          amount: testPayment.amount,
          currency: testPayment.currency,
          merchant_code: gatewayConfig?.merchant_id || 'DEMO_MERCHANT',
          description: testPayment.description
        });
        
        console.log('Real API response:', realApiResponse);
        showInfo('Real API Success', 'Using actual SumUp API endpoints!');
        
        // Convert to our response format
        response = {
          id: realApiResponse.id,
          amount: realApiResponse.amount,
          currency: realApiResponse.currency,
          description: realApiResponse.description,
          merchant_code: realApiResponse.merchant_code,
          checkout_reference: realApiResponse.checkout_reference,
          status: realApiResponse.status.toLowerCase() as 'pending' | 'paid' | 'failed' | 'cancelled',
          date: realApiResponse.date,
          valid_until: realApiResponse.date, // Use date as fallback
          checkout_url: `/sumup-checkout?checkout_reference=${realApiResponse.checkout_reference}&amount=${testPayment.amount}&currency=${testPayment.currency}&description=${encodeURIComponent(testPayment.description)}&merchant_code=${realApiResponse.merchant_code}`
        };
        
      } catch (realApiError) {
        console.log('Real API failed, using mock:', realApiError);
        showInfo('Using Mock API', 'Real API failed, falling back to mock for testing...');
        
        // Fall back to mock API
        response = await createSumUpCheckout(
          testPayment.amount,
          testPayment.currency,
          testPayment.description,
          checkoutReference,
          'test@khtherapy.ie' // Test email
        );
      }

      setCheckoutResponse(response);
      setCheckoutUrl(response.checkout_url);
      setPaymentStatus('checkout');
      
      showSuccess('Checkout Created', 'SumUp checkout session created successfully');
      
      // Log the checkout details for debugging
      console.log('SumUp Checkout Created:', {
        checkout_id: response.id,
        amount: response.amount,
        currency: response.currency,
        merchant_code: response.merchant_code,
        checkout_url: response.checkout_url,
        status: response.status
      });

    } catch (error) {
      console.error('Failed to create checkout:', error);
      setPaymentStatus('failed');
      showError('Checkout Error', 'Failed to create SumUp checkout');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentComplete = () => {
    setPaymentStatus('completed');
    showSuccess('Payment Completed', 'Test payment completed successfully!');
  };

  const handlePaymentFailed = () => {
    setPaymentStatus('failed');
    showError('Payment Failed', 'Test payment failed. This is normal in sandbox mode.');
  };

  const resetTest = () => {
    setPaymentStatus('idle');
    setCurrentPayment(null);
    setCheckoutUrl(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link 
            to="/admin" 
            className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Admin
          </Link>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">SumUp Payment Testing</h1>
          <p className="text-gray-600">Test SumUp integration with your actual merchant configuration</p>
          
          {/* Configuration Status */}
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium text-blue-900">App ID:</span>
                <p className="text-blue-700 truncate">{import.meta.env.VITE_SUMUP_APP_ID || 'Not set'}</p>
              </div>
              <div>
                <span className="font-medium text-blue-900">Merchant Code:</span>
                <p className="text-blue-700">{import.meta.env.VITE_SUMUP_MERCHANT_CODE || 'Not set'}</p>
              </div>
              <div>
                <span className="font-medium text-blue-900">Environment:</span>
                <p className="text-blue-700">{import.meta.env.VITE_SUMUP_ENVIRONMENT || 'sandbox'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Initialization Status */}
        {loading && paymentStatus === 'idle' && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
              <span className="text-gray-700">Initializing SumUp...</span>
            </div>
          </div>
        )}

        {!isInitialized && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
              <p className="text-red-800">
                SumUp initialization failed. Please check your configuration in the .env file.
              </p>
            </div>
          </div>
        )}

        {/* Test Payment Options */}
        {isInitialized && paymentStatus === 'idle' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Select Test Payment</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {testPayments.map((payment, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {formatCurrency(payment.amount * 100, payment.currency)}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">{payment.description}</p>
                    </div>
                    <CreditCard className="w-5 h-5 text-gray-400" />
                  </div>
                  <button
                    onClick={() => handleCreateCheckout(payment)}
                    disabled={loading}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    Create Checkout
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Checkout Creation Status */}
        {paymentStatus === 'creating' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
              <span className="text-gray-700">Creating SumUp checkout...</span>
            </div>
          </div>
        )}

        {/* Checkout URL and Payment Simulation */}
        {paymentStatus === 'checkout' && checkoutUrl && currentPayment && (
          <div className="space-y-6">
            {/* Checkout Details */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Checkout Created</h2>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                  <span className="text-green-800 font-medium">SumUp checkout URL generated successfully!</span>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <span className="font-medium text-gray-700">Amount:</span>
                  <span className="ml-2 text-lg font-semibold text-gray-900">
                    {formatCurrency(currentPayment.amount * 100, currentPayment.currency)}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Description:</span>
                  <span className="ml-2 text-gray-900">{currentPayment.description}</span>
                </div>
                {checkoutResponse && (
                  <>
                    <div>
                      <span className="font-medium text-gray-700">Checkout ID:</span>
                      <span className="ml-2 text-gray-900 font-mono text-sm">{checkoutResponse.id}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Reference:</span>
                      <span className="ml-2 text-gray-900 font-mono text-sm">{checkoutResponse.checkout_reference}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Status:</span>
                      <span className="ml-2 text-gray-900 capitalize">{checkoutResponse.status}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Valid Until:</span>
                      <span className="ml-2 text-gray-900 text-sm">
                        {new Date(checkoutResponse.valid_until).toLocaleString()}
                      </span>
                    </div>
                  </>
                )}
                <div>
                  <span className="font-medium text-gray-700">Checkout URL:</span>
                  <div className="mt-1 p-2 bg-gray-50 rounded border text-sm text-gray-600 break-all">
                    {checkoutUrl}
                  </div>
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <a
                  href={checkoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open Checkout
                </a>
                <button
                  onClick={handlePaymentComplete}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Simulate Success
                </button>
                <button
                  onClick={handlePaymentFailed}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Simulate Failure
                </button>
              </div>
            </div>

            {/* Test Instructions */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-medium text-yellow-800 mb-2">Testing Instructions</h3>
              <div className="text-sm text-yellow-700 space-y-1">
                <p>• Click "Open Checkout" to test the payment flow with a mock SumUp payment page</p>
                <p>• The mock page simulates SumUp's interface for sandbox testing</p>
                <p>• Test cards are pre-filled: 4000000000000002 (Success), 4000000000000069 (Decline)</p>
                <p>• Use "Simulate Success/Failure" buttons to test completion handling quickly</p>
                <p>• Check browser console for detailed payment parameters and API responses</p>
                <p>• The mock page will redirect back to success/cancel pages automatically</p>
              </div>
            </div>

            {/* Real API Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-800 mb-2">Production Implementation</h3>
              <div className="text-sm text-blue-700 space-y-1">
                <p>• Current implementation uses a mock checkout for testing purposes</p>
                <p>• For production, you'll need SumUp API credentials and OAuth authentication</p>
                <p>• See <code>src/utils/sumupRealApi.ts</code> for production implementation guide</p>
                <p>• Your merchant code ({import.meta.env.VITE_SUMUP_MERCHANT_CODE}) is ready for real integration</p>
              </div>
            </div>
          </div>
        )}

        {/* Payment Completed */}
        {paymentStatus === 'completed' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-center">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Payment Completed!</h2>
              <p className="text-gray-600 mb-6">
                Test payment of {currentPayment && formatCurrency(currentPayment.amount * 100, currentPayment.currency)} completed successfully.
              </p>
              <button
                onClick={resetTest}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Test Another Payment
              </button>
            </div>
          </div>
        )}

        {/* Payment Failed */}
        {paymentStatus === 'failed' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-center">
              <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Payment Failed</h2>
              <p className="text-gray-600 mb-6">
                Test payment failed. This is expected behavior in sandbox mode with certain test conditions.
              </p>
              <button
                onClick={resetTest}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SumUpTestPage;
