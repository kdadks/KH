import * as React from 'react';
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Calendar, 
  Package, 
  Clock, 
  BarChart3, 
  User,
  Mail,
  AlertCircle,
  TrendingUp,
  Settings,
  LogOut,
  FileText,
  Users,
  RefreshCw,
  CreditCard,
  HelpCircle
} from 'lucide-react';
import { Dashboard } from '../components/admin/Dashboard';
import { Services } from '../components/admin/Services';
import { Bookings } from '../components/admin/Bookings';
import { Availability } from '../components/admin/Availability';
import { Reports } from '../components/admin/Reports';
import InvoiceManagement from '../components/admin/InvoiceManagement';
import PaymentManagement from '../components/admin/PaymentManagement';
import CustomerManagement from '../components/admin/CustomerManagement';
import { BookingFormData, Package as PackageType, Customer, Invoice, Service } from '../components/admin/types';
import { PaymentRequest, Payment, PaymentGateway } from '../utils/paymentManagementUtils';
import { getBookingsWithCustomers } from '../utils/customerBookingUtils';
import { useToast } from '../components/shared/toastContext';
import { 
  decryptCustomersArrayForAdmin, 
  decryptBookingCustomerDataForAdmin, 
  logAdminDataAccess 
} from '../utils/adminGdprUtils';
import {
  getAllPaymentRequests,
  getAllPayments,
  getRecentPayments,
  getAllPaymentGateways,
  getPaymentStatistics
} from '../utils/paymentManagementUtils';
import { useSessionTimeout } from '../hooks/useSessionTimeout';
import { SessionTimeoutWarning } from '../components/shared/SessionTimeoutWarning';

