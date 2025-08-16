import React, { useState, useEffect } from 'react';
import { useUserAuth } from '../../contexts/UserAuthContext';
import { getUserInvoices } from '../../utils/userManagementUtils';
import { UserInvoice } from '../../types/userManagement';
import { useToast } from '../shared/toastContext';
import { downloadInvoicePDF } from '../../services/invoiceService';
import { 
  FileText, 
  Download, 
  AlertCircle,
  Search,
  Filter,
  Calendar
} from 'lucide-react';
import { formatCurrency, getInvoiceStatusDisplay } from '../../utils/userManagementUtils';

const UserInvoices: React.FC = () => {
  const { user } = useUserAuth();
  const { showError, showSuccess } = useToast();
  
  const [invoices, setInvoices] = useState<UserInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    if (user?.id) {
      loadInvoices();
    }
  }, [user]);

  const loadInvoices = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const { invoices: data, error } = await getUserInvoices(user.id.toString());
      
      if (error) {
        showError('Error', `Failed to load invoices: ${error}`);
      } else {
        setInvoices(data);
      }
    } catch (error) {
      console.error('Error loading invoices:', error);
      showError('Error', 'Unexpected error loading invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadInvoice = async (invoice: UserInvoice) => {
    try {
      // Separate deposits from other payments
      let depositAmount = 0;
      let otherPaymentsAmount = 0;
      
      invoice.payments?.forEach(payment => {
        if (payment.status === 'paid') {
          // More comprehensive check for deposit payments
          const isDeposit = payment.notes?.toLowerCase().includes('payment request') || 
                           payment.notes?.toLowerCase().includes('deposit') ||
                           payment.sumup_checkout_id ||
                           payment.payment_method === 'sumup';
          
          if (isDeposit) {
            depositAmount += payment.amount || 0;
          } else {
            otherPaymentsAmount += payment.amount || 0;
          }
        }
      });

      // For testing: If no deposits identified but there are payments, 
      // treat the first payment as deposit
      if (depositAmount === 0 && invoice.payments && invoice.payments.length > 0) {
        const firstPaidPayment = invoice.payments.find(p => p.status === 'paid');
        if (firstPaidPayment) {
          depositAmount = firstPaidPayment.amount || 0;
          otherPaymentsAmount = (invoice.payments?.reduce((total, payment) => {
            if (payment.status === 'paid' && payment.id !== firstPaidPayment.id) {
              return total + (payment.amount || 0);
            }
            return total;
          }, 0) || 0);
        }
      }

      const totalPaidAmount = depositAmount + otherPaymentsAmount;

      // Round to handle floating point precision issues
      const roundedDepositAmount = Math.round(depositAmount * 100) / 100;
      const roundedOtherPayments = Math.round(otherPaymentsAmount * 100) / 100;
      const roundedTotalPaid = Math.round(totalPaidAmount * 100) / 100;

      console.log('UserInvoice Payment Debug:', {
        invoiceId: invoice.id,
        invoiceTotal: invoice.total_amount,
        paymentsCount: invoice.payments?.length || 0,
        paidPayments: invoice.payments?.filter(p => p.status === 'paid').length || 0,
        depositAmount: roundedDepositAmount,
        otherPaymentsAmount: roundedOtherPayments,
        totalPaidAmount: roundedTotalPaid,
        paymentBreakdown: invoice.payments?.map(p => ({
          id: p.id,
          amount: p.amount,
          status: p.status,
          notes: p.notes,
          payment_method: p.payment_method,
          sumup_checkout_id: p.sumup_checkout_id,
          isDeposit: p.notes?.toLowerCase().includes('payment request') || 
                    p.notes?.toLowerCase().includes('deposit') ||
                    p.sumup_checkout_id ||
                    p.payment_method === 'sumup'
        }))
      });

      // Transform UserInvoice to the format expected by the service
      const invoiceData = {
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        customer_id: invoice.customer_id,
        invoice_date: invoice.invoice_date,
        due_date: invoice.due_date,
        status: invoice.status,
        subtotal: invoice.subtotal,
        vat_amount: invoice.vat_amount,
        total: invoice.total_amount, // Map total_amount to total for compatibility
        total_paid: roundedTotalPaid, // Add calculated total paid (rounded)
        deposit_paid: roundedDepositAmount, // Add calculated deposit amount
        notes: invoice.notes,
        currency: 'EUR'
      };

      // For user invoices, we need to use the current user's information
      // since this is their own invoice
      const customerData = {
        id: invoice.customer_id,
        name: `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'Customer',
        email: user?.email || '',
        phone: user?.phone || '',
        address: [
          user?.address_line_1,
          user?.address_line_2,
          user?.city,
          user?.county,
          user?.eircode
        ].filter(Boolean).join(', ') || ''
      };

      // Transform items if available, or create a default item
      let itemsData = invoice.items || [];
      
      // If no items exist, create a default item based on the invoice total
      if (!itemsData || itemsData.length === 0) {
        itemsData = [{
          id: 1,
          invoice_id: invoice.id,
          description: `Service - Invoice ${invoice.invoice_number}`,
          quantity: 1,
          unit_price: invoice.subtotal,
          total_price: invoice.subtotal
        }];
      }

      // Ensure items have the correct format for the PDF service
      const transformedItems = itemsData.map(item => ({
        id: item.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        category: 'Service' // Add default category
      }));

      console.log('Downloading invoice with detailed data:', { 
        invoiceData, 
        customerData, 
        transformedItems,
        paymentBreakdown: {
          totalInvoice: invoice.total_amount,
          depositPaid: roundedDepositAmount,
          otherPayments: roundedOtherPayments,
          totalPaid: roundedTotalPaid,
          due: invoice.total_amount - roundedTotalPaid
        }
      });

      // Use the PDF service
      const result = await downloadInvoicePDF(invoiceData, customerData, transformedItems);

      if (result.success) {
        showSuccess('Invoice Downloaded', `Invoice ${invoice.invoice_number} has been downloaded successfully`);
      } else {
        console.error('Download failed:', result.error);
        showError('Download Failed', result.error || 'Failed to download invoice PDF');
      }

    } catch (error) {
      console.error('Error downloading invoice:', error);
      showError('Download Failed', 'An unexpected error occurred while downloading the invoice');
    }
  };

  // Filter invoices based on search and status
  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = 
      invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (invoice.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your invoices...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Your Invoices</h1>
        <p className="text-gray-600">View and manage all your invoices.</p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search invoices..."
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
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Invoices List */}
      {filteredInvoices.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-xl font-medium text-gray-900 mb-2">No invoices found</p>
          <p className="text-gray-600">
            {searchTerm || statusFilter !== 'all' 
              ? 'Try adjusting your search or filter criteria.' 
              : 'You don\'t have any invoices yet.'}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {/* Table Header */}
          <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
            <div className="grid grid-cols-12 gap-4 text-xs font-medium text-gray-500 uppercase tracking-wide">
              <div className="col-span-3">Invoice</div>
              <div className="col-span-2">Date</div>
              <div className="col-span-2">Due Date</div>
              <div className="col-span-2">Amount</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-1">Actions</div>
            </div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-gray-200">
            {filteredInvoices.map((invoice) => {
              const statusInfo = getInvoiceStatusDisplay(invoice.status);
              
              return (
                <div key={invoice.id} className="px-6 py-4 hover:bg-gray-50">
                  {/* Main row - all items in straight line */}
                  <div className="grid grid-cols-12 gap-4 items-center">
                    {/* Invoice Number */}
                    <div className="col-span-3">
                      <div className="flex items-center">
                        <FileText className="w-4 h-4 text-gray-400 mr-2" />
                        <p className="text-sm font-medium text-gray-900">
                          {invoice.invoice_number}
                        </p>
                      </div>
                    </div>

                    {/* Invoice Date */}
                    <div className="col-span-2">
                      <div className="flex items-center text-sm text-gray-900">
                        <Calendar className="w-4 h-4 text-gray-400 mr-1" />
                        {new Date(invoice.invoice_date).toLocaleDateString()}
                      </div>
                    </div>

                    {/* Due Date */}
                    <div className="col-span-2">
                      <div className="text-sm text-gray-900">
                        {new Date(invoice.due_date).toLocaleDateString()}
                        {invoice.is_overdue && (
                          <div className="flex items-center text-red-600 text-xs mt-1">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            {invoice.days_overdue} days overdue
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="col-span-2">
                      <p className="text-sm font-medium text-gray-900">
                        {formatCurrency(invoice.total_amount)}
                      </p>
                    </div>

                    {/* Status */}
                    <div className="col-span-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        statusInfo.color === 'green' ? 'bg-green-500 text-white' :
                        statusInfo.color === 'red' ? 'bg-red-100 text-red-800' :
                        statusInfo.color === 'blue' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {statusInfo.text}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="col-span-1">
                      <div className="flex items-center justify-end">
                        <button
                          onClick={() => handleDownloadInvoice(invoice)}
                          className="text-gray-600 hover:text-gray-800"
                          title="Download PDF"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Second row - Notes and Subtotal with vertical gap */}
                  {(invoice.notes || invoice.subtotal !== invoice.total_amount) && (
                    <div className="grid grid-cols-12 gap-4 mt-3">
                      {/* Notes under Invoice Number */}
                      <div className="col-span-3">
                        {invoice.notes && (
                          <p className="text-xs text-gray-500 ml-6">
                            {invoice.notes}
                          </p>
                        )}
                      </div>

                      {/* Empty columns for alignment */}
                      <div className="col-span-4"></div>

                      {/* Subtotal under Amount */}
                      <div className="col-span-2">
                        {invoice.subtotal !== invoice.total_amount && (
                          <p className="text-xs text-gray-500">
                            Subtotal: {formatCurrency(invoice.subtotal)}
                          </p>
                        )}
                      </div>

                      {/* Empty columns */}
                      <div className="col-span-3"></div>
                    </div>
                  )}

                  {/* Invoice Items */}
                  {invoice.items && invoice.items.length > 0 && (
                    <div className="mt-4 pl-6 border-l-2 border-gray-100">
                      <p className="text-xs font-medium text-gray-700 mb-2">Items:</p>
                      <div className="space-y-1">
                        {invoice.items.map((item, index) => (
                          <div key={index} className="flex justify-between text-xs text-gray-600">
                            <span>{item.description} (x{item.quantity})</span>
                            <span>{formatCurrency(item.total_price)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Summary */}
      {filteredInvoices.length > 0 && (
        <div className="mt-6 bg-gray-50 rounded-lg p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-sm font-medium text-gray-900">
                {filteredInvoices.length}
              </p>
              <p className="text-xs text-gray-500">Total Invoices</p>
            </div>
            <div>
              <p className="text-sm font-medium text-green-600">
                {formatCurrency(filteredInvoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.total_amount, 0))}
              </p>
              <p className="text-xs text-gray-500">Paid</p>
            </div>
            <div>
              <p className="text-sm font-medium text-orange-600">
                {formatCurrency(filteredInvoices.filter(i => i.status !== 'paid').reduce((sum, i) => sum + i.total_amount, 0))}
              </p>
              <p className="text-xs text-gray-500">Outstanding</p>
            </div>
            <div>
              <p className="text-sm font-medium text-red-600">
                {filteredInvoices.filter(i => i.is_overdue).length}
              </p>
              <p className="text-xs text-gray-500">Overdue</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserInvoices;
