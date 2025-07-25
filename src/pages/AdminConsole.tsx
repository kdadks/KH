import React, { useState, useEffect } from 'react';
import { treatmentPackages } from '../data/packages';
import { supabase } from '../supabaseClient';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
// import { Calendar as BigCalendar, momentLocalizer, View, Views } from 'react-big-calendar';
// import moment from 'moment';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format, parseISO } from 'date-fns';
// import 'react-big-calendar/lib/css/react-big-calendar.css';
// import '../styles/calendar.css';
import { useToast } from '../components/shared/Toast';
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
  AlertCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  // CalendarDays, // COMMENTED OUT - only used in calendar views
  // List, // COMMENTED OUT - only used in calendar views
  Menu,
  FileSpreadsheet,
  Filter,
  TrendingUp,
  RotateCcw
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
  const { showSuccess, showError } = useToast();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [packages, setPackages] = useState<Package[]>(treatmentPackages);
  const [newPackage, setNewPackage] = useState<Package>({ name: '', price: '', features: [''] });
  const [activeTab, setActiveTab] = useState<'dashboard' | 'package' | 'bookings' | 'availability' | 'reports'>('dashboard');
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
  
  // Calendar view state - COMMENTED OUT
  // const [calendarView, setCalendarView] = useState<'list' | 'calendar'>('list');
  // const [calendarDate, setCalendarDate] = useState(new Date());
  // const [calendarViewType, setCalendarViewType] = useState<View>(Views.MONTH);
  // const localizer = momentLocalizer(moment);
  
  // Date/Time selection modal state
  const [showDateTimeModal, setShowDateTimeModal] = useState(false);
  const [selectedBookingForDateTime, setSelectedBookingForDateTime] = useState<{ booking: BookingFormData; idx: number } | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [dateTimeError, setDateTimeError] = useState('');

  // Mobile navigation state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Enhanced UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'confirmed' | 'cancelled'>('all');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Reports state
  const [reportDateRange, setReportDateRange] = useState<'select' | 'daily' | 'weekly' | 'monthly' | 'custom'>('select');
  const [reportCustomStartDate, setReportCustomStartDate] = useState('');
  const [reportCustomEndDate, setReportCustomEndDate] = useState('');
  const [reportStatusFilter, setReportStatusFilter] = useState<'all' | 'pending' | 'confirmed' | 'cancelled'>('all');
  const [reportData, setReportData] = useState<BookingFormData[]>([]);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;

  // Calendar view state for bookings - COMMENTED OUT
  // const [bookingsCalendarView, setBookingsCalendarView] = useState<'list' | 'calendar'>('list');
  // const [bookingsCalendarDate, setBookingsCalendarDate] = useState(new Date());
  // const [bookingsCalendarViewType, setBookingsCalendarViewType] = useState<View>(Views.MONTH);

  // Booking modal states
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<BookingFormData | null>(null);
  const [showMultiBookingsModal, setShowMultiBookingsModal] = useState(false);
  const [selectedDateBookings, setSelectedDateBookings] = useState<BookingFormData[]>([]);

  // Edit booking states
  const [showEditBookingModal, setShowEditBookingModal] = useState(false);
  const [editingBooking, setEditingBooking] = useState<BookingFormData | null>(null);
  const [editBookingDate, setEditBookingDate] = useState('');
  const [editBookingTime, setEditBookingTime] = useState('');
  const [editBookingError, setEditBookingError] = useState('');

  // Delete booking states
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [bookingToDelete, setBookingToDelete] = useState<BookingFormData | null>(null);

  // Cancel booking states
  const [showCancelConfirmModal, setShowCancelConfirmModal] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState<BookingFormData | null>(null);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, filterDate, filterRange]);

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
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      showError('Password Change Failed', error.message);
    } else {
      showSuccess('Password Changed!', 'Your password has been updated successfully.');
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
    showSuccess('Booking Confirmed!', 'Calendar invite will be sent to the customer.');
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

  // Edit booking handlers
  const handleEditBooking = (booking: BookingFormData) => {
    setEditingBooking(booking);
    setEditBookingDate(booking.date || '');
    setEditBookingTime(booking.time || '');
    setEditBookingError('');
    setShowEditBookingModal(true);
  };

  const handleSaveEditBooking = async () => {
    if (!editingBooking) return;
    
    setEditBookingError('');
    
    // Validate date and time
    if (!editBookingDate || !editBookingTime) {
      setEditBookingError('Please select both date and time.');
      return;
    }

    try {
      // Find the booking in database
      const { data: dbBookings } = await supabase
        .from('bookings')
        .select('*')
        .eq('customer_name', editingBooking.name)
        .eq('customer_email', editingBooking.email)
        .eq('package_name', editingBooking.service);

      if (dbBookings && dbBookings.length > 0) {
        const bookingId = dbBookings[0].id;
        
        // Prepare update data - include status if booking was pending and now has date/time
        const updateData: any = {
          booking_date: `${editBookingDate}T${editBookingTime}:00`
        };
        
        // If the booking was pending and didn't have date/time before, mark it as confirmed
        const wasWithoutDateTime = !editingBooking.date && !editingBooking.time;
        if (wasWithoutDateTime || editingBooking.status !== 'confirmed') {
          updateData.status = 'confirmed';
        }
        
        // Update booking in database
        const { error } = await supabase
          .from('bookings')
          .update(updateData)
          .eq('id', bookingId);
        
        if (error) {
          setEditBookingError('Failed to update booking: ' + error.message);
          return;
        }

        // Refresh bookings list
        const { data: refreshedData } = await supabase
          .from('bookings')
          .select('*')
          .order('booking_date', { ascending: false });
        
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

        // Close modal and reset state
        setShowEditBookingModal(false);
        setEditingBooking(null);
        setEditBookingDate('');
        setEditBookingTime('');
        
        const statusMessage = wasWithoutDateTime ? 'Booking updated and confirmed successfully!' : 'Booking updated successfully!';
        const statusDescription = wasWithoutDateTime ? 'The booking now has a confirmed date and time.' : 'Changes have been saved to the database.';
        showSuccess(statusMessage, statusDescription);
      } else {
        setEditBookingError('Booking not found in database.');
      }
    } catch (error) {
      setEditBookingError('Error updating booking: ' + (error as Error).message);
    }
  };

  const handleCancelEditBooking = () => {
    setShowEditBookingModal(false);
    setEditingBooking(null);
    setEditBookingDate('');
    setEditBookingTime('');
    setEditBookingError('');
  };

  // Delete booking handlers
  const handleDeleteBooking = (booking: BookingFormData) => {
    setBookingToDelete(booking);
    setShowDeleteConfirmModal(true);
  };

  const handleConfirmDeleteBooking = async () => {
    if (!bookingToDelete) return;

    try {
      // Find the booking in database
      const { data: dbBookings } = await supabase
        .from('bookings')
        .select('*')
        .eq('customer_name', bookingToDelete.name)
        .eq('customer_email', bookingToDelete.email)
        .eq('package_name', bookingToDelete.service);

      if (dbBookings && dbBookings.length > 0) {
        const bookingId = dbBookings[0].id;
        
        // Delete booking from database
        const { error } = await supabase
          .from('bookings')
          .delete()
          .eq('id', bookingId);
        
        if (error) {
          showError('Delete Failed', 'Failed to delete booking: ' + error.message);
          return;
        }

        // Refresh bookings list
        const { data: refreshedData } = await supabase
          .from('bookings')
          .select('*')
          .order('booking_date', { ascending: false });
        
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

        // Close modal and reset state
        setShowDeleteConfirmModal(false);
        setBookingToDelete(null);
        
        showSuccess('Booking Deleted', 'The booking has been permanently removed from the database.');
      } else {
        showError('Booking Not Found', 'The booking could not be found in the database.');
      }
    } catch (error) {
      showError('Delete Failed', 'Error deleting booking: ' + (error as Error).message);
    }
  };

  const handleCancelDeleteBooking = () => {
    setShowDeleteConfirmModal(false);
    setBookingToDelete(null);
  };

  // Cancel booking handlers
  const handleCancelBooking = (booking: BookingFormData) => {
    setBookingToCancel(booking);
    setShowCancelConfirmModal(true);
  };

  const handleConfirmCancelBooking = async () => {
    if (!bookingToCancel) return;

    try {
      // Find the booking in database
      const { data: dbBookings } = await supabase
        .from('bookings')
        .select('*')
        .eq('customer_name', bookingToCancel.name)
        .eq('customer_email', bookingToCancel.email)
        .eq('package_name', bookingToCancel.service);

      if (dbBookings && dbBookings.length > 0) {
        const bookingId = dbBookings[0].id;
        
        // Update booking status to cancelled
        const { error } = await supabase
          .from('bookings')
          .update({ status: 'cancelled' })
          .eq('id', bookingId);
        
        if (error) {
          showError('Cancel Failed', 'Failed to cancel booking: ' + error.message);
          return;
        }

        // Refresh bookings list
        const { data: refreshedData } = await supabase
          .from('bookings')
          .select('*')
          .order('booking_date', { ascending: false });
        
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

        // Close modal and reset state
        setShowCancelConfirmModal(false);
        setBookingToCancel(null);
        
        showSuccess('Booking Cancelled', 'The booking has been marked as cancelled.');
      } else {
        showError('Booking Not Found', 'The booking could not be found in the database.');
      }
    } catch (error) {
      showError('Cancel Failed', 'Error cancelling booking: ' + (error as Error).message);
    }
  };

  const handleCancelCancelBooking = () => {
    setShowCancelConfirmModal(false);
    setBookingToCancel(null);
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

  const handleDeleteAvailability = async (blockId: number | undefined, blockIndex: number) => {
    if (!blockId) {
      // If no ID, just remove from local state (shouldn't happen with Supabase data)
      setAvailability(availability.filter((_, index) => index !== blockIndex));
      return;
    }

    const { error } = await supabase.from('availability').delete().eq('id', blockId);
    
    if (error) {
      setAvailabilityError('Failed to delete availability: ' + error.message);
    } else {
      // Remove from local state immediately for better UX
      setAvailability(availability.filter(block => block.id !== blockId));
      setAvailabilityError('');
    }
  };

  // Export functions for bookings
  const exportToExcel = () => {
    try {
      // Use all bookings for export, not just filtered ones
      const exportData = allBookings.map((booking, index) => ({
        'S.No': index + 1,
        'Customer Name': booking.name,
        'Email': booking.email,
        'Phone': booking.phone,
        'Service': booking.service,
        'Date': booking.date || 'Not set',
        'Time': booking.time || 'Not set',
        'Status': booking.status || 'pending',
        'Notes': booking.notes || 'No notes'
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Bookings');
      
      // Auto-adjust column widths
      const colWidths = [
        { wch: 6 },  // S.No
        { wch: 20 }, // Customer Name
        { wch: 25 }, // Email
        { wch: 15 }, // Phone
        { wch: 25 }, // Service
        { wch: 12 }, // Date
        { wch: 8 },  // Time
        { wch: 12 }, // Status
        { wch: 30 }  // Notes
      ];
      worksheet['!cols'] = colWidths;

      const fileName = `bookings_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      showSuccess('Excel Export Complete', `File saved as ${fileName}`);
    } catch (error) {
      showError('Export Failed', 'Error exporting to Excel: ' + (error as Error).message);
    }
  };

  const exportToPDF = () => {
    try {
      const doc = new jsPDF('l', 'mm', 'a4'); // landscape orientation
      
      // Add title
      doc.setFontSize(16);
      doc.text('KH Therapy - Bookings Report', 14, 15);
      
      // Add export date
      doc.setFontSize(10);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 25);
      doc.text(`Total Records: ${allBookings.length}`, 14, 30);

      // Prepare data for PDF table
      const tableData = allBookings.map((booking, index) => [
        index + 1,
        booking.name,
        booking.email,
        booking.phone,
        booking.service,
        booking.date || 'Not set',
        booking.time || 'Not set',
        booking.status || 'pending',
        booking.notes ? (booking.notes.length > 30 ? booking.notes.substring(0, 30) + '...' : booking.notes) : 'No notes'
      ]);

      const tableHeaders = [
        'S.No',
        'Name',
        'Email',
        'Phone',
        'Service',
        'Date',
        'Time',
        'Status',
        'Notes'
      ];

      // Add table using autoTable
      autoTable(doc, {
        head: [tableHeaders],
        body: tableData,
        startY: 35,
        styles: {
          fontSize: 8,
          cellPadding: 2,
        },
        headStyles: {
          fillColor: [63, 131, 248], // primary blue color
          textColor: 255,
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [245, 247, 250]
        },
        columnStyles: {
          0: { cellWidth: 15 }, // S.No
          1: { cellWidth: 25 }, // Name
          2: { cellWidth: 35 }, // Email
          3: { cellWidth: 20 }, // Phone
          4: { cellWidth: 30 }, // Service
          5: { cellWidth: 18 }, // Date
          6: { cellWidth: 15 }, // Time
          7: { cellWidth: 18 }, // Status
          8: { cellWidth: 35 }  // Notes
        },
        margin: { top: 35, left: 14, right: 14 },
        pageBreak: 'auto',
        showHead: 'everyPage'
      });

      const fileName = `bookings_export_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      showSuccess('PDF Export Complete', `File saved as ${fileName}`);
    } catch (error) {
      showError('Export Failed', 'Error exporting to PDF: ' + (error as Error).message);
    }
  };

  // Reports functionality
  const generateReportDateRange = () => {
    const today = new Date();
    let startDate: Date;
    let endDate: Date = today;

    switch (reportDateRange) {
      case 'select':
        // Return null to indicate no date range selected
        return null;
      case 'daily':
        startDate = today;
        break;
      case 'weekly':
        startDate = startOfWeek(today, { weekStartsOn: 1 }); // Monday start
        endDate = endOfWeek(today, { weekStartsOn: 1 });
        break;
      case 'monthly':
        startDate = startOfMonth(today);
        endDate = endOfMonth(today);
        break;
      case 'custom':
        if (!reportCustomStartDate || !reportCustomEndDate) {
          showError('Date Range Required', 'Please select both start and end dates for custom range.');
          return null;
        }
        startDate = parseISO(reportCustomStartDate);
        endDate = parseISO(reportCustomEndDate);
        break;
      default:
        startDate = today;
    }

    return {
      start: format(startDate, 'yyyy-MM-dd'),
      end: format(endDate, 'yyyy-MM-dd')
    };
  };

  const generateReport = async () => {
    setIsGeneratingReport(true);
    try {
      // Check if date range is selected when status is not "all"
      if (reportStatusFilter !== 'all' && reportDateRange === 'select') {
        showError('Date Range Required', 'Please select a date range when filtering by specific status.');
        setIsGeneratingReport(false);
        return;
      }

      // For "All Status" - generate report regardless of date range
      const isAllStatusReport = reportStatusFilter === 'all';
      let dateRange = null;
      
      if (!isAllStatusReport) {
        dateRange = generateReportDateRange();
        if (!dateRange && reportDateRange !== 'select') {
          setIsGeneratingReport(false);
          return;
        }
      }

      // Filter bookings based on criteria
      let filteredBookings = allBookings.filter(booking => {
        // Status filtering
        let matchesStatus = true;
        if (reportStatusFilter !== 'all') {
          const bookingStatus = booking.status || 'pending';
          matchesStatus = bookingStatus === reportStatusFilter;
        }

        // Date filtering (only apply if not "All Status" and date range is selected)
        let matchesDate = true;
        if (!isAllStatusReport && dateRange) {
          if (!booking.date) {
            matchesDate = false;
          } else {
            const bookingDate = booking.date;
            matchesDate = bookingDate >= dateRange.start && bookingDate <= dateRange.end;
          }
        }

        return matchesStatus && matchesDate;
      });

      // Sort by date (newest first)
      filteredBookings.sort((a, b) => {
        if (!a.date && !b.date) return 0;
        if (!a.date) return 1;
        if (!b.date) return -1;
        return b.date.localeCompare(a.date);
      });

      setReportData(filteredBookings);
      const reportType = isAllStatusReport 
        ? `all bookings (all statuses, all dates)`
        : `filtered report (${reportStatusFilter}, ${reportDateRange})`;
      showSuccess('Report Generated', `Found ${filteredBookings.length} bookings for ${reportType}.`);
    } catch (error) {
      showError('Report Generation Failed', 'Error generating report: ' + (error as Error).message);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const clearReportFilters = () => {
    setReportDateRange('select');
    setReportStatusFilter('all');
    setReportCustomStartDate('');
    setReportCustomEndDate('');
    setReportData([]);
    showSuccess('Filters Cleared', 'All report filters have been reset to default values.');
  };

  const exportReportToExcel = () => {
    try {
      if (reportData.length === 0) {
        showError('No Data', 'Please generate a report first before exporting.');
        return;
      }

      const exportData = reportData.map((booking, index) => ({
        'S.No': index + 1,
        'Customer Name': booking.name,
        'Email': booking.email,
        'Phone': booking.phone,
        'Service': booking.service,
        'Date': booking.date || 'Not set',
        'Time': booking.time || 'Not set',
        'Status': booking.status || 'pending',
        'Notes': booking.notes || 'No notes'
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Bookings Report');
      
      // Auto-adjust column widths
      const colWidths = [
        { wch: 6 },  // S.No
        { wch: 20 }, // Customer Name
        { wch: 25 }, // Email
        { wch: 15 }, // Phone
        { wch: 25 }, // Service
        { wch: 12 }, // Date
        { wch: 8 },  // Time
        { wch: 12 }, // Status
        { wch: 30 }  // Notes
      ];
      worksheet['!cols'] = colWidths;

      const dateRangeStr = reportDateRange === 'custom' 
        ? `${reportCustomStartDate}_to_${reportCustomEndDate}`
        : reportDateRange === 'select'
        ? 'no_date_filter'
        : reportDateRange;
      const statusStr = reportStatusFilter === 'all' ? 'all_status' : reportStatusFilter;
      const fileName = `bookings_report_${dateRangeStr}_${statusStr}_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      XLSX.writeFile(workbook, fileName);
      showSuccess('Excel Export Complete', `Report saved as ${fileName}`);
    } catch (error) {
      showError('Export Failed', 'Error exporting report to Excel: ' + (error as Error).message);
    }
  };

  const exportReportToPDF = () => {
    try {
      if (reportData.length === 0) {
        showError('No Data', 'Please generate a report first before exporting.');
        return;
      }

      const doc = new jsPDF('l', 'mm', 'a4'); // landscape orientation
      
      // Add title
      doc.setFontSize(16);
      doc.text('KH Therapy - Bookings Report', 14, 15);
      
      // Add report parameters
      doc.setFontSize(10);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 25);
      doc.text(`Date Range: ${reportDateRange === 'select' ? 'NO DATE FILTER' : reportDateRange.toUpperCase()}`, 14, 30);
      if (reportDateRange === 'custom') {
        doc.text(`Custom Range: ${reportCustomStartDate} to ${reportCustomEndDate}`, 14, 35);
      }
      doc.text(`Status Filter: ${reportStatusFilter.toUpperCase()}`, 14, reportDateRange === 'custom' ? 40 : 35);
      doc.text(`Total Records: ${reportData.length}`, 14, reportDateRange === 'custom' ? 45 : 40);

      // Prepare data for PDF table
      const tableData = reportData.map((booking, index) => [
        index + 1,
        booking.name,
        booking.email,
        booking.phone,
        booking.service,
        booking.date || 'Not set',
        booking.time || 'Not set',
        booking.status || 'pending',
        booking.notes ? (booking.notes.length > 30 ? booking.notes.substring(0, 30) + '...' : booking.notes) : 'No notes'
      ]);

      const tableHeaders = [
        'S.No',
        'Name',
        'Email',
        'Phone',
        'Service',
        'Date',
        'Time',
        'Status',
        'Notes'
      ];

      // Add table using autoTable
      autoTable(doc, {
        head: [tableHeaders],
        body: tableData,
        startY: reportDateRange === 'custom' ? 50 : 45,
        styles: {
          fontSize: 8,
          cellPadding: 2,
        },
        headStyles: {
          fillColor: [63, 131, 248], // primary blue color
          textColor: 255,
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [245, 247, 250]
        },
        columnStyles: {
          0: { cellWidth: 15 }, // S.No
          1: { cellWidth: 25 }, // Name
          2: { cellWidth: 35 }, // Email
          3: { cellWidth: 20 }, // Phone
          4: { cellWidth: 30 }, // Service
          5: { cellWidth: 18 }, // Date
          6: { cellWidth: 15 }, // Time
          7: { cellWidth: 18 }, // Status
          8: { cellWidth: 35 }  // Notes
        },
        margin: { top: 35, left: 14, right: 14 },
        pageBreak: 'auto',
        showHead: 'everyPage'
      });

      const dateRangeStr = reportDateRange === 'custom' 
        ? `${reportCustomStartDate}_to_${reportCustomEndDate}`
        : reportDateRange === 'select'
        ? 'no_date_filter'
        : reportDateRange;
      const statusStr = reportStatusFilter === 'all' ? 'all_status' : reportStatusFilter;
      const fileName = `bookings_report_${dateRangeStr}_${statusStr}_${new Date().toISOString().split('T')[0]}.pdf`;
      
      doc.save(fileName);
      showSuccess('PDF Export Complete', `Report saved as ${fileName}`);
    } catch (error) {
      showError('Export Failed', 'Error exporting report to PDF: ' + (error as Error).message);
    }
  };

  // Convert availability data to calendar events - COMMENTED OUT
  // const getCalendarEvents = () => {
  //   return availability.map((slot, index) => {
  //     const startDateTime = new Date(`${slot.date}T${slot.start}`);
  //     const endDateTime = new Date(`${slot.date}T${slot.end_time}`);
      
  //     return {
  //       id: slot.id || index,
  //       title: `Available: ${slot.start} - ${slot.end_time}`,
  //       start: startDateTime,
  //       end: endDateTime,
  //       resource: slot,
  //       allDay: false
  //     };
  //   });
  // };

  // Convert bookings data to calendar events - COMMENTED OUT
  // const getBookingsCalendarEvents = () => {
  //   const bookingsWithDateTime = allBookings.filter(booking => booking.date && booking.time);
    
  //   // Group bookings by date
  //   const bookingsByDate: { [key: string]: BookingFormData[] } = {};
  //   bookingsWithDateTime.forEach(booking => {
  //     const dateKey = booking.date;
  //     if (!bookingsByDate[dateKey]) {
  //       bookingsByDate[dateKey] = [];
  //     }
  //     bookingsByDate[dateKey].push(booking);
  //   });

  //   const events: any[] = [];
    
  //   Object.entries(bookingsByDate).forEach(([date, bookings]) => {
  //     bookings.forEach((booking, index) => {
  //       const startDateTime = new Date(`${booking.date}T${booking.time}`);
  //       const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000); // Assume 1 hour duration
        
  //       // Create title with multiple indicator
  //       const title = bookings.length > 1 && index === 0 
  //         ? `${booking.name} (+${bookings.length - 1} more)`
  //         : booking.name;
        
  //       events.push({
  //         id: `booking-${date}-${index}`,
  //         title: title,
  //         start: startDateTime,
  //         end: endDateTime,
  //         resource: {
  //           ...booking,
  //           isMultiple: bookings.length > 1,
  //           totalCount: bookings.length,
  //           allBookings: bookings
  //         },
  //         allDay: false
  //       });
  //     });
  //   });

  //   return events;
  // };

  // Format event display for calendar - COMMENTED OUT
  // const eventStyleGetter = () => {
  //   return {
  //     style: {
  //       backgroundColor: '#3b82f6',
  //       borderRadius: '5px',
  //       opacity: 0.8,
  //       color: 'white',
  //       border: '0px',
  //       display: 'block',
  //       fontSize: '12px',
  //       fontWeight: '500'
  //     }
  //   };
  // };

  // Format booking event display for calendar - COMMENTED OUT
  // const bookingEventStyleGetter = (event: any) => {
  //   const booking = event.resource;
  //   let backgroundColor = '#3b82f6'; // default blue
    
  //   if (booking.status === 'confirmed') {
  //     backgroundColor = '#10b981'; // green for confirmed
  //   } else if (booking.status === 'cancelled') {
  //     backgroundColor = '#ef4444'; // red for cancelled
  //   } else if (!booking.date || !booking.time) {
  //     backgroundColor = '#f59e0b'; // orange for missing date/time
  //   } else {
  //     backgroundColor = '#6b7280'; // gray for pending
  //   }
    
  //   return {
  //     style: {
  //       backgroundColor,
  //       borderRadius: '5px',
  //       opacity: 0.8,
  //       color: 'white',
  //       border: '0px',
  //       display: 'block',
  //       fontSize: '12px',
  //       fontWeight: '500'
  //     }
  //   };
  // };

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
              <h1 className="text-lg sm:text-xl font-semibold text-gray-900">KH Therapy Admin</h1>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <button
                onClick={() => setShowPasswordModal(true)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                title="Change Password"
              >
                <Settings className="w-5 h-5" />
              </button>
              <button
                onClick={() => setIsLoggedIn(false)}
                className="hidden sm:flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </button>
              <button
                onClick={() => setIsLoggedIn(false)}
                className="sm:hidden p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-5 h-5" />
              </button>
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                title="Toggle Menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Desktop Navigation */}
          <div className="hidden md:flex space-x-8">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
              { id: 'bookings', label: 'Bookings', icon: Calendar },
              { id: 'package', label: 'Services', icon: Package },
              { id: 'availability', label: 'Availability', icon: Clock },
              { id: 'reports', label: 'Reports', icon: TrendingUp }
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

          {/* Mobile Navigation Dropdown */}
          <div className={`md:hidden ${isMobileMenuOpen ? 'block' : 'hidden'} border-t border-gray-200`}>
            <div className="py-2 space-y-1">
              {[
                { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
                { id: 'bookings', label: 'Bookings', icon: Calendar },
                { id: 'package', label: 'Services', icon: Package },
                { id: 'availability', label: 'Availability', icon: Clock },
                { id: 'reports', label: 'Reports', icon: TrendingUp }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center px-3 py-3 text-sm font-medium rounded-lg mx-2 transition-colors ${
                    activeTab === tab.id
                      ? 'bg-primary-50 text-primary-600'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <tab.icon className="w-4 h-4 mr-3" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Mobile Tab Indicator - visible when mobile menu is closed */}
          <div className={`md:hidden ${isMobileMenuOpen ? 'hidden' : 'block'} py-3`}>
            <div className="flex items-center justify-center">
              {(() => {
                const currentTab = [
                  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
                  { id: 'bookings', label: 'Bookings', icon: Calendar },
                  { id: 'package', label: 'Services', icon: Package },
                  { id: 'availability', label: 'Availability', icon: Clock },
                  { id: 'reports', label: 'Reports', icon: TrendingUp }
                ].find(tab => tab.id === activeTab);
                return currentTab ? (
                  <div className="flex items-center text-primary-600 font-medium">
                    <currentTab.icon className="w-4 h-4 mr-2" />
                    {currentTab.label}
                  </div>
                ) : null;
              })()}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {activeTab === 'dashboard' && <DashboardView />}
        {activeTab === 'bookings' && <BookingsView />}
        {activeTab === 'package' && <ServicesView />}
        {activeTab === 'availability' && <AvailabilityView />}
        {activeTab === 'reports' && <ReportsView />}
      </main>

      {/* Modals */}
      {showBookingModal && <BookingDetailsModal />}
      {showMultiBookingsModal && <MultiBookingsModal />}
      {showEditBookingModal && <EditBookingModal />}
      {showDeleteConfirmModal && <DeleteConfirmModal />}
      {showCancelConfirmModal && <CancelConfirmModal />}
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
    ).sort((a, b) => {
      // Sort by date: most recent first, null dates at the end
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    // Pagination calculations
    const totalRecords = filteredAndSearchedBookings.length;
    const totalPages = Math.ceil(totalRecords / recordsPerPage);
    const startIndex = (currentPage - 1) * recordsPerPage;
    const endIndex = startIndex + recordsPerPage;
    const currentPageBookings = filteredAndSearchedBookings.slice(startIndex, endIndex);

    const handlePageChange = (page: number) => {
      setCurrentPage(page);
    };

    const getPageNumbers = () => {
      const pageNumbers = [];
      const maxVisiblePages = 5;
      
      if (totalPages <= maxVisiblePages) {
        for (let i = 1; i <= totalPages; i++) {
          pageNumbers.push(i);
        }
      } else {
        const leftSide = Math.floor(maxVisiblePages / 2);
        const rightSide = maxVisiblePages - leftSide - 1;
        
        if (currentPage <= leftSide + 1) {
          for (let i = 1; i <= maxVisiblePages; i++) {
            pageNumbers.push(i);
          }
        } else if (currentPage >= totalPages - rightSide) {
          for (let i = totalPages - maxVisiblePages + 1; i <= totalPages; i++) {
            pageNumbers.push(i);
          }
        } else {
          for (let i = currentPage - leftSide; i <= currentPage + rightSide; i++) {
            pageNumbers.push(i);
          }
        }
      }
      
      return pageNumbers;
    };

    // const bookingsCalendarEvents = getBookingsCalendarEvents(); // COMMENTED OUT

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Bookings Management</h2>
            <p className="text-gray-600 mt-1">Manage all patient appointments and bookings</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-3">
            {/* CALENDAR VIEW TOGGLE COMMENTED OUT
            <button
              onClick={() => setBookingsCalendarView(bookingsCalendarView === 'list' ? 'calendar' : 'list')}
              className={`w-full sm:w-auto flex items-center justify-center px-4 py-2 rounded-lg transition-colors ${
                bookingsCalendarView === 'calendar'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {bookingsCalendarView === 'calendar' ? (
                <>
                  <List className="w-4 h-4 mr-2" />
                  List View
                </>
              ) : (
                <>
                  <CalendarDays className="w-4 h-4 mr-2" />
                  Calendar View
                </>
              )}
            </button>
            */}
            <button
              onClick={exportToExcel}
              className="w-full sm:w-auto flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              title="Export to Excel"
            >
              <Download className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Export Excel</span>
              <span className="sm:hidden">Excel</span>
            </button>
            <button
              onClick={exportToPDF}
              className="w-full sm:w-auto flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              title="Export to PDF"
            >
              <FileText className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Export PDF</span>
              <span className="sm:hidden">PDF</span>
            </button>
          </div>
        </div>

        {/* Filters - Always show now since calendar view is commented out */}
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

        {/* List View - Calendar view is commented out */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Bookings ({totalRecords})
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Export functions will include all {allBookings.length} booking records
              </p>
              {/* CALENDAR VIEW LEGEND COMMENTED OUT
              {bookingsCalendarView === 'calendar' && (
                <div className="flex items-center space-x-4 mt-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded"></div>
                    <span className="text-xs text-gray-600">Confirmed</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-gray-500 rounded"></div>
                    <span className="text-xs text-gray-600">Pending</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-orange-500 rounded"></div>
                    <span className="text-xs text-gray-600">Missing Date/Time</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-500 rounded"></div>
                    <span className="text-xs text-gray-600">Cancelled</span>
                  </div>
                </div>
              )}
              */}
            </div>
            {/* CALENDAR VIEW CONTROLS COMMENTED OUT
            {bookingsCalendarView === 'calendar' && (
              <div className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto">
                <button
                  onClick={() => setBookingsCalendarViewType(Views.DAY)}
                  className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded whitespace-nowrap ${
                    bookingsCalendarViewType === Views.DAY
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Day
                </button>
                <button
                  onClick={() => setBookingsCalendarViewType(Views.WEEK)}
                  className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded whitespace-nowrap ${
                    bookingsCalendarViewType === Views.WEEK
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Week
                </button>
                <button
                  onClick={() => setBookingsCalendarViewType(Views.MONTH)}
                  className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded whitespace-nowrap ${
                    bookingsCalendarViewType === Views.MONTH
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Month
                </button>
              </div>
            )}
            */}
            {totalRecords > 0 && (
              <div className="text-sm text-gray-500">
                Showing {startIndex + 1}-{Math.min(endIndex, totalRecords)} of {totalRecords} bookings
              </div>
            )}
          </div>

          <div className="overflow-hidden">
            {/* CALENDAR VIEW COMMENTED OUT - Only showing list view */}
            {currentPageBookings.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No bookings found</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                    {currentPageBookings.map((booking, idx) => {
                      const isConfirmed = booking.status === 'confirmed';
                      const isCancelled = booking.status === 'cancelled';
                      const needsDateTime = !booking.date && !booking.time;

                      return (
                        <div key={startIndex + idx} className={`p-6 transition-colors ${
                          isCancelled 
                            ? 'bg-gray-50 opacity-75' 
                            : 'hover:bg-gray-50'
                        }`}>
                          <div className="space-y-4">
                            <div className="flex items-start space-x-4">
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                                isCancelled 
                                  ? 'bg-gray-200' 
                                  : 'bg-primary-100'
                              }`}>
                                <User className={`w-6 h-6 ${
                                  isCancelled 
                                    ? 'text-gray-500' 
                                    : 'text-primary-600'
                                }`} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 space-y-2 sm:space-y-0">
                                  <h4 className={`text-lg font-medium ${
                                    isCancelled 
                                      ? 'text-gray-500 line-through' 
                                      : 'text-gray-900'
                                  }`}>{booking.name}</h4>
                                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full w-fit ${
                                    isCancelled ? 'bg-red-100 text-red-800' :
                                    isConfirmed ? 'bg-green-100 text-green-800' :
                                    needsDateTime ? 'bg-orange-100 text-orange-800' :
                                    'bg-yellow-100 text-yellow-800'
                                  }`}>
                                    {isCancelled ? 'Cancelled' : isConfirmed ? 'Confirmed' : needsDateTime ? 'Needs Date/Time' : 'Pending'}
                                  </span>
                                </div>
                                
                                {/* Contact Information Row */}
                                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div className="flex items-center min-w-0">
                                    <Mail className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
                                    <span className="text-sm text-gray-600 truncate" title={booking.email}>
                                      {booking.email}
                                    </span>
                                  </div>
                                  <div className="flex items-center min-w-0">
                                    <Phone className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
                                    <span className="text-sm text-gray-600 truncate" title={booking.phone}>
                                      {booking.phone}
                                    </span>
                                  </div>
                                </div>
                                
                                {/* Date and Time Information Row */}
                                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div className="flex items-center min-w-0">
                                    <Calendar className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
                                    <span className="text-sm text-gray-600">
                                      {booking.date || <span className="text-red-500 italic">Not set</span>}
                                    </span>
                                  </div>
                                  <div className="flex items-center min-w-0">
                                    <Clock className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
                                    <span className="text-sm text-gray-600">
                                      {booking.time || <span className="text-red-500 italic">Not set</span>}
                                    </span>
                                  </div>
                                </div>
                                
                                {/* Service and Notes */}
                                <div className="mt-3 pt-2 border-t border-gray-100">
                                  <p className="text-sm text-gray-900 font-medium">{booking.service}</p>
                                  {booking.notes && (
                                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{booking.notes}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            {/* Action Buttons - Moved below content */}
                            <div className="flex justify-end pt-3 border-t border-gray-100">
                              {isCancelled ? (
                                <div className="text-center">
                                  <span className="text-sm text-gray-500 italic">Booking Cancelled</span>
                                </div>
                              ) : (
                                <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 w-full sm:w-auto">
                                  {!isConfirmed && (
                                    <button
                                      onClick={() => handleConfirmBooking(booking, startIndex + idx)}
                                      className="flex items-center justify-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                                    >
                                      <Check className="w-4 h-4 mr-1" />
                                      <span className="hidden sm:inline">{needsDateTime ? 'Set Date & Confirm' : 'Confirm'}</span>
                                      <span className="sm:hidden">Confirm</span>
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleEditBooking(booking)}
                                    className="flex items-center justify-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                                  >
                                    <Edit className="w-4 h-4 mr-1" />
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleCancelBooking(booking)}
                                    className="flex items-center justify-center px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm"
                                  >
                                    <X className="w-4 h-4 mr-1" />
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() => handleDeleteBooking(booking)}
                                    className="flex items-center justify-center px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                                  >
                                    <Trash2 className="w-4 h-4 mr-1" />
                                    Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {/* Pagination Controls - Only in list view */}
                {totalPages > 1 && (
                  <div className="px-4 sm:px-6 py-4 border-t border-gray-200">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                      <div className="text-sm text-gray-500 text-center sm:text-left">
                        Page {currentPage} of {totalPages}
                      </div>
                      <div className="flex items-center justify-center space-x-1 sm:space-x-2">
                        <button
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                          className="flex items-center px-2 sm:px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronLeft className="w-4 h-4 mr-1" />
                          <span className="hidden sm:inline">Previous</span>
                        </button>
                        
                        <div className="flex items-center space-x-1">
                          {getPageNumbers().map((pageNumber) => (
                            <button
                              key={pageNumber}
                              onClick={() => handlePageChange(pageNumber)}
                              className={`px-2 sm:px-3 py-2 text-sm font-medium rounded-lg ${
                                currentPage === pageNumber
                                  ? 'bg-primary-600 text-white'
                                  : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              {pageNumber}
                            </button>
                          ))}
                        </div>
                        
                        <button
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          className="flex items-center px-2 sm:px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span className="hidden sm:inline">Next</span>
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </button>
                      </div>
                    </div>
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
    // const calendarEvents = getCalendarEvents(); // COMMENTED OUT

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Availability Management</h2>
            <p className="text-gray-600 mt-1">Manage your clinic availability and time slots</p>
          </div>
          {/* CALENDAR VIEW TOGGLE COMMENTED OUT
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setCalendarView(calendarView === 'list' ? 'calendar' : 'list')}
              className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                calendarView === 'calendar'
                  ? 'bg-primary-600 text-white'
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
                  <CalendarDays className="w-4 h-4 mr-2" />
                  Calendar View
                </>
              )}
            </button>
          </div>
          */}
        </div>

        {/* Add Availability Form - Always visible */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Availability Block</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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

        {/* List View - Calendar view is commented out */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">
              Current Availability
            </h3>
            {/* CALENDAR VIEW CONTROLS COMMENTED OUT
            {calendarView === 'calendar' && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCalendarViewType(Views.DAY)}
                  className={`px-3 py-1 text-sm rounded ${
                    calendarViewType === Views.DAY
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Day
                </button>
                <button
                  onClick={() => setCalendarViewType(Views.WEEK)}
                  className={`px-3 py-1 text-sm rounded ${
                    calendarViewType === Views.WEEK
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Week
                </button>
                <button
                  onClick={() => setCalendarViewType(Views.MONTH)}
                  className={`px-3 py-1 text-sm rounded ${
                    calendarViewType === Views.MONTH
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Month
                </button>
              </div>
            )}
            */}
          </div>
          
          <div className="p-6">
            {/* CALENDAR VIEW COMMENTED OUT - Only showing list view */}
            {availability.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No availability blocks set</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {availability.map((block, index) => (
                      <div
                        key={block.id || `${block.date}-${block.start}-${block.end_time}`}
                        className="p-4 border border-gray-200 rounded-lg"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{block.date}</p>
                            <p className="text-sm text-gray-500">{block.start} - {block.end_time}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Clock className="w-5 h-5 text-gray-400" />
                            <button
                              onClick={() => handleDeleteAvailability(block.id, index)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Delete availability block"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
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

  // Edit Booking Modal
  function EditBookingModal() {
    if (!editingBooking) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Edit Booking</h3>
            <button
              onClick={handleCancelEditBooking}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6">
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">
                Customer: <strong className="text-gray-900">{editingBooking.name}</strong>
              </p>
              <p className="text-sm text-gray-600 mb-1">
                Email: <strong className="text-gray-900">{editingBooking.email}</strong>
              </p>
              <p className="text-sm text-gray-600">
                Service: <strong className="text-gray-900">{editingBooking.service}</strong>
              </p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                <input
                  type="date"
                  value={editBookingDate}
                  onChange={(e) => setEditBookingDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
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
            </div>
            
            {editBookingError && (
              <div className="mt-4 flex items-center p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                <span className="text-sm text-red-700">{editBookingError}</span>
              </div>
            )}
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={handleSaveEditBooking}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Save Changes
              </button>
              <button
                onClick={handleCancelEditBooking}
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

  // Delete Confirmation Modal
  function DeleteConfirmModal() {
    if (!bookingToDelete) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Confirm Delete</h3>
            <button
              onClick={handleCancelDeleteBooking}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h4 className="text-lg font-medium text-gray-900">Delete Booking</h4>
                <p className="text-sm text-gray-500">This action cannot be undone</p>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-600 mb-1">
                Customer: <strong className="text-gray-900">{bookingToDelete.name}</strong>
              </p>
              <p className="text-sm text-gray-600 mb-1">
                Email: <strong className="text-gray-900">{bookingToDelete.email}</strong>
              </p>
              <p className="text-sm text-gray-600 mb-1">
                Service: <strong className="text-gray-900">{bookingToDelete.service}</strong>
              </p>
              <p className="text-sm text-gray-600">
                Date & Time: <strong className="text-gray-900">
                  {bookingToDelete.date || 'Not set'} {bookingToDelete.time || ''}
                </strong>
              </p>
            </div>
            
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete this booking? This will permanently remove it from the database.
            </p>
            
            <div className="flex space-x-3">
              <button
                onClick={handleConfirmDeleteBooking}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete Booking
              </button>
              <button
                onClick={handleCancelDeleteBooking}
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

  // Cancel Confirmation Modal
  function CancelConfirmModal() {
    if (!bookingToCancel) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Confirm Cancellation</h3>
            <button
              onClick={handleCancelCancelBooking}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mr-4">
                <AlertCircle className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h4 className="text-lg font-medium text-gray-900">Cancel Booking</h4>
                <p className="text-sm text-gray-500">This will mark the booking as cancelled</p>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-600 mb-1">
                Customer: <strong className="text-gray-900">{bookingToCancel.name}</strong>
              </p>
              <p className="text-sm text-gray-600 mb-1">
                Email: <strong className="text-gray-900">{bookingToCancel.email}</strong>
              </p>
              <p className="text-sm text-gray-600 mb-1">
                Service: <strong className="text-gray-900">{bookingToCancel.service}</strong>
              </p>
              <p className="text-sm text-gray-600">
                Date & Time: <strong className="text-gray-900">
                  {bookingToCancel.date || 'Not set'} {bookingToCancel.time || ''}
                </strong>
              </p>
            </div>
            
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to cancel this booking? The booking will be marked as cancelled but will remain in the system for record keeping.
            </p>
            
            <div className="flex space-x-3">
              <button
                onClick={handleConfirmCancelBooking}
                className="flex-1 bg-orange-600 text-white py-2 px-4 rounded-lg hover:bg-orange-700 transition-colors"
              >
                Cancel Booking
              </button>
              <button
                onClick={handleCancelCancelBooking}
                className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Keep Booking
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Reports View Component
  function ReportsView() {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Reports</h2>
          <p className="text-gray-600 mt-1">Generate and export detailed booking reports</p>
        </div>

        {/* Report Filters */}
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Report Filters</h3>
            <button
              onClick={clearReportFilters}
              className="flex items-center px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Clear Filters
            </button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {/* Date Range Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Filter className="w-4 h-4 inline mr-1" />
                Date Range
              </label>
              <select
                value={reportDateRange}
                onChange={(e) => setReportDateRange(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="select">Select Date Range</option>
                <option value="daily">Today</option>
                <option value="weekly">This Week</option>
                <option value="monthly">This Month</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Filter className="w-4 h-4 inline mr-1" />
                Status
              </label>
              <select
                value={reportStatusFilter}
                onChange={(e) => setReportStatusFilter(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              {reportStatusFilter === 'all' && (
                <p className="text-xs text-blue-600 mt-1">
                  <TrendingUp className="w-3 h-3 inline mr-1" />
                  All bookings regardless of date or status
                </p>
              )}
            </div>
          </div>

          {/* Custom Date Range */}
          {reportDateRange === 'custom' && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                <input
                  type="date"
                  value={reportCustomStartDate}
                  onChange={(e) => setReportCustomStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                <input
                  type="date"
                  value={reportCustomEndDate}
                  onChange={(e) => setReportCustomEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
          )}

          {/* Generate Report Button */}
          <div className="mt-6 flex justify-center sm:justify-start">
            <button
              onClick={generateReport}
              disabled={isGeneratingReport}
              className="w-full sm:w-auto bg-primary-600 text-white py-3 px-6 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-medium"
            >
              {isGeneratingReport ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <TrendingUp className="w-4 h-4 mr-2" />
              )}
              {isGeneratingReport ? 'Generating...' : 'Generate Report'}
            </button>
          </div>
        </div>

        {/* Report Results */}
        {reportData.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            {/* Export Actions */}
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Report Results</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Found {reportData.length} booking(s) matching your criteria
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <button
                  onClick={exportReportToExcel}
                  className="flex items-center justify-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                >
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Export Excel
                </button>
                <button
                  onClick={exportReportToPDF}
                  className="flex items-center justify-center px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Export PDF
                </button>
              </div>
            </div>

            {/* Report Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      #
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="hidden sm:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Service
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="hidden lg:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportData.map((booking, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {index + 1}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8 bg-primary-100 rounded-full flex items-center justify-center">
                            <User className="h-4 w-4 text-primary-600" />
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">{booking.name}</div>
                            <div className="text-sm text-gray-500 sm:hidden">{booking.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div>
                          <div className="flex items-center">
                            <Mail className="h-3 w-3 mr-1" />
                            {booking.email}
                          </div>
                          <div className="flex items-center mt-1">
                            <Phone className="h-3 w-3 mr-1" />
                            {booking.phone}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate">
                          {booking.service}
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {booking.date || 'Not set'}
                      </td>
                      <td className="hidden lg:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {booking.time || 'Not set'}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          booking.status === 'confirmed' 
                            ? 'bg-green-100 text-green-800'
                            : booking.status === 'cancelled'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {booking.status || 'pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary Statistics */}
            <div className="px-4 sm:px-6 py-4 bg-gray-50 border-t border-gray-200">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-900">
                    {reportData.filter(b => b.status === 'confirmed').length}
                  </div>
                  <div className="text-xs text-gray-500">Confirmed</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-900">
                    {reportData.filter(b => !b.status || b.status === 'pending').length}
                  </div>
                  <div className="text-xs text-gray-500">Pending</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-900">
                    {reportData.filter(b => b.status === 'cancelled').length}
                  </div>
                  <div className="text-xs text-gray-500">Cancelled</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-900">
                    {reportData.length}
                  </div>
                  <div className="text-xs text-gray-500">Total</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {reportData.length === 0 && !isGeneratingReport && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Report Generated</h3>
            <p className="text-gray-600 mb-4">
              Select your filters and click "Generate Report" to view booking data.
            </p>
          </div>
        )}
      </div>
    );
  }

  // Booking Details Modal
  function BookingDetailsModal() {
    if (!selectedBooking) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Booking Details</h3>
            <button
              onClick={() => setShowBookingModal(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">{selectedBooking.name}</p>
                <p className="text-sm text-gray-500">{selectedBooking.email}</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-500">Phone:</span>
                <span className="text-sm text-gray-900">{selectedBooking.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-500">Service:</span>
                <span className="text-sm text-gray-900">{selectedBooking.service}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-500">Date:</span>
                <span className="text-sm text-gray-900">{selectedBooking.date || 'Not set'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-500">Time:</span>
                <span className="text-sm text-gray-900">{selectedBooking.time || 'Not set'}</span>
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
            
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 pt-4 border-t border-gray-200">
              {/* Only show action buttons if booking is not cancelled */}
              {selectedBooking.status !== 'cancelled' && (
                <>
                  {selectedBooking.status !== 'confirmed' && (
                    <button
                      onClick={() => {
                        const bookingIndex = allBookings.findIndex(b => 
                          b.name === selectedBooking.name && 
                          b.email === selectedBooking.email && 
                          b.service === selectedBooking.service
                        );
                        if (bookingIndex !== -1) {
                          handleConfirmBooking(selectedBooking, bookingIndex);
                          setShowBookingModal(false);
                        }
                      }}
                      className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                    >
                      Confirm Booking
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowBookingModal(false);
                      handleEditBooking(selectedBooking);
                    }}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center justify-center"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      setShowBookingModal(false);
                      handleDeleteBooking(selectedBooking);
                    }}
                    className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium flex items-center justify-center"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </button>
                </>
              )}
              {/* Close button - always visible but changes styling based on status */}
              <button
                onClick={() => setShowBookingModal(false)}
                className={`${
                  selectedBooking.status === 'cancelled' 
                    ? 'w-full bg-primary-600 text-white hover:bg-primary-700' 
                    : 'flex-1 bg-gray-200 text-gray-800 hover:bg-gray-300'
                } py-2 px-4 rounded-lg transition-colors text-sm font-medium`}
              >
                {selectedBooking.status === 'cancelled' ? 'View Details Only' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Multiple Bookings Modal
  function MultiBookingsModal() {
    if (selectedDateBookings.length === 0) return null;

    const selectedDate = selectedDateBookings[0]?.date;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Bookings for {selectedDate ? new Date(selectedDate).toLocaleDateString() : 'Selected Date'}
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
                        <p className="font-semibold text-gray-900">{booking.name}</p>
                        <p className="text-sm text-gray-500">{booking.email}</p>
                        <p className="text-sm text-gray-600">{booking.service}</p>
                        <div className="flex items-center space-x-4 mt-1">
                          <span className="text-sm text-gray-500">
                            {booking.time ? `${booking.time}` : 'No time set'}
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
                                const bookingIndex = allBookings.findIndex(b => 
                                  b.name === booking.name && 
                                  b.email === booking.email && 
                                  b.service === booking.service
                                );
                                if (bookingIndex !== -1) {
                                  handleConfirmBooking(booking, bookingIndex);
                                  // Update the local state
                                  setSelectedDateBookings(prev => 
                                    prev.map(b => 
                                      b.name === booking.name && b.email === booking.email && b.service === booking.service 
                                        ? { ...b, status: 'confirmed' } 
                                        : b
                                    )
                                  );
                                }
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
                              handleDeleteBooking(booking);
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
          <div className="px-6 py-4 border-t border-gray-200">
            <button
              onClick={() => setShowMultiBookingsModal(false)}
              className="w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Close
            </button>
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
