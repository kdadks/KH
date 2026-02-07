import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Search, 
  Download,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  Settings,
  FileText,
  TrendingUp,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useToast } from '../shared/toastContext';
import PaymentGatewayManagement from './PaymentGatewayManagement';

// Import utility functions
import {
  getAllPaymentRequests,
  getAllPayments,
  getRecentPayments,
  getBookingsWithoutPaymentRequests,
  getAllPaymentGateways,
  getPaymentStatistics,
  updatePaymentRequest,
  deletePaymentRequest,
  PaymentRequest as PaymentRequestType,
  Payment as PaymentType,
  BookingWithoutPayment,
  PaymentGateway as PaymentGatewayType
} from '../../utils/paymentManagementUtils';
import { createPaymentRequest, sendPaymentRequestNotification } from '../../utils/paymentRequestUtils';
import { formatPrice } from '../../utils/priceFormatter';

interface PaymentManagementProps {
  paymentRequests?: PaymentRequestType[];
  payments?: PaymentType[];
  recentPayments?: PaymentType[];
  gateways?: PaymentGatewayType[];
  statistics?: any;
  onRefresh?: () => void;
}

// Helper function to format service name with visit type
const formatServiceWithVisitType = (serviceName: string, visitType?: 'home' | 'online' | 'clinic'): string => {
  if (!serviceName) return 'Not specified';
  
  // Fix legacy service names that have prices without € symbol
  // Pattern: "Service Name - Type (123)" should become "Service Name - Type (€123)"
  const pricePattern = /\((\d+(?:\.\d+)?)\)$/;
  const match = serviceName.match(pricePattern);
  
  let formattedName = serviceName;
  if (match && !serviceName.includes('(€') && !serviceName.includes('($')) {
    formattedName = serviceName.replace(pricePattern, `(€${match[1]})`);
  }
  
  if (!visitType) return formattedName;
  
  const visitTypeLabel = {
    home: '[Home]',
    online: '[Online]',
    clinic: '[Clinic]'
  }[visitType];
  
  return `${formattedName} ${visitTypeLabel}`;
};

