import React, { useState, useEffect } from 'react';
import { CreditCard, Clock, CheckCircle, XCircle, AlertTriangle, ExternalLink } from 'lucide-react';
import { PaymentRequest } from '../../types/paymentTypes';
import { getCustomerPaymentRequests, processPaymentRequest } from '../../utils/paymentRequestUtils';
import { useUserAuth } from '../../contexts/UserAuthContext';
import { useToast } from '../shared/toastContext';

interface PaymentRequestsProps {
  activeRequest?: string; // ID of payment request to highlight/process
}

const PaymentRequests: React.FC<PaymentRequestsProps> = ({ activeRequest }) => {
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState<string | null>(null);
  const { user } = useUserAuth();
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    loadPaymentRequests();
  }, [user]);

  const loadPaymentRequests = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const { success, paymentRequests: requests, error } = await getCustomerPaymentRequests(user.id.toString());
      
      if (success && requests) {
        setPaymentRequests(requests);
      } else {
        console.error('Error loading payment requests:', error);
        showError('Failed to load payment requests');
      }
    } catch (error) {
      console.error('Exception loading payment requests:', error);
      showError('Failed to load payment requests');
    } finally {
      setLoading(false);
    }
  };

  const handlePayNow = async (paymentRequestId: string) => {
    setProcessingPayment(paymentRequestId);
    
    try {
      const { success, confirmation, error } = await processPaymentRequest(paymentRequestId);
      
      if (success && confirmation) {
        showSuccess('Payment processed successfully!');
        // Refresh the payment requests list
        await loadPaymentRequests();
      } else {
        showError(error || 'Payment processing failed');
      }
    } catch (error) {
      console.error('Exception processing payment:', error);
      showError('Payment processing failed');
    } finally {
      setProcessingPayment(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusIcon = (status: PaymentRequest['status']) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'expired':
        return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusText = (status: PaymentRequest['status']) => {
    switch (status) {
      case 'paid':
        return 'Paid';
      case 'failed':
        return 'Failed';
      case 'expired':
        return 'Expired';
      default:
        return 'Pending';
    }
  };

  const getStatusColor = (status: PaymentRequest['status']) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'expired':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <span className="ml-3 text-gray-600">Loading payment requests...</span>
      </div>
    );
  }

  const pendingRequests = paymentRequests.filter(req => req.status === 'pending');
  const completedRequests = paymentRequests.filter(req => req.status !== 'pending');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Payment Requests</h2>
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <span className="flex items-center">
            <Clock className="w-4 h-4 mr-1 text-yellow-500" />
            {pendingRequests.length} Pending
          </span>
          <span className="flex items-center">
            <CheckCircle className="w-4 h-4 mr-1 text-green-500" />
            {completedRequests.length} Completed
          </span>
        </div>
      </div>

      {paymentRequests.length === 0 ? (
        <div className="text-center py-8">
          <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Payment Requests</h3>
          <p className="text-gray-600">You don't have any payment requests at the moment.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Pending Requests */}
          {pendingRequests.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Pending Payments</h3>
              <div className="space-y-3">
                {pendingRequests.map((request) => (
                  <div
                    key={request.id}
                    className={`bg-white rounded-lg border-2 p-6 transition-all ${
                      activeRequest === request.id
                        ? 'border-primary-500 shadow-lg'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          {getStatusIcon(request.status)}
                          <h4 className="text-lg font-semibold text-gray-900">
                            {request.service_name}
                          </h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                            {getStatusText(request.status)}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div>
                            <p className="text-sm font-medium text-gray-500">Deposit Amount</p>
                            <p className="text-xl font-bold text-primary-600">
                              €{request.deposit_amount.toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-500">Total Cost</p>
                            <p className="text-lg font-semibold text-gray-900">
                              €{request.total_amount.toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-500">Due Date</p>
                            <p className="text-lg font-semibold text-gray-900">
                              {formatDate(request.due_date)}
                            </p>
                          </div>
                        </div>

                        {request.notes && (
                          <p className="text-sm text-gray-600 mb-4">{request.notes}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <div className="text-sm text-gray-500">
                        Requested on {formatDate(request.created_at)}
                      </div>
                      <button
                        onClick={() => handlePayNow(request.id)}
                        disabled={processingPayment === request.id}
                        className="inline-flex items-center px-4 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {processingPayment === request.id ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Processing...
                          </>
                        ) : (
                          <>
                            <CreditCard className="w-4 h-4 mr-2" />
                            Pay Now
                            <ExternalLink className="w-4 h-4 ml-1" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completed Requests */}
          {completedRequests.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Payment History</h3>
              <div className="space-y-3">
                {completedRequests.map((request) => (
                  <div
                    key={request.id}
                    className="bg-gray-50 rounded-lg border border-gray-200 p-6"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(request.status)}
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900">
                            {request.service_name}
                          </h4>
                          <p className="text-sm text-gray-600">
                            €{request.deposit_amount.toFixed(2)} deposit
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                          {getStatusText(request.status)}
                        </span>
                        {request.paid_at && (
                          <p className="text-sm text-gray-500 mt-1">
                            Paid on {formatDate(request.paid_at)}
                          </p>
                        )}
                        {request.transaction_id && (
                          <p className="text-xs text-gray-400 mt-1">
                            ID: {request.transaction_id}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PaymentRequests;
