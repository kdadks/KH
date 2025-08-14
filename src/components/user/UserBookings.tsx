import React, { useState, useEffect } from 'react';
import { useUserAuth } from '../../contexts/UserAuthContext';
import { getUserBookings } from '../../utils/userManagementUtils';
import { UserBooking } from '../../types/userManagement';
import { useToast } from '../shared/toastContext';
import { 
  Calendar, 
  Clock, 
  MapPin,
  Search,
  Filter,
  CheckCircle,
  AlertCircle,
  XCircle,
  RefreshCw
} from 'lucide-react';

const UserBookings: React.FC = () => {
  const { user } = useUserAuth();
  const { showError } = useToast();
  
  const [bookings, setBookings] = useState<UserBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    if (user?.id) {
      loadBookings();
    }
  }, [user]);

  const loadBookings = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const { bookings: data, error } = await getUserBookings(user.id.toString());
      
      if (error) {
        showError('Error', `Failed to load bookings: ${error}`);
      } else {
        setBookings(data);
      }
    } catch (error) {
      console.error('Error loading bookings:', error);
      showError('Error', 'Unexpected error loading bookings');
    } finally {
      setLoading(false);
    }
  };

  // Filter bookings based on search and status
  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = 
      booking.package_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (booking.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    
    const matchesStatus = statusFilter === 'all' || booking.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Separate bookings by status for better organization
  const upcomingBookings = filteredBookings.filter(b => 
    b.booking_date && new Date(b.booking_date) > new Date() && b.status !== 'cancelled'
  );
  
  const pastBookings = filteredBookings.filter(b => 
    !b.booking_date || new Date(b.booking_date) <= new Date() || b.status === 'cancelled'
  );

  // Remove unused helper functions - they're defined in BookingCard component

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your bookings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Your Bookings</h1>
          <p className="text-gray-600">View and manage your appointments and sessions.</p>
        </div>
        <button
          onClick={loadBookings}
          className="flex items-center px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search bookings..."
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
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Booking Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-800">Total Bookings</p>
              <p className="text-2xl font-bold text-blue-900">{bookings.length}</p>
            </div>
            <Calendar className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-800">Upcoming</p>
              <p className="text-2xl font-bold text-green-900">{upcomingBookings.length}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-800">Pending</p>
              <p className="text-2xl font-bold text-yellow-900">
                {bookings.filter(b => b.status === 'pending').length}
              </p>
            </div>
            <Clock className="w-8 h-8 text-yellow-600" />
          </div>
        </div>
      </div>

      {filteredBookings.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-xl font-medium text-gray-900 mb-2">No bookings found</p>
          <p className="text-gray-600 mb-4">
            {searchTerm || statusFilter !== 'all' 
              ? 'Try adjusting your search or filter criteria.' 
              : 'You don\'t have any bookings yet.'}
          </p>
          <button
            onClick={() => {
              // TODO: Navigate to booking page
              console.log('Navigate to booking page');
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Book an Appointment
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Upcoming Bookings */}
          {upcomingBookings.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Upcoming Appointments ({upcomingBookings.length})
              </h2>
              <div className="grid gap-4">
                {upcomingBookings.map((booking) => (
                  <BookingCard key={booking.id} booking={booking} isUpcoming={true} />
                ))}
              </div>
            </div>
          )}

          {/* Past Bookings */}
          {pastBookings.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Past Appointments ({pastBookings.length})
              </h2>
              <div className="grid gap-4">
                {pastBookings.map((booking) => (
                  <BookingCard key={booking.id} booking={booking} isUpcoming={false} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Booking Card Component
interface BookingCardProps {
  booking: UserBooking;
  isUpcoming: boolean;
}

const BookingCard: React.FC<BookingCardProps> = ({ booking, isUpcoming }) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDateTime = (dateTime: string) => {
    const date = new Date(dateTime);
    return {
      date: date.toLocaleDateString('en-IE', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      time: date.toLocaleTimeString('en-IE', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    };
  };

  return (
    <div className={`bg-white border rounded-lg p-6 hover:shadow-md transition-shadow ${
      isUpcoming ? 'border-blue-200' : 'border-gray-200'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Service and Status */}
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                {booking.package_name}
              </h3>
              <div className="flex items-center">
                {getStatusIcon(booking.status || 'pending')}
                <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  getStatusColor(booking.status || 'pending')
                }`}>
                  {(booking.status && booking.status.charAt(0).toUpperCase() + booking.status.slice(1)) || 'Pending'}
                </span>
              </div>
            </div>
          </div>

          {/* Date and Time */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center text-sm text-gray-600">
              <Calendar className="w-4 h-4 mr-2" />
              <span>
                {booking.booking_date 
                  ? formatDateTime(booking.booking_date).date
                  : 'Date to be confirmed'
                }
              </span>
            </div>
            
            {booking.timeslot_start_time && (
              <div className="flex items-center text-sm text-gray-600">
                <Clock className="w-4 h-4 mr-2" />
                <span>
                  {booking.timeslot_start_time.substring(0, 5)}
                  {booking.timeslot_end_time && ` - ${booking.timeslot_end_time.substring(0, 5)}`}
                </span>
              </div>
            )}

            <div className="flex items-center text-sm text-gray-600">
              <MapPin className="w-4 h-4 mr-2" />
              <span>KH Therapy Clinic</span>
            </div>
          </div>

          {/* Notes */}
          {booking.notes && (
            <div className="bg-gray-50 rounded-md p-3 mb-4">
              <p className="text-sm text-gray-700">
                <span className="font-medium">Notes:</span> {booking.notes}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500">
              Booking ID: {booking.id}
            </div>
            
            {isUpcoming && booking.status === 'confirmed' && (
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    // TODO: Implement reschedule
                    console.log('Reschedule booking:', booking.id);
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Reschedule
                </button>
                <span className="text-gray-300">|</span>
                <button
                  onClick={() => {
                    // TODO: Implement cancel
                    console.log('Cancel booking:', booking.id);
                  }}
                  className="text-sm text-red-600 hover:text-red-800 font-medium"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserBookings;
