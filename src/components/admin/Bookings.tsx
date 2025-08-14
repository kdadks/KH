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
  Grid3x3,
  Plus
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
import { createBookingWithCustomer } from '../../utils/customerBookingUtils';
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
  
  // Helper functions to get customer data with fallbacks
  const getCustomerName = (booking: BookingFormData): string => {
    const name = booking.customer_details?.first_name && booking.customer_details?.last_name 
      ? `${booking.customer_details.first_name} ${booking.customer_details.last_name}`
      : booking.customer_name || booking.name || 'Unknown';
    
    console.log('getCustomerName for booking', booking.id, ':', {
      customer_details: booking.customer_details,
      customer_name: booking.customer_name,
      result: name
    });
    
    return name;
  };

  const getCustomerEmail = (booking: BookingFormData): string => {
    const email = booking.customer_details?.email || booking.customer_email || booking.email || 'No email';
    console.log('getCustomerEmail for booking', booking.id, ':', email);
    return email;
  };

  const getCustomerPhone = (booking: BookingFormData): string => {
    const phone = booking.customer_details?.phone || booking.customer_phone || booking.phone || 'No phone';
    console.log('getCustomerPhone for booking', booking.id, ':', phone);
    return phone;
  };
  
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
  
  // New booking modal states
  const [showNewBookingModal, setShowNewBookingModal] = useState(false);
  const [newBookingData, setNewBookingData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    service: '',
    date: '',
    time: '',
    notes: '',
    status: 'pending'
  });
  const [services, setServices] = useState<any[]>([]);
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [loadingTimeSlots, setLoadingTimeSlots] = useState(false);
  const [creatingBooking, setCreatingBooking] = useState(false);
  
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
    // Normalized fields using helper functions
    const customerName = getCustomerName(booking);
    const customerEmail = getCustomerEmail(booking);
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

  // New booking functions
  const fetchServices = async () => {
    try {
      setLoadingServices(true);
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      // Transform services to include pricing options
      const transformedServices: any[] = [];
      data?.forEach((service: any) => {
        const hasInHour = service.in_hour_price && service.in_hour_price.trim() !== '';
        const hasOutOfHour = service.out_of_hour_price && service.out_of_hour_price.trim() !== '';
        const hasMainPrice = service.price && service.price.trim() !== '';

        if (hasInHour && hasOutOfHour) {
          transformedServices.push({
            ...service,
            id: `${service.id}-in`,
            displayName: `${service.name} - In Hour (${service.in_hour_price})`,
            priceType: 'in-hour'
          });
          transformedServices.push({
            ...service,
            id: `${service.id}-out`,
            displayName: `${service.name} - Out of Hour (${service.out_of_hour_price})`,
            priceType: 'out-of-hour'
          });
        } else if (hasInHour || hasOutOfHour || hasMainPrice) {
          let displayName = service.name;
          let priceType = 'standard';
          
          if (hasInHour) {
            displayName = `${service.name} - In Hour (${service.in_hour_price})`;
            priceType = 'in-hour';
          } else if (hasOutOfHour) {
            displayName = `${service.name} - Out of Hour (${service.out_of_hour_price})`;
            priceType = 'out-of-hour';
          } else if (hasMainPrice) {
            displayName = `${service.name} (${service.price})`;
            priceType = 'standard';
          }
          
          transformedServices.push({
            ...service,
            displayName,
            priceType
          });
        }
      });

      setServices(transformedServices);
    } catch (error) {
      console.error('Error fetching services:', error);
    } finally {
      setLoadingServices(false);
    }
  };

  const fetchTimeSlots = async (serviceId: string, selectedDate: string) => {
    if (!serviceId || !selectedDate) {
      setTimeSlots([]);
      return;
    }

    console.log('Fetching time slots for:', { serviceId, selectedDate });

    try {
      setLoadingTimeSlots(true);
      
      // Extract service ID and price type from the composite ID
      let actualServiceId: number;
      let priceType = 'standard';
      
      if (serviceId.includes('-')) {
        const [baseServiceId, type] = serviceId.split('-');
        actualServiceId = parseInt(baseServiceId);
        priceType = type === 'in' ? 'in-hour' : type === 'out' ? 'out-of-hour' : 'standard';
      } else {
        actualServiceId = parseInt(serviceId);
      }

      console.log('Parsed service info:', { actualServiceId, priceType });

      if (!actualServiceId || isNaN(actualServiceId)) {
        console.log('Invalid serviceId, returning');
        setTimeSlots([]);
        return;
      }

      // Fetch time slots for the selected service (don't filter by day initially)
      const { data, error } = await supabase
        .from('services_time_slots')
        .select('*')
        .eq('service_id', actualServiceId)
        .eq('is_available', true)
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true });

      console.log('Time slots query result:', { data, error });

      if (error) {
        console.error('Error fetching time slots:', error);
        setTimeSlots([]);
        return;
      }

      // Filter time slots based on service price type
      let relevantSlots = data || [];
      console.log('All slots before filtering:', relevantSlots);
      
      if (priceType === 'in-hour') {
        relevantSlots = relevantSlots.filter(slot => slot.slot_type === 'in-hour');
      } else if (priceType === 'out-of-hour') {
        relevantSlots = relevantSlots.filter(slot => slot.slot_type === 'out-of-hour');
      }

      console.log('Relevant slots after filtering:', relevantSlots);

      // If no slots found after filtering, show all slots as fallback
      if (relevantSlots.length === 0 && (data || []).length > 0) {
        console.log('No slots found for specific price type, showing all available slots');
        relevantSlots = data || [];
      }

      // Convert time slots to formatted time options
      const timeOptions: string[] = [];
      
      relevantSlots.forEach(slot => {
        // Show the actual time range from database
        const startTime = slot.start_time.substring(0, 5); // Remove seconds (09:00:00 -> 09:00)
        const endTime = slot.end_time.substring(0, 5);     // Remove seconds (17:00:00 -> 17:00)
        
        const startDisplay = formatTimeForDisplay(startTime);
        const endDisplay = formatTimeForDisplay(endTime);
        
        const timeRange = `${startTime}-${endTime}`;
        const displayRange = `${startDisplay} - ${endDisplay}`;
        const timeOption = `${timeRange}|${displayRange}`;
        
        // Only add if not already in array
        if (!timeOptions.includes(timeOption)) {
          timeOptions.push(timeOption);
        }
      });

      console.log('Generated time options:', timeOptions);

      // Remove duplicates using Set and sort by time value
      const uniqueTimeOptions = Array.from(new Set(timeOptions)).sort((a, b) => {
        const timeA = a.split('|')[0];
        const timeB = b.split('|')[0];
        return timeA.localeCompare(timeB);
      });
      
      setTimeSlots(uniqueTimeOptions);
      
    } catch (error) {
      console.error('Error fetching time slots:', error);
      setTimeSlots([]);
    } finally {
      setLoadingTimeSlots(false);
    }
  };

  const formatTimeForDisplay = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const handleOpenNewBookingModal = () => {
    setShowNewBookingModal(true);
    fetchServices();
  };

  const handleCloseNewBookingModal = () => {
    setShowNewBookingModal(false);
    setNewBookingData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      service: '',
      date: '',
      time: '',
      notes: '',
      status: 'pending'
    });
    setTimeSlots([]);
  };

  const handleNewBookingInputChange = (field: string, value: string) => {
    console.log('Input change:', { field, value });
    
    setNewBookingData(prev => {
      const updated = { ...prev, [field]: value };
      
      // Fetch time slots when service or date changes
      if (field === 'service' || field === 'date') {
        const serviceName = field === 'service' ? value : updated.service;
        const date = field === 'date' ? value : updated.date;
        
        console.log('Checking for time slots:', { serviceName, date });
        
        if (serviceName && date) {
          // Find the service object to get the ID
          const selectedService = services.find(s => s.displayName === serviceName);
          console.log('Found service:', selectedService);
          
          if (selectedService) {
            fetchTimeSlots(selectedService.id.toString(), date);
          }
        } else {
          setTimeSlots([]);
        }
      }
      
      return updated;
    });
  };

  const handleCreateNewBooking = async () => {
    if (!newBookingData.firstName || !newBookingData.lastName || !newBookingData.email || 
        !newBookingData.service || !newBookingData.date) {
      showError('Missing Information', 'Please fill in all required fields.');
      return;
    }

    setCreatingBooking(true);
    
    try {
      // Find the selected service to get proper service name
      const selectedService = services.find(s => s.displayName === newBookingData.service);
      const serviceName = selectedService ? selectedService.name : newBookingData.service;

      // Extract timeslot information
      let timeslotStartTime = null;
      let timeslotEndTime = null;
      let bookingDateTime = newBookingData.date;
      
      if (newBookingData.time) {
        if (newBookingData.time.includes('-')) {
          const [startTime, endTime] = newBookingData.time.split('-');
          timeslotStartTime = startTime;
          timeslotEndTime = endTime;
          bookingDateTime = `${newBookingData.date}T${startTime}`;
        } else {
          timeslotStartTime = newBookingData.time;
          bookingDateTime = `${newBookingData.date}T${newBookingData.time}`;
        }
      }

      const customerData = {
        firstName: newBookingData.firstName,
        lastName: newBookingData.lastName,
        email: newBookingData.email,
        phone: newBookingData.phone
      };

      const bookingData = {
        package_name: serviceName, // Use the actual service name, not the display name with pricing
        booking_date: bookingDateTime,
        timeslot_start_time: timeslotStartTime || undefined,
        timeslot_end_time: timeslotEndTime || undefined,
        notes: newBookingData.notes,
        status: newBookingData.status
      };

      const { booking, customer, error } = await createBookingWithCustomer(customerData, bookingData);

      if (error) {
        showError('Booking Failed', error);
        return;
      }

      if (booking && customer) {
        // Add the new booking to the list
        const newBookingForList: BookingFormData = {
          ...booking,
          customer_details: customer,
          customer_name: `${customer.first_name} ${customer.last_name}`,
          customer_email: customer.email,
          customer_phone: customer.phone || ''
        };
        
        setAllBookings([newBookingForList, ...allBookings]);
        showSuccess('Booking Created', 'New booking has been created successfully.');
        handleCloseNewBookingModal();
      }
    } catch (error) {
      console.error('Error creating booking:', error);
      showError('Error', 'Failed to create booking. Please try again.');
    } finally {
      setCreatingBooking(false);
    }
  };

  // Export functions
  const exportToExcel = () => {
    const exportData = filteredBookings.map(booking => ({
      'Customer Name': getCustomerName(booking),
      'Email': getCustomerEmail(booking),
      'Phone': getCustomerPhone(booking),
      'Service': booking.package_name || booking.service || 'N/A',
      'Booking Date': booking.booking_date ? 
        new Date(booking.booking_date).toLocaleDateString() : 
        (booking.appointment_date || booking.date || 'N/A'),
      'Booking Time': booking.booking_date ? 
        new Date(booking.booking_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 
        (booking.appointment_time || booking.time || 'N/A'),
      'Timeslot Start': booking.timeslot_start_time || 'N/A',
      'Timeslot End': booking.timeslot_end_time || 'N/A',
      'Status': booking.status || 'pending',
      'Notes': booking.notes || 'N/A',
      'Created At': booking.created_at || 'N/A'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
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
    
    // Helper to derive date & time prioritizing booking_date column (single source of truth)
    const deriveDateTime = (b: BookingFormData) => {
      if (b.booking_date) {
        // Support ISO 'YYYY-MM-DDTHH:MM:SS' or space separated
        const raw = b.booking_date.trim();
        const dateSeg = raw.includes('T') ? raw.split('T')[0] : raw.split(' ')[0];
        let timeSeg = '';
        if (raw.includes('T')) {
          timeSeg = raw.split('T')[1];
        } else if (raw.includes(' ')) {
          timeSeg = raw.split(' ')[1] || '';
        }
        // Remove timezone / milliseconds if present
        timeSeg = timeSeg.replace(/Z$/, '').split('.')[0];
        if (timeSeg.includes('+')) timeSeg = timeSeg.split('+')[0];
        if (timeSeg.includes('-')) {
          // If timezone offset like -05:00 after seconds
          const parts = timeSeg.split(/-(?=\d{2}:?\d{2}$)/);
          timeSeg = parts[0];
        }
        // Normalize to HH:MM
        if (timeSeg) {
          const parts = timeSeg.split(':');
          if (parts.length >= 2) timeSeg = `${parts[0].padStart(2,'0')}:${parts[1].padStart(2,'0')}`;
          else timeSeg = 'N/A';
        } else {
          timeSeg = 'N/A';
        }
        return { date: dateSeg || 'N/A', time: timeSeg };
      }
      // Fallback legacy fields if booking_date missing
      const dateFallback = b.appointment_date || b.date || b.created_at || 'N/A';
      const datePart = dateFallback === 'N/A' ? 'N/A' : dateFallback.split('T')[0].split(' ')[0];
      const timeFallback = b.appointment_time || b.time || 'N/A';
      let timePart = 'N/A';
      if (timeFallback !== 'N/A') {
        const p = timeFallback.split(':');
        if (p.length >= 2) timePart = `${p[0].padStart(2,'0')}:${p[1].padStart(2,'0')}`;
      }
      return { date: datePart, time: timePart };
    };

    // Prepare table data ensuring normalized date/time always populated
    const tableData = filteredBookings.map(booking => {
      const { date, time } = deriveDateTime(booking);
      const timeslotRange = booking.timeslot_start_time && booking.timeslot_end_time 
        ? `${booking.timeslot_start_time.substring(0, 5)}-${booking.timeslot_end_time.substring(0, 5)}`
        : 'N/A';
      
      return [
        getCustomerName(booking),
        getCustomerEmail(booking),
        getCustomerPhone(booking),
        booking.package_name || booking.service || 'N/A',
        date,
        time,
        timeslotRange,
        booking.status || 'pending'
      ];
    });
    
    // Add table
    autoTable(doc, {
      startY: 50,
      head: [['Customer Name', 'Email', 'Phone', 'Service', 'Date', 'Time', 'Timeslot', 'Status']],
      body: tableData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: '#3b82f6' },
      alternateRowStyles: { fillColor: '#f5f7fa' },
      didParseCell: (data: any) => {
        // Ensure empty cells show N/A explicitly
        if (data.cell.raw === '' || data.cell.raw == null) {
          data.cell.text = ['N/A'];
        }
      }
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
        
        const customerName = getCustomerName(booking);
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
            onClick={handleOpenNewBookingModal}
            className="w-full sm:w-auto flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create New Booking
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
                    {/* Three Column Layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                      
                      {/* Column 1: Customer Info, Email, Date, Service (6 columns on large screens) */}
                      <div className="lg:col-span-5 space-y-2">
                        {/* Customer Name with Status */}
                        <div className="flex items-center space-x-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                            isCancelled ? 'bg-gray-200' : 'bg-primary-100'
                          }`}>
                            <User className={`w-5 h-5 ${
                              isCancelled ? 'text-gray-500' : 'text-primary-600'
                            }`} />
                          </div>
                          <div className="flex items-center space-x-3 min-w-0 flex-1">
                            <h4 className={`text-lg font-medium break-words ${
                              isCancelled ? 'text-gray-500 line-through' : 'text-gray-900'
                            }`}>{getCustomerName(booking)}</h4>
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full flex-shrink-0 ${
                              isCancelled ? 'bg-red-100 text-red-800' :
                              isConfirmed ? 'bg-green-100 text-green-800' :
                              needsDateTime ? 'bg-orange-100 text-orange-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {isCancelled ? 'Cancelled' : isConfirmed ? 'Confirmed' : needsDateTime ? 'Needs Date/Time' : 'Pending'}
                            </span>
                          </div>
                        </div>

                        {/* Content aligned with customer name, not icon */}
                        <div className="ml-14 space-y-2">
                          {/* Email */}
                          <div className="flex items-start space-x-2">
                            <Mail className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm text-gray-600 break-words" title={getCustomerEmail(booking)}>
                                {getCustomerEmail(booking)}
                              </p>
                            </div>
                          </div>

                          {/* Date */}
                          <div className="flex items-start space-x-2">
                            <Calendar className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm text-gray-600">
                                {booking.booking_date ? 
                                  new Date(booking.booking_date).toLocaleDateString() : 
                                  (booking.appointment_date || booking.date || <span className="text-red-500 italic">Not set</span>)
                                }
                              </p>
                            </div>
                          </div>

                          {/* Service */}
                          <div className="flex items-start space-x-2">
                            <div className="w-4 h-4 mt-0.5 flex-shrink-0 flex items-center justify-center">
                              <div className="w-3 h-3 bg-blue-500 rounded-full" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm text-gray-600 break-words">
                                <span className="font-medium">Service:</span> {booking.package_name || booking.service || 'Not specified'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Column 2: Phone, Time Slot, Timeslot Message (4 columns on large screens) */}
                      <div className="lg:col-span-4 space-y-2">
                        {/* Phone Number */}
                        <div className="flex items-start space-x-2">
                          <Phone className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm text-gray-600 break-words" title={getCustomerPhone(booking)}>
                              {getCustomerPhone(booking)}
                            </p>
                          </div>
                        </div>

                        {/* Time Slot */}
                        <div className="flex items-start space-x-2">
                          <Clock className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm text-gray-600">
                              {booking.timeslot_start_time && booking.timeslot_end_time ? (
                                <>
                                  {booking.timeslot_start_time.substring(0, 5)} - {booking.timeslot_end_time.substring(0, 5)}
                                  <span className="text-xs text-gray-500 ml-1">(Timeslot)</span>
                                </>
                              ) : booking.booking_date ? 
                                new Date(booking.booking_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 
                                (booking.appointment_time || booking.time || <span className="text-red-500 italic">Not set</span>)
                              }
                            </p>
                          </div>
                        </div>

                        {/* Timeslot Status Message */}
                        <div className="flex items-start space-x-2">
                          <div className="w-4 h-4 mt-0.5 flex-shrink-0 flex items-center justify-center">
                            <div className={`w-3 h-3 rounded-full ${
                              booking.timeslot_start_time && booking.timeslot_end_time 
                                ? 'bg-green-500' 
                                : 'bg-orange-500'
                            }`} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs text-gray-500">
                              {booking.timeslot_start_time && booking.timeslot_end_time 
                                ? 'Full timeslot booked' 
                                : 'Legacy booking'
                              }
                            </p>
                          </div>
                        </div>

                        {/* Notes if available */}
                        {booking.notes && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-600 break-words">
                              <span className="font-medium">Notes:</span> {booking.notes}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Column 3: Action Buttons (3 columns on large screens) */}
                      <div className="lg:col-span-3 flex flex-row lg:flex-col justify-end lg:justify-start items-center lg:items-end space-x-2 lg:space-x-0 lg:space-y-2 relative z-10">
                        {!isCancelled ? (
                          <>
                            {!isConfirmed && (
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleConfirmBooking(booking);
                                }}
                                className="flex items-center justify-center w-10 h-10 bg-green-100 text-green-700 rounded-full hover:bg-green-200 transition-colors cursor-pointer"
                                title="Confirm Booking"
                                type="button"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleEditBooking(booking);
                              }}
                              className="flex items-center justify-center w-10 h-10 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors cursor-pointer"
                              title="Edit Booking"
                              type="button"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setBookingToDelete(booking);
                                setShowDeleteConfirmModal(true);
                              }}
                              className="flex items-center justify-center w-10 h-10 bg-red-100 text-red-700 rounded-full hover:bg-red-200 transition-colors cursor-pointer"
                              title="Delete Booking"
                              type="button"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setBookingToCancel(booking);
                                setShowCancelConfirmModal(true);
                              }}
                              className="flex items-center justify-center w-10 h-10 bg-orange-100 text-orange-700 rounded-full hover:bg-orange-200 transition-colors cursor-pointer"
                              title="Cancel Booking"
                              type="button"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : null}
                        {/* Details button - Always present for all bookings */}
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSelectedBooking(booking);
                            setShowBookingModal(true);
                          }}
                          className="flex items-center justify-center w-10 h-10 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors cursor-pointer"
                          title="View Details"
                          type="button"
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
                <p className="text-sm text-gray-600">{getCustomerName(editingBooking)}</p>
              </div>
              {editingBooking.timeslot_start_time && editingBooking.timeslot_end_time && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Current Timeslot</label>
                  <p className="text-sm text-gray-600 p-2 bg-blue-50 rounded-lg">
                    {editingBooking.timeslot_start_time.substring(0, 5)} - {editingBooking.timeslot_end_time.substring(0, 5)}
                    <span className="text-xs text-blue-600 ml-2">(Full timeslot)</span>
                  </p>
                </div>
              )}
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
                {editingBooking.timeslot_start_time && editingBooking.timeslot_end_time && (
                  <p className="text-xs text-gray-500 mt-1">
                    Note: Editing time will override the original timeslot information
                  </p>
                )}
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
              Are you sure you want to delete the booking for <span className="font-medium">{getCustomerName(bookingToDelete)}</span>? 
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
              Are you sure you want to cancel the booking for <span className="font-medium">{getCustomerName(bookingToCancel)}</span>?
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
                  <p className="font-semibold text-gray-900">{getCustomerName(selectedBooking)}</p>
                  <p className="text-sm text-gray-500">{getCustomerEmail(selectedBooking)}</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-500">Phone:</span>
                  <span className="text-sm text-gray-900">{getCustomerPhone(selectedBooking)}</span>
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
                    {selectedBooking.timeslot_start_time && selectedBooking.timeslot_end_time ? (
                      <div className="flex flex-col">
                        <span>
                          {selectedBooking.timeslot_start_time.substring(0, 5)} - {selectedBooking.timeslot_end_time.substring(0, 5)}
                        </span>
                        <span className="text-xs text-gray-500">(Full timeslot)</span>
                      </div>
                    ) : selectedBooking.booking_date ? 
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
                          <p className="font-semibold text-gray-900">{getCustomerName(booking)}</p>
                          <p className="text-sm text-gray-500">{getCustomerEmail(booking)}</p>
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

      {/* New Booking Modal */}
      {showNewBookingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white rounded-t-xl">
              <h3 className="text-lg font-semibold text-gray-900">Create New Booking</h3>
              <button
                onClick={handleCloseNewBookingModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6 overflow-y-auto">
              {/* Customer Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">First Name *</label>
                  <input
                    type="text"
                    value={newBookingData.firstName}
                    onChange={(e) => handleNewBookingInputChange('firstName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="John"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Last Name *</label>
                  <input
                    type="text"
                    value={newBookingData.lastName}
                    onChange={(e) => handleNewBookingInputChange('lastName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                  <input
                    type="email"
                    value={newBookingData.email}
                    onChange={(e) => handleNewBookingInputChange('email', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="john@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={newBookingData.phone}
                    onChange={(e) => handleNewBookingInputChange('phone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="+353 123 456 789"
                  />
                </div>
              </div>

              {/* Service and Appointment Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Service *</label>
                  <select
                    value={newBookingData.service}
                    onChange={(e) => handleNewBookingInputChange('service', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    disabled={loadingServices}
                  >
                    <option value="">Select a service</option>
                    {services.map((service) => (
                      <option key={service.id} value={service.displayName}>
                        {service.displayName}
                      </option>
                    ))}
                  </select>
                  {loadingServices && (
                    <p className="text-xs text-gray-500 mt-1">Loading services...</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date *</label>
                  <input
                    type="date"
                    value={newBookingData.date}
                    onChange={(e) => handleNewBookingInputChange('date', e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Time Slot</label>
                  <select
                    value={newBookingData.time}
                    onChange={(e) => handleNewBookingInputChange('time', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    disabled={loadingTimeSlots || !newBookingData.service || !newBookingData.date}
                  >
                    <option value="">Select a time slot</option>
                    {timeSlots.map((slot) => {
                      const [timeRange, displayRange] = slot.split('|');
                      return (
                        <option key={timeRange} value={timeRange}>
                          {displayRange}
                        </option>
                      );
                    })}
                  </select>
                  {loadingTimeSlots && (
                    <p className="text-xs text-gray-500 mt-1">Loading available times...</p>
                  )}
                  {!loadingTimeSlots && timeSlots.length === 0 && newBookingData.service && newBookingData.date && (
                    <p className="text-xs text-orange-600 mt-1">No available time slots for selected service and date.</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={newBookingData.status}
                    onChange={(e) => handleNewBookingInputChange('status', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={newBookingData.notes}
                  onChange={(e) => handleNewBookingInputChange('notes', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Additional notes or special requirements..."
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3 bg-gray-50 rounded-b-xl">
              <button
                onClick={handleCloseNewBookingModal}
                disabled={creatingBooking}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateNewBooking}
                disabled={creatingBooking || !newBookingData.firstName || !newBookingData.lastName || 
                         !newBookingData.email || !newBookingData.service || !newBookingData.date}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {creatingBooking ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </>
                ) : (
                  'Create Booking'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
