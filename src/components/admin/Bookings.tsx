import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Mail, 
  Phone, 
  Calendar, 
  Clock, 
  User, 
  Check, 
  X, 
  Edit, 
  Trash2,
  Eye,
  FileSpreadsheet,
  FileText,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  List,
  Grid3x3
} from 'lucide-react';
import { Calendar as BigCalendar, momentLocalizer, View, Views } from 'react-big-calendar';
import moment from 'moment';
import { BookingFormData } from './types';

interface BookingEventResource extends BookingFormData {
  isMultiple: boolean;
  totalCount: number;
  allBookings: BookingFormData[];
  classification: 'in-hour' | 'out-of-hour' | 'mixed';
}
interface BookingCalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: BookingEventResource;
  allDay: boolean;
}
import { useToast } from '../shared/toastContext';
import { supabase } from '../../supabaseClient';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = momentLocalizer(moment);

interface BookingsProps {
  allBookings: BookingFormData[];
  setAllBookings: React.Dispatch<React.SetStateAction<BookingFormData[]>>;
  filterDate: string;
  setFilterDate: React.Dispatch<React.SetStateAction<string>>;
  filterRange: {start: string; end: string} | null;
  setFilterRange: React.Dispatch<React.SetStateAction<{start: string; end: string} | null>>;
}

