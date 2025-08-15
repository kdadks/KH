import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CreditCard, Clock, CheckCircle, XCircle, AlertCircle, Calendar, Euro } from 'lucide-react';
import { getCustomerPaymentRequests } from '../../utils/paymentRequestUtils';
import { PaymentRequestWithCustomer, PAYMENT_REQUEST_STATUS_INFO } from '../../types/paymentTypes';
import { useToast } from '../shared/toastContext';
import PaymentModal from '../shared/PaymentModal';

interface PaymentRequestsProps {
  customerId: number;
  onPaymentComplete?: () => void;
}

const PaymentRequests: React.FC<PaymentRequestsProps> = ({ customerId, onPaymentComplete }) => {
  const [searchParams] = useSearchParams();
  const { showSuccess, showError } = useToast();
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequestWithCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPaymentRequest, setSelectedPaymentRequest] = useState<PaymentRequestWithCustomer | null>(null);
  const [hasAutoOpened, setHasAutoOpened] = useState(false); // Prevent multiple auto-opens

  // Check if we should highlight a specific payment request
  const highlightRequestId = searchParams.get('request') || localStorage.getItem('highlightPaymentRequest');

  useEffect(() => {
    loadPaymentRequests();
  }, [customerId]);

  // Separate effect for auto-opening modal after paymentRequests are loaded
  useEffect(() => {
    const autoOpen = localStorage.getItem('autoOpenPaymentModal');
    const highlightId = localStorage.getItem('highlightPaymentRequest');
    
    if (autoOpen && highlightId && paymentRequests.length > 0 && !hasAutoOpened) {
      console.log('Auto-opening payment modal for request:', highlightId);
      
      // Remove the flags immediately to prevent re-triggering
      localStorage.removeItem('autoOpenPaymentModal');
      localStorage.removeItem('highlightPaymentRequest');
      
      // Set flag to prevent multiple auto-opens
      setHasAutoOpened(true);
      
      // Find and open the payment request
      const request = paymentRequests.find(req => req.id.toString() === highlightId);
      if (request && (request.status === 'pending' || request.status === 'sent')) {
        console.log('Found matching payment request, opening modal:', request);
        handlePayNow(request);
      } else {
        console.log('Payment request not found or not payable:', highlightId, request);
        showError('Payment Request Not Found', 'The requested payment could not be found or is not payable.');
      }
    }
  }, [paymentRequests, hasAutoOpened]); // This effect only runs when paymentRequests or hasAutoOpened change

  const loadPaymentRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Loading payment requests for customer:', customerId);
      
      // Add timeout protection
      const timeoutId = setTimeout(() => {
        setLoading(false);
        setError('Loading timeout - please refresh and try again');
        showError('Loading Timeout', 'Payment requests took too long to load. Please refresh the page.');
      }, 10000); // 10 second timeout
      
      const requests = await getCustomerPaymentRequests(customerId);
      
      // Clear timeout if request completes
      clearTimeout(timeoutId);
      
      console.log('Loaded payment requests:', requests);
      setPaymentRequests(requests);
    } catch (err) {
      console.error('Failed to load payment requests:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load payment requests';
      setError(errorMessage);
      showError('Loading Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handlePayNow = (paymentRequest: PaymentRequestWithCustomer) => {
    setSelectedPaymentRequest(paymentRequest);
    setShowPaymentModal(true);
    showSuccess('Opening Payment', 'Opening secure payment modal...');
  };

  const handlePaymentComplete = async () => {
    // Refresh payment requests to show updated status
    await loadPaymentRequests();
    setShowPaymentModal(false);
    setSelectedPaymentRequest(null);
    showSuccess('Payment Complete', 'Your payment has been processed successfully!');
    
    // Trigger parent component refresh (dashboard stats and payment history)
    onPaymentComplete?.();
  };

  const formatCurrency = (amount: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-gray-400" />;
      case 'sent':
        return <AlertCircle className="w-4 h-4 text-blue-400" />;
      case 'paid':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'expired':
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600 mt-2">Loading payment requests...</span>
        <p className="text-xs text-gray-500 mt-2">Customer ID: {customerId}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex">
          <XCircle className="w-5 h-5 text-red-400 mt-0.5" />
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-red-800">Error Loading Payment Requests</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
            <div className="mt-3 flex gap-3">
              <button
                onClick={loadPaymentRequests}
                className="text-sm text-red-600 hover:text-red-500 underline font-medium"
              >
                Try again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="text-sm text-red-600 hover:text-red-500 underline"
              >
                Refresh page
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const pendingRequests = paymentRequests.filter(req => req.status === 'pending' || req.status === 'sent');
  const completedRequests = paymentRequests.filter(req => req.status === 'paid' || req.status === 'expired' || req.status === 'cancelled');

  return (
    <div className="space-y-6">
      {/* Pending Payment Requests */}
      {pendingRequests.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Pending Payment Requests</h3>
          <div className="space-y-4">
            {pendingRequests.map((request) => {
              const statusInfo = PAYMENT_REQUEST_STATUS_INFO[request.status];
              const isHighlighted = highlightRequestId === request.id.toString();
              
              return (
                <div
                  key={request.id}
                  className={`border rounded-lg p-6 transition-all ${
                    isHighlighted 
                      ? 'border-blue-300 bg-blue-50 shadow-md' 
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <CreditCard className="w-5 h-5 text-gray-400" />
                        <h4 className="text-lg font-medium text-gray-900">
                          {request.service_name || 'Service Payment'}
                        </h4>
                        <div className="flex items-center">
                          {getStatusIcon(request.status)}
                          <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            statusInfo.color === 'green' ? 'bg-green-100 text-green-800' :
                            statusInfo.color === 'red' ? 'bg-red-100 text-red-800' :
                            statusInfo.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                            statusInfo.color === 'blue' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {statusInfo.text}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Amount Due:</span>
                          <p className="font-medium text-lg text-gray-900">
                            {formatCurrency(request.amount, request.currency)}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500">Due Date:</span>
                          <p className="font-medium text-gray-900 flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            {request.payment_due_date 
                              ? new Date(request.payment_due_date).toLocaleDateString()
                              : 'No due date'
                            }
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500">Created:</span>
                          <p className="font-medium text-gray-900">
                            {new Date(request.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      {request.notes && (
                        <div className="mt-3">
                          <span className="text-gray-500 text-sm">Notes:</span>
                          <p className="text-sm text-gray-700 mt-1">{request.notes}</p>
                        </div>
                      )}
                    </div>

                    {(request.status === 'pending' || request.status === 'sent') && (
                      <div className="ml-6">
                        <button
                          onClick={() => handlePayNow(request)}
                          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center gap-2"
                        >
                          <Euro className="w-4 h-4" />
                          Pay Now
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Completed Payment Requests */}
      {completedRequests.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Payment History</h3>
          <div className="space-y-3">
            {completedRequests.map((request) => {
              const statusInfo = PAYMENT_REQUEST_STATUS_INFO[request.status];
              
              return (
                <div key={request.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-4 h-4 text-gray-400" />
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {request.service_name || 'Service Payment'}
                        </h4>
                        <p className="text-sm text-gray-500">
                          {formatCurrency(request.amount, request.currency)} • 
                          {' '}{new Date(request.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      {getStatusIcon(request.status)}
                      <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        statusInfo.color === 'green' ? 'bg-green-100 text-green-800' :
                        statusInfo.color === 'red' ? 'bg-red-100 text-red-800' :
                        statusInfo.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                        statusInfo.color === 'blue' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {statusInfo.text}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {paymentRequests.length === 0 && (
        <div className="text-center py-12">
          <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-xl font-medium text-gray-900 mb-2">No payment requests</p>
          <p className="text-gray-600">
            You don't have any payment requests at the moment.
          </p>
        </div>
      )}

      {/* Payment Modal */}
      {selectedPaymentRequest && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedPaymentRequest(null);
          }}
          paymentRequest={selectedPaymentRequest}
          onPaymentComplete={handlePaymentComplete}
        />
      )}
    </div>
  );
};

export default PaymentRequests;
