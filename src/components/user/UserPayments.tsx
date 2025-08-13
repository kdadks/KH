import React, { useState, useEffect } from 'react';
import { useUserAuth } from '../../contexts/UserAuthContext';
import { getUserPaymentHistory } from '../../utils/userManagementUtils';
import { PaymentHistoryItem } from '../../types/userManagement';
import { useToast } from '../shared/toastContext';
import { 
  CreditCard, 
  Search,
  Filter,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw
} from 'lucide-react';
import { formatCurrency, getPaymentStatusDisplay } from '../../utils/userManagementUtils';

const UserPayments: React.FC = () => {
  const { user } = useUserAuth();
  const { showError } = useToast();
  
  const [payments, setPayments] = useState<PaymentHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    if (user?.auth_user_id) {
      loadPayments();
    }
  }, [user]);

  const loadPayments = async () => {
    if (!user?.auth_user_id) return;

    setLoading(true);
    try {
      const { payments: data, error } = await getUserPaymentHistory(user.auth_user_id);
      
      if (error) {
        showError('Error', `Failed to load payments: ${error}`);
      } else {
        setPayments(data);
      }
    } catch (error) {
      console.error('Error loading payments:', error);
      showError('Error', 'Unexpected error loading payments');
    } finally {
      setLoading(false);
    }
  };

  // Filter payments based on search and status
  const filteredPayments = payments.filter(payment => {
    const matchesSearch = 
      payment.invoice_number.toLowerCase().includes(searchTerm.toLowerCase());
    
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
          <p className="text-gray-600">Loading your payment history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment History</h1>
          <p className="text-gray-600">View your payment transactions and history.</p>
        </div>
        <button
          onClick={loadPayments}
          className="flex items-center px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </button>
      </div>

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
            <div className="grid grid-cols-12 gap-4 text-xs font-medium text-gray-500 uppercase tracking-wide">
              <div className="col-span-3">Invoice</div>
              <div className="col-span-2">Amount</div>
              <div className="col-span-2">Method</div>
              <div className="col-span-2">Date</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-1">Receipt</div>
            </div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-gray-200">
            {filteredPayments.map((payment) => {
              const statusInfo = getPaymentStatusDisplay(payment.status);
              
              return (
                <div key={payment.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="grid grid-cols-12 gap-4 items-center">
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
                          {statusInfo.label}
                        </span>
                      </div>
                    </div>

                    {/* Receipt/Actions */}
                    <div className="col-span-1">
                      {payment.status === 'paid' && (
                        <button
                          onClick={() => {
                            // TODO: Implement receipt download
                            console.log('Download receipt for payment:', payment.id);
                          }}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                          title="Download Receipt"
                        >
                          Download
                        </button>
                      )}
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
            <p className="text-blue-700">
              You can pay outstanding invoices directly from your invoice page.
            </p>
          </div>
          <button
            onClick={() => {
              // TODO: Navigate to invoices with overdue filter
              console.log('Navigate to invoices');
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            View Invoices
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserPayments;
