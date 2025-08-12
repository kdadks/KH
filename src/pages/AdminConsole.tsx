import React, { useState, useEffect } from 'react';
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
  Users
} from 'lucide-react';
import { Dashboard } from '../components/admin/Dashboard';
import { Services } from '../components/admin/Services';
import { Bookings } from '../components/admin/Bookings';
import { Availability } from '../components/admin/Availability';
import { Reports } from '../components/admin/Reports';
import InvoiceManagement from '../components/admin/InvoiceManagement';
import CustomerManagement from '../components/admin/CustomerManagement';
import { BookingFormData, Package as PackageType } from '../components/admin/types';
import { getBookingsWithCustomers } from '../utils/customerBookingUtils';
import { useToast } from '../components/shared/toastContext';

const AdminConsole = () => {
  const { showError } = useToast();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  // State management
  const [activeTab, setActiveTab] = useState<'dashboard' | 'package' | 'bookings' | 'availability' | 'customers' | 'invoices' | 'reports'>('dashboard');
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
  const [filterDate, setFilterDate] = useState('');
  const [filterRange, setFilterRange] = useState<{start: string; end: string} | null>(null);

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

  // Logout handler
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsLoggedIn(false);
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as 'dashboard' | 'package' | 'bookings' | 'availability' | 'reports' | 'invoices');
  };

  // Change password handler
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim()) return;
    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword.trim() });
      if (error) {
        alert(`Password change failed: ${error.message}`);
      } else {
        alert('Password updated successfully.');
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
    }
  }, [isLoggedIn]);

  // Also fetch data when the active tab changes to ensure fresh data
  useEffect(() => {
    if (isLoggedIn && (activeTab === 'dashboard' || activeTab === 'bookings' || activeTab === 'invoices')) {
      if (allBookings.length === 0) {
        fetchAllBookings();
      }
    }
    if (isLoggedIn && (activeTab === 'dashboard' || activeTab === 'package')) {
      if (packages.length === 0) {
        fetchAllServices();
      }
    }
  }, [activeTab, isLoggedIn, allBookings.length, packages.length]);

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
        await Promise.all([fetchAllBookings(), fetchAllServices()]);
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
      console.log('🔍 Testing Supabase connection...');
      
      // First, test a simple query to see if Supabase is accessible
      const { data: testData, error: testError } = await supabase
        .from('bookings')
        .select('id, package_name')
        .limit(1);
      
      if (testError) {
        console.error('❌ Simple Supabase test failed:', testError);
        showError('Database Connection Error', 'Could not connect to database. Please check your connection.');
        return;
      }
      
      console.log('✅ Simple Supabase test successful:', testData);
      
      // Now try the customer join query
      console.log('🔍 Fetching bookings with customer join...');
      const { bookings: bookingsWithCustomers, error: customerError } = await getBookingsWithCustomers();
      
      if (!customerError && bookingsWithCustomers) {
        console.log('✅ Raw bookings from Supabase:', bookingsWithCustomers);
        
        // Transform the data to include customer details while maintaining backward compatibility
        const transformedBookings = bookingsWithCustomers.map((booking: any) => {
          console.log('📝 Processing booking:', booking.id);
          console.log('👤 Customer data:', booking.customers);
          
          const transformed = {
            ...booking,
            // If customer relationship exists, use it, otherwise fall back to direct fields
            customer_name: booking.customers?.first_name && booking.customers?.last_name 
              ? `${booking.customers.first_name} ${booking.customers.last_name}`
              : booking.customer_name,
            customer_email: booking.customers?.email || booking.customer_email,
            customer_phone: booking.customers?.phone || booking.customer_phone,
            // Keep the customer object for potential future use
            customer_details: booking.customers
          };
          
          console.log('🔄 Transformed booking:', {
            id: transformed.id,
            customer_name: transformed.customer_name,
            customer_email: transformed.customer_email,
            customer_phone: transformed.customer_phone,
            customer_details: transformed.customer_details
          });
          
          return transformed;
        });
        
        console.log('✨ Final transformed bookings:', transformedBookings);
        setAllBookings(transformedBookings);
        return;
      }
      
      // Fallback to the old method if customer integration fails
      console.warn('❌ Customer integration failed, using fallback method:', customerError);
      
      // Try the simple fallback method
      console.log('🔍 Trying fallback: simple bookings fetch...');
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (fallbackError) {
        console.error('❌ Fallback method also failed:', fallbackError);
        showError('Database Error', 'Cannot fetch bookings data. Please check your connection and try again.');
        return;
      } else {
        console.log('✅ Fallback successful, got bookings:', fallbackData);
        setAllBookings(fallbackData || []);
      }
    } catch (error) {
      console.error('❌ Exception in fetchAllBookings:', error);
      
      // Show user-friendly error
      showError('Connection Error', 'Unable to fetch booking data. Please check your internet connection and try again.');
      
      // Fallback to empty array to prevent UI crashes
      setAllBookings([]);
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
        // Transform database format to component format
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
        
        setPackages(transformedServices);
      }
    } catch (error) {
      console.error('Exception in fetchAllServices:', error);
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
                  placeholder="admin@khtherapy.ie"
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
          <div className="flex space-x-8">
      {[
              { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
              { id: 'bookings', label: 'Bookings', icon: Calendar },
              { id: 'package', label: 'Services', icon: Package },
              { id: 'availability', label: 'Availability', icon: Clock },
              { id: 'customers', label: 'Customers', icon: Users },
              { id: 'invoices', label: 'Invoices', icon: FileText },
              { id: 'reports', label: 'Reports', icon: TrendingUp }
            ].map(tab => (
              <button
                key={tab.id}
        onClick={() => setActiveTab(tab.id as 'dashboard' | 'bookings' | 'package' | 'availability' | 'customers' | 'invoices' | 'reports')}
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
          />
        )}
        {activeTab === 'availability' && (
          <Availability />
        )}
        {activeTab === 'customers' && (
          <CustomerManagement />
        )}
        {activeTab === 'invoices' && (
          <InvoiceManagement />
        )}
        {activeTab === 'reports' && (
          <Reports allBookings={allBookings} />
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
