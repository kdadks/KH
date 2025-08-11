import React from 'react';
import { Calendar, Users, Package, BarChart3 } from 'lucide-react';
import { BookingFormData } from './types';

interface PackageLite {
  name: string;
  price?: string;
  inHourPrice?: string;
  outOfHourPrice?: string;
  features?: string[];
  category?: string;
}

interface DashboardProps {
  allBookings: BookingFormData[];
  packages: PackageLite[];
  setActiveTab: (tab: string) => void;
  setFilterDate: (date: string) => void;
  setFilterRange: (range: {start: string; end: string} | null) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  allBookings, 
  packages, 
  setActiveTab, 
  setFilterDate, 
  setFilterRange 
}) => {
  // ---------- Date helpers & normalization ----------
  const toDateOnlyString = (d: Date) => d.toISOString().split('T')[0];
  const parseDate = (raw?: string) => {
    if (!raw) return undefined;
    // If raw looks like full timestamp (contains 'T' or space) let Date parse it
    // Otherwise treat as YYYY-MM-DD without timezone shift
    if (/\d{4}-\d{2}-\d{2}T/.test(raw) || /\s/.test(raw)) {
      const dt = new Date(raw);
      return isNaN(dt.getTime()) ? undefined : dt;
    }
    // Assume yyyy-mm-dd
    const parts = raw.split('-');
    if (parts.length === 3) {
      const [y, m, d] = parts.map(p => parseInt(p, 10));
      return new Date(y, m - 1, d);
    }
    const dt = new Date(raw);
    return isNaN(dt.getTime()) ? undefined : dt;
  };

  const getAppointmentDate = (b: BookingFormData) => {
    // Priority: explicit appointment_date, legacy date, fallback to booking_date (timestamp) or created_at
    return parseDate(b.appointment_date || b.date || b.booking_date || b.created_at);
  };

  const today = new Date();
  const todayStr = toDateOnlyString(today);
  
  // Start of week (Monday) & end of week (Sunday)
  const dayOfWeek = today.getDay(); // 0=Sun
  const diffToMonday = (dayOfWeek + 6) % 7; // convert so Monday=0
  const weekStartDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - diffToMonday);
  const weekEndDate = new Date(weekStartDate.getFullYear(), weekStartDate.getMonth(), weekStartDate.getDate() + 6);
  const weekStartStr = toDateOnlyString(weekStartDate);
  const weekEndStr = toDateOnlyString(weekEndDate);

  const monthStartDate = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEndDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const monthStartStr = toDateOnlyString(monthStartDate);
  const monthEndStr = toDateOnlyString(monthEndDate);

  // ---------- Aggregations (string-based to avoid TZ drift & match Bookings filter) ----------
  const extractDateOnly = (b: BookingFormData): string | null => {
    const sources = [b.appointment_date, b.date, b.booking_date, b.created_at].filter(Boolean) as string[];
    if (sources.length === 0) return null;
    const raw = sources[0];
    return raw.split('T')[0].split(' ')[0];
  };

  const bookingsToday = allBookings.reduce((acc, b) => {
    const s = extractDateOnly(b);
    if (s === todayStr) acc++;
    return acc;
  }, 0);

  const bookingsThisWeek = allBookings.reduce((acc, b) => {
    const s = extractDateOnly(b);
    if (s && s >= weekStartStr && s <= weekEndStr) acc++;
    return acc;
  }, 0);

  const bookingsThisMonth = allBookings.reduce((acc, b) => {
    const s = extractDateOnly(b);
    if (s && s >= monthStartStr && s <= monthEndStr) acc++;
    return acc;
  }, 0);

  // ---------- Recent bookings (sorted) ----------
  // Previous implementation sorted primarily by appointment date which could
  // surface future (scheduled) appointments ahead of more recently created bookings,
  // making the list look "out of order" from an admin recency perspective.
  // Requirement: show the latest bookings (by creation time) first.
  // We therefore sort strictly by created_at (descending) and fall back to
  // the best available timestamp if created_at is missing (should be rare).
  const recentBookings = [...allBookings]
    .sort((a, b) => {
      const aCreated = new Date(a.created_at || a.booking_date || a.appointment_date || a.date || 0).getTime();
      const bCreated = new Date(b.created_at || b.booking_date || b.appointment_date || b.date || 0).getTime();
      return bCreated - aCreated; // newest first
    })
    .slice(0, 5);

  const formatDisplayDate = (b: BookingFormData) => {
    const d = getAppointmentDate(b);
    if (!d) return 'No date set';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const time = b.appointment_time || b.time || '';
    return time ? `${y}-${m}-${day} ${time}` : `${y}-${m}-${day}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard Overview</h2>
        <p className="text-gray-600 mt-1">Welcome to your clinic management dashboard</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
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
              setFilterRange({ start: weekStartStr, end: weekEndStr });
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
              setFilterRange({ start: monthStartStr, end: monthEndStr });
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
          {recentBookings.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No recent bookings</p>
          ) : (
            <div className="space-y-4">
              {recentBookings.map((booking, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{booking.customer_name || booking.name}</p>
                      <p className="text-sm text-gray-500">{booking.package_name || booking.service}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{formatDisplayDate(booking)}</p>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      booking.status === 'confirmed' 
                        ? 'bg-green-100 text-green-800'
                        : booking.status === 'cancelled'
                        ? 'bg-red-100 text-red-800'
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
};
