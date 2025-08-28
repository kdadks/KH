import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useUserAuth } from '../../contexts/UserAuthContext';
import { getCustomerPayments } from '../../utils/paymentRequestUtils';
import { PaymentWithCustomer, PAYMENT_STATUS_INFO } from '../../types/paymentTypes';
import { useToast } from '../shared/toastContext';
import PaymentRequests from './PaymentRequests';
import { 
  CreditCard, 
  Search,
  Filter,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

const UserPayments: React.FC<{ onDataChange?: () => void }> = ({ onDataChange }) => {
  const { user } = useUserAuth();
  const { showError } = useToast();
  const [searchParams] = useSearchParams();
  
  const [payments, setPayments] = useState<PaymentWithCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeSubTab, setActiveSubTab] = useState<'requests' | 'history'>('requests');

  // Get active payment request ID from URL params
  const activeRequestId = searchParams.get('request');

  useEffect(() => {
    if (user?.id) {
      loadPayments();
    }
    
    // If there's a payment request in URL, switch to requests tab
    if (activeRequestId) {
      setActiveSubTab('requests');
    }

    // Check localStorage for highlighted payment request and auto-open modal
    const highlightedRequest = localStorage.getItem('highlightPaymentRequest');
    const autoOpenModal = localStorage.getItem('autoOpenPaymentModal');
    
    if (highlightedRequest || autoOpenModal) {
      setActiveSubTab('requests');
      // Don't remove localStorage items here - let PaymentRequests component handle it
    }
  }, [user, activeRequestId]);

  const loadPayments = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const data = await getCustomerPayments(user.id);
      setPayments(data);
    } catch (error) {
      console.error('Error loading payments:', error);
      showError('Error', 'Failed to load payment history');
    } finally {
      setLoading(false);
    }
  };

  // Helper functions
  const formatCurrency = (amount: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const getPaymentStatusDisplay = (status: string) => {
    return PAYMENT_STATUS_INFO[status as keyof typeof PAYMENT_STATUS_INFO] || {
      text: status,
      color: 'gray' as const,
      icon: 'clock'
    };
  };

  const handleViewInvoices = () => {
    // Navigate to invoices tab - this will be handled by the parent component
    // For now, we'll trigger a custom event or use a callback
    const event = new CustomEvent('navigateToInvoices', {
      detail: { filterOverdue: true }
    });
    window.dispatchEvent(event);
  };

  // Filter payments based on search and status
  const filteredPayments = payments.filter(payment => {
    const matchesSearch = 
      payment.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      payment.notes?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'pending':
      case 'processing':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your payment information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Payments</h1>
          <p className="text-gray-600">Manage payment requests and view payment history.</p>
        </div>
        <button
          onClick={loadPayments}
          className="flex items-center px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveSubTab('requests')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeSubTab === 'requests'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <AlertCircle className="w-4 h-4 inline mr-2" />
          Payment Requests
        </button>
        <button
          onClick={() => setActiveSubTab('history')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeSubTab === 'history'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <CreditCard className="w-4 h-4 inline mr-2" />
          Payment History
        </button>
      </div>

      {/* Tab Content */}
      {activeSubTab === 'requests' && user?.id && (
        <PaymentRequests 
          customerId={user.id} 
          onPaymentComplete={() => {
            // Refresh both local payment data and parent dashboard data
            loadPayments();
            onDataChange?.();
          }}
        />
      )}

      {activeSubTab === 'history' && (
        <div>
          {/* Filters */}
          <div className="mb-6 flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by invoice number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            <div className="sm:w-48">
              <div className="relative">
                <Filter className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                >
                  <option value="all">All Status</option>
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="failed">Failed</option>
                  <option value="refunded">Refunded</option>
                </select>
              </div>
            </div>
          </div>

          {/* Payment Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-800">Total Paid</p>
                  <p className="text-2xl font-bold text-green-900">
                    {formatCurrency(payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0))}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-yellow-800">Pending</p>
                  <p className="text-2xl font-bold text-yellow-900">
                    {formatCurrency(payments.filter(p => p.status === 'pending' || p.status === 'processing').reduce((sum, p) => sum + p.amount, 0))}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-yellow-600" />
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-800">Total Transactions</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {payments.length}
                  </p>
                </div>
                <CreditCard className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Payments List */}
          {filteredPayments.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-xl font-medium text-gray-900 mb-2">No payments found</p>
              <p className="text-gray-600">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filter criteria.' 
                  : 'You don\'t have any payment history yet.'}
              </p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              {/* Table Header */}
              <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                <div className="grid grid-cols-11 gap-4 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  <div className="col-span-3">Invoice</div>
                  <div className="col-span-2">Amount</div>
                  <div className="col-span-2">Method</div>
                  <div className="col-span-2">Date</div>
                  <div className="col-span-2">Status</div>
                </div>
              </div>

              {/* Table Body */}
              <div className="divide-y divide-gray-200">
                {filteredPayments.map((payment) => {
                  const statusInfo = getPaymentStatusDisplay(payment.status);
                  
                  return (
                    <div key={payment.id} className="px-6 py-4 hover:bg-gray-50">
                      <div className="grid grid-cols-11 gap-4 items-center">
                        {/* Invoice Number */}
                        <div className="col-span-3">
                          <div className="flex items-center">
                            <CreditCard className="w-4 h-4 text-gray-400 mr-2" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {payment.invoice_number}
                              </p>
                              <p className="text-xs text-gray-500">
                                Payment #{payment.id}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Amount */}
                        <div className="col-span-2">
                          <p className="text-sm font-medium text-gray-900">
                            {formatCurrency(payment.amount)}
                          </p>
                        </div>

                        {/* Payment Method */}
                        <div className="col-span-2">
                          <p className="text-sm text-gray-900 capitalize">
                            {payment.payment_method || 'Card'}
                          </p>
                        </div>

                        {/* Payment Date */}
                        <div className="col-span-2">
                          <div className="flex items-center text-sm text-gray-900">
                            <Calendar className="w-4 h-4 text-gray-400 mr-1" />
                            {payment.payment_date 
                              ? new Date(payment.payment_date).toLocaleDateString()
                              : 'Pending'
                            }
                          </div>
                          {payment.payment_date && (
                            <p className="text-xs text-gray-500">
                              {new Date(payment.payment_date).toLocaleTimeString()}
                            </p>
                          )}
                        </div>

                        {/* Status */}
                        <div className="col-span-2">
                          <div className="flex items-center">
                            {getStatusIcon(payment.status)}
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
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Make Payment Section */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-blue-900 mb-2">Need to make a payment?</h3>
                <p className="text-primary-700">
                  You can pay outstanding invoices directly from your invoice page.
                </p>
              </div>
              <button
                onClick={() => handleViewInvoices()}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              >
                View Invoices
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserPayments;
