import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Plus, 
  Search, 
  Download,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  Settings,
  FileText,
  DollarSign,
  TrendingUp
} from 'lucide-react';
import { useToast } from '../shared/toastContext';
import PaymentGatewayManagement from './PaymentGatewayManagement';

// Import utility functions
import { 
  getAllPaymentRequests,
  getAllPayments,
  getInvoicesWithPaymentTracking,
  getBookingsWithoutPaymentRequests,
  getAllPaymentGateways,
  getPaymentStatistics,
  createManualPaymentRequest,
  updatePaymentRequestStatus,
  deletePaymentRequest,
  PaymentRequest as PaymentRequestType,
  Payment as PaymentType,
  InvoiceWithPayments,
  BookingWithoutPayment,
  PaymentGateway as PaymentGatewayType
} from '../../utils/paymentManagementUtils';

export const PaymentManagement: React.FC = () => {
  const { showSuccess, showError } = useToast();
  
  // State management
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'requests' | 'payments' | 'invoices' | 'bookings' | 'gateways'>('overview');
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequestType[]>([]);
  const [payments, setPayments] = useState<PaymentType[]>([]);
  const [invoices, setInvoices] = useState<InvoiceWithPayments[]>([]);
  const [bookings, setBookings] = useState<BookingWithoutPayment[]>([]);
  const [gateways, setGateways] = useState<PaymentGatewayType[]>([]);
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState<any>(null);
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  
  // Modal states
  const [showCreateRequestModal, setShowCreateRequestModal] = useState(false);
  const [showGatewayModal, setShowGatewayModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<BookingWithoutPayment | null>(null);
  const [selectedGateway, setSelectedGateway] = useState<PaymentGatewayType | null>(null);

  // Load data on component mount
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadPaymentRequests(),
        loadPayments(),
        loadInvoices(),
        loadBookings(),
        loadGateways(),
        loadStatistics()
      ]);
    } catch (error) {
      console.error('Error loading payment data:', error);
      showError('Error', 'Failed to load payment data');
    } finally {
      setLoading(false);
    }
  };

  const loadPaymentRequests = async () => {
    try {
      const requests = await getAllPaymentRequests();
      setPaymentRequests(requests);
    } catch (error) {
      console.error('Error loading payment requests:', error);
    }
  };

  const loadPayments = async () => {
    try {
      const allPayments = await getAllPayments();
      setPayments(allPayments);
    } catch (error) {
      console.error('Error loading payments:', error);
    }
  };

  const loadInvoices = async () => {
    try {
      const allInvoices = await getInvoicesWithPaymentTracking();
      setInvoices(allInvoices);
    } catch (error) {
      console.error('Error loading invoices:', error);
    }
  };

  const loadBookings = async () => {
    try {
      const bookingsWithoutPayments = await getBookingsWithoutPaymentRequests();
      setBookings(bookingsWithoutPayments);
    } catch (error) {
      console.error('Error loading bookings:', error);
    }
  };

  const loadGateways = async () => {
    try {
      const allGateways = await getAllPaymentGateways();
      setGateways(allGateways);
    } catch (error) {
      console.error('Error loading gateways:', error);
    }
  };

  const loadStatistics = async () => {
    try {
      const stats = await getPaymentStatistics();
      setStatistics(stats);
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  };

  // Use statistics from state, fallback to calculating from current data
  const stats = statistics || {
    totalRequests: paymentRequests.length,
    pendingRequests: paymentRequests.filter(pr => pr.status === 'pending').length,
    paidRequests: paymentRequests.filter(pr => pr.status === 'paid').length,
    totalAmount: paymentRequests.reduce((sum, pr) => sum + pr.amount, 0),
    paidAmount: paymentRequests.filter(pr => pr.status === 'paid').reduce((sum, pr) => sum + pr.amount, 0),
    outstandingAmount: 0,
    paymentRate: 0
  };

  // Calculate derived values
  if (!statistics) {
    stats.outstandingAmount = stats.totalAmount - stats.paidAmount;
    stats.paymentRate = stats.totalRequests > 0 ? parseFloat((stats.paidRequests / stats.totalRequests * 100).toFixed(1)) : 0;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payment Management</h1>
          <p className="text-gray-600">Comprehensive payment tracking and gateway management</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowCreateRequestModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Payment Request
          </button>
          <button
            onClick={() => setShowGatewayModal(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center"
          >
            <Settings className="w-4 h-4 mr-2" />
            Manage Gateways
          </button>
        </div>
      </div>

      {/* Sub-navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: TrendingUp },
            { id: 'requests', label: 'Payment Requests', icon: FileText },
            { id: 'payments', label: 'Payments', icon: CreditCard },
            { id: 'invoices', label: 'Invoice Tracking', icon: FileText },
            { id: 'bookings', label: 'Pending Bookings', icon: Clock },
            { id: 'gateways', label: 'Payment Gateways', icon: Settings }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                activeSubTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Requests</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalRequests}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.pendingRequests}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Payment Rate</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.paymentRate}%</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg">
                  <DollarSign className="w-6 h-6 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Outstanding</p>
                  <p className="text-2xl font-bold text-gray-900">€{stats.outstandingAmount.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Recent Payment Activity</h3>
            </div>
            <div className="p-6">
              <p className="text-gray-500">No recent activity to display</p>
            </div>
          </div>
        </div>
      )}

      {/* Payment Requests Tab */}
      {activeSubTab === 'requests' && (
        <div className="space-y-4">
          {/* Search and Filters */}
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-64">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search by customer name, email, or service..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="failed">Failed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Dates</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
          </div>

          {/* Payment Requests Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Payment Requests</h3>
              <button className="flex items-center text-blue-600 hover:text-blue-800">
                <Download className="w-4 h-4 mr-2" />
                Export
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Service
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Due Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paymentRequests.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                        No payment requests found
                      </td>
                    </tr>
                  ) : (
                    paymentRequests.map((request) => (
                      <tr key={request.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {request.customer_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {request.customer_email}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {request.service_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {request.currency}{request.amount.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            request.status === 'paid' ? 'bg-green-100 text-green-800' :
                            request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            request.status === 'failed' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {request.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(request.due_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button className="text-blue-600 hover:text-blue-900">
                              <Eye className="w-4 h-4" />
                            </button>
                            <button className="text-green-600 hover:text-green-900">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button className="text-red-600 hover:text-red-900">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Other tabs would be implemented similarly */}
      {activeSubTab === 'payments' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Payments</h3>
          <p className="text-gray-500">Payment tracking functionality will be implemented here</p>
        </div>
      )}

      {activeSubTab === 'invoices' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Invoice Payment Tracking</h3>
          <p className="text-gray-500">Invoice payment tracking functionality will be implemented here</p>
        </div>
      )}

      {activeSubTab === 'bookings' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Bookings Without Payment Requests</h3>
          <p className="text-gray-500">Bookings requiring manual payment request creation will be shown here</p>
        </div>
      )}

      {activeSubTab === 'gateways' && (
        <PaymentGatewayManagement 
          gateways={gateways}
          setGateways={setGateways}
          onRefresh={() => loadGateways()}
        />
      )}
    </div>
  );
};

export default PaymentManagement;