const AdminConsole = () => {
  const { showError, showSuccess } = useToast();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  // State management
  const [activeTab, setActiveTab] = useState<'dashboard' | 'package' | 'bookings' | 'availability' | 'customers' | 'invoices' | 'reports' | 'payments' | 'help'>('dashboard');
  const [packages, setPackages] = useState<PackageType[]>([]);
  const [newPackage, setNewPackage] = useState<PackageType>({ 
    name: '', 
    price: '', 
    inHourPrice: '', 
    outOfHourPrice: '', 
    features: [''], 
    category: '',
    description: ''
  });
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editPackage, setEditPackage] = useState<PackageType | null>(null);
  const [allBookings, setAllBookings] = useState<BookingFormData[]>([]);
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [allInvoices, setAllInvoices] = useState<Invoice[]>([]);
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [allPaymentRequests, setAllPaymentRequests] = useState<PaymentRequest[]>([]);
  const [allPayments, setAllPayments] = useState<Payment[]>([]);
  const [allRecentPayments, setAllRecentPayments] = useState<Payment[]>([]);
  const [allPaymentGateways, setAllPaymentGateways] = useState<PaymentGateway[]>([]);
  const [paymentStatistics, setPaymentStatistics] = useState<{
    totalRequests: number;
    pendingRequests: number;
    paidRequests: number;
    failedRequests: number;
    totalAmount: number;
    paidAmount: number;
    outstandingAmount: number;
    paymentRate: number;
    totalPayments: number;
    recentActivity: PaymentRequest[];
  } | null>(null);
  const [filterDate, setFilterDate] = useState('');
  const [filterRange, setFilterRange] = useState<{start: string; end: string} | null>(null);

  // Logout handler (defined before useSessionTimeout hook)
  const handleLogout = async () => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
        showError('Logout Error', 'Failed to sign out properly, but you are now logged out locally.');
      }
      // Force local logout regardless of server response
      setIsLoggedIn(false);
      setEmail('');
      setPassword('');
      setActiveTab('dashboard');
      
      // Clear any cached session data
      localStorage.removeItem('supabase.auth.token');
      sessionStorage.clear();
    } catch (error) {
      console.error('Logout error:', error);
      showError('Logout Error', 'Error during logout, but you are now logged out locally.');
      // Force logout anyway
      setIsLoggedIn(false);
      setEmail('');
      setPassword('');
    } finally {
      setIsLoading(false);
    }
  };

  // Session timeout hook - 15 minutes idle, 60 seconds warning
  const { showWarning, remainingTime, extendSession } = useSessionTimeout({
    idleTimeout: 15 * 60 * 1000, // 15 minutes
    warningTimeout: 60 * 1000, // 60 seconds warning
    onTimeout: handleLogout,
    enabled: isLoggedIn, // Only active when logged in
  });

  // Check if user is already logged in when component mounts
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (session && !error) {
          setIsLoggedIn(true);
        }
      } catch (error) {
        console.error('Error checking auth status:', error);
      }
    };

    // Clear session on page unload
    const handleBeforeUnload = () => {
      supabase.auth.signOut();
    };

    checkAuthStatus();
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const handleTabChange = (tab: string) => {
    // Set loading state briefly for visual feedback
    if (tab !== activeTab) {
      setIsLoading(true);
      setActiveTab(tab as 'dashboard' | 'package' | 'bookings' | 'availability' | 'reports' | 'invoices' | 'customers' | 'payments');
      // Clear loading state after a brief delay to allow components to render
      setTimeout(() => setIsLoading(false), 100);
    }
  };

  // Change password handler
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim()) return;
    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword.trim() });
      if (error) {
        showError('Password Change Failed', error.message);
      } else {
        showSuccess('Password Updated', 'Your password has been successfully changed.');
        setShowPasswordModal(false);
        setNewPassword('');
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Fetch bookings when component mounts and user is logged in
  useEffect(() => {
    if (isLoggedIn) {
      fetchAllBookings();
      fetchAllServices();
      fetchAllCustomers();
      fetchAllInvoices();
    }
  }, [isLoggedIn]); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for refresh events from child components
  useEffect(() => {
    if (!isLoggedIn) return;

    let refreshDebounceTimer: NodeJS.Timeout | null = null;
    let dashboardDebounceTimer: NodeJS.Timeout | null = null;

    const handleRefreshBookings = () => {
      // Debounce refresh events to prevent loops
      if (refreshDebounceTimer) {
        clearTimeout(refreshDebounceTimer);
      }

      refreshDebounceTimer = setTimeout(async () => {
        console.log('🔄 AdminConsole received refreshBookings event, refreshing booking and payment data...');
        setIsLoading(true);
        try {
          await Promise.all([
            fetchAllBookings(),
            fetchAllPaymentData() // Also refresh payment data since booking payments are linked
          ]);
        } catch (error) {
          console.error('❌ Error during refresh:', error);
        } finally {
          setIsLoading(false);
        }
        refreshDebounceTimer = null;
      }, 1000); // 1 second debounce
    };

    const handleRefreshDashboard = () => {
      // Debounce dashboard refresh events
      if (dashboardDebounceTimer) {
        clearTimeout(dashboardDebounceTimer);
      }

      dashboardDebounceTimer = setTimeout(async () => {
        console.log('🔄 AdminConsole received refreshDashboard event, refreshing all data...');
        setIsLoading(true);
        try {
          await handleManualRefresh();
        } catch (error) {
          console.error('❌ Error during dashboard refresh:', error);
        } finally {
          setIsLoading(false);
        }
        dashboardDebounceTimer = null;
      }, 1000); // 1 second debounce
    };

    window.addEventListener('refreshBookings', handleRefreshBookings);
    window.addEventListener('refreshDashboard', handleRefreshDashboard);

    return () => {
      // Clean up timers
      if (refreshDebounceTimer) clearTimeout(refreshDebounceTimer);
      if (dashboardDebounceTimer) clearTimeout(dashboardDebounceTimer);

      window.removeEventListener('refreshBookings', handleRefreshBookings);
      window.removeEventListener('refreshDashboard', handleRefreshDashboard);
    };
  }, [isLoggedIn]); // eslint-disable-line react-hooks/exhaustive-deps

  // Only fetch data when first logging in, not on tab changes
  // This prevents losing payment status and reduces unnecessary API calls
  useEffect(() => {
    if (isLoggedIn && allBookings.length === 0) {
      fetchAllBookings();
    }
    if (isLoggedIn && packages.length === 0) {
      fetchAllServices();
    }
    if (isLoggedIn && allCustomers.length === 0) {
      fetchAllCustomers();
    }
    if (isLoggedIn && allInvoices.length === 0) {
      fetchAllInvoices();
    }
    if (isLoggedIn && allPaymentRequests.length === 0) {
      fetchAllPaymentData();
    }
  }, [isLoggedIn]); // eslint-disable-line react-hooks/exhaustive-deps

  // Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        console.error('Login error:', error);
        setLoginError(error.message);
      } else if (data.user) {
        setIsLoggedIn(true);
        setLoginError('');
        await Promise.all([
          fetchAllBookings(), 
          fetchAllServices(), 
          fetchAllCustomers(), 
          fetchAllInvoices(),
          fetchAllPaymentData()
        ]);
      } else {
        setLoginError('Login failed.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch bookings with customer details
  const fetchAllBookings = async () => {
    try {
      // First, test a simple query to see if Supabase is accessible
      const { error: testError } = await supabase
        .from('bookings')
        .select('id, package_name')
        .limit(1);
      
      if (testError) {
        console.error('❌ Simple Supabase test failed:', testError);
        showError('Database Connection Error', 'Could not connect to database. Please check your connection.');
        return;
      }
      
      // Now try the customer join query to get latest booking_reference data
      const { bookings: bookingsWithCustomers, error: customerError } = await getBookingsWithCustomers();
      
      if (!customerError && bookingsWithCustomers) {
        // Transform the data to include customer details while maintaining backward compatibility
        const transformedBookings = bookingsWithCustomers.map((booking) => {
          const transformed = {
            ...booking,
            // Create customer fields from customer relationship
            customer_name: booking.customers?.first_name && booking.customers?.last_name 
              ? `${booking.customers.first_name} ${booking.customers.last_name}`
              : 'Unknown Customer',
            customer_email: booking.customers?.email || '',
            customer_phone: booking.customers?.phone || '',
            // Keep the customer object for potential future use
            customer_details: booking.customers
          };
          
          return transformed;
        });
        
        // Decrypt customer data for admin viewing (GDPR compliance)
        const decryptedBookings = transformedBookings.map(booking => {
          const decrypted = decryptBookingCustomerDataForAdmin(booking);
          return decrypted;
        });
        
        // Log admin access for GDPR audit trail
        const customerIds = decryptedBookings
          .map(b => b.customer_id)
          .filter(Boolean);
        if (customerIds.length > 0) {
          logAdminDataAccess(
            null, // Auto-detect current admin user
            'VIEW_BOOKINGS', 
            customerIds, 
            'Admin console booking management access'
          );
        }
        
        setAllBookings(decryptedBookings);
        return;
      }
      
      // Fallback to the old method if customer integration fails
      console.warn('❌ Customer integration failed, using fallback method:', customerError);
      
      // Try the simple fallback method with performance optimization
      // Add timeout protection
      const timeoutId = setTimeout(() => {
        showError('Timeout Error', 'Data loading is taking too long. Please check your connection.');
      }, 15000); // 15 second timeout
      
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000); // Add limit to prevent massive data loads
      
      // Clear timeout if successful
      clearTimeout(timeoutId);
      
      if (fallbackError) {
        console.error('❌ Fallback method also failed:', fallbackError);
        showError('Database Error', 'Cannot fetch bookings data. Please check your connection and try again.');
        return;
      } else {
        // Decrypt fallback booking data for admin viewing
        const decryptedFallbackBookings = (fallbackData || []).map(booking => 
          decryptBookingCustomerDataForAdmin(booking)
        );
        
        setAllBookings(decryptedFallbackBookings);
      }
    } catch (error) {
      console.error('❌ Exception in fetchAllBookings:', error);
      
      // Show user-friendly error
      showError('Connection Error', 'Unable to fetch booking data. Please check your internet connection and try again.');
      
      // Fallback to empty array to prevent UI crashes
      setAllBookings([]);
    }
  };

  // Manual refresh function to replace auto-refresh
  const handleManualRefresh = async (dataType?: string, silent?: boolean) => {
    try {
      setIsLoading(true);
      
      if (!dataType || dataType === 'bookings') {
        await fetchAllBookings();
      }
      if (!dataType || dataType === 'services') {
        await fetchAllServices();
      }
      if (!dataType || dataType === 'customers') {
        await fetchAllCustomers();
      }
      if (!dataType || dataType === 'invoices') {
        await fetchAllInvoices();
      }
      if (!dataType || dataType === 'payments') {
        await fetchAllPaymentData();
      }
      
      // Only show success message if not in silent mode
      if (!silent) {
        showSuccess('Refresh Complete', 'Data has been refreshed successfully.');
      }
    } catch (error) {
      console.error('Manual refresh error:', error);
      showError('Refresh Error', 'Failed to refresh data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch customers from database
  const fetchAllCustomers = async () => {
    try {
      setIsLoading(true);
      
      // Add timeout protection
      const timeoutId = setTimeout(() => {
        showError('Timeout Error', 'Customer data loading is taking too long. Please check your connection.');
      }, 15000);
      
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(500); // Limit for performance
      
      clearTimeout(timeoutId);
      
      if (error) {
        console.error('❌ Error fetching customers:', error);
        showError('Database Error', 'Cannot fetch customer data. Please check your connection and try again.');
        return;
      }
      
      // Decrypt customer data for admin viewing (GDPR compliance)
      const decryptedCustomers = decryptCustomersArrayForAdmin(data || []);
      
      // Log admin access for GDPR audit trail
      const customerIds = decryptedCustomers.map(c => c.id).filter(Boolean);
      if (customerIds.length > 0) {
        logAdminDataAccess(
          null, // Auto-detect current admin user
          'VIEW_CUSTOMERS', 
          customerIds, 
          'Admin console customer management access'
        );
      }
      
      setAllCustomers(decryptedCustomers);
    } catch (error) {
      console.error('❌ Exception in fetchAllCustomers:', error);
      showError('Connection Error', 'Unable to fetch customer data. Please check your internet connection and try again.');
      setAllCustomers([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch invoices from database
  const fetchAllInvoices = async () => {
    try {
      setIsLoading(true);
      
      // Add timeout protection
      const timeoutId = setTimeout(() => {
        showError('Timeout Error', 'Invoice data loading is taking too long. Please check your connection.');
      }, 20000);
      
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          customer:customers(*),
          items:invoice_items(*)
        `)
        .order('invoice_date', { ascending: false })
        .limit(200); // Limit for performance
      
      clearTimeout(timeoutId);
      
      if (error) {
        console.error('❌ Error fetching invoices:', error);
        showError('Database Error', 'Cannot fetch invoice data. Please check your connection and try again.');
        return;
      }
      
      // Decrypt customer data in invoices for admin viewing (GDPR compliance)
      const decryptedInvoices = (data || []).map(invoice => {
        if (invoice.customer) {
          return {
            ...invoice,
            customer: decryptCustomersArrayForAdmin([invoice.customer])[0]
          };
        }
        return invoice;
      });
      
      setAllInvoices(decryptedInvoices);
    } catch (error) {
      console.error('❌ Exception in fetchAllInvoices:', error);
      showError('Connection Error', 'Unable to fetch invoice data. Please check your internet connection and try again.');
      setAllInvoices([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch services from database
  const fetchAllServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching services:', error);
      } else {
        // Transform database format to component format for Services tab
        const transformedServices: PackageType[] = (data || []).map(service => ({
          id: service.id,
          name: service.name,
          category: service.category,
          price: service.price,
          inHourPrice: service.in_hour_price,
          outOfHourPrice: service.out_of_hour_price,
          features: service.features || [],
          description: service.description,
          isActive: service.is_active,
          created_at: service.created_at,
          updated_at: service.updated_at
        }));
        
        // Transform for Invoice Management (Service format)
        const servicesForInvoice: Service[] = (data || []).map(service => ({
          id: service.id!,
          name: service.name,
          category: service.category,
          price: service.price,
          in_hour_price: service.in_hour_price,
          out_of_hour_price: service.out_of_hour_price,
          features: service.features || [],
          description: service.description,
          is_active: service.is_active,
          created_at: service.created_at,
          updated_at: service.updated_at
        }));
        
        setPackages(transformedServices);
        setAllServices(servicesForInvoice);
      }
    } catch (error) {
      console.error('Exception in fetchAllServices:', error);
    }
  };

  // Fetch all payment-related data
  const fetchAllPaymentData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch payment data in parallel for better performance
      const [
        paymentRequestsData,
        paymentsData,
        recentPaymentsData,
        gatewaysData,
        statisticsData
      ] = await Promise.all([
        getAllPaymentRequests(),
        getAllPayments(),
        getRecentPayments(5),
        getAllPaymentGateways(),
        getPaymentStatistics()
      ]);
      
      setAllPaymentRequests(paymentRequestsData || []);
      setAllPayments(paymentsData || []);
      setAllRecentPayments(recentPaymentsData || []);
      setAllPaymentGateways(gatewaysData || []);
      setPaymentStatistics(statisticsData);
      
    } catch (error) {
      console.error('❌ Error fetching payment data:', error);
      showError('Payment Data Error', 'Failed to load payment data. Some features may not be available.');
    } finally {
      setIsLoading(false);
    }
  };

  // Login form
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Portal</h1>
            <p className="text-gray-600 mt-2">KH Therapy Management System</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 text-gray-400 absolute left-3 top-3" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                  placeholder="admin@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="w-5 h-5 text-gray-400 absolute left-3 top-3">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                  placeholder="Enter your password"
                  required
                />
              </div>
            </div>

            {loginError && (
              <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                <span className="text-sm text-red-700">{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            <p>Secure access to your clinic management system</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Session Timeout Warning Modal */}
      {showWarning && (
        <SessionTimeoutWarning
          remainingTime={remainingTime}
          onExtendSession={extendSession}
          onLogout={handleLogout}
        />
      )}
      
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center mr-3">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-lg sm:text-xl font-semibold text-gray-900">KH Therapy Admin</h1>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <button
                onClick={() => handleManualRefresh()}
                disabled={isLoading}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Refresh Data"
              >
                <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setActiveTab('help')}
                className={`p-2 rounded-lg transition-colors ${
                  activeTab === 'help' 
                    ? 'text-primary-600 bg-primary-50' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
                title="Help & Documentation"
              >
                <HelpCircle className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowPasswordModal(true)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Change Password"
              >
                <Settings className="w-5 h-5" />
              </button>
              <button
                onClick={handleLogout}
                className="hidden sm:flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </button>
              <button
                onClick={handleLogout}
                className="sm:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Mobile Navigation - Horizontal Scrolling */}
          <div className="block md:hidden">
            <div className="flex space-x-1 overflow-x-auto scrollbar-hide pb-2 pt-2">
              {[
                { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
                { id: 'bookings', label: 'Bookings', icon: Calendar },
                { id: 'package', label: 'Services', icon: Package },
                { id: 'availability', label: 'Availability', icon: Clock },
                { id: 'customers', label: 'Customers', icon: Users },
                { id: 'invoices', label: 'Invoices', icon: FileText },
                { id: 'payments', label: 'Payments', icon: CreditCard },
                { id: 'reports', label: 'Reports', icon: TrendingUp },
                { id: 'help', label: 'Help', icon: HelpCircle }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as 'dashboard' | 'bookings' | 'package' | 'availability' | 'customers' | 'invoices' | 'reports' | 'payments' | 'help')}
                  className={`flex items-center px-3 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <tab.icon className="w-4 h-4 mr-1" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Desktop Navigation - Standard Tabs */}
          <div className="hidden md:flex space-x-8">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
              { id: 'bookings', label: 'Bookings', icon: Calendar },
              { id: 'package', label: 'Services', icon: Package },
              { id: 'availability', label: 'Availability', icon: Clock },
              { id: 'customers', label: 'Customers', icon: Users },
              { id: 'invoices', label: 'Invoices', icon: FileText },
              { id: 'payments', label: 'Payments', icon: CreditCard },
              { id: 'reports', label: 'Reports', icon: TrendingUp },
              { id: 'help', label: 'Help', icon: HelpCircle }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'dashboard' | 'bookings' | 'package' | 'availability' | 'customers' | 'invoices' | 'reports' | 'payments' | 'help')}
                className={`flex items-center px-3 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Loading overlay for tab switches */}
        {isLoading && (
          <div className="fixed inset-0 bg-black bg-opacity-10 flex items-center justify-center z-40">
            <div className="bg-white rounded-lg p-4 shadow-lg">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="text-gray-700">Processing...</span>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'dashboard' && (
          <Dashboard
            allBookings={allBookings}
            packages={packages}
            setActiveTab={handleTabChange}
            setFilterDate={setFilterDate}
            setFilterRange={setFilterRange}
          />
        )}
        {activeTab === 'package' && (
          <Services
            packages={packages}
            setPackages={setPackages}
            newPackage={newPackage}
            setNewPackage={setNewPackage}
            editIndex={editIndex}
            setEditIndex={setEditIndex}
            editPackage={editPackage}
            setEditPackage={setEditPackage}
          />
        )}
        {activeTab === 'bookings' && (
          <Bookings
            allBookings={allBookings}
            setAllBookings={setAllBookings}
            filterDate={filterDate}
            setFilterDate={setFilterDate}
            filterRange={filterRange}
            setFilterRange={setFilterRange}
            onRefresh={() => handleManualRefresh('bookings')}
          />
        )}
        {activeTab === 'availability' && (
          <Availability />
        )}
        {activeTab === 'customers' && (
          <CustomerManagement 
            customers={allCustomers}
            setCustomers={setAllCustomers}
            onRefresh={(silent) => handleManualRefresh('customers', silent)}
          />
        )}
        {activeTab === 'invoices' && (
          <InvoiceManagement 
            invoices={allInvoices}
            setInvoices={setAllInvoices}
            customers={allCustomers}
            services={allServices}
            onRefresh={() => handleManualRefresh('invoices')}
          />
        )}
        {activeTab === 'payments' && (
          <PaymentManagement 
            paymentRequests={allPaymentRequests}
            payments={allPayments}
            recentPayments={allRecentPayments}
            gateways={allPaymentGateways}
            statistics={paymentStatistics}
            onRefresh={() => handleManualRefresh('payments')}
          />
        )}
        {activeTab === 'reports' && (
          <Reports allBookings={allBookings} />
        )}
        {activeTab === 'help' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Help & Documentation</h2>
              <p className="text-gray-600 mt-1">Complete guide to using the KH Therapy Admin Console</p>
            </div>

            {/* Quick Navigation */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Navigation</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { id: 'dashboard', label: 'Dashboard', icon: BarChart3, description: 'Overview & statistics' },
                  { id: 'bookings', label: 'Bookings', icon: Calendar, description: 'Manage appointments' },
                  { id: 'package', label: 'Services', icon: Package, description: 'Therapy services' },
                  { id: 'availability', label: 'Availability', icon: Clock, description: 'Schedule management' },
                  { id: 'customers', label: 'Customers', icon: Users, description: 'Client information' },
                  { id: 'invoices', label: 'Invoices', icon: FileText, description: 'Billing & invoices' },
                  { id: 'payments', label: 'Payments', icon: CreditCard, description: 'Payment tracking' },
                  { id: 'reports', label: 'Reports', icon: TrendingUp, description: 'Analytics & reports' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as 'dashboard' | 'package' | 'bookings' | 'availability' | 'customers' | 'invoices' | 'reports' | 'payments' | 'help')}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left transition-colors group"
                  >
                    <div className="flex items-center mb-2">
                      <tab.icon className="w-5 h-5 text-primary-600 mr-2" />
                      <span className="font-medium text-gray-900 group-hover:text-primary-600">{tab.label}</span>
                    </div>
                    <p className="text-sm text-gray-600">{tab.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Development & Testing Tools */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <CreditCard className="w-5 h-5 text-amber-600 mr-2" />
                Development & Testing Tools
              </h3>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">SumUp Payment Integration</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    SumUp payment integration is now active with real API.
                  </p>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-green-700 text-sm">
                      ✅ SumUp API integration active and ready for production payments
                    </p>
                  </div>
                </div>
                <div className="text-xs text-green-700 bg-green-100 rounded p-3">
                  <strong>Active Configuration:</strong> Using SumUp App ID ({import.meta.env.VITE_SUMUP_APP_ID?.substring(0, 20)}...) 
                  and Merchant Code ({import.meta.env.VITE_SUMUP_MERCHANT_CODE}) in {import.meta.env.VITE_SUMUP_ENVIRONMENT} mode.
                </div>
              </div>
            </div>

            {/* Feature Overview */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Feature Overview</h3>
              <div className="space-y-6">
                
                {/* Dashboard */}
                <div className="border-l-4 border-blue-500 pl-4">
                  <div className="flex items-center mb-2">
                    <BarChart3 className="w-5 h-5 text-blue-600 mr-2" />
                    <h4 className="font-semibold text-gray-900">Dashboard</h4>
                  </div>
                  <p className="text-gray-600 mb-2">Get a quick overview of your clinic's current status and activity.</p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• View today's, weekly, and monthly booking statistics</li>
                    <li>• Review recent bookings and customer activity</li>
                    <li>• Quick access to key metrics with clickable stat cards</li>
                  </ul>
                </div>

                {/* Bookings */}
                <div className="border-l-4 border-green-500 pl-4">
                  <div className="flex items-center mb-2">
                    <Calendar className="w-5 h-5 text-green-600 mr-2" />
                    <h4 className="font-semibold text-gray-900">Bookings</h4>
                  </div>
                  <p className="text-gray-600 mb-2">Manage all customer appointments and bookings.</p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Switch between list and calendar views</li>
                    <li>• Confirm, cancel, or modify booking status</li>
                    <li>• Search and filter by customer, date, status, or service</li>
                    <li>• View encrypted customer details (automatically decrypted for admin)</li>
                  </ul>
                </div>

                {/* Services */}
                <div className="border-l-4 border-purple-500 pl-4">
                  <div className="flex items-center mb-2">
                    <Package className="w-5 h-5 text-purple-600 mr-2" />
                    <h4 className="font-semibold text-gray-900">Services</h4>
                  </div>
                  <p className="text-gray-600 mb-2">Manage therapy services, packages, and pricing.</p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Add, edit, and configure therapy services</li>
                    <li>• Manage pricing and service details</li>
                    <li>• Configure time slots for each service</li>
                    <li>• Bulk operations for efficient setup</li>
                  </ul>
                </div>

                {/* Availability */}
                <div className="border-l-4 border-yellow-500 pl-4">
                  <div className="flex items-center mb-2">
                    <Clock className="w-5 h-5 text-yellow-600 mr-2" />
                    <h4 className="font-semibold text-gray-900">Availability</h4>
                  </div>
                  <p className="text-gray-600 mb-2">Manage clinic availability and view booking conflicts.</p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Create and manage availability time slots</li>
                    <li>• Visual calendar showing available vs. booked times</li>
                    <li>• Identify scheduling conflicts or overbooking</li>
                    <li>• Multiple calendar views (month, week, day)</li>
                  </ul>
                </div>

                {/* Customers */}
                <div className="border-l-4 border-indigo-500 pl-4">
                  <div className="flex items-center mb-2">
                    <Users className="w-5 h-5 text-indigo-600 mr-2" />
                    <h4 className="font-semibold text-gray-900">Customers</h4>
                  </div>
                  <p className="text-gray-600 mb-2">Manage customer information and records with GDPR compliance.</p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Secure, encrypted customer database</li>
                    <li>• Search and filter customer records</li>
                    <li>• Complete contact and medical information</li>
                    <li>• GDPR-compliant data handling with audit logging</li>
                  </ul>
                </div>

                {/* Invoices */}
                <div className="border-l-4 border-red-500 pl-4">
                  <div className="flex items-center mb-2">
                    <FileText className="w-5 h-5 text-red-600 mr-2" />
                    <h4 className="font-semibold text-gray-900">Invoices</h4>
                  </div>
                  <p className="text-gray-600 mb-2">Create, manage, and track customer invoices.</p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Generate invoices from confirmed bookings</li>
                    <li>• PDF generation and email sending</li>
                    <li>• Track payment status and due dates</li>
                    <li>• Customer deposit tracking and balance management</li>
                  </ul>
                </div>

                {/* Payments */}
                <div className="border-l-4 border-teal-500 pl-4">
                  <div className="flex items-center mb-2">
                    <CreditCard className="w-5 h-5 text-teal-600 mr-2" />
                    <h4 className="font-semibold text-gray-900">Payments</h4>
                  </div>
                  <p className="text-gray-600 mb-2">Monitor payment requests, transactions, and financial data.</p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Create and track payment requests</li>
                    <li>• Monitor payment status and due dates</li>
                    <li>• Payment gateway management</li>
                    <li>• Financial overview and transaction history</li>
                  </ul>
                </div>

                {/* Reports */}
                <div className="border-l-4 border-orange-500 pl-4">
                  <div className="flex items-center mb-2">
                    <TrendingUp className="w-5 h-5 text-orange-600 mr-2" />
                    <h4 className="font-semibold text-gray-900">Reports</h4>
                  </div>
                  <p className="text-gray-600 mb-2">Generate detailed analytics and reports for business insights.</p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Booking and financial analytics</li>
                    <li>• Service breakdown and trend analysis</li>
                    <li>• Export to Excel and PDF formats</li>
                    <li>• Custom date range reporting</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Common Workflows */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Common Workflows</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Daily Tasks</h4>
                  <ol className="text-sm text-gray-600 space-y-2">
                    <li>1. Check Dashboard for today's activity</li>
                    <li>2. Review Bookings for today's appointments</li>
                    <li>3. Monitor Payments for overdue requests</li>
                    <li>4. Handle customer inquiries using Customers tab</li>
                  </ol>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Weekly Management</h4>
                  <ol className="text-sm text-gray-600 space-y-2">
                    <li>1. Review Availability for upcoming week</li>
                    <li>2. Create and send Invoices for completed services</li>
                    <li>3. Reconcile Payments and follow up on outstanding</li>
                    <li>4. Update Services or time slots as needed</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Security & Data Protection */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <AlertCircle className="w-5 h-5 text-blue-600 mr-2" />
                Security & Data Protection
              </h3>
              <div className="space-y-3 text-sm text-gray-700">
                <p><strong>GDPR Compliance:</strong> All customer personal data is encrypted in the database and automatically decrypted for admin viewing.</p>
                <p><strong>Audit Logging:</strong> Admin access to customer data is logged for compliance and security auditing.</p>
                <p><strong>Best Practices:</strong> Change your password regularly, log out when finished, and verify customer identity before accessing records.</p>
              </div>
            </div>

            {/* Quick Tips */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Tips</h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-700">
                <div>
                  <h4 className="font-medium mb-2">Navigation</h4>
                  <ul className="space-y-1">
                    <li>• Use the refresh button (↻) to reload data</li>
                    <li>• Click stat cards in Dashboard for quick filtering</li>
                    <li>• Switch between list and calendar views in Bookings</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Efficiency</h4>
                  <ul className="space-y-1">
                    <li>• Use search and filters to find records quickly</li>
                    <li>• Create bulk time slots for multiple services</li>
                    <li>• Export reports for external analysis</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Change Password</h3>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleChangePassword} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter new password"
                  required
                />
              </div>
              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="flex-1 bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                >
                  {isChangingPassword ? 'Updating...' : 'Update Password'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminConsole;
