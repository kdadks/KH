import React, { useState, useEffect } from 'react';
import { useUserAuth } from '../contexts/UserAuthContext';
import { getUserDashboardData } from '../utils/userManagementUtils';
import { UserDashboardData, UserPortalTab } from '../types/userManagement';
import { useToast } from './shared/toastContext';

// Import user portal components
import UserLogin from './user/UserLogin';
import UserDashboard from './user/UserDashboard';
import UserProfile from './user/UserProfile';
import UserInvoices from './user/UserInvoices';
import UserPayments from './user/UserPayments';
import UserBookings from './user/UserBookings';
import FirstLoginPasswordChange from './user/FirstLoginPasswordChange';
import { 
  User, 
  FileText, 
  CreditCard, 
  Calendar, 
  LogOut,
  Home
} from 'lucide-react';

const UserPortal: React.FC = () => {
  const { user, authUser, loading: authLoading, logout } = useUserAuth();
  const { showSuccess, showError } = useToast();
  const [activeTab, setActiveTab] = useState<UserPortalTab>('dashboard');
  const [dashboardData, setDashboardData] = useState<UserDashboardData | null>(null);
  const [loading, setLoading] = useState(false);

  // Load dashboard data when user logs in
  useEffect(() => {
    if (user?.id) {
      loadDashboardData();
    }
  }, [user]);

  useEffect(() => {
  }, [user, authUser, authLoading]);

  // Listen for navigation events from child components
  useEffect(() => {
    const handleNavigateToInvoices = () => {
      setActiveTab('invoices');
    };

    window.addEventListener('navigateToInvoices', handleNavigateToInvoices as EventListener);
    
    return () => {
      window.removeEventListener('navigateToInvoices', handleNavigateToInvoices as EventListener);
    };
  }, []);

  const loadDashboardData = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const { data, error } = await getUserDashboardData(user.id.toString());
      
      if (error) {
        showError('Error', `Failed to load dashboard: ${error}`);
      } else {
        setDashboardData(data);
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
      showError('Error', 'Unexpected error loading dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      showSuccess('Logged Out', 'You have been successfully logged out.');
    } catch (error) {
      console.error('Logout error:', error);
      showError('Error', 'Failed to logout properly');
    }
  };

  const handleTabChange = (tab: UserPortalTab) => {
    setActiveTab(tab);
    
    // Refresh dashboard data when returning to dashboard
    if (tab === 'dashboard' && user?.id) {
      loadDashboardData();
    }
  };

  // Show login page if user is not authenticated
  // With custom authentication, we only need to check the user (customer record)
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <UserLogin />
      </div>
    );
  }

  // Show loading spinner during authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your account...</p>
        </div>
      </div>
    );
  }

  // Check if user needs to change password on first login
  if (user?.must_change_password) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <FirstLoginPasswordChange 
          onPasswordChanged={() => {
            // Refresh user data after password change
            window.location.reload(); // Simple reload to refresh all auth state
          }}
        />
      </div>
    );
  }

  const navigation = [
    { id: 'dashboard' as UserPortalTab, name: 'Dashboard', icon: Home, description: 'Overview of your account' },
    { id: 'profile' as UserPortalTab, name: 'Profile', icon: User, description: 'Update your personal information' },
    { id: 'invoices' as UserPortalTab, name: 'Invoices', icon: FileText, description: 'View your invoices and bills' },
    { id: 'payments' as UserPortalTab, name: 'Payments', icon: CreditCard, description: 'Payment history and outstanding amounts' },
    { id: 'bookings' as UserPortalTab, name: 'Bookings', icon: Calendar, description: 'Your appointments and bookings' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and title */}
            <div className="flex items-center">
              <img 
                src="/Logo.png" 
                alt="KH Therapy" 
                className="h-8 w-8 mr-3"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  KH Therapy Portal
                </h1>
                <p className="text-sm text-gray-500">
                  Welcome back, {user?.first_name || 'User'}!
                </p>
              </div>
            </div>

            {/* User menu */}
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {user?.first_name || ''} {user?.last_name || ''}
                </p>
                <p className="text-sm text-gray-500">{user?.email || authUser?.email || ''}</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center px-3 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4 mr-1" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <aside className="lg:w-64 flex-shrink-0">
            <nav className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <ul className="space-y-2">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  
                  return (
                    <li key={item.id}>
                      <button
                        onClick={() => handleTabChange(item.id)}
                        className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                          isActive
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                        }`}
                      >
                        <Icon className="w-5 h-5 mr-3 flex-shrink-0" />
                        <div className="text-left">
                          <div>{item.name}</div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {item.description}
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>

              {/* Quick stats in sidebar */}
              {dashboardData && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    Quick Stats
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Outstanding:</span>
                      <span className="font-medium text-red-600">
                        €{dashboardData.stats.totalOutstanding.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Overdue:</span>
                      <span className="font-medium text-red-600">
                        {dashboardData.stats.overdueCount}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Paid:</span>
                      <span className="font-medium text-green-600">
                        €{dashboardData.stats.totalPaid.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 min-h-[600px]">
              {loading && (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              )}

              {!loading && (
                <>
                  {activeTab === 'dashboard' && (
                    <UserDashboard 
                      data={dashboardData} 
                      onRefresh={loadDashboardData}
                      onTabChange={handleTabChange}
                    />
                  )}
                  {activeTab === 'profile' && <UserProfile />}
                  {activeTab === 'invoices' && <UserInvoices />}
                  {activeTab === 'payments' && <UserPayments onDataChange={loadDashboardData} />}
                  {activeTab === 'bookings' && <UserBookings />}
                </>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default UserPortal;
