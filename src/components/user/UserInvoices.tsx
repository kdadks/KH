import React, { useState, useEffect } from 'react';
import { useUserAuth } from '../../contexts/UserAuthContext';
import { getUserInvoices } from '../../utils/userManagementUtils';
import { UserInvoice } from '../../types/userManagement';
import { useToast } from '../shared/toastContext';
import jsPDF from 'jspdf';
import { 
  FileText, 
  Download, 
  Eye, 
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

  const handleViewInvoice = (invoice: UserInvoice) => {
    // Create a modal or navigate to invoice details page
    // For now, we'll create a simple modal showing invoice details
    alert(`Invoice ${invoice.invoice_number}\nDate: ${new Date(invoice.invoice_date).toLocaleDateString()}\nAmount: ${formatCurrency(invoice.total_amount)}\nStatus: ${invoice.status}`);
  };

  const handleDownloadInvoice = async (invoice: UserInvoice) => {
    try {
      // Create PDF invoice
      const pdf = new jsPDF();
      
      // Header
      pdf.setFontSize(20);
      pdf.text('INVOICE', 20, 20);
      
      // Company info
      pdf.setFontSize(12);
      pdf.text('KH Therapy', 20, 35);
      pdf.text('Professional Physiotherapy Services', 20, 42);
      
      // Invoice details
      pdf.setFontSize(14);
      pdf.text('Invoice Details', 20, 60);
      
      pdf.setFontSize(10);
      pdf.text(`Invoice Number: ${invoice.invoice_number}`, 20, 75);
      pdf.text(`Invoice Date: ${new Date(invoice.invoice_date).toLocaleDateString()}`, 20, 82);
      pdf.text(`Due Date: ${new Date(invoice.due_date).toLocaleDateString()}`, 20, 89);
      pdf.text(`Status: ${invoice.status}`, 20, 96);
      
      // Amount details
      pdf.setFontSize(12);
      pdf.text('Amount Details', 20, 115);
      pdf.setFontSize(10);
      pdf.text(`Subtotal: ${formatCurrency(invoice.subtotal)}`, 20, 130);
      if (invoice.vat_amount) {
        pdf.text(`VAT: ${formatCurrency(invoice.vat_amount)}`, 20, 137);
      }
      pdf.setFontSize(12);
      pdf.text(`Total: ${formatCurrency(invoice.total_amount)}`, 20, 150);
      
      // Items if available
      let yPos = 170;
      if (invoice.items && invoice.items.length > 0) {
        pdf.setFontSize(12);
        pdf.text('Items:', 20, yPos);
        pdf.setFontSize(10);
        yPos += 15;
        invoice.items.forEach((item, index) => {
          pdf.text(`${index + 1}. ${item.description} (x${item.quantity}) - ${formatCurrency(item.total_price)}`, 20, yPos);
          yPos += 7;
        });
      }
      
      // Notes if available
      if (invoice.notes) {
        pdf.setFontSize(10);
        pdf.text(`Notes: ${invoice.notes}`, 20, yPos + 10);
      }
      
      // Footer
      pdf.setFontSize(8);
      pdf.text('Thank you for your business!', 20, 280);
      pdf.text(`Generated on ${new Date().toLocaleDateString()}`, 20, 287);
      
      // Save the PDF
      pdf.save(`invoice_${invoice.invoice_number.replace('/', '-')}.pdf`);
      
      showSuccess('Invoice Downloaded', 'Invoice has been downloaded successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      showError('Download Failed', 'Failed to download invoice PDF');
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
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewInvoice(invoice)}
                          className="text-blue-600 hover:text-blue-800"
                          title="View Invoice"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        
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
