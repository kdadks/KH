import React, { useState, useEffect } from 'react';
import { treatmentPackages } from '../data/packages';
import { supabase } from '../supabaseClient';
import { 
  Calendar, 
  Users, 
  Package, 
  Clock, 
  BarChart3, 
  Settings, 
  LogOut, 
  Plus, 
  Edit, 
  Trash2, 
  Check, 
  X, 
  Search, 
  Mail, 
  Phone, 
  User,
  CheckCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

type Package = {
  name: string;
  price: string;
  features: string[];
};

type BookingFormData = {
  name: string;
  email: string;
  phone: string;
  service: string;
  date: string;
  time: string;
  notes: string;
  status?: string;
};



const AdminConsole: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changePasswordMsg, setChangePasswordMsg] = useState('');
  const [packages, setPackages] = useState<Package[]>(treatmentPackages);
  const [newPackage, setNewPackage] = useState<Package>({ name: '', price: '', features: [''] });
  const [activeTab, setActiveTab] = useState<'dashboard' | 'package' | 'bookings' | 'availability'>('dashboard');
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editPackage, setEditPackage] = useState<Package | null>(null);
  // bookings state removed; allBookings is the single source of truth
  const [allBookings, setAllBookings] = useState<BookingFormData[]>([]);
  const [filterDate, setFilterDate] = useState('');
  const [filterRange, setFilterRange] = useState<{start: string; end: string} | null>(null);
  const [availability, setAvailability] = useState<{ id?: number; date: string; start: string; end_time: string }[]>([]);
  const [newAvailability, setNewAvailability] = useState<{ date: string; start: string; end_time: string }>({ date: '', start: '', end_time: '' });
  const [availabilityError, setAvailabilityError] = useState<string>('');
  const [confirmedBookings, setConfirmedBookings] = useState<number[]>([]);
  
  // Date/Time selection modal state
  const [showDateTimeModal, setShowDateTimeModal] = useState(false);
  const [selectedBookingForDateTime, setSelectedBookingForDateTime] = useState<{ booking: BookingFormData; idx: number } | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [dateTimeError, setDateTimeError] = useState('');

  // Enhanced UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'confirmed' | 'cancelled'>('all');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Login handler using Supabase Auth
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
        setLoginError(error.message);
      } else if (data.user) {
        setIsLoggedIn(true);
        setLoginError('');
      } else {
        setLoginError('Login failed.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Change password handler
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePasswordMsg('');
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setChangePasswordMsg('Failed to change password: ' + error.message);
    } else {
      setChangePasswordMsg('Password changed successfully!');
      setShowPasswordModal(false);
      setNewPassword('');
    }
  };

  // Package management handlers
  const handleAdd = () => {
    setPackages([...packages, { ...newPackage, features: newPackage.features.filter(f => f) }]);
    setNewPackage({ name: '', price: '', features: [''] });
  };

  const handleDelete = (index: number) => {
    setPackages(packages.filter((_, i) => i !== index));
  };

  const handleFeatureChange = (idx: number, value: string) => {
    const features = [...newPackage.features];
    features[idx] = value;
    setNewPackage({ ...newPackage, features });
  };

  const addFeatureField = () => {
    setNewPackage({ ...newPackage, features: [...newPackage.features, ''] });
  };

  // Edit handlers
  const handleEdit = (index: number) => {
    setEditIndex(index);
    setEditPackage({ ...packages[index] });
  };

  const handleEditChange = (field: keyof Package, value: string) => {
    if (!editPackage) return;
    setEditPackage({ ...editPackage, [field]: value });
  };

  const handleEditFeatureChange = (idx: number, value: string) => {
    if (!editPackage) return;
    const features = [...editPackage.features];
    features[idx] = value;
    setEditPackage({ ...editPackage, features });
  };

  const addEditFeatureField = () => {
    if (!editPackage) return;
    setEditPackage({ ...editPackage, features: [...editPackage.features, ''] });
  };

  const handleSaveEdit = () => {
    if (editIndex === null || !editPackage) return;
    const updated = [...packages];
    updated[editIndex] = { ...editPackage, features: editPackage.features.filter(f => f) };
    setPackages(updated);
    setEditIndex(null);
    setEditPackage(null);
  };

  const handleCancelEdit = () => {
    setEditIndex(null);
    setEditPackage(null);
  };

  // Load all bookings on login for dashboard metrics

  // Fetch all bookings after login for dashboard metrics
  useEffect(() => {
    const fetchAllBookings = async () => {
      if (isLoggedIn) {
        const { data } = await supabase.from('bookings').select('*').order('booking_date', { ascending: false });
        if (data) {
          const mapped = data.map((b: any) => ({
            name: b.customer_name,
            email: b.customer_email,
            phone: b.customer_phone,
            service: b.package_name,
            date: b.booking_date ? b.booking_date.split('T')[0] : '',
            time: b.booking_date && b.booking_date.includes('T') ? b.booking_date.split('T')[1].slice(0,5) : '',
            notes: b.notes || '',
            status: b.status || 'pending',
          }));
          setAllBookings(mapped);
        } else {
          setAllBookings([]);
        }
      }
    };
    fetchAllBookings();
  }, [isLoggedIn]);

  // bookings tab fetch effect removed; allBookings is always used

  // Fetch availability blocks from Supabase
  useEffect(() => {
    const fetchAvailability = async () => {
      const { data } = await supabase.from('availability').select('*').order('date', { ascending: true });
      if (data) {
        setAvailability(data);
      } else {
        setAvailability([]);
      }
    };
    if (isLoggedIn && activeTab === 'availability') {
      fetchAvailability();
    }
  }, [isLoggedIn, activeTab]);

  // Dashboard metrics (use allBookings for accurate counts)
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const month = today.getMonth();
  const year = today.getFullYear();
  const monthStart = new Date(year, month, 1).toISOString().split('T')[0];
  const monthEnd = new Date(year, month + 1, 0).toISOString().split('T')[0];

  // Always filter from allBookings for correct results
  const filteredBookings = (() => {
    if (filterRange) {
      // If the filterRange matches the current month, filter by month and year
      const isCurrentMonth = filterRange.start === monthStart && filterRange.end === monthEnd;
      if (isCurrentMonth) {
        return allBookings.filter(b => {
          const d = new Date(b.date);
          return d.getMonth() === month && d.getFullYear() === year;
        });
      } else {
        return allBookings.filter(b => b.date >= filterRange.start && b.date <= filterRange.end);
      }
    } else if (filterDate) {
      return allBookings.filter(b => b.date === filterDate);
    } else {
      return allBookings;
    }
  })();

  const bookingsToday = allBookings.filter(b => b.date === todayStr).length;
  const dayOfWeek = today.getDay();
  const diffToMonday = (dayOfWeek + 6) % 7;
  const monday = new Date(today);
  monday.setDate(today.getDate() - diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const bookingsThisWeek = allBookings.filter(b => {
    const d = new Date(b.date);
    return d >= monday && d <= sunday;
  }).length;
  const bookingsThisMonth = allBookings.filter(b => {
    const d = new Date(b.date);
    return d.getMonth() === month && d.getFullYear() === year;
  }).length;
  // compute string ranges for drill-down filtering
  const mondayStr = monday.toISOString().split('T')[0];
  const sundayStr = sunday.toISOString().split('T')[0];

  const handleConfirmBooking = async (booking: BookingFormData, idx: number) => {
    // Check if booking has no date/time (NULL booking_date)
    if (!booking.date && !booking.time) {
      // Show modal to select date/time
      setSelectedBookingForDateTime({ booking, idx });
      setShowDateTimeModal(true);
      setSelectedDate('');
      setSelectedTime('');
      setDateTimeError('');
      return;
    }

    // Proceed with normal confirmation if date/time exists
    await confirmBookingWithDateTime(booking, idx, booking.date, booking.time);
  };

  const confirmBookingWithDateTime = async (booking: BookingFormData, idx: number, date: string, time: string) => {
    // 1. Update booking status and date/time in the database
    const { data: dbBookings } = await supabase
      .from('bookings')
      .select('*')
      .eq('customer_name', booking.name)
      .eq('customer_email', booking.email)
      .eq('package_name', booking.service);

    if (dbBookings && dbBookings.length > 0) {
      const bookingId = dbBookings[0].id;
      
      // Prepare update data
      const updateData: any = { status: 'confirmed' };
      
      // If we have date/time, update booking_date as well
      if (date && time) {
        updateData.booking_date = `${date}T${time}:00`;
      }

      const { error } = await supabase.from('bookings').update(updateData).eq('id', bookingId);
      
      if (!error) {
        // 2. Refresh bookings list to show updated data
        const { data: refreshedData } = await supabase.from('bookings').select('*').order('booking_date', { ascending: false });
        if (refreshedData) {
          const mapped = refreshedData.map((b: any) => ({
            name: b.customer_name,
            email: b.customer_email,
            phone: b.customer_phone,
            service: b.package_name,
            date: b.booking_date ? b.booking_date.split('T')[0] : '',
            time: b.booking_date && b.booking_date.includes('T') ? b.booking_date.split('T')[1].slice(0,5) : '',
            notes: b.notes || '',
            status: b.status || 'pending',
          }));
          setAllBookings(mapped);
        }

        // 3. Fetch the latest booking details from the database
        const { data: latestBooking } = await supabase
          .from('bookings')
          .select('*')
          .eq('id', bookingId)
          .single();

        // 4. Call backend API to send calendar invite email
        if (latestBooking) {
          try {
            await fetch('/api/send-calendar-invite', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                to: latestBooking.customer_email,
                booking: latestBooking
              })
            });
          } catch (err) {
            // Optionally handle error
          }
        }
      }
    }

    setConfirmedBookings([...confirmedBookings, idx]);
    alert('Booking confirmed! Calendar invite will be sent.');
  };

  const handleDateTimeSubmit = async () => {
    if (!selectedBookingForDateTime) return;
    
    setDateTimeError('');
    
    // Validate date and time
    if (!selectedDate || !selectedTime) {
      setDateTimeError('Please select both date and time.');
      return;
    }

    // Confirm booking with selected date/time
    await confirmBookingWithDateTime(
      selectedBookingForDateTime.booking,
      selectedBookingForDateTime.idx,
      selectedDate,
      selectedTime
    );

    // Close modal
    setShowDateTimeModal(false);
    setSelectedBookingForDateTime(null);
    setSelectedDate('');
    setSelectedTime('');
  };

  const handleCancelDateTime = () => {
    setShowDateTimeModal(false);
    setSelectedBookingForDateTime(null);
    setSelectedDate('');
    setSelectedTime('');
    setDateTimeError('');
  };

  const handleAddAvailability = async () => {
    setAvailabilityError('');
    if (newAvailability.date && newAvailability.start && newAvailability.end_time && newAvailability.start < newAvailability.end_time) {
      const { error } = await supabase.from('availability').insert([
        {
          date: newAvailability.date,
          start: newAvailability.start,
          end_time: newAvailability.end_time
        }
      ]);
      if (error) {
        setAvailabilityError('Failed to add availability: ' + error.message);
      } else {
        // Refetch availability blocks
        const { data } = await supabase.from('availability').select('*').order('date', { ascending: true });
        setAvailability(data || []);
        setNewAvailability({ date: '', start: '', end_time: '' });
      }
    } else {
      setAvailabilityError('Please enter a valid date and time range.');
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
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
                  <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                  Signing In...
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
              <h1 className="text-xl font-semibold text-gray-900">KH Therapy Admin</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowPasswordModal(true)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                title="Change Password"
              >
                <Settings className="w-5 h-5" />
              </button>
              <button
                onClick={() => setIsLoggedIn(false)}
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
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
              { id: 'availability', label: 'Availability', icon: Clock }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && <DashboardView />}
        {activeTab === 'bookings' && <BookingsView />}
        {activeTab === 'package' && <ServicesView />}
        {activeTab === 'availability' && <AvailabilityView />}
      </main>

      {/* Modals */}
      {showPasswordModal && <PasswordChangeModal />}
      {showDateTimeModal && <DateTimeModal />}
    </div>
  );

  // Dashboard Component
  function DashboardView() {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard Overview</h2>
          <p className="text-gray-600 mt-1">Welcome to your clinic management dashboard</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              title: 'Today\'s Bookings',
              value: bookingsToday,
              icon: Calendar,
              color: 'bg-blue-500',
              action: () => {
                setFilterDate(todayStr);
                setFilterRange(null);
                setActiveTab('bookings');
              }
            },
            {
              title: 'This Week',
              value: bookingsThisWeek,
              icon: Users,
              color: 'bg-green-500',
              action: () => {
                setFilterDate('');
                setFilterRange({ start: mondayStr, end: sundayStr });
                setActiveTab('bookings');
              }
            },
            {
              title: 'This Month',
              value: bookingsThisMonth,
              icon: BarChart3,
              color: 'bg-purple-500',
              action: () => {
                setFilterDate('');
                setFilterRange({ start: monthStart, end: monthEnd });
                setActiveTab('bookings');
              }
            },
            {
              title: 'Total Services',
              value: packages.length,
              icon: Package,
              color: 'bg-orange-500',
              action: () => setActiveTab('package')
            }
          ].map((stat, index) => (
            <div
              key={index}
              onClick={stat.action}
              className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer border border-gray-200"
            >
              <div className="flex items-center">
                <div className={`${stat.color} rounded-lg p-3 mr-4`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Recent Bookings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Recent Bookings</h3>
          </div>
          <div className="p-6">
            {allBookings.slice(0, 5).length === 0 ? (
              <p className="text-gray-500 text-center py-8">No recent bookings</p>
            ) : (
              <div className="space-y-4">
                {allBookings.slice(0, 5).map((booking, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-primary-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{booking.name}</p>
                        <p className="text-sm text-gray-500">{booking.service}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {booking.date || 'No date set'}
                      </p>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        booking.status === 'confirmed' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {booking.status || 'pending'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Bookings Component
  function BookingsView() {
    const filteredAndSearchedBookings = filteredBookings.filter(booking =>
      statusFilter === 'all' || booking.status === statusFilter ||
      (statusFilter === 'pending' && !booking.status)
    ).filter(booking =>
      searchTerm === '' ||
      booking.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.service.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Bookings Management</h2>
            <p className="text-gray-600 mt-1">Manage all patient appointments and bookings</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <div className="relative">
                <Search className="w-5 h-5 text-gray-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Search bookings..."
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Date</label>
              <input
                type="date"
                value={filterDate}
                onChange={(e) => { setFilterDate(e.target.value); setFilterRange(null); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => { setFilterDate(''); setFilterRange(null); setSearchTerm(''); setStatusFilter('all'); }}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Bookings List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Bookings ({filteredAndSearchedBookings.length})
            </h3>
          </div>
          <div className="overflow-hidden">
            {filteredAndSearchedBookings.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No bookings found</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredAndSearchedBookings.map((booking, idx) => {
                  const isConfirmed = booking.status === 'confirmed';
                  const needsDateTime = !booking.date && !booking.time;

                  return (
                    <div key={idx} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                            <User className="w-6 h-6 text-primary-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center space-x-3">
                              <h4 className="text-lg font-medium text-gray-900">{booking.name}</h4>
                              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                isConfirmed ? 'bg-green-100 text-green-800' :
                                needsDateTime ? 'bg-orange-100 text-orange-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {isConfirmed ? 'Confirmed' : needsDateTime ? 'Needs Date/Time' : 'Pending'}
                              </span>
                            </div>
                            <div className="mt-1 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-500">
                              <div className="flex items-center">
                                <Mail className="w-4 h-4 mr-1" />
                                {booking.email}
                              </div>
                              <div className="flex items-center">
                                <Phone className="w-4 h-4 mr-1" />
                                {booking.phone}
                              </div>
                              <div className="flex items-center">
                                <Calendar className="w-4 h-4 mr-1" />
                                {booking.date || <span className="text-red-500 italic">Not set</span>}
                              </div>
                              <div className="flex items-center">
                                <Clock className="w-4 h-4 mr-1" />
                                {booking.time || <span className="text-red-500 italic">Not set</span>}
                              </div>
                            </div>
                            <div className="mt-2">
                              <p className="text-sm text-gray-900 font-medium">{booking.service}</p>
                              {booking.notes && (
                                <p className="text-sm text-gray-500 mt-1">{booking.notes}</p>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {isConfirmed ? (
                            <span className="flex items-center text-green-700 font-medium">
                              <CheckCircle className="w-5 h-5 mr-1" />
                              Confirmed
                            </span>
                          ) : (
                            <button
                              onClick={() => handleConfirmBooking(booking, idx)}
                              className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                            >
                              <Check className="w-4 h-4 mr-2" />
                              {needsDateTime ? 'Set Date & Confirm' : 'Confirm'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Services Component  
  function ServicesView() {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Services Management</h2>
            <p className="text-gray-600 mt-1">Manage your treatment packages and services</p>
          </div>
        </div>

        {/* Add New Service */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Service</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Service Name</label>
              <input
                type="text"
                value={newPackage.name}
                onChange={(e) => setNewPackage({ ...newPackage, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Enter service name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Price</label>
              <input
                type="text"
                value={newPackage.price}
                onChange={(e) => setNewPackage({ ...newPackage, price: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="â‚¬99"
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Features</label>
            <div className="space-y-2">
              {newPackage.features.map((feature, idx) => (
                <input
                  key={idx}
                  type="text"
                  value={feature}
                  onChange={(e) => handleFeatureChange(idx, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder={`Feature ${idx + 1}`}
                />
              ))}
              <button
                onClick={addFeatureField}
                className="flex items-center px-3 py-2 text-sm text-primary-600 hover:text-primary-700"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Feature
              </button>
            </div>
          </div>
          <button
            onClick={handleAdd}
            className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Service
          </button>
        </div>

        {/* Services List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Current Services</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {packages.map((pkg, idx) => (
              <div key={idx} className="p-6">
                {editIndex === idx && editPackage ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input
                        type="text"
                        value={editPackage.name}
                        onChange={(e) => handleEditChange('name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                      <input
                        type="text"
                        value={editPackage.price}
                        onChange={(e) => handleEditChange('price', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    <div className="space-y-2">
                      {editPackage.features.map((feature, fidx) => (
                        <input
                          key={fidx}
                          type="text"
                          value={feature}
                          onChange={(e) => handleEditFeatureChange(fidx, e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      ))}
                      <button
                        onClick={addEditFeatureField}
                        className="flex items-center px-3 py-2 text-sm text-primary-600 hover:text-primary-700"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Feature
                      </button>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={handleSaveEdit}
                        className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Save
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-xl font-semibold text-gray-900">{pkg.name}</h4>
                      <p className="text-2xl font-bold text-primary-600 mt-1">{pkg.price}</p>
                      <ul className="mt-3 space-y-1">
                        {pkg.features.filter(Boolean).map((feature, fidx) => (
                          <li key={fidx} className="text-gray-600 flex items-center">
                            <Check className="w-4 h-4 text-green-500 mr-2" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(idx)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(idx)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Availability Component
  function AvailabilityView() {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Availability Management</h2>
          <p className="text-gray-600 mt-1">Manage your clinic availability and time slots</p>
        </div>

        {/* Add Availability */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Availability Block</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
              <input
                type="date"
                value={newAvailability.date}
                onChange={(e) => setNewAvailability({ ...newAvailability, date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
              <input
                type="time"
                value={newAvailability.start}
                onChange={(e) => setNewAvailability({ ...newAvailability, start: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
              <input
                type="time"
                value={newAvailability.end_time}
                onChange={(e) => setNewAvailability({ ...newAvailability, end_time: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
          {availabilityError && (
            <div className="mt-4 flex items-center p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <span className="text-sm text-red-700">{availabilityError}</span>
            </div>
          )}
          <button
            onClick={handleAddAvailability}
            className="mt-4 flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Availability
          </button>
        </div>

        {/* Availability List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Current Availability</h3>
          </div>
          <div className="p-6">
            {availability.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No availability blocks set</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availability.map((block) => (
                  <div
                    key={block.id || `${block.date}-${block.start}-${block.end_time}`}
                    className="p-4 border border-gray-200 rounded-lg"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{block.date}</p>
                        <p className="text-sm text-gray-500">{block.start} - {block.end_time}</p>
                      </div>
                      <Clock className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Password Change Modal
  function PasswordChangeModal() {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Change Password</h3>
          </div>
          <form onSubmit={handleChangePassword} className="p-6">
            <div className="mb-4">
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
            {changePasswordMsg && (
              <div className="mb-4 flex items-center p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                <span className="text-sm text-green-700">{changePasswordMsg}</span>
              </div>
            )}
            <div className="flex space-x-3">
              <button
                type="submit"
                className="flex-1 bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors"
              >
                Update Password
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
    );
  }

  // Date Time Modal  
  function DateTimeModal() {
    if (!selectedBookingForDateTime) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Set Appointment Date & Time</h3>
          </div>
          <div className="p-6">
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">
                Booking for: <strong className="text-gray-900">{selectedBookingForDateTime.booking.name}</strong>
              </p>
              <p className="text-sm text-gray-600">
                Service: <strong className="text-gray-900">{selectedBookingForDateTime.booking.service}</strong>
              </p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
                <input
                  type="time"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
            
            {dateTimeError && (
              <div className="mt-4 flex items-center p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                <span className="text-sm text-red-700">{dateTimeError}</span>
              </div>
            )}
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={handleDateTimeSubmit}
                className="flex-1 bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors"
              >
                Confirm Booking
              </button>
              <button
                onClick={handleCancelDateTime}
                className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
};

export default AdminConsole;