export const Bookings: React.FC<BookingsProps> = ({ 
  allBookings,
  setAllBookings,
  filterDate,
  setFilterDate,
  filterRange,
  setFilterRange
}) => {
  const { showSuccess, showError } = useToast();
  
  // State management
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'confirmed' | 'cancelled'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [showEditBookingModal, setShowEditBookingModal] = useState(false);
  const [editingBooking, setEditingBooking] = useState<BookingFormData | null>(null);
  const [editBookingDate, setEditBookingDate] = useState('');
  const [editBookingTime, setEditBookingTime] = useState('');
  const [editBookingError, setEditBookingError] = useState('');
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [bookingToDelete, setBookingToDelete] = useState<BookingFormData | null>(null);
  const [showCancelConfirmModal, setShowCancelConfirmModal] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState<BookingFormData | null>(null);
  
  // Calendar view state
  const [calendarView, setCalendarView] = useState<'list' | 'calendar'>('list');
  const [calendarViewType, setCalendarViewType] = useState<View>(Views.MONTH);
  const [calendarDate, setCalendarDate] = useState(new Date());
  
  // Calendar modal states
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<BookingFormData | null>(null);
  const [showMultiBookingsModal, setShowMultiBookingsModal] = useState(false);
  const [selectedDateBookings, setSelectedDateBookings] = useState<BookingFormData[]>([]);
  
  const recordsPerPage = 10;

  // React to external filter changes (e.g., from Dashboard stat tiles)
  useEffect(() => {
    // Auto switch to list view for clarity when a specific date or range applied
    if (filterDate || filterRange) {
      setCalendarView('list');
      // Optional: scroll into view smoothly
      try {
        const el = document.getElementById('bookings-root');
        el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch {
        // ignore scroll errors
      }
    }
  }, [filterDate, filterRange]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, filterDate, filterRange]);

  // Filter bookings
  const filteredBookings = allBookings.filter(booking => {
    // Normalized fields (handle legacy + new schema)
    const customerName = booking.customer_name || booking.name || '';
    const customerEmail = booking.customer_email || booking.email || '';
    const packageName = booking.package_name || booking.service || '';

    // Collect all possible date sources
    const rawDates: string[] = [
      booking.appointment_date,
      booking.date,
      booking.booking_date,
      booking.created_at
    ].filter((d): d is string => !!d);

    // Extract date-only (YYYY-MM-DD) portions
    const dateOnlySet = new Set(
      rawDates.map(d => {
        // If contains 'T' split; if space split; else assume already date-only
        const part = d.split('T')[0].split(' ')[0];
        return part;
      })
    );

    // Pick primary appointment date for range comparisons (first valid date)
    const primaryDate = [...dateOnlySet][0] || '';

    const matchesSearch =
      customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      packageName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'pending' && (!booking.status || booking.status === 'pending')) ||
      booking.status === statusFilter;

    const matchesDate = !filterDate || dateOnlySet.has(filterDate);

    const matchesRange = !filterRange || (
      primaryDate && primaryDate >= filterRange.start && primaryDate <= filterRange.end
    );

    return matchesSearch && matchesStatus && matchesDate && matchesRange;
  });

  // Pagination
  const totalRecords = filteredBookings.length;
  const totalPages = Math.ceil(totalRecords / recordsPerPage);
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const currentPageBookings = filteredBookings.slice(startIndex, endIndex);

  // Booking operations
  const handleConfirmBooking = async (booking: BookingFormData) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'confirmed' })
        .eq('id', booking.id);

      if (error) throw error;

      const updatedBookings = [...allBookings];
      const actualIndex = allBookings.findIndex(b => b.id === booking.id);
      if (actualIndex !== -1) {
        updatedBookings[actualIndex] = { ...updatedBookings[actualIndex], status: 'confirmed' };
        setAllBookings(updatedBookings);
      }
      
      showSuccess('Booking Confirmed', 'The booking has been confirmed successfully.');
    } catch (error) {
      console.error('Error confirming booking:', error);
      showError('Error', 'Failed to confirm booking. Please try again.');
    }
  };

  // Helper function to process booking data for editing
  const processBookingForEdit = (bookingToEdit: BookingFormData) => {
    // Handle booking_date field (contains both date and time)
    if (bookingToEdit.booking_date) {
      const bookingDateTime = new Date(bookingToEdit.booking_date);
      if (!isNaN(bookingDateTime.getTime())) {
        // Extract date and time from booking_date
        const dateStr = bookingDateTime.toISOString().split('T')[0]; // YYYY-MM-DD
        const timeStr = bookingDateTime.toTimeString().split(' ')[0].substring(0, 5); // HH:MM
        setEditBookingDate(dateStr);
        setEditBookingTime(timeStr);
      } else {
        // Fallback to legacy fields or empty
        setEditBookingDate(bookingToEdit.appointment_date || bookingToEdit.date || '');
        setEditBookingTime(bookingToEdit.appointment_time || bookingToEdit.time || '');
      }
    } else {
      // Fallback to legacy fields
      setEditBookingDate(bookingToEdit.appointment_date || bookingToEdit.date || '');
      setEditBookingTime(bookingToEdit.appointment_time || bookingToEdit.time || '');
    }
  };

  // Edit booking
  const handleEditBooking = (booking: BookingFormData) => {
    setEditingBooking(booking);
    processBookingForEdit(booking);
    setShowEditBookingModal(true);
  };

  const handleUpdateBooking = async () => {
    if (!editingBooking || !editBookingDate || !editBookingTime) {
      setEditBookingError('Please fill in all fields');
      return;
    }

    try {
      // Combine date and time into a single datetime string for booking_date column
      const bookingDateTime = `${editBookingDate}T${editBookingTime}:00`;

      const { error } = await supabase
        .from('bookings')
        .update({ 
          booking_date: bookingDateTime
        })
        .eq('id', editingBooking.id);

      if (error) {
        console.error('Supabase error details:', error);
        throw error;
      }

      // Update local state with the new booking_date and also set legacy fields for compatibility
      const updatedBookings = allBookings.map(booking => 
        booking.id === editingBooking.id
          ? { 
              ...booking, 
              booking_date: bookingDateTime,
              // Also set legacy fields for compatibility with calendar logic
              appointment_date: editBookingDate, 
              appointment_time: editBookingTime,
              date: editBookingDate, 
              time: editBookingTime 
            }
          : booking
      );
      setAllBookings(updatedBookings);
      
      setShowEditBookingModal(false);
      setEditingBooking(null);
      setEditBookingError('');
      showSuccess('Booking Updated', 'The booking has been updated successfully.');
    } catch (error) {
      console.error('Error updating booking:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setEditBookingError(`Update failed: ${errorMessage}`);
      showError('Error', 'Failed to update booking. Please try again.');
    }
  };

  // Delete booking
  const handleDeleteBooking = async () => {
    if (!bookingToDelete) return;
    
    try {
      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('id', bookingToDelete.id);

      if (error) throw error;

      setAllBookings(allBookings.filter(booking => booking.id !== bookingToDelete.id));
      
      setShowDeleteConfirmModal(false);
      setBookingToDelete(null);
      showSuccess('Booking Deleted', 'The booking has been deleted successfully.');
    } catch (error) {
      console.error('Error deleting booking:', error);
      showError('Error', 'Failed to delete booking. Please try again.');
    }
  };

  // Cancel booking
  const handleCancelBooking = async () => {
    if (!bookingToCancel) return;
    
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingToCancel.id);

      if (error) throw error;

      const updatedBookings = allBookings.map(booking => 
        booking.id === bookingToCancel.id
          ? { ...booking, status: 'cancelled' }
          : booking
      );
      setAllBookings(updatedBookings);
      
      setShowCancelConfirmModal(false);
      setBookingToCancel(null);
      showSuccess('Booking Cancelled', 'The booking has been cancelled successfully.');
    } catch (error) {
      console.error('Error cancelling booking:', error);
      showError('Error', 'Failed to cancel booking. Please try again.');
    }
  };

  // Export functions
  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredBookings);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Bookings');
    XLSX.writeFile(wb, `bookings_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(20);
    doc.text('KH Therapy - Bookings Report', 14, 22);
    
    // Add date
    doc.setFontSize(12);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 32);
    doc.text(`Total Bookings: ${filteredBookings.length}`, 14, 40);
    
    // Prepare table data
    const tableData = filteredBookings.map(booking => [
      booking.customer_name || booking.name || 'N/A',
      booking.customer_email || booking.email || 'N/A',
      booking.customer_phone || booking.phone || 'N/A',
      booking.package_name || booking.service || 'N/A',
      booking.appointment_date || booking.date || 'N/A',
      booking.appointment_time || booking.time || 'N/A',
      booking.status || 'pending'
    ]);
    
    // Add table
    autoTable(doc, {
      startY: 50,
      head: [['Customer Name', 'Email', 'Phone', 'Service', 'Date', 'Time', 'Status']],
      body: tableData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
      alternateRowStyles: { fillColor: [245, 247, 250] }
    });
    
    // Save the PDF
    doc.save(`bookings_report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Calendar helper functions
  const classifyInHour = (start: string, end: string) => {
    const toMinutes = (t: string) => { const [h,m] = t.split(':').map(Number); return h*60 + (m||0); };
    const s = toMinutes(start); const e = toMinutes(end);
    const inStart = 9*60, inEnd = 17*60; // 09:00-17:00
    const earlyStart = 8*60, earlyEnd = 9*60; // 08:00-09:00
    const lateStart = 18*60, lateEnd = 20*60; // 18:00-20:00
    if (s >= inStart && e <= inEnd) return 'in-hour';
    if ((s >= earlyStart && e <= earlyEnd) || (s >= lateStart && e <= lateEnd)) return 'out-of-hour';
    if ((s < inStart && e > inStart) || (s < inEnd && e > inEnd) || (s < lateStart && e > lateStart)) return 'mixed';
    return 'out-of-hour';
  };

  const getBookingsCalendarEvents = () => {
    // Use allBookings for calendar view to show all bookings regardless of filters
    // Filter bookings that have booking_date set (which contains both date and time)
    const bookingsWithDateTime = allBookings.filter(booking => {
      // Check for booking_date column (new format) or fallback to legacy fields
      return booking.booking_date || 
             ((booking.appointment_date || booking.date) && (booking.appointment_time || booking.time));
    });
    
    const bookingsByDate: { [key: string]: BookingFormData[] } = {};
    bookingsWithDateTime.forEach(booking => {
      let dateKey: string;
      
      if (booking.booking_date) {
        // Extract date from booking_date column (format: "2025-08-11T10:00:00")
        dateKey = booking.booking_date.split('T')[0];
      } else {
        // Fallback to legacy fields
        dateKey = booking.appointment_date || booking.date!;
      }
      
      if (!bookingsByDate[dateKey]) bookingsByDate[dateKey] = [];
      bookingsByDate[dateKey].push(booking);
    });
    
    const events: BookingCalendarEvent[] = [];
    Object.entries(bookingsByDate).forEach(([date, bookings]) => {
      bookings.forEach((booking, index) => {
        let startDateTime: Date;
        
        if (booking.booking_date) {
          // Parse booking_date directly (format: "2025-08-11T10:00:00")
          startDateTime = new Date(booking.booking_date);
        } else {
          // Fallback to legacy fields
          const bookingTime = booking.appointment_time || booking.time!;
          startDateTime = new Date(`${date}T${bookingTime}`);
        }
        
        // Validate the date
        if (isNaN(startDateTime.getTime())) {
          return;
        }
        
        const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000);
        
        const customerName = booking.customer_name || booking.name || 'Booking';
        const title: string = bookings.length > 1 && index === 0
          ? `${customerName} (+${bookings.length - 1} more)`
          : customerName;
          
        // Classification for style
        const pad = (n: number) => n.toString().padStart(2, '0');
        const endStr = `${pad(endDateTime.getHours())}:${pad(endDateTime.getMinutes())}`;
        const startTimeStr = `${pad(startDateTime.getHours())}:${pad(startDateTime.getMinutes())}`;
        const classification = classifyInHour(startTimeStr, endStr);
        
        events.push({
          id: `booking-${date}-${index}`,
          title,
          start: startDateTime,
          end: endDateTime,
          resource: {
            ...booking,
            isMultiple: bookings.length > 1,
            totalCount: bookings.length,
            allBookings: bookings,
            classification
          },
          allDay: false
        });
      });
    });
    
    return events;
  };

  const bookingEventStyleGetter = (event: { resource: { status?: string; appointment_date?: string | null; date?: string | null; appointment_time?: string | null; time?: string | null; classification?: string } }) => {
    const booking = event.resource;
    let backgroundColor = '#6b7280'; // gray for pending
    
    if (booking.status === 'confirmed') backgroundColor = '#10b981'; // green
    else if (booking.status === 'cancelled') backgroundColor = '#ef4444'; // red
    else if (!(booking.appointment_date || booking.date) || !(booking.appointment_time || booking.time)) backgroundColor = '#f59e0b'; // orange
    
    // Adjust visuals for in-hour vs out-of-hour classification
    const classification = booking.classification;
    let border = '0px';
    let boxShadow = 'none';
    
    if (classification === 'out-of-hour') {
      border = '2px solid #6366f1'; // indigo border for out-of-hour
      boxShadow = '0 0 0 1px #6366f1 inset';
    } else if (classification === 'mixed') {
      border = '2px dashed #f59e0b';
    } else if (classification === 'in-hour') {
      // Slightly brighten in-hour confirmed vs others
      if (booking.status === 'confirmed') backgroundColor = '#14b285';
    }
    
    return {
      style: {
        backgroundColor,
        borderRadius: '5px',
        opacity: 0.85,
        color: 'white',
        border,
        boxShadow,
        display: 'block',
        fontSize: '12px',
        fontWeight: '500'
      }
    };
  };

  const handleCalendarEventClick = (event: { resource: BookingEventResource }) => {
    const booking = event.resource;
    
    if (booking.isMultiple) {
      // Handle multiple bookings on same date/time - show multi-bookings modal
      setSelectedDateBookings(booking.allBookings);
      setShowMultiBookingsModal(true);
    } else {
      // Show single booking details modal
      setSelectedBooking(booking);
      setShowBookingModal(true);
    }
  };

  return (
    <div id="bookings-root" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Bookings Management</h2>
          <p className="text-gray-600 mt-1">Manage all patient appointments and bookings</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-3">
          <button
            onClick={() => setCalendarView(calendarView === 'list' ? 'calendar' : 'list')}
            className={`w-full sm:w-auto flex items-center justify-center px-4 py-2 rounded-lg transition-colors ${
              calendarView === 'calendar'
                ? 'bg-primary-600 text-white hover:bg-primary-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {calendarView === 'calendar' ? (
              <>
                <List className="w-4 h-4 mr-2" />
                List View
              </>
            ) : (
              <>
                <Grid3x3 className="w-4 h-4 mr-2" />
                Calendar View
              </>
            )}
          </button>
          <button
            onClick={exportToPDF}
            className="w-full sm:w-auto flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <FileText className="w-4 h-4 mr-2" />
            Export PDF
          </button>
          <button
            onClick={exportToExcel}
            className="w-full sm:w-auto flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Export Excel
          </button>
        </div>
      </div>

      {/* Filters (hidden in calendar view for cleaner UI) */}
      {calendarView === 'list' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'pending' | 'confirmed' | 'cancelled')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date Filter</label>
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
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
      )}

      {/* Bookings List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Bookings ({totalRecords})
            </h3>
            {calendarView === 'calendar' && (
              <div className="flex items-center space-x-4 mt-2">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded" />
                  <span className="text-xs text-gray-600">Confirmed</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-gray-500 rounded" />
                  <span className="text-xs text-gray-600">Pending</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-orange-500 rounded" />
                  <span className="text-xs text-gray-600">Missing Date/Time</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded" />
                  <span className="text-xs text-gray-600">Cancelled</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded" style={{background:'#14b285'}} />
                  <span className="text-xs text-gray-600">In-Hour</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded border-2 border-indigo-500" style={{background:'#6366f1'}} />
                  <span className="text-xs text-gray-600">Out-of-Hour</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded border-2 border-amber-500" style={{background:'#f59e0b'}} />
                  <span className="text-xs text-gray-600">Mixed</span>
                </div>
              </div>
            )}
          </div>
          {totalRecords > 0 && calendarView === 'list' && (
            <div className="text-sm text-gray-500">
              Showing {startIndex + 1}-{Math.min(endIndex, totalRecords)} of {totalRecords} bookings
            </div>
          )}
          {calendarView === 'calendar' && (
            <div className="flex space-x-2">
              <button
                onClick={() => setCalendarViewType(Views.DAY)}
                className={`px-3 py-1 text-sm rounded ${
                  calendarViewType === Views.DAY
                    ? 'bg-primary-100 text-primary-600'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Day
              </button>
              <button
                onClick={() => setCalendarViewType(Views.WEEK)}
                className={`px-3 py-1 text-sm rounded ${
                  calendarViewType === Views.WEEK
                    ? 'bg-primary-100 text-primary-600'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setCalendarViewType(Views.MONTH)}
                className={`px-3 py-1 text-sm rounded ${
                  calendarViewType === Views.MONTH
                    ? 'bg-primary-100 text-primary-600'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Month
              </button>
            </div>
          )}
        </div>

        <div className="overflow-hidden">
          {calendarView === 'calendar' ? (
            <div className="space-y-4">
              <div style={{ height: '600px' }} className="p-4 border rounded-lg">
                <BigCalendar
                  localizer={localizer}
                  events={getBookingsCalendarEvents()}
                  startAccessor="start"
                  endAccessor="end"
                  view={calendarViewType}
                  date={calendarDate}
                  onView={setCalendarViewType}
                  onNavigate={setCalendarDate}
                  onSelectEvent={handleCalendarEventClick}
                  eventPropGetter={bookingEventStyleGetter}
                  style={{ height: '100%' }}
                  popup
                />
              </div>
            </div>
          ) : currentPageBookings.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-2">No bookings found</p>
              <div className="text-sm text-gray-400 space-y-1">
                <p>Total bookings in database: {allBookings.length}</p>
                <p>After filtering: {filteredBookings.length}</p>
                {allBookings.length === 0 && (
                  <p className="text-orange-600 mt-4">
                    The database appears to be empty.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {currentPageBookings.map((booking, idx) => {
                const isConfirmed = booking.status === 'confirmed';
                const isCancelled = booking.status === 'cancelled';
                // Determine if booking truly lacks scheduled date/time.
                const hasDateTime = (() => {
                  if (booking.booking_date) {
                    // booking_date holds combined date & time (e.g. 2025-08-11T10:00:00)
                    return /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(booking.booking_date);
                  }
                  const dateVal = booking.appointment_date || booking.date;
                  const timeVal = booking.appointment_time || booking.time;
                  return !!(dateVal && timeVal);
                })();
                const needsDateTime = !hasDateTime;

                return (
                  <div key={startIndex + idx} className={`p-6 transition-colors ${
                    isCancelled 
                      ? 'bg-gray-50 opacity-75' 
                      : 'hover:bg-gray-50'
                  }`}>
                    <div className="flex items-start justify-between space-x-4">
                      {/* Left: Avatar and Content */}
                      <div className="flex items-start space-x-4 flex-1 min-w-0">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                          isCancelled ? 'bg-gray-200' : 'bg-primary-100'
                        }`}>
                          <User className={`w-6 h-6 ${
                            isCancelled ? 'text-gray-500' : 'text-primary-600'
                          }`} />
                        </div>
                        
                        {/* Content Section */}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 space-y-2 sm:space-y-0">
                            <h4 className={`text-lg font-medium ${
                              isCancelled ? 'text-gray-500 line-through' : 'text-gray-900'
                            }`}>{booking.customer_name || booking.name || 'Unknown'}</h4>
                            <div className="flex items-center space-x-2">
                              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full w-fit ${
                                isCancelled ? 'bg-red-100 text-red-800' :
                                isConfirmed ? 'bg-green-100 text-green-800' :
                                needsDateTime ? 'bg-orange-100 text-orange-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {isCancelled ? 'Cancelled' : isConfirmed ? 'Confirmed' : needsDateTime ? 'Needs Date/Time' : 'Pending'}
                              </span>
                            </div>
                          </div>
                          
                          {/* Contact Information Row */}
                          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="flex items-center min-w-0">
                              <Mail className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
                              <span className="text-sm text-gray-600 truncate" title={booking.customer_email || booking.email || ''}>
                                {booking.customer_email || booking.email || 'No email'}
                              </span>
                            </div>
                            <div className="flex items-center min-w-0">
                              <Phone className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
                              <span className="text-sm text-gray-600 truncate" title={booking.customer_phone || booking.phone || ''}>
                                {booking.customer_phone || booking.phone || 'No phone'}
                              </span>
                            </div>
                          </div>
                          
                          {/* Date and Time Information Row */}
                          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="flex items-center min-w-0">
                              <Calendar className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
                              <span className="text-sm text-gray-600">
                                {booking.booking_date ? 
                                  new Date(booking.booking_date).toLocaleDateString() : 
                                  (booking.appointment_date || booking.date || <span className="text-red-500 italic">Not set</span>)
                                }
                              </span>
                            </div>
                            <div className="flex items-center min-w-0">
                              <Clock className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
                              <span className="text-sm text-gray-600">
                                {booking.booking_date ? 
                                  new Date(booking.booking_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 
                                  (booking.appointment_time || booking.time || <span className="text-red-500 italic">Not set</span>)
                                }
                              </span>
                            </div>
                          </div>

                          {/* Service Information */}
                          <div className="mt-2 flex items-center">
                            <div className="flex items-center text-sm text-gray-600">
                              <span className="font-medium">Service:</span>
                              <span className="ml-1 text-gray-600">{booking.package_name || booking.service || 'Not specified'}</span>
                            </div>
                          </div>

                          {/* Notes if available */}
                          {booking.notes && (
                            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Notes:</span> {booking.notes}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Right: Action Buttons - Always present for consistent spacing */}
                      <div className="flex flex-col gap-2 flex-shrink-0 min-w-[40px] items-center">
                        {!isCancelled ? (
                          <>
                            {!isConfirmed && (
                              <button
                                onClick={() => handleConfirmBooking(booking)}
                                className="flex items-center justify-center w-8 h-8 bg-green-100 text-green-700 rounded-full hover:bg-green-200 transition-colors"
                                title="Confirm Booking"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleEditBooking(booking)}
                              className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors"
                              title="Edit Booking"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setBookingToDelete(booking);
                                setShowDeleteConfirmModal(true);
                              }}
                              className="flex items-center justify-center w-8 h-8 bg-red-100 text-red-700 rounded-full hover:bg-red-200 transition-colors"
                              title="Delete Booking"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setBookingToCancel(booking);
                                setShowCancelConfirmModal(true);
                              }}
                              className="flex items-center justify-center w-8 h-8 bg-orange-100 text-orange-700 rounded-full hover:bg-orange-200 transition-colors"
                              title="Cancel Booking"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : null}
                        {/* Details button - Always present for all bookings */}
                        <button
                          onClick={() => {
                            setSelectedBooking(booking);
                            setShowBookingModal(true);
                          }}
                          className="flex items-center justify-center w-8 h-8 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {calendarView === 'list' && totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                  <span className="font-medium">{Math.min(endIndex, totalRecords)}</span> of{' '}
                  <span className="font-medium">{totalRecords}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNumber = i + 1;
                    return (
                      <button
                        key={pageNumber}
                        onClick={() => setCurrentPage(pageNumber)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          pageNumber === currentPage
                            ? 'z-10 bg-primary-50 border-primary-500 text-primary-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {pageNumber}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="h-5 w-5" aria-hidden="true" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Booking Modal */}
      {showEditBookingModal && editingBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Booking</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Customer</label>
                <p className="text-sm text-gray-600">{editingBooking.customer_name || editingBooking.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                <input
                  type="date"
                  value={editBookingDate}
                  onChange={(e) => setEditBookingDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
                <input
                  type="time"
                  value={editBookingTime}
                  onChange={(e) => setEditBookingTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              {editBookingError && (
                <div className="text-red-600 text-sm">{editBookingError}</div>
              )}
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowEditBookingModal(false);
                  setEditingBooking(null);
                  setEditBookingError('');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateBooking}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700"
              >
                Update Booking
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmModal && bookingToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center mb-4">
              <AlertCircle className="w-6 h-6 text-red-600 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">Delete Booking</h3>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete the booking for <span className="font-medium">{bookingToDelete.customer_name || bookingToDelete.name}</span>? 
              This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteConfirmModal(false);
                  setBookingToDelete(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteBooking}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Booking Modal */}
      {showCancelConfirmModal && bookingToCancel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center mb-4">
              <AlertCircle className="w-6 h-6 text-orange-600 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">Cancel Booking</h3>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to cancel the booking for <span className="font-medium">{bookingToCancel.customer_name || bookingToCancel.name}</span>?
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowCancelConfirmModal(false);
                  setBookingToCancel(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
              >
                Keep Booking
              </button>
              <button
                onClick={handleCancelBooking}
                className="px-4 py-2 text-sm font-medium text-white bg-orange-600 border border-transparent rounded-md hover:bg-orange-700"
              >
                Cancel Booking
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Booking Details Modal */}
      {showBookingModal && selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white rounded-t-xl">
              <h3 className="text-lg font-semibold text-gray-900">Booking Details</h3>
              <button
                onClick={() => setShowBookingModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{selectedBooking.customer_name || selectedBooking.name}</p>
                  <p className="text-sm text-gray-500">{selectedBooking.customer_email || selectedBooking.email}</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-500">Phone:</span>
                  <span className="text-sm text-gray-900">{selectedBooking.customer_phone || selectedBooking.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-500">Service:</span>
                  <span className="text-sm text-gray-900">{selectedBooking.package_name || selectedBooking.service}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-500">Date:</span>
                  <span className="text-sm text-gray-900">
                    {selectedBooking.booking_date ? 
                      new Date(selectedBooking.booking_date).toLocaleDateString() : 
                      (selectedBooking.appointment_date || selectedBooking.date || 'Not set')
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-500">Time:</span>
                  <span className="text-sm text-gray-900">
                    {selectedBooking.booking_date ? 
                      new Date(selectedBooking.booking_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 
                      (selectedBooking.appointment_time || selectedBooking.time || 'Not set')
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-500">Status:</span>
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    selectedBooking.status === 'confirmed' 
                      ? 'bg-green-100 text-green-800'
                      : selectedBooking.status === 'cancelled'
                      ? 'bg-red-100 text-red-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {selectedBooking.status || 'pending'}
                  </span>
                </div>
                {selectedBooking.notes && (
                  <div>
                    <span className="text-sm font-medium text-gray-500">Notes:</span>
                    <p className="text-sm text-gray-900 mt-1 p-2 bg-gray-50 rounded">{selectedBooking.notes}</p>
                  </div>
                )}
              </div>
              
              <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200">
                {/* Only show action buttons if booking is not cancelled */}
                {selectedBooking.status !== 'cancelled' && (
                  <>
                    {selectedBooking.status !== 'confirmed' && (
                      <button
                        onClick={() => {
                          handleConfirmBooking(selectedBooking);
                          setShowBookingModal(false);
                        }}
                        className="min-w-[140px] flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                      >
                        Confirm Booking
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setShowBookingModal(false);
                        handleEditBooking(selectedBooking);
                      }}
                      className="min-w-[120px] flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center justify-center"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        setShowBookingModal(false);
                        setBookingToDelete(selectedBooking);
                        setShowDeleteConfirmModal(true);
                      }}
                      className="min-w-[120px] flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium flex items-center justify-center"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </button>
                    <button
                      onClick={() => {
                        setShowBookingModal(false);
                        setBookingToCancel(selectedBooking);
                        setShowCancelConfirmModal(true);
                      }}
                      className="min-w-[120px] flex-1 bg-orange-600 text-white py-2 px-4 rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium flex items-center justify-center"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Cancel
                    </button>
                  </>
                )}
                {/* Close button - always visible */}
                <button
                  onClick={() => setShowBookingModal(false)}
                  className="min-w-[100px] flex-1 bg-gray-200 text-gray-800 hover:bg-gray-300 py-2 px-4 rounded-lg transition-colors text-sm font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Multiple Bookings Modal */}
      {showMultiBookingsModal && selectedDateBookings.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Multiple Bookings
                </h3>
                <p className="text-sm text-gray-500">{selectedDateBookings.length} booking(s) found</p>
              </div>
              <button
                onClick={() => setShowMultiBookingsModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="space-y-4">
                {selectedDateBookings.map((booking, index) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3 flex-1">
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-primary-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-gray-900">{booking.customer_name || booking.name}</p>
                          <p className="text-sm text-gray-500">{booking.customer_email || booking.email}</p>
                          <p className="text-sm text-gray-600">{booking.package_name || booking.service}</p>
                          <div className="flex items-center space-x-4 mt-1">
                            <span className="text-sm text-gray-500">
                              {booking.booking_date ? 
                                new Date(booking.booking_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 
                                (booking.appointment_time || booking.time ? `${booking.appointment_time || booking.time}` : 'No time set')
                              }
                            </span>
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
                      </div>
                      <div className="flex flex-wrap gap-2 ml-4">
                        <button
                          onClick={() => {
                            setSelectedBooking(booking);
                            setShowMultiBookingsModal(false);
                            setShowBookingModal(true);
                          }}
                          className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                        >
                          Details
                        </button>
                        {/* Only show action buttons if booking is not cancelled */}
                        {booking.status !== 'cancelled' && (
                          <>
                            {booking.status !== 'confirmed' && (
                              <button
                                onClick={() => {
                                  handleConfirmBooking(booking);
                                  // Update the local state
                                  setSelectedDateBookings(prev => 
                                    prev.map(b => 
                                      b.id === booking.id ? { ...b, status: 'confirmed' } : b
                                    )
                                  );
                                }}
                                className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
                              >
                                Confirm
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setShowMultiBookingsModal(false);
                                handleEditBooking(booking);
                              }}
                              className="px-3 py-1 bg-orange-600 text-white text-xs rounded hover:bg-orange-700 transition-colors flex items-center"
                            >
                              <Edit className="w-3 h-3 mr-1" />
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                setShowMultiBookingsModal(false);
                                setBookingToDelete(booking);
                                setShowDeleteConfirmModal(true);
                              }}
                              className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors flex items-center"
                            >
                              <Trash2 className="w-3 h-3 mr-1" />
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
