import React, { useState, useEffect } from 'react';
import { UserDashboardData, UserPortalTab } from '../../types/userManagement';
import { 
  AlertCircle, 
  CreditCard, 
  FileText, 
  Calendar,
  TrendingUp,
  Clock,
  Euro,
  RefreshCw,
  X,
  Plus
} from 'lucide-react';
import { formatCurrency } from '../../utils/userManagementUtils';
import { getCustomerPaymentRequests } from '../../utils/paymentRequestUtils';
import { PaymentRequestWithCustomer } from '../../types/paymentTypes';
import { useToast } from '../shared/toastContext';
import BookingModal from './BookingModal';

interface UserDashboardProps {
  data: UserDashboardData | null;
  onRefresh: () => void;
  onTabChange: (tab: UserPortalTab) => void;
}

const UserDashboard: React.FC<UserDashboardProps> = ({ data, onRefresh, onTabChange }) => {
  const { showSuccess } = useToast();
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequestWithCustomer[]>([]);
  const [loadingPaymentRequests, setLoadingPaymentRequests] = useState(true);
  const [dismissedNotifications, setDismissedNotifications] = useState<number[]>([]);
  const [showBookingModal, setShowBookingModal] = useState(false);

  // Load payment requests when component mounts
  useEffect(() => {
    if (data?.customer?.id) {
      loadPaymentRequests();
    }
  }, [data?.customer?.id]);

  const loadPaymentRequests = async () => {
    if (!data?.customer?.id) return;
    
    try {
      setLoadingPaymentRequests(true);
      const requests = await getCustomerPaymentRequests(data.customer.id);
      setPaymentRequests(requests);
    } catch (error) {
      console.error('Failed to load payment requests:', error);
    } finally {
      setLoadingPaymentRequests(false);
    }
  };

  const dismissNotification = (requestId: number) => {
    setDismissedNotifications(prev => [...prev, requestId]);
  };

  const handlePaymentRequestClick = (requestId: number) => {
    // Store both flags for the payments page
    localStorage.setItem('highlightPaymentRequest', requestId.toString());
    localStorage.setItem('autoOpenPaymentModal', 'true');
    showSuccess('Navigating to Payments', 'Opening your payment request...');
    onTabChange('payments');
  };

  if (!data) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const { customer, stats, recentInvoices, overdueInvoices, recentPayments, upcomingBookings } = data;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {customer.first_name}!
          </h1>
          <p className="text-gray-600 mt-1">
            Here's your account overview for today.
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="flex items-center px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Total Invoices</p>
              <p className="text-2xl font-bold">{stats.totalInvoices}</p>
            </div>
            <FileText className="w-8 h-8 text-blue-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Total Paid</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.totalPaid)}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm font-medium">Outstanding</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.totalOutstanding)}</p>
            </div>
            <Euro className="w-8 h-8 text-orange-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm font-medium">Overdue</p>
              <p className="text-2xl font-bold">{stats.overdueCount}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-red-200" />
          </div>
        </div>
      </div>

      {/* Overdue Invoices Alert */}
      {overdueInvoices.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-red-500 mr-3 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800">
                You have {overdueInvoices.length} overdue invoice{overdueInvoices.length > 1 ? 's' : ''}
              </h3>
              <p className="text-sm text-red-700 mt-1">
                Please pay your outstanding invoices to avoid service interruption.
              </p>
              <button
                onClick={() => onTabChange('invoices')}
                className="text-sm text-red-700 underline hover:text-red-800 mt-2"
              >
                View overdue invoices →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Request Notifications */}
      {!loadingPaymentRequests && paymentRequests.length > 0 && (
        <div className="space-y-4 mb-6">
          {paymentRequests
            .filter(request => 
              (request.status === 'pending' || request.status === 'sent') && 
              !dismissedNotifications.includes(request.id)
            )
            .map((request) => (
              <div key={request.id} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start">
                    <CreditCard className="w-5 h-5 text-blue-500 mr-3 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-blue-800">
                        Payment Request: {request.service_name || 'Service Payment'}
                      </h3>
                      <p className="text-sm text-blue-700 mt-1">
                        Amount due: <span className="font-semibold">{formatCurrency(request.amount)}</span>
                        {request.payment_due_date && (
                          <span className="ml-2">
                            • Due: {new Date(request.payment_due_date).toLocaleDateString()}
                          </span>
                        )}
                      </p>
                      <div className="flex gap-3 mt-3">
                        <button
                          onClick={() => handlePaymentRequestClick(request.id)}
                          className="text-sm bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          Pay Now
                        </button>
                        <button
                          onClick={() => onTabChange('payments')}
                          className="text-sm text-blue-600 underline hover:text-blue-800"
                        >
                          View all payment requests →
                        </button>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => dismissNotification(request.id)}
                    className="text-gray-400 hover:text-gray-600 ml-4"
                    title="Dismiss notification"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Invoices */}
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Recent Invoices</h3>
              <button
                onClick={() => onTabChange('invoices')}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                View all →
              </button>
            </div>
          </div>
          <div className="p-6">
            {recentInvoices.length > 0 ? (
              <div className="space-y-4">
                {recentInvoices.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between py-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {invoice.invoice_number}
                      </p>
                      <p className="text-sm text-gray-500">
                        Due: {new Date(invoice.due_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {formatCurrency(invoice.total_amount)}
                      </p>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        invoice.status === 'paid'
                          ? 'bg-green-500 text-white'
                          : invoice.status === 'sent' && invoice.is_overdue
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {invoice.status === 'paid' ? 'Paid' : invoice.is_overdue ? 'Overdue' : 'Pending'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">
                No invoices found
              </p>
            )}
          </div>
        </div>

        {/* Recent Payments */}
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Recent Payments</h3>
              <button
                onClick={() => onTabChange('payments')}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                View all →
              </button>
            </div>
          </div>
          <div className="p-6">
            {recentPayments.length > 0 ? (
              <div className="space-y-4">
                {recentPayments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between py-2">
                    <div className="flex items-center">
                      <CreditCard className="w-4 h-4 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          Payment #{payment.id}
                        </p>
                        <p className="text-sm text-gray-500">
                          {payment.payment_method || 'Card payment'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {formatCurrency(payment.amount)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {payment.payment_date ? new Date(payment.payment_date).toLocaleDateString() : 'Pending'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">
                No payments found
              </p>
            )}
          </div>
        </div>

        {/* Upcoming Bookings */}
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Upcoming Appointments</h3>
              <button
                onClick={() => onTabChange('bookings')}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                View all →
              </button>
            </div>
          </div>
          <div className="p-6">
            {upcomingBookings.length > 0 ? (
              <div className="space-y-4">
                {upcomingBookings.map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between py-2">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {booking.package_name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {booking.booking_date ? new Date(booking.booking_date).toLocaleDateString() : 'Date TBD'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-500">
                        {booking.timeslot_start_time ? 
                          `${booking.timeslot_start_time.substring(0, 5)}` : 
                          'Time TBD'
                        }
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">
                No upcoming appointments
              </p>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              <button
                onClick={() => setShowBookingModal(true)}
                className="w-full flex items-center justify-between px-4 py-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
              >
                <div className="flex items-center">
                  <Plus className="w-5 h-5 text-blue-600 mr-3" />
                  <span className="text-sm font-medium text-blue-900">Book New Appointment</span>
                </div>
                <span className="text-xs text-blue-500">→</span>
              </button>
              
              <button
                onClick={() => onTabChange('invoices')}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <div className="flex items-center">
                  <FileText className="w-5 h-5 text-gray-600 mr-3" />
                  <span className="text-sm font-medium text-gray-900">View Invoices</span>
                </div>
                <span className="text-xs text-gray-500">→</span>
              </button>
              
              <button
                onClick={() => onTabChange('payments')}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <div className="flex items-center">
                  <CreditCard className="w-5 h-5 text-gray-600 mr-3" />
                  <span className="text-sm font-medium text-gray-900">Make Payment</span>
                </div>
                <span className="text-xs text-gray-500">→</span>
              </button>
              
              <button
                onClick={() => onTabChange('profile')}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <div className="flex items-center">
                  <FileText className="w-5 h-5 text-gray-600 mr-3" />
                  <span className="text-sm font-medium text-gray-900">Update Profile</span>
                </div>
                <span className="text-xs text-gray-500">→</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      {showBookingModal && (
        <BookingModal 
          isOpen={showBookingModal}
          onClose={() => setShowBookingModal(false)}
          customer={customer}
          onBookingCreated={() => {
            setShowBookingModal(false);
            showSuccess('Booking Request Submitted', 'Your booking request has been submitted successfully. We will review and confirm it shortly.');
            onRefresh(); // Refresh dashboard data
          }}
        />
      )}
    </div>
  );
};

export default UserDashboard;
