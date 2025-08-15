import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useUserAuth } from '../../contexts/UserAuthContext';
import { getCustomerPayments } from '../../utils/paymentRequestUtils';
import { PaymentWithCustomer, PAYMENT_STATUS_INFO } from '../../types/paymentTypes';
import { useToast } from '../shared/toastContext';
import PaymentRequests from './PaymentRequests';
import jsPDF from 'jspdf';
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
  const { showError, showSuccess } = useToast();
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

  const handleDownloadReceipt = async (payment: PaymentWithCustomer) => {
    try {
      // Create PDF receipt
      const pdf = new jsPDF();
      
      // Header with consistent branding
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text('KH Therapy', 20, 20);
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Professional Physiotherapy Services', 20, 28);
      
      // Receipt title
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text('PAYMENT RECEIPT', 20, 45);
      
      // Company contact info
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Neilstown Village Court, Neilstown Rd, Clondalkin, D22E8P2', 20, 55);
      pdf.text('Phone: (083) 8009404 | Email: khtherapy@hotmail.com', 20, 62);
      
      // Receipt details section
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Receipt Details', 20, 80);
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Receipt ID: ${payment.id}`, 20, 95);
      pdf.text(`Invoice Number: ${payment.invoice_number}`, 20, 102);
      pdf.text(`Payment Date: ${payment.payment_date ? new Date(payment.payment_date).toLocaleDateString('en-IE') : 'N/A'}`, 20, 109);
      pdf.text(`Amount Paid: ${formatCurrency(payment.amount)}`, 20, 116);
      pdf.text(`Payment Method: ${payment.payment_method || 'Card Payment'}`, 20, 123);
      pdf.text(`Status: ${payment.status.toUpperCase()}`, 20, 130);
      
      // Transaction details if available
      if (payment.sumup_transaction_id) {
        pdf.text(`Transaction ID: ${payment.sumup_transaction_id}`, 20, 137);
      }
      
      // Footer section
      const pageHeight = pdf.internal.pageSize.height;
      pdf.setFontSize(8);
      pdf.text('Thank you for your payment!', 20, pageHeight - 30);
      pdf.text('IAPT Registered', 105, pageHeight - 30); // Center
      pdf.text(`Generated on ${new Date().toLocaleDateString('en-IE')}`, 20, pageHeight - 20);
      
      // Save the PDF
      pdf.save(`receipt_${payment.invoice_number}_${payment.id}.pdf`);
      
      showSuccess('Receipt Downloaded', 'Payment receipt has been downloaded successfully');
    } catch (error) {
      console.error('Error generating receipt:', error);
      showError('Download Failed', 'Failed to download receipt');
    }
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
                              {statusInfo.text}
                            </span>
                          </div>
                        </div>

                        {/* Receipt/Actions */}
                        <div className="col-span-1">
                          {payment.status === 'paid' && (
                            <button
                              onClick={() => handleDownloadReceipt(payment)}
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
                onClick={() => handleViewInvoices()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
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