export const PaymentManagement: React.FC<PaymentManagementProps> = ({
  paymentRequests: propPaymentRequests,
  payments: propPayments,
  recentPayments: propRecentPayments,
  gateways: propGateways,
  statistics: propStatistics,
  onRefresh
}) => {
  const { showSuccess, showError } = useToast();
  
  // State management - Initialize with props if available
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'requests' | 'payments' | 'bookings' | 'gateways'>('overview');
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequestType[]>(propPaymentRequests || []);
  const [payments, setPayments] = useState<PaymentType[]>(propPayments || []);
  const [recentPayments, setRecentPayments] = useState<PaymentType[]>(propRecentPayments || []);
  const [gateways, setGateways] = useState<PaymentGatewayType[]>(propGateways || []);
  const [loading, setLoading] = useState(!propPaymentRequests); // Only show loading if no data provided
  const [statistics, setStatistics] = useState<any>(propStatistics || null);

  // Modal states for view/edit functionality
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedPaymentRequest, setSelectedPaymentRequest] = useState<PaymentRequestType | null>(null);
  
  // Payment details modal state
  const [showPaymentDetailsModal, setShowPaymentDetailsModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentType | null>(null);
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  
  // Bookings for payment request
  const [bookingsForPaymentRequest, setBookingsForPaymentRequest] = useState<BookingWithoutPayment[]>([]);
  const [creatingPaymentRequest, setCreatingPaymentRequest] = useState<{[key: string]: boolean}>({});

  // Load data on component mount - only if not provided via props
  useEffect(() => {
    if (!propPaymentRequests || !propPayments || !propRecentPayments || !propGateways) {
      loadAllData();
    } else {
      // Even if props are provided, we still need to load pending bookings
      // because this data is not passed as props
      loadBookingsForPaymentRequest();
      setLoading(false); // Data is already provided via props
    }
  }, [propPaymentRequests, propPayments, propRecentPayments, propGateways]);

  // Reset pagination and filters when tab changes
  useEffect(() => {
    resetPagination();
  }, [activeSubTab]);

  // Reset pagination (but NOT filters) when search/filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, dateFilter]);

  const loadAllData = async () => {
    console.log('🚀 Starting loadAllData...');
    setLoading(true);
    try {
      // Only fetch data not provided via props
      const promises = [];
      
      if (!propPaymentRequests) promises.push(loadPaymentRequests());
      if (!propPayments) promises.push(loadPayments());
      if (!propRecentPayments) promises.push(loadRecentPayments());
      if (!propGateways) promises.push(loadGateways());
      if (!propStatistics) promises.push(loadStatistics());
      
      // Always load bookings for payment requests as it's not provided via props
      promises.push(loadBookingsForPaymentRequest());
      
      console.log(`🔄 Executing ${promises.length} data loading promises...`);
      await Promise.all(promises);
      console.log('✅ All data loading completed');
    } catch (error) {
      console.error('❌ Error loading payment data:', error);
      showError('Error', 'Failed to load payment data');
    } finally {
      setLoading(false);
      console.log('🏁 loadAllData finished');
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

  const loadRecentPayments = async () => {
    try {
      const recentPaymentsData = await getRecentPayments(5);
      setRecentPayments(recentPaymentsData);
    } catch (error) {
      console.error('Error loading recent payments:', error);
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

  // Pagination helper functions
  const getTotalPages = (totalItems: number, itemsPerPage: number) => {
    return Math.ceil(totalItems / itemsPerPage);
  };

  const getCurrentPageData = <T,>(data: T[], currentPage: number, itemsPerPage: number): T[] => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return data.slice(startIndex, endIndex);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (items: number) => {
    setItemsPerPage(items);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  // Reset pagination when switching tabs
  const resetPagination = () => {
    setCurrentPage(1);
    // Reset filters when switching tabs since different tabs have different filter options
    setStatusFilter('all');
    setDateFilter('all');
  };

  // Filter functions for search and status filtering
  const getFilteredPaymentRequests = () => {
    const filtered = paymentRequests.filter(request => {
      // Search filter - check customer name, service, and reference
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = searchTerm === '' || 
        (request.customer_name && request.customer_name.toLowerCase().includes(searchLower)) ||
        (request.service_name && request.service_name.toLowerCase().includes(searchLower)) ||
        (request.id && request.id.toString().includes(searchLower));

      // Status filter
      const matchesStatus = statusFilter === 'all' || request.status === statusFilter;

      // Date filter
      let matchesDate = true;
      if (dateFilter !== 'all') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        switch (dateFilter) {
          case 'today':
            if (request.created_at) {
              const requestDate = new Date(request.created_at);
              requestDate.setHours(0, 0, 0, 0);
              matchesDate = requestDate.getTime() === today.getTime();
            } else {
              matchesDate = false;
            }
            break;
          case 'week':
            if (request.created_at) {
              const requestDate = new Date(request.created_at);
              const weekAgo = new Date(today);
              weekAgo.setDate(today.getDate() - 7);
              matchesDate = requestDate >= weekAgo;
            } else {
              matchesDate = false;
            }
            break;
          case 'month':
            if (request.created_at) {
              const requestDate = new Date(request.created_at);
              const monthAgo = new Date(today);
              monthAgo.setMonth(today.getMonth() - 1);
              matchesDate = requestDate >= monthAgo;
            } else {
              matchesDate = false;
            }
            break;
          case 'overdue':
            if (request.due_date && request.status !== 'paid') {
              const dueDate = new Date(request.due_date);
              dueDate.setHours(23, 59, 59, 999); // End of due date
              matchesDate = dueDate < today;
            } else {
              matchesDate = false;
            }
            break;
          default:
            matchesDate = true;
        }
      }

      return matchesSearch && matchesStatus && matchesDate;
    });

    return filtered;
  };

  const getFilteredPayments = () => {
    return payments.filter(payment => {
      // Search filter - check customer name, service, and transaction ID
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = searchTerm === '' || 
        (payment.customer_name && payment.customer_name.toLowerCase().includes(searchLower)) ||
        (payment.service_name && payment.service_name.toLowerCase().includes(searchLower)) ||
        (payment.transaction_id && payment.transaction_id.toLowerCase().includes(searchLower));

      // Status filter
      const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;

      // Date filter
      let matchesDate = true;
      if (dateFilter !== 'all') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Use payment_date if available, otherwise fall back to created_at
        const dateToCheck = payment.payment_date || payment.created_at;
        
        if (dateToCheck) {
          const paymentDate = new Date(dateToCheck);
          
          switch (dateFilter) {
            case 'today':
              paymentDate.setHours(0, 0, 0, 0);
              matchesDate = paymentDate.getTime() === today.getTime();
              break;
            case 'week':
              const weekAgo = new Date(today);
              weekAgo.setDate(today.getDate() - 7);
              matchesDate = paymentDate >= weekAgo;
              break;
            case 'month':
              const monthAgo = new Date(today);
              monthAgo.setMonth(today.getMonth() - 1);
              matchesDate = paymentDate >= monthAgo;
              break;
            default:
              matchesDate = true;
          }
        } else {
          matchesDate = false;
        }
      }

      return matchesSearch && matchesStatus && matchesDate;
    });
  };

  // Get status options based on current tab
  const getStatusOptions = () => {
    if (activeSubTab === 'requests') {
      return [
        { value: 'all', label: 'All Status' },
        { value: 'pending', label: 'Pending' },
        { value: 'sent', label: 'Sent' },
        { value: 'paid', label: 'Paid' },
        { value: 'failed', label: 'Failed' },
        { value: 'cancelled', label: 'Cancelled' }
      ];
    } else if (activeSubTab === 'payments') {
      return [
        { value: 'all', label: 'All Status' },
        { value: 'pending', label: 'Pending' },
        { value: 'completed', label: 'Completed' },
        { value: 'failed', label: 'Failed' }
      ];
    }
    return [{ value: 'all', label: 'All Status' }];
  };

  // Get date filter options based on current tab
  const getDateFilterOptions = () => {
    const baseOptions = [
      { value: 'all', label: 'All Dates' },
      { value: 'today', label: 'Today' },
      { value: 'week', label: 'This Week' },
      { value: 'month', label: 'This Month' }
    ];

    if (activeSubTab === 'requests') {
      // Add overdue option for payment requests since they have due dates
      return [...baseOptions, { value: 'overdue', label: 'Overdue' }];
    }

    // For payments tab, don't include overdue option
    return baseOptions;
  };

  // Modal and Payment Request Functions
  // Helper function to check if a service should show payment request actions
  const shouldShowPaymentRequestAction = (serviceName: string): boolean => {
    if (!serviceName) return false;
    
    const serviceLower = serviceName.toLowerCase();
    
    // Check for patterns that indicate no fixed pricing
    const skipPatterns = [
      'contact for quote',
      'contact for pricing',
      'contact us for pricing',
      'pricing on request',
      'quote on request',
      '€25/ class',  // This pattern indicates per-class pricing, not suitable for payment requests
      '€25/class',
      '€25 / class',
      '€25 per class'
    ];
    
    // If any skip pattern is found, don't show payment request action
    return !skipPatterns.some(pattern => serviceLower.includes(pattern));
  };

  const loadBookingsForPaymentRequest = async () => {
    try {
      const allBookings = await getBookingsWithoutPaymentRequests();
      setBookingsForPaymentRequest(allBookings);
    } catch (error) {
      console.error('Error loading bookings for payment request:', error);
    }
  };

  const handleCreatePaymentRequest = async (booking: BookingWithoutPayment) => {
    if (!booking.customer_name || !booking.package_name) {
      showError('Error', 'Missing customer or service information');
      return;
    }

    const bookingId = booking.id;
    setCreatingPaymentRequest(prev => ({ ...prev, [bookingId]: true }));

    try {
      // Use the createPaymentRequest function that will calculate the 20% deposit
      const result = await createPaymentRequest(
        booking.customer_id || 0, // This will need to be properly mapped
        booking.package_name,
        booking.booking_date || new Date().toISOString(),
        null, // invoiceId
        bookingId, // bookingId
        false, // isInvoicePaymentRequest
        undefined // customAmount (let it calculate the deposit)
      );

      if (result) {
        // Send email notification for the payment request
        try {
          console.log('📧 Sending payment request email notification...');
          const emailResult = await sendPaymentRequestNotification(result.id);
          if (emailResult.success) {
            showSuccess('Payment Request Created', `20% deposit payment request created and email sent to ${booking.customer_name}`);
          } else {
            console.error('Failed to send payment request email:', emailResult.error);
            showSuccess('Payment Request Created', `20% deposit payment request created for ${booking.customer_name} (email sending failed)`);
          }
        } catch (emailError) {
          console.error('Error sending payment request email:', emailError);
          showSuccess('Payment Request Created', `20% deposit payment request created for ${booking.customer_name} (email sending failed)`);
        }

        // Refresh the bookings list
        await loadBookingsForPaymentRequest();
      } else {
        throw new Error('Failed to create payment request');
      }
    } catch (error) {
      console.error('Error creating payment request:', error);
      showError('Error', 'Failed to create payment request. Please try again.');
    } finally {
      setCreatingPaymentRequest(prev => ({ ...prev, [bookingId]: false }));
    }
  };

  // Payment Request Action Handlers
  const handleViewPaymentRequest = (request: PaymentRequestType) => {
    setSelectedPaymentRequest(request);
    setShowViewModal(true);
  };

  const handleEditPaymentRequest = (request: PaymentRequestType) => {
    setSelectedPaymentRequest(request);
    setShowEditModal(true);
  };

  const handleDeletePaymentRequest = (request: PaymentRequestType) => {
    setSelectedPaymentRequest(request);
    setShowDeleteModal(true);
  };

  const confirmDeletePaymentRequest = async () => {
    if (!selectedPaymentRequest) return;

    try {
      const success = await deletePaymentRequest(selectedPaymentRequest.id);

      if (success) {
        showSuccess('Payment Request Deleted', `Payment request for ${selectedPaymentRequest.customer_name} has been deleted`);

        // Refresh data
        await loadPaymentRequests();
        setShowDeleteModal(false);
        setSelectedPaymentRequest(null);
      } else {
        showError('Error', 'Failed to delete payment request');
      }
    } catch (error) {
      console.error('Error deleting payment request:', error);
      showError('Error', 'Failed to delete payment request');
    }
  };

  const handleUpdatePaymentRequest = async (updatedRequest: { amount: number; due_date: string; notes: string; status: string }) => {
    if (!selectedPaymentRequest) return;

    try {
      const success = await updatePaymentRequest(selectedPaymentRequest.id, {
        amount: updatedRequest.amount,
        due_date: updatedRequest.due_date,
        notes: updatedRequest.notes,
        status: updatedRequest.status as 'pending' | 'paid' | 'failed' | 'cancelled'
      });

      if (success) {
        showSuccess('Payment Request Updated', `Payment request has been updated successfully`);

        // Refresh data
        await loadPaymentRequests();
        setShowEditModal(false);
        setSelectedPaymentRequest(null);
      } else {
        showError('Error', 'Failed to update payment request');
      }
    } catch (error) {
      console.error('Error updating payment request:', error);
      showError('Error', 'Failed to update payment request');
    }
  };

  // Pagination Component
  const PaginationComponent = ({ 
    currentPage, 
    totalPages, 
    onPageChange, 
    itemsPerPage, 
    onItemsPerPageChange, 
    totalItems 
  }: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    itemsPerPage: number;
    onItemsPerPageChange: (items: number) => void;
    totalItems: number;
  }) => {
    if (totalPages <= 1) return null;

    const pageNumbers = [];
    const maxVisiblePages = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    return (
      <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-700">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} results
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-700">Items per page:</label>
            <select
              value={itemsPerPage}
              onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
              className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="p-2 rounded-md border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          {pageNumbers.map((page) => (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                page === currentPage
                  ? 'bg-primary-600 text-white'
                  : 'border border-gray-300 text-gray-700 hover:bg-gray-100'
              }`}
            >
              {page}
            </button>
          ))}
          
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="p-2 rounded-md border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
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
      </div>

      {/* Sub-navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: TrendingUp },
            { id: 'requests', label: 'Payment Requests', icon: FileText },
            { id: 'payments', label: 'Payments', icon: CreditCard },
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
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
                <div className="p-2 bg-purple-100 rounded-lg">
                  <span className="text-purple-600 font-bold text-lg">€</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Requested</p>
                  <p className="text-2xl font-bold text-gray-900">{formatPrice(stats.totalAmount || 0)}</p>
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
                  <p className="text-sm font-medium text-gray-600">Total Paid</p>
                  <p className="text-2xl font-bold text-gray-900">{formatPrice(stats.paidAmount || 0)}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg">
                  <span className="text-red-600 font-bold text-lg">€</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Outstanding</p>
                  <p className="text-2xl font-bold text-gray-900">{formatPrice(stats.outstandingAmount)}</p>
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
              {recentPayments.length === 0 ? (
                <p className="text-gray-500">No recent payment activity to display</p>
              ) : (
                <div className="space-y-4">
                  {recentPayments.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="p-2 bg-green-100 rounded-full">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{payment.customer_name}</p>
                          <p className="text-sm text-gray-500">{formatServiceWithVisitType(payment.service_name, payment.visit_type)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">{formatPrice(payment.amount)}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(payment.payment_date || payment.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
                {getStatusOptions().map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {getDateFilterOptions().map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
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
                  {getCurrentPageData(getFilteredPaymentRequests(), currentPage, itemsPerPage).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                        {getFilteredPaymentRequests().length === 0 ? 'No payment requests found matching your criteria' : 'No payment requests on this page'}
                      </td>
                    </tr>
                  ) : (
                    getCurrentPageData(getFilteredPaymentRequests(), currentPage, itemsPerPage).map((request) => (
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
                          {formatServiceWithVisitType(request.service_name || 'No service specified', request.visit_type)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatPrice(request.amount)}
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
                          {request.due_date ? new Date(request.due_date).toLocaleDateString() : 'No due date'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleViewPaymentRequest(request)}
                              className="text-blue-600 hover:text-blue-900"
                              title="View payment request details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleEditPaymentRequest(request)}
                              className="text-green-600 hover:text-green-900"
                              title="Edit payment request"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeletePaymentRequest(request)}
                              className="text-red-600 hover:text-red-900"
                              title="Delete payment request"
                            >
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

            {/* Payment Requests Pagination */}
            {getFilteredPaymentRequests().length > 0 && (
              <PaginationComponent 
                totalItems={getFilteredPaymentRequests().length}
                currentPage={currentPage}
                itemsPerPage={itemsPerPage}
                totalPages={getTotalPages(getFilteredPaymentRequests().length, itemsPerPage)}
                onPageChange={handlePageChange}
                onItemsPerPageChange={handleItemsPerPageChange}
              />
            )}
          </div>
        </div>
      )}

      {/* Payments Tab */}
      {activeSubTab === 'payments' && (
        <div className="space-y-4">
          {/* Search and Filters */}
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-64">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search payments..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {getStatusOptions().map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {getDateFilterOptions().map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Header */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-2">All Payments</h3>
            <p className="text-sm text-gray-600">Complete payment history sorted by most recent</p>
          </div>

          {/* Payments Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment Date
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {getCurrentPageData(getFilteredPayments(), currentPage, itemsPerPage).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                        {getFilteredPayments().length === 0 ? 'No payments found matching your criteria' : 'No payments on this page'}
                      </td>
                    </tr>
                  ) : (
                    getCurrentPageData(getFilteredPayments(), currentPage, itemsPerPage).map((payment) => (
                      <tr key={payment.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {payment.customer_name || 'Unknown Customer'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {formatServiceWithVisitType(payment.service_name || 'Payment', payment.visit_type)}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-gray-900">
                            {formatPrice(payment.amount)}
                          </div>
                          <div className="text-xs text-gray-500 capitalize">
                            {payment.sumup_payment_type || payment.payment_method || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            payment.status === 'paid' || payment.status === 'completed' ? 'bg-green-100 text-green-800' :
                            payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {payment.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {payment.payment_date ? 
                            new Date(payment.payment_date).toLocaleDateString('en-IE', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : 
                            new Date(payment.created_at).toLocaleDateString('en-IE', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          }
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <button
                            onClick={() => {
                              setSelectedPayment(payment);
                              setShowPaymentDetailsModal(true);
                            }}
                            className="inline-flex items-center px-3 py-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Payments Pagination */}
            {getFilteredPayments().length > 0 && (
              <PaginationComponent 
                totalItems={getFilteredPayments().length}
                currentPage={currentPage}
                itemsPerPage={itemsPerPage}
                totalPages={getTotalPages(getFilteredPayments().length, itemsPerPage)}
                onPageChange={handlePageChange}
                onItemsPerPageChange={handleItemsPerPageChange}
              />
            )}
          </div>
        </div>
      )}

      {activeSubTab === 'bookings' && (
        <div className="space-y-4">
          {/* Header */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Pending Bookings</h3>
            <p className="text-sm text-gray-600">Bookings that require payment request creation</p>
          </div>

          {/* Bookings Content */}
          <div className="bg-white rounded-lg shadow p-6">
            {bookingsForPaymentRequest.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No bookings found that require payment requests.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Service
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Booking Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {bookingsForPaymentRequest.map((booking) => (
                      <tr key={booking.id}>
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {booking.customer_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {booking.customer_email}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {formatServiceWithVisitType(booking.package_name, booking.visit_type)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(booking.booking_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            booking.status === 'confirmed' 
                              ? 'bg-green-100 text-green-800'
                              : booking.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {booking.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {!shouldShowPaymentRequestAction(booking.package_name) ? (
                            <span className="text-xs text-gray-500 italic">
                              Contact Physio
                            </span>
                          ) : creatingPaymentRequest[booking.id] ? (
                            <div className="flex items-center justify-center">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                            </div>
                          ) : (
                            <img 
                              src="/paymentrequest.png" 
                              alt="Create Payment Request" 
                              title="Create Payment Request"
                              className="w-8 h-8 cursor-pointer hover:opacity-70 transition-opacity duration-200 mx-auto"
                              onClick={() => handleCreatePaymentRequest(booking)}
                            />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeSubTab === 'gateways' && (
        <PaymentGatewayManagement 
          gateways={gateways}
          setGateways={setGateways}
          onRefresh={() => loadGateways()}
        />
      )}

      {/* View Payment Request Modal */}
      {showViewModal && selectedPaymentRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Payment Request Details</h3>
              <button
                onClick={() => setShowViewModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-600">Customer</p>
                <p className="text-base text-gray-900">{selectedPaymentRequest.customer_name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Email</p>
                <p className="text-base text-gray-900">{selectedPaymentRequest.customer_email || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Service</p>
                <p className="text-base text-gray-900">{formatServiceWithVisitType(selectedPaymentRequest.service_name, selectedPaymentRequest.visit_type)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Amount</p>
                <p className="text-base font-bold text-gray-900">{formatPrice(selectedPaymentRequest.amount)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Status</p>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  selectedPaymentRequest.status === 'paid' ? 'bg-green-100 text-green-800' :
                  selectedPaymentRequest.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {selectedPaymentRequest.status}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Due Date</p>
                <p className="text-base text-gray-900">
                  {selectedPaymentRequest.due_date ? new Date(selectedPaymentRequest.due_date).toLocaleDateString() : 'No due date'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Created</p>
                <p className="text-base text-gray-900">
                  {new Date(selectedPaymentRequest.created_at).toLocaleDateString()}
                </p>
              </div>
              {selectedPaymentRequest.notes && (
                <div>
                  <p className="text-sm font-medium text-gray-600">Notes</p>
                  <p className="text-base text-gray-900">{selectedPaymentRequest.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Payment Request Modal */}
      {showEditModal && selectedPaymentRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Edit Payment Request</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const updatedRequest = {
                amount: parseFloat(formData.get('amount') as string),
                due_date: formData.get('due_date') as string,
                notes: formData.get('notes') as string,
                status: formData.get('status') as string
              };
              handleUpdatePaymentRequest(updatedRequest);
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
                  <p className="text-base text-gray-900">{selectedPaymentRequest.customer_name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Service</label>
                  <p className="text-base text-gray-900">{formatServiceWithVisitType(selectedPaymentRequest.service_name, selectedPaymentRequest.visit_type)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                  <input
                    type="number"
                    name="amount"
                    step="0.01"
                    defaultValue={selectedPaymentRequest.amount}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    name="status"
                    defaultValue={selectedPaymentRequest.status}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="sent">Sent</option>
                    <option value="paid">Paid</option>
                    <option value="failed">Failed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    name="due_date"
                    defaultValue={selectedPaymentRequest.due_date ? selectedPaymentRequest.due_date.split('T')[0] : ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    name="notes"
                    rows={3}
                    defaultValue={selectedPaymentRequest.notes || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedPaymentRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0 w-10 h-10 mx-auto bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Delete Payment Request</h3>
              <p className="text-sm text-gray-500 mb-4">
                Are you sure you want to delete the payment request for {selectedPaymentRequest.customer_name}?
                This action cannot be undone.
              </p>
              <div className="flex justify-center space-x-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeletePaymentRequest}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Details Modal */}
      {showPaymentDetailsModal && selectedPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Payment Details</h3>
              <button
                onClick={() => {
                  setShowPaymentDetailsModal(false);
                  setSelectedPayment(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="text-2xl">&times;</span>
              </button>
            </div>

            <div className="space-y-6">
              {/* Customer Information */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Customer Information
                </h4>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Name:</span>
                    <span className="text-sm font-medium text-gray-900">{selectedPayment.customer_name || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Email:</span>
                    <span className="text-sm font-medium text-gray-900">{selectedPayment.customer_email || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Customer ID:</span>
                    <span className="text-sm font-medium text-gray-900">{selectedPayment.customer_id}</span>
                  </div>
                </div>
              </div>

              {/* Payment Information */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                  <CreditCard className="w-4 h-4 mr-2" />
                  Payment Information
                </h4>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Payment ID:</span>
                    <span className="text-sm font-medium text-gray-900">#{selectedPayment.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Amount:</span>
                    <span className="text-sm font-bold text-gray-900">{formatPrice(selectedPayment.amount)} {selectedPayment.currency}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Payment Method:</span>
                    <span className="text-sm font-medium text-gray-900">{selectedPayment.payment_method || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Payment Type:</span>
                    <span className="text-sm font-medium text-gray-900 capitalize">
                      {selectedPayment.sumup_payment_type || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Status:</span>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      selectedPayment.status === 'paid' || selectedPayment.status === 'completed' ? 'bg-green-100 text-green-800' :
                      selectedPayment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {selectedPayment.status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Service:</span>
                    <span className="text-sm font-medium text-gray-900">{formatServiceWithVisitType(selectedPayment.service_name || 'N/A', selectedPayment.visit_type)}</span>
                  </div>
                </div>
              </div>

              {/* Transaction Details */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                  <FileText className="w-4 h-4 mr-2" />
                  Transaction Details
                </h4>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Transaction ID:</span>
                    <span className="text-sm font-mono text-gray-900 break-all">
                      {selectedPayment.sumup_transaction_id || selectedPayment.transaction_id || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Checkout ID:</span>
                    <span className="text-sm font-mono text-gray-900 break-all">
                      {selectedPayment.sumup_checkout_id || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Checkout Reference:</span>
                    <span className="text-sm font-mono text-gray-900 break-all">
                      {selectedPayment.sumup_checkout_reference || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Payment Request ID:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {selectedPayment.payment_request_id ? `#${selectedPayment.payment_request_id}` : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Booking ID:</span>
                    <span className="text-sm font-mono text-gray-900 break-all">
                      {selectedPayment.booking_id || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Invoice ID:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {selectedPayment.invoice_id ? `#${selectedPayment.invoice_id}` : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                  <Clock className="w-4 h-4 mr-2" />
                  Timestamps
                </h4>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Payment Date:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {selectedPayment.payment_date ? 
                        new Date(selectedPayment.payment_date).toLocaleString() : 
                        'N/A'
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Created At:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {new Date(selectedPayment.created_at).toLocaleString()}
                    </span>
                  </div>
                  {selectedPayment.updated_at && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Updated At:</span>
                      <span className="text-sm font-medium text-gray-900">
                        {new Date(selectedPayment.updated_at).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {selectedPayment.webhook_processed_at && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Webhook Processed:</span>
                      <span className="text-sm font-medium text-gray-900">
                        {new Date(selectedPayment.webhook_processed_at).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Additional Information */}
              {(selectedPayment.notes || selectedPayment.failure_reason || selectedPayment.refund_amount) && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Additional Information</h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    {selectedPayment.notes && (
                      <div>
                        <span className="text-sm text-gray-600 block mb-1">Notes:</span>
                        <p className="text-sm text-gray-900">{selectedPayment.notes}</p>
                      </div>
                    )}
                    {selectedPayment.failure_reason && (
                      <div>
                        <span className="text-sm text-gray-600 block mb-1">Failure Reason:</span>
                        <p className="text-sm text-red-700">{selectedPayment.failure_reason}</p>
                      </div>
                    )}
                    {selectedPayment.refund_amount && (
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Refund Amount:</span>
                          <span className="text-sm font-medium text-red-700">
                            {formatPrice(parseFloat(selectedPayment.refund_amount))}
                          </span>
                        </div>
                        {selectedPayment.refund_reason && (
                          <div>
                            <span className="text-sm text-gray-600 block mb-1">Refund Reason:</span>
                            <p className="text-sm text-gray-900">{selectedPayment.refund_reason}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => {
                  setShowPaymentDetailsModal(false);
                  setSelectedPayment(null);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentManagement;
