import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { PaymentRequestWithCustomer } from '../types/paymentTypes';
import { getPaymentRequestById } from '../utils/paymentRequestUtils';
import PaymentModal from '../components/shared/PaymentModal';
import { useToast } from '../components/shared/toastContext';
import { CheckCircle, CreditCard, ArrowLeft, ExternalLink } from 'lucide-react';

const PaymentPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequestWithCustomer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(false);

  // Get payment request ID from URL params
  const requestId = searchParams.get('request');

  useEffect(() => {
    if (requestId) {
      loadPaymentRequest(requestId);
    } else {
      setError('No payment request ID provided');
      setLoading(false);
    }
  }, [requestId]);

  const loadPaymentRequest = async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      const request = await getPaymentRequestById(parseInt(id));
      
      if (request) {
        setPaymentRequest(request);
        
        // Auto-open payment modal if request is payable
        if (request.status === 'pending' || request.status === 'sent') {
          setShowPaymentModal(true);
        }
      } else {
        setError('Payment request not found');
      }
    } catch (err) {
      console.error('Failed to load payment request:', err);
      setError('Failed to load payment request');
      showError('Loading Error', 'Failed to load payment request');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentComplete = async () => {
    setPaymentCompleted(true);
    setShowPaymentModal(false);
    showSuccess('Payment Successful!', 'Your payment has been processed successfully. A confirmation email will be sent to you.');
    
    // Reload the payment request to get updated status
    if (requestId) {
      await loadPaymentRequest(requestId);
    }
  };

  const handlePayNow = () => {
    setShowPaymentModal(true);
  };

  const formatCurrency = (amount: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full mx-auto p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-lg font-medium text-gray-900 mb-2">Loading Payment Request</h2>
            <p className="text-gray-600">Please wait while we load your payment details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !paymentRequest) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full mx-auto p-6">
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CreditCard className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Payment Not Found</h2>
            <p className="text-gray-600 mb-6">
              {error || 'The payment request could not be found or may have expired.'}
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">KH Therapy</h1>
          <p className="text-gray-600">Secure Payment Portal</p>
        </div>

        {/* Payment Request Card */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Header */}
          <div className="bg-primary-50 px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <CreditCard className="w-6 h-6 text-primary-600 mr-3" />
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Payment Request</h2>
                  <p className="text-sm text-gray-600">#{paymentRequest.id}</p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                paymentRequest.status === 'paid' 
                  ? 'bg-green-100 text-green-800'
                  : paymentRequest.status === 'cancelled'
                  ? 'bg-red-100 text-red-800'
                  : paymentRequest.status === 'pending' || paymentRequest.status === 'sent'
                  ? 'bg-yellow-100 text-yellow-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {paymentRequest.status === 'paid' ? 'Paid' : 
                 paymentRequest.status === 'cancelled' ? 'Cancelled' :
                 paymentRequest.status === 'pending' ? 'Pending' :
                 paymentRequest.status === 'sent' ? 'Sent' : paymentRequest.status}
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {paymentCompleted ? (
              /* Payment Success State */
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-green-700 mb-2">Payment Successful!</h3>
                <p className="text-gray-600 mb-6">
                  Your payment of {formatCurrency(paymentRequest.amount, paymentRequest.currency)} has been processed successfully.
                </p>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-700 mb-6">
                  A confirmation email will be sent to {paymentRequest.customer.email}
                </div>
                <div className="flex gap-4 justify-center">
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    Go to Dashboard
                  </button>
                  <button
                    onClick={() => window.location.href = '/'}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Return to Home
                  </button>
                </div>
              </div>
            ) : paymentRequest.status === 'paid' ? (
              /* Already Paid State */
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-green-700 mb-2">Already Paid</h3>
                <p className="text-gray-600 mb-6">
                  This payment request has already been completed.
                </p>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Go to Dashboard
                </button>
              </div>
            ) : paymentRequest.status === 'cancelled' ? (
              /* Cancelled State */
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CreditCard className="w-10 h-10 text-red-600" />
                </div>
                <h3 className="text-xl font-semibold text-red-700 mb-2">Payment Request Cancelled</h3>
                <p className="text-gray-600 mb-6">
                  This payment request has been cancelled and is no longer available for payment.
                </p>
                <button
                  onClick={() => window.location.href = '/'}
                  className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Go to Home
                </button>
              </div>
            ) : (
              /* Payment Required State */
              <div className="space-y-6">
                {/* Payment Details */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Details</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Service:</span>
                      <span className="font-medium">{paymentRequest.service_name || 'Service Payment'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Amount:</span>
                      <span className="font-bold text-xl text-blue-600">
                        {formatCurrency(paymentRequest.amount, paymentRequest.currency)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Customer:</span>
                      <span className="font-medium">
                        {paymentRequest.customer.first_name} {paymentRequest.customer.last_name}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Email:</span>
                      <span className="font-medium">{paymentRequest.customer.email}</span>
                    </div>
                    {paymentRequest.payment_due_date && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Due Date:</span>
                        <span className="font-medium">
                          {new Date(paymentRequest.payment_due_date).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Notes */}
                {paymentRequest.notes && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Notes:</h4>
                    <p className="text-gray-600 text-sm bg-gray-50 rounded-lg p-3">
                      {sanitizeText(paymentRequest.notes)}
                    </p>
                  </div>
                )}

                {/* Security Info */}
                <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 text-primary-700">
                    <CreditCard className="w-5 h-5" />
                    <span className="font-medium">Secure Payment</span>
                  </div>
                  <p className="text-primary-600 text-sm mt-1">
                    Your payment is secured by SumUp with 256-bit SSL encryption and PCI compliance.
                  </p>
                </div>

                {/* Pay Now Button */}
                <button
                  onClick={handlePayNow}
                  className="w-full bg-primary-600 text-white py-4 px-6 rounded-lg hover:bg-primary-700 transition-colors font-semibold text-lg flex items-center justify-center"
                >
                  <CreditCard className="w-5 h-5 mr-2" />
                  Pay Now - {formatCurrency(paymentRequest.amount, paymentRequest.currency)}
                </button>

                {/* Dashboard Link */}
                <div className="text-center">
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="inline-flex items-center text-gray-600 hover:text-gray-800 text-sm"
                  >
                    <ExternalLink className="w-4 h-4 mr-1" />
                    View in Dashboard
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>© 2025 KH Therapy. All rights reserved.</p>
          <p className="mt-1">
            Need help? Contact us at{' '}
            <a href="mailto:info@khtherapy.ie" className="text-blue-600 hover:underline">
              info@khtherapy.ie
            </a>
          </p>
        </div>
      </div>

      {/* Payment Modal */}
      {paymentRequest && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          paymentRequest={paymentRequest}
          onPaymentComplete={handlePaymentComplete}
          context="email" // Email payment context - redirect to home
        />
      )}
    </div>
  );
};

export default PaymentPage;
