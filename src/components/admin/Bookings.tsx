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
  Trash2,
  Eye,
  FileSpreadsheet,
  FileText,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  List,
  Grid3x3,
  Plus,
  Euro,
  Loader2
} from 'lucide-react';
import { Calendar as BigCalendar, momentLocalizer, View, Views } from 'react-big-calendar';
import moment from 'moment';
import { BookingFormData } from './types';
import { decryptCustomerDataForAdmin } from '../../utils/adminGdprUtils';
import { treatmentPackages } from '../../data/packages';

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

interface ServiceType {
  id: string;
  name: string;
  displayName: string;
  price?: number | string;
  in_hour_price?: string;
  out_of_hour_price?: string;
  duration?: number;
  description?: string;
  priceType?: string;
}

interface PaymentRequest {
  id: string;
  booking_id?: string;
  customer_id: number;
  amount: number;
  status: string;
  notes?: string;
  payment_due_date?: string;
  created_at: string;
  updated_at?: string;
}

interface Payment {
  id: string;
  booking_id?: string;
  customer_id: number;
  amount: number;
  status: string;
  payment_method?: string;
  payment_date?: string;
  created_at: string;
}

interface BookingPaymentStatus {
  paymentRequest: PaymentRequest | null;
  payment: Payment | null;
  paymentType?: 'deposit' | 'full' | null;
}

interface AvailabilitySlot {
  id: number;
  date: string;
  start_time: string;
  end_time: string;
  start?: string; // Alternative field name used in some contexts
  end?: string;   // Alternative field name used in some contexts
  is_available: boolean;
  slot_type?: string;
}

import { useToast } from '../shared/toastContext';
import { supabase } from '../../supabaseClient';
import { createBookingWithCustomer } from '../../utils/customerBookingUtils';
import { createPaymentRequest, fixBookingStatusBasedOnPayments } from '../../utils/paymentRequestUtils';
import RescheduleModal from '../user/RescheduleModal';
import { validateEmail, validateName, validatePhoneNumber, validateNotes } from '../../utils/formValidation';
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
  onRefresh?: () => void;
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
    return name;
  };

  const getCustomerEmail = (booking: BookingFormData): string => {
    const email = booking.customer_details?.email || booking.customer_email || booking.email || 'No email';
    return email;
  };

  const getCustomerPhone = (booking: BookingFormData): string => {
    const phone = booking.customer_details?.phone || booking.customer_phone || booking.phone || 'No phone';
    return phone;
  };
  
  // State management
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'confirmed' | 'cancelled'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [bookingToDelete, setBookingToDelete] = useState<BookingFormData | null>(null);
  const [showCancelConfirmModal, setShowCancelConfirmModal] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState<BookingFormData | null>(null);
  
  // Reschedule state management
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [bookingToReschedule, setBookingToReschedule] = useState<BookingFormData | null>(null);
  
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
    customStartTime: '',
    customEndTime: '',
    notes: '',
    status: 'pending'
  });

  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});
  const [services, setServices] = useState<ServiceType[]>([]);
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [loadingTimeSlots, setLoadingTimeSlots] = useState(false);
  const [creatingBooking, setCreatingBooking] = useState(false);
  
  // Payment request state
  const [bookingPaymentStatus, setBookingPaymentStatus] = useState<Map<string, BookingPaymentStatus>>(new Map());
  const [bookingDepositAmounts, setBookingDepositAmounts] = useState<Map<string, number>>(new Map());
  const [loadingPaymentStatus, setLoadingPaymentStatus] = useState(false);


  // Booking confirmation loading state
  const [confirmingBookings, setConfirmingBookings] = useState<Set<string>>(new Set());
  
  // Booking cancellation loading state
  const [cancellingBookings, setCancellingBookings] = useState<Set<string>>(new Set());
  
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

  // Auto-refresh bookings data every 5 minutes (reduced frequency)
  useEffect(() => {
    const interval = setInterval(() => {
      // Trigger refresh of bookings from parent component
      window.dispatchEvent(new CustomEvent('refreshBookings'));
    }, 300000); // 300 seconds (5 minutes)

    return () => clearInterval(interval);
  }, []);

  // Listen for booking updates from other parts of the app
  useEffect(() => {
    const handleBookingUpdate = () => {
      window.dispatchEvent(new CustomEvent('refreshBookings'));
    };

    const handleBookingStatusUpdate = (event: Event) => {
      // Force refresh of bookings to reflect the status change
      window.dispatchEvent(new CustomEvent('refreshBookings'));
    };

    window.addEventListener('bookingUpdated', handleBookingUpdate);
    window.addEventListener('availabilityUpdated', handleBookingUpdate);
    window.addEventListener('bookingStatusUpdated', handleBookingStatusUpdate);

    return () => {
      window.removeEventListener('bookingUpdated', handleBookingUpdate);
      window.removeEventListener('availabilityUpdated', handleBookingUpdate);
      window.removeEventListener('bookingStatusUpdated', handleBookingStatusUpdate);
    };
  }, []); // Empty dependency array - event listeners should only be set up once

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

    // Get the primary appointment date for filtering
    const appointmentDate = booking.appointment_date || booking.date || booking.booking_date || '';
    const appointmentDateOnly = appointmentDate ? appointmentDate.split('T')[0].split(' ')[0] : '';

    // For range comparisons, collect all possible date sources
    const rawDates: string[] = [
      booking.appointment_date,
      booking.date,
      booking.booking_date,
      booking.created_at
    ].filter((d): d is string => !!d);

    // Extract date-only (YYYY-MM-DD) portions for range filtering
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

    // Normalize status by trimming whitespace and converting to lowercase for comparison
    const rawStatus = booking.status?.trim() || '';
    const normalizedBookingStatus = rawStatus.toLowerCase();
    const normalizedStatusFilter = statusFilter.toLowerCase();
    
    // Treat empty/null status as 'pending'
    const effectiveStatus = normalizedBookingStatus || 'pending';
    
    const matchesStatus =
      statusFilter === 'all' ||
      effectiveStatus === normalizedStatusFilter;

    // For date filter, only check appointment date (not all date fields)
    const matchesDate = !filterDate || appointmentDateOnly === filterDate;

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
  // Enhanced availability check that auto-matches to available slots
  const checkBookingAvailabilityWithAutoMatch = async (booking: BookingFormData): Promise<{
    hasAvailability: boolean;
    message?: string;
    matchedSlot?: AvailabilitySlot;
    bookingDate?: string
  }> => {
    try {
      // Extract booking date and time
      let bookingDate: string = '';

      console.log('🔍 Auto-match availability check for booking:', {
        booking_date: booking.booking_date,
        appointment_date: booking.appointment_date,
        appointment_time: booking.appointment_time,
        time: booking.time,
        date: booking.date,
        timeslot_start_time: booking.timeslot_start_time,
        timeslot_end_time: booking.timeslot_end_time
      });


      // First try to get the requested date
      if (booking.appointment_date) {
        bookingDate = booking.appointment_date;
      } else if (booking.date) {
        bookingDate = booking.date;
      } else if (booking.booking_date && booking.booking_date.includes('T')) {
        const [dateStr] = booking.booking_date.split('T');
        if (dateStr) {
          bookingDate = dateStr;
        }
      }

      if (!bookingDate) {
        return {
          hasAvailability: false,
          message: 'Cannot auto-match: Missing booking date.'
        };
      }

      // Fetch availability slots for the requested date
      const { data: availabilitySlots, error } = await supabase
        .from('availability')
        .select('*')
        .eq('date', bookingDate)
        .eq('is_available', true) // Only fetch available slots
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Error fetching availability slots:', error);
        return {
          hasAvailability: false,
          message: 'Error checking availability. Please try again.'
        };
      }

      console.log('🔍 Raw availability slots from database:', availabilitySlots?.map(slot => ({
        id: slot.id,
        date: slot.date,
        start_time: slot.start_time,
        end_time: slot.end_time,
        start: slot.start,
        is_available: slot.is_available,
        slot_type: slot.slot_type
      })));

      if (!availabilitySlots || availabilitySlots.length === 0) {
        return {
          hasAvailability: false,
          message: `No availability slots found for ${new Date(bookingDate + 'T00:00:00').toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}. Please create availability slots for this date before confirming the booking.`
        };
      }

      // Extract the requested booking start and end times
      // Prefer explicit timeslot fields over booking_date to avoid timezone issues
      let requestedStartTime = '';
      let requestedEndTime = '';

      if (booking.timeslot_start_time) {
        requestedStartTime = booking.timeslot_start_time.substring(0, 5); // Remove seconds: 08:00:00 -> 08:00
      } else if (booking.appointment_time) {
        requestedStartTime = booking.appointment_time.substring(0, 5);
      } else if (booking.time) {
        requestedStartTime = booking.time.substring(0, 5);
      } else if (booking.booking_date && booking.booking_date.includes('T')) {
        const timeStr = booking.booking_date.split('T')[1];
        if (timeStr) {
          requestedStartTime = timeStr.substring(0, 5); // Get HH:MM format
        }
      }

      // Get the end time if available
      if (booking.timeslot_end_time) {
        requestedEndTime = booking.timeslot_end_time.substring(0, 5); // Remove seconds: 08:50:00 -> 08:50
      } else if (requestedStartTime) {
        // If no end time, assume 50-minute session (default therapy session)
        const [hours, minutes] = requestedStartTime.split(':').map(Number);
        const endMinutes = minutes + 50;
        const endHours = hours + Math.floor(endMinutes / 60);
        const finalMinutes = endMinutes % 60;
        requestedEndTime = `${endHours.toString().padStart(2, '0')}:${finalMinutes.toString().padStart(2, '0')}`;
      }

      // Helper function to normalize time format (remove seconds if present)
      const normalizeTime = (timeStr: string): string => {
        if (!timeStr) return '';
        return timeStr.substring(0, 5); // Get HH:MM format, removing seconds
      };

      // Check if this is an all-day booking - look for multiple indicators
      const isAllDayBooking = (requestedStartTime === '09:00' && normalizeTime(requestedEndTime) === '17:00') ||
                             (normalizeTime(booking.timeslot_start_time || '') === '09:00' && normalizeTime(booking.timeslot_end_time || '') === '17:00') ||
                             // Check if booking_date indicates 09:00 start time with explicit timeslot_end_time of 17:00
                             (requestedStartTime === '09:00' && normalizeTime(booking.timeslot_end_time || '') === '17:00');

      console.log('🔍 Extracted times after processing:', {
        requestedStartTime,
        requestedEndTime,
        'booking.timeslot_start_time': booking.timeslot_start_time,
        'booking.timeslot_end_time': booking.timeslot_end_time,
        'normalized_start': normalizeTime(booking.timeslot_start_time || ''),
        'normalized_end': normalizeTime(booking.timeslot_end_time || ''),
        isAllDayBooking
      });

      console.log(`🔍 Looking for slot that contains: ${requestedStartTime} - ${requestedEndTime} on ${bookingDate}${isAllDayBooking ? ' (ALL-DAY BOOKING)' : ''}`);

      if (!requestedStartTime) {
        return {
          hasAvailability: false,
          message: 'Cannot check availability: Missing requested time information.'
        };
      }

      // Helper function to convert time string to minutes
      const timeToMinutes = (timeStr: string): number => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
      };

      const requestedStartMinutes = timeToMinutes(requestedStartTime);
      const requestedEndMinutes = timeToMinutes(requestedEndTime);

      // Check for already booked slots to avoid conflicts
      // Use date range filtering instead of 'like' on timestamp column
      const startOfDay = `${bookingDate}T00:00:00`;
      const endOfDay = `${bookingDate}T23:59:59`;

      const { data: existingBookings, error: bookingError } = await supabase
        .from('bookings')
        .select('booking_date, timeslot_start_time, timeslot_end_time')
        .eq('status', 'confirmed')
        .gte('booking_date', startOfDay)
        .lte('booking_date', endOfDay);

      if (bookingError) {
        console.error('Error checking existing bookings:', bookingError);
      }

      // Handle all-day bookings differently
      if (isAllDayBooking) {
        // For all-day bookings, check if there are ANY available slots between 9am-5pm
        const allDayStartMinutes = timeToMinutes('09:00');
        const allDayEndMinutes = timeToMinutes('17:00');

        // Find slots that overlap with the 9am-5pm range
        const overlappingSlots = availabilitySlots.filter(slot => {
          const slotStartTime = slot.start_time || slot.start || '';
          const slotEndTime = slot.end_time || '';

          if (!slotStartTime || !slotEndTime) return false;

          const slotStartMinutes = timeToMinutes(slotStartTime);
          const slotEndMinutes = timeToMinutes(slotEndTime);

          // Check if slot overlaps with 9am-5pm range
          return !(slotEndMinutes <= allDayStartMinutes || slotStartMinutes >= allDayEndMinutes);
        });

        if (overlappingSlots.length === 0) {
          return {
            hasAvailability: false,
            message: `No availability slots found between 9:00 AM - 5:00 PM for ${new Date(bookingDate + 'T00:00:00').toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}. Please create availability slots for this time range before confirming the all-day booking.`
          };
        }

        // Check if any existing bookings conflict with the entire 9am-5pm range
        const hasConflictingBookings = existingBookings?.some(existingBooking => {
          const existingDateTime = existingBooking.booking_date;
          if (!existingDateTime || !existingDateTime.includes('T')) return false;

          const existingStartTime = existingDateTime.split('T')[1]?.substring(0, 5);
          const existingEndTime = existingBooking.timeslot_end_time;

          if (!existingStartTime) return false;

          const existingStartMinutes = timeToMinutes(existingStartTime);
          const existingEndMinutes = existingEndTime ? timeToMinutes(existingEndTime) : existingStartMinutes + 50;

          // Check for any overlap with the 9am-5pm range
          return !(existingEndMinutes <= allDayStartMinutes || existingStartMinutes >= allDayEndMinutes);
        });

        if (hasConflictingBookings) {
          return {
            hasAvailability: false,
            message: `There are existing bookings that conflict with the all-day booking (9:00 AM - 5:00 PM) on ${new Date(bookingDate + 'T00:00:00').toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}. Please check existing bookings first.`
          };
        }

        const matchingSlot = overlappingSlots[0]; // Use first available slot as reference
        console.log('✅ Found availability for all-day booking:', {
          overlappingSlots: overlappingSlots.length,
          date: bookingDate,
          timeRange: '09:00 - 17:00'
        });

        return {
          hasAvailability: true,
          matchedSlot: matchingSlot,
          bookingDate,
          message: `All-day booking availability confirmed for ${new Date(bookingDate + 'T00:00:00').toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}.`
        };
      }

      // Original logic for specific time bookings
      console.log('🔍 Availability slots found for matching:', availabilitySlots.map(slot => ({
        id: slot.id,
        start: slot.start_time || slot.start,
        end: slot.end_time,
        is_available: slot.is_available,
        slot_type: slot.slot_type
      })));

      const matchingSlot = availabilitySlots.find(slot => {
        const slotStartTime = slot.start_time || slot.start || '';
        const slotEndTime = slot.end_time || '';

        console.log('🔍 Checking slot for match:', {
          slotId: slot.id,
          slotStartTime,
          slotEndTime,
          slotIsAvailable: slot.is_available,
          requestedRange: `${requestedStartTime} - ${requestedEndTime}`
        });

        if (!slotStartTime || !slotEndTime) {
          console.log('❌ Slot missing start/end time');
          return false;
        }

        const slotStartMinutes = timeToMinutes(slotStartTime);
        const slotEndMinutes = timeToMinutes(slotEndTime);

        console.log('🔍 Time comparison:', {
          requested: `${requestedStartMinutes} - ${requestedEndMinutes} minutes`,
          slot: `${slotStartMinutes} - ${slotEndMinutes} minutes`,
          fitsStart: requestedStartMinutes >= slotStartMinutes,
          fitsEnd: requestedEndMinutes <= slotEndMinutes
        });

        // Check if the requested booking falls within this availability slot
        // Use exact match first (for slots that exactly match the booking time)
        const isExactMatch = requestedStartMinutes === slotStartMinutes &&
                            requestedEndMinutes === slotEndMinutes;

        // Then check if booking fits within slot (for larger slots)
        const bookingFitsInSlot = requestedStartMinutes >= slotStartMinutes &&
                                 requestedEndMinutes <= slotEndMinutes;

        console.log(`🔍 Slot ${slot.id} matching results:`, {
          isExactMatch,
          bookingFitsInSlot,
          slotRange: `${slotStartMinutes}-${slotEndMinutes}`,
          requestedRange: `${requestedStartMinutes}-${requestedEndMinutes}`
        });

        // Accept either exact match or fitting within slot
        const slotCanAccommodate = isExactMatch || bookingFitsInSlot;

        // If exact fit doesn't work, also check for overlapping slots that could potentially work
        const hasOverlap = !(requestedEndMinutes <= slotStartMinutes || requestedStartMinutes >= slotEndMinutes);
        if (!slotCanAccommodate && hasOverlap) {
          console.log(`⚠️ Slot ${slot.id} overlaps but doesn't fully contain the booking time`);
        }

        if (slotCanAccommodate) {
          console.log(`✅ Slot ${slot.id} can accommodate booking - checking for conflicts...`);

          // Check if this slot time is already taken by another confirmed booking
          console.log(`🔍 Checking ${existingBookings?.length || 0} existing bookings for conflicts...`);

          const isSlotConflicted = existingBookings?.some(existingBooking => {
            const existingDateTime = existingBooking.booking_date;
            if (!existingDateTime || !existingDateTime.includes('T')) return false;

            const existingStartTime = existingDateTime.split('T')[1]?.substring(0, 5);
            const existingEndTime = existingBooking.timeslot_end_time;

            if (!existingStartTime) return false;

            const existingStartMinutes = timeToMinutes(existingStartTime);
            const existingEndMinutes = existingEndTime ? timeToMinutes(existingEndTime) : existingStartMinutes + 50;

            // Check for time overlap between existing booking and requested booking
            const hasOverlap = !(requestedEndMinutes <= existingStartMinutes || requestedStartMinutes >= existingEndMinutes);

            console.log(`🔍 Checking conflict with existing booking:`, {
              existing: `${existingStartTime}-${existingEndTime}`,
              existingMinutes: `${existingStartMinutes}-${existingEndMinutes}`,
              hasOverlap
            });

            return hasOverlap;
          });

          return !isSlotConflicted; // Return true only if no conflicts
        }

        return false;
      });

      if (matchingSlot) {
        console.log('✅ Found containing slot:', {
          slotId: matchingSlot.id,
          requestedTime: `${requestedStartTime} - ${requestedEndTime}`,
          availableSlot: `${matchingSlot.start_time || matchingSlot.start} - ${matchingSlot.end_time}`,
          date: bookingDate
        });

        return {
          hasAvailability: true,
          matchedSlot: matchingSlot,
          bookingDate: bookingDate
        };
      }

      // No available slot found for the requested time (either no slot exists or all matching slots are conflicted)
      const formattedDate = new Date(bookingDate + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      const formatTime = (timeStr: string) => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        const period = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
        return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
      };

      // Check if we found slots that matched but were conflicted
      const hadMatchingSlots = availabilitySlots.some(slot => {
        const slotStartTime = slot.start_time || slot.start || '';
        const slotEndTime = slot.end_time || '';
        if (!slotStartTime || !slotEndTime) return false;

        const slotStartMinutes = timeToMinutes(slotStartTime);
        const slotEndMinutes = timeToMinutes(slotEndTime);

        // Check if slot could contain the booking
        return requestedStartMinutes >= slotStartMinutes && requestedEndMinutes <= slotEndMinutes;
      });

      // Show available slots to help with debugging
      const availableSlotsList = availabilitySlots
        .filter(slot => slot.is_available)
        .map(slot => {
          const start = slot.start_time || slot.start;
          const end = slot.end_time;
          return `${formatTime(start)} - ${formatTime(end)}`;
        })
        .join(', ');

      let message;
      if (hadMatchingSlots) {
        message = `The time slot ${formatTime(requestedStartTime)} - ${formatTime(requestedEndTime)} on ${formattedDate} is already booked by another confirmed appointment. Please choose a different time or check existing bookings.`;
      } else {
        const debugMessage = availableSlotsList
          ? `Available slots on this date: ${availableSlotsList}`
          : 'No available slots found on this date';
        message = `No availability slot found that can contain the booking from ${formatTime(requestedStartTime)} to ${formatTime(requestedEndTime)} on ${formattedDate}. ${debugMessage}. Please create or adjust availability slots to accommodate this booking time.`;
      }

      return {
        hasAvailability: false,
        message
      };

    } catch (error) {
      console.error('Error in auto-match availability check:', error);
      return {
        hasAvailability: false,
        message: 'Error checking availability. Please try again.'
      };
    }
  };

  // Helper function to find the availability slot that matches a booking
  const findMatchingAvailabilitySlot = async (booking: BookingFormData): Promise<AvailabilitySlot | null> => {
    try {
      // Extract booking date and time from the booking
      let bookingDate: string;
      let bookingTime: string;

      if (booking.booking_date) {
        // Parse booking_date field
        console.log('🔍 Parsing booking_date for slot matching:', booking.booking_date);

        if (booking.booking_date.includes('T')) {
          // ISO format: "2024-09-16T14:50:00"
          const [dateStr, timeWithZone] = booking.booking_date.split('T');
          const timeStr = timeWithZone.split(':').slice(0, 2).join(':');
          bookingDate = dateStr;
          bookingTime = timeStr;
        } else {
          // Date only: "2024-09-16" - use appointment_time
          bookingDate = booking.booking_date;
          bookingTime = booking.appointment_time || booking.timeslot_start_time || '';
        }
      } else if (booking.appointment_date && booking.appointment_time) {
        // Use appointment_date and appointment_time
        bookingDate = booking.appointment_date;
        bookingTime = booking.appointment_time;
      } else {
        console.warn('❌ Cannot extract booking date/time for slot matching - available fields:', {
          booking_date: booking.booking_date,
          appointment_date: booking.appointment_date,
          appointment_time: booking.appointment_time,
          timeslot_start_time: booking.timeslot_start_time,
          timeslot_end_time: booking.timeslot_end_time
        });
        return null;
      }

      console.log('🔍 Looking for availability slot for:', { bookingDate, bookingTime, bookingStatus: booking.status });

      // Fetch availability slots for the booking date
      const { data: availabilitySlots, error } = await supabase
        .from('availability')
        .select('id, date, start_time, end_time, start, is_available')
        .eq('date', bookingDate);

      if (error) {
        console.error('❌ Error fetching availability slots:', error);
        return null;
      }

      console.log('🔍 Found availability slots for date:', availabilitySlots?.length || 0, availabilitySlots);

      if (!availabilitySlots || availabilitySlots.length === 0) {
        console.log('❌ No availability slots found for date:', bookingDate);
        return null;
      }

      // Helper function to convert time string to minutes
      const timeToMinutes = (timeStr: string): number => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
      };

      // Find slot that contains this booking time
      const matchingSlot = availabilitySlots.find(slot => {
        const slotStartTime = slot.start_time || slot.start || '';
        const slotEndTime = slot.end_time || '';

        console.log('🔍 Checking slot:', {
          slotId: slot.id,
          slotStartTime,
          slotEndTime,
          slotIsAvailable: slot.is_available
        });

        if (!slotStartTime || !slotEndTime || !bookingTime) {
          console.log('❌ Missing time data for slot check');
          return false;
        }

        // Convert times to minutes for comparison
        const bookingMinutes = timeToMinutes(bookingTime);
        const slotStartMinutes = timeToMinutes(slotStartTime);
        const slotEndMinutes = timeToMinutes(slotEndTime);

        // Check if booking falls within the slot
        const isWithinSlot = bookingMinutes >= slotStartMinutes && bookingMinutes < slotEndMinutes;

        console.log('🔍 Checking slot match:', {
          slotId: slot.id,
          slotStart: slotStartTime,
          slotEnd: slotEndTime,
          bookingTime,
          bookingMinutes,
          slotStartMinutes,
          slotEndMinutes,
          isWithinSlot
        });

        return isWithinSlot;
      });

      if (matchingSlot) {
        console.log('✅ Found matching availability slot:', matchingSlot.id);
        return matchingSlot;
      } else {
        console.log('❌ No matching availability slot found');
        return null;
      }

    } catch (error) {
      console.error('❌ Error finding matching availability slot:', error);
      return null;
    }
  };

  // Helper function to check if booking has availability (original logic)
  const checkBookingAvailability = async (booking: BookingFormData): Promise<{ hasAvailability: boolean; message?: string }> => {
    try {
      // Extract booking date and time
      let bookingDate: string = '';
      let bookingTime: string = '';

      if (booking.booking_date) {
        console.log('🔍 Parsing booking_date for availability check:', booking.booking_date);
      console.log('🔍 All booking time fields:', {
        booking_date: booking.booking_date,
        appointment_date: booking.appointment_date,
        appointment_time: booking.appointment_time,
        time: booking.time,
        date: booking.date,
        timeslot_start_time: booking.timeslot_start_time,
        timeslot_end_time: booking.timeslot_end_time
      });

        // Handle range format like "2025-09-16T14:50-15:40"
        if (booking.booking_date.includes('T') && booking.booking_date.includes('-')) {
          const lastDashIndex = booking.booking_date.lastIndexOf('-');
          console.log('🔍 Last dash index:', lastDashIndex, 'in string:', booking.booking_date);

          if (lastDashIndex > 10) { // Ensure it's not the date separator
            // Extract the datetime part before the end time
            const dateTimeStr = booking.booking_date.substring(0, lastDashIndex);
            console.log('🔍 Extracted datetime string:', dateTimeStr);

            const [dateStr, timeStr] = dateTimeStr.split('T');
            console.log('🔍 Split result - dateStr:', dateStr, 'timeStr:', timeStr);

            if (dateStr && timeStr) {
              bookingDate = dateStr;
              bookingTime = timeStr;
              console.log('🔍 Parsed from range format - Date:', bookingDate, 'Time:', bookingTime);
            }
          } else {
            console.log('🔍 Last dash index too early, might be date separator');
          }
        }

        // Fallback: Direct ISO string parsing to avoid timezone issues
        if (!bookingDate || !bookingTime) {
          console.log('🔍 Attempting direct ISO string parsing to avoid timezone conversion');

          // For ISO strings like "2025-09-16T14:50:00+00:00", extract components directly
          if (booking.booking_date.includes('T')) {
            const [dateStr, timeWithZone] = booking.booking_date.split('T');
            const timeStr = timeWithZone.split(':').slice(0, 2).join(':'); // Get HH:MM, ignore seconds and timezone

            if (dateStr && timeStr) {
              bookingDate = dateStr;
              bookingTime = timeStr;
              console.log('🔍 Parsed from ISO string directly - Date:', bookingDate, 'Time:', bookingTime);
            }
          }

          // Final fallback to JavaScript Date if direct parsing failed
          if (!bookingDate || !bookingTime) {
            console.log('🔍 Falling back to JavaScript Date parsing (with timezone conversion)');
            const bookingDateTime = new Date(booking.booking_date);
            if (!isNaN(bookingDateTime.getTime())) {
              const year = bookingDateTime.getFullYear();
              const month = String(bookingDateTime.getMonth() + 1).padStart(2, '0');
              const day = String(bookingDateTime.getDate()).padStart(2, '0');
              const hours = String(bookingDateTime.getHours()).padStart(2, '0');
              const minutes = String(bookingDateTime.getMinutes()).padStart(2, '0');

              bookingDate = `${year}-${month}-${day}`;
              bookingTime = `${hours}:${minutes}`;
              console.log('🔍 Parsed from JavaScript Date - Date:', bookingDate, 'Time:', bookingTime);
            }
          }
        }
      } else if (booking.appointment_date && (booking.appointment_time || booking.time)) {
        bookingDate = booking.appointment_date;
        bookingTime = booking.appointment_time || booking.time || '';
      } else if (booking.date && (booking.appointment_time || booking.time)) {
        bookingDate = booking.date;
        bookingTime = booking.appointment_time || booking.time || '';
      }

      if (!bookingDate || !bookingTime) {
        return {
          hasAvailability: false,
          message: 'Cannot confirm booking: Missing date or time information. Please set the appointment date and time first.'
        };
      }

      // Check if there's an availability slot for this booking
      const { data: availabilitySlots, error } = await supabase
        .from('availability')
        .select('id, date, start_time, end_time, start, is_available')
        .eq('date', bookingDate)
        .eq('is_available', true); // Only get available slots

      if (error) {
        console.error('Error checking availability:', error);
        return {
          hasAvailability: false,
          message: 'Error checking availability. Please try again.'
        };
      }

      console.log('🔍 Availability check results:', {
        bookingDate,
        bookingTime,
        availabilitySlots: availabilitySlots?.map(slot => ({
          id: slot.id,
          date: slot.date,
          start_time: slot.start_time,
          end_time: slot.end_time,
          start: slot.start,
          is_available: slot.is_available
        }))
      });

      if (!availabilitySlots || availabilitySlots.length === 0) {
        return {
          hasAvailability: false,
          message: `No availability slots found for ${new Date(bookingDate + 'T00:00:00').toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}. Please create availability slots for this date before confirming the booking.`
        };
      }

      // Check if booking time falls within any availability slot
      const hasMatchingSlot = availabilitySlots.some(slot => {
        const slotStartTime = slot.start_time || slot.start || '';
        const slotEndTime = slot.end_time || '';

        console.log('🔍 Checking slot:', {
          slotId: slot.id,
          slotStartTime,
          slotEndTime,
          bookingTime
        });

        if (!slotStartTime || !slotEndTime) {
          console.log('❌ Slot missing start or end time');
          return false;
        }

        // Convert times to comparable format (remove seconds if present)
        const bookingTimeFormatted = bookingTime.length === 5 ? bookingTime : bookingTime.substring(0, 5);
        const slotStartFormatted = slotStartTime.length === 5 ? slotStartTime : slotStartTime.substring(0, 5);
        const slotEndFormatted = slotEndTime.length === 5 ? slotEndTime : slotEndTime.substring(0, 5);

        const isWithinSlot = bookingTimeFormatted >= slotStartFormatted && bookingTimeFormatted < slotEndFormatted;

        console.log('🔍 Time comparison:', {
          bookingTimeFormatted,
          slotStartFormatted,
          slotEndFormatted,
          isWithinSlot,
          condition: `${bookingTimeFormatted} >= ${slotStartFormatted} && ${bookingTimeFormatted} < ${slotEndFormatted}`
        });

        return isWithinSlot;
      });

      if (!hasMatchingSlot) {
        const formattedDate = new Date(bookingDate + 'T00:00:00').toLocaleDateString('en-US', { 
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        const formattedTime = (() => {
          const [hours, minutes] = bookingTime.split(':').map(Number);
          const period = hours >= 12 ? 'PM' : 'AM';
          const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
          return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
        })();

        return {
          hasAvailability: false,
          message: `No availability slot found for ${formattedDate} at ${formattedTime}. Please create an availability slot for this time before confirming the booking.`
        };
      }

      return { hasAvailability: true };
    } catch (error) {
      console.error('Error in availability check:', error);
      return {
        hasAvailability: false,
        message: 'Error checking availability. Please try again.'
      };
    }
  };

  // Helper function to check for existing confirmed bookings in the same time slot
  const checkForConflictingBookings = async (booking: BookingFormData): Promise<{ hasConflict: boolean; conflictDetails?: Record<string, unknown>; message?: string }> => {
    try {
      // Extract booking date and time
      let bookingDate: string = '';
      let bookingStartTime: string = '';
      let bookingEndTime: string = '';

      // Helper function to convert time to minutes
      const timeToMinutes = (timeStr: string): number => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
      };

      // Extract date from booking_date (which is usually just the date part)
      if (booking.booking_date) {
        const bookingDateTime = new Date(booking.booking_date);
        if (!isNaN(bookingDateTime.getTime())) {
          const year = bookingDateTime.getUTCFullYear();
          const month = String(bookingDateTime.getUTCMonth() + 1).padStart(2, '0');
          const day = String(bookingDateTime.getUTCDate()).padStart(2, '0');
          bookingDate = `${year}-${month}-${day}`;
        }
      } else if (booking.appointment_date) {
        bookingDate = booking.appointment_date;
      } else if (booking.date) {
        bookingDate = booking.date;
      }

      // Extract time from timeslot fields (this is the actual appointment time)
      if (booking.timeslot_start_time && booking.timeslot_end_time) {
        bookingStartTime = booking.timeslot_start_time;
        bookingEndTime = booking.timeslot_end_time;
      } else if (booking.appointment_time) {
        bookingStartTime = booking.appointment_time;
        // Estimate end time as 50 minutes later if not provided
        const startMinutes = timeToMinutes(booking.appointment_time);
        const endMinutes = startMinutes + 50;
        bookingEndTime = `${Math.floor(endMinutes / 60).toString().padStart(2, '0')}:${(endMinutes % 60).toString().padStart(2, '0')}`;
      }

      if (!bookingDate || !bookingStartTime) {
        return {
          hasConflict: false,
          message: 'Cannot check for conflicts: Missing date or time information.'
        };
      }

      // Check for other confirmed bookings at the same date and time
      // We need to exclude the current booking if we're updating an existing one
      const { data: existingBookings, error } = await supabase
        .from('bookings')
        .select('id, booking_reference, booking_date, timeslot_start_time, timeslot_end_time, status, customer_id, package_name')
        .eq('status', 'confirmed')
        .neq('id', booking.id || '00000000-0000-0000-0000-000000000000'); // Exclude current booking if exists

      if (error) {
        console.error('Error checking for conflicting bookings:', error);
        // Return false conflict to allow booking to proceed if check fails
        return {
          hasConflict: false,
          message: 'Could not verify conflicts, proceeding with confirmation.'
        };
      }

      // Check each existing booking to see if it conflicts with our time slot
      const conflictingBookings = existingBookings?.filter(existingBooking => {
        // First check if dates match
        const existingDateTime = new Date(existingBooking.booking_date);
        const year = existingDateTime.getUTCFullYear();
        const month = String(existingDateTime.getUTCMonth() + 1).padStart(2, '0');
        const day = String(existingDateTime.getUTCDate()).padStart(2, '0');
        const existingDate = `${year}-${month}-${day}`;

        if (existingDate !== bookingDate) {
          return false; // Different dates, no conflict
        }

        // Same date, now check time overlap using timeslot fields
        const existingStartTime = existingBooking.timeslot_start_time;
        const existingEndTime = existingBooking.timeslot_end_time;

        if (!existingStartTime || !existingEndTime) {
          return false; // Can't compare without time data
        }

        // Convert times to minutes for easier comparison
        const newStartMinutes = timeToMinutes(bookingStartTime);
        const newEndMinutes = timeToMinutes(bookingEndTime);
        const existingStartMinutes = timeToMinutes(existingStartTime);
        const existingEndMinutes = timeToMinutes(existingEndTime);

        // Check for time overlap: two time ranges overlap if one doesn't end before the other starts
        const hasTimeOverlap = !(newEndMinutes <= existingStartMinutes || newStartMinutes >= existingEndMinutes);

        return hasTimeOverlap;
      }) || [];

      if (conflictingBookings.length > 0) {
        const conflictedBooking = conflictingBookings[0];
        
        // Get customer details for the conflicting booking
        let customerName = 'Unknown Customer';
        let customerEmail = '';
        
        if (conflictedBooking.customer_id) {
          const { data: customerData, error: customerError } = await supabase
            .from('customers')
            .select('first_name, last_name, email')
            .eq('id', conflictedBooking.customer_id)
            .single();
            
          if (customerData && !customerError) {
            // Decrypt customer data for admin viewing
            try {
              const decryptedCustomer = decryptCustomerDataForAdmin(customerData);
              customerName = `${decryptedCustomer.first_name} ${decryptedCustomer.last_name}`;
              customerEmail = decryptedCustomer.email || '';
            } catch (decryptError) {
              console.error('Error decrypting customer data for conflict:', decryptError);
              customerName = 'Customer Data Unavailable';
              customerEmail = 'Email Unavailable';
            }
          }
        }
        
        const packageName = conflictedBooking.package_name || 'Unknown Package';

        // Format the conflicting booking date and time using the timeslot fields
        const conflictedDate = new Date(conflictedBooking.booking_date);
        const formattedDate = conflictedDate.toLocaleDateString('en-US', { 
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        
        // Use timeslot_start_time for the actual appointment time
        const conflictedStartTime = conflictedBooking.timeslot_start_time || '00:00';
        const conflictedEndTime = conflictedBooking.timeslot_end_time || '00:50';
        
        const formatTime = (timeStr: string) => {
          const [hours, minutes] = timeStr.split(':').map(Number);
          const period = hours >= 12 ? 'PM' : 'AM';
          const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
          return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
        };

        return {
          hasConflict: true,
          conflictDetails: conflictedBooking,
          message: `🚫 BOOKING CONFLICT DETECTED\n\n` +
                  `❌ Cannot confirm booking - this time slot is already taken!\n\n` +
                  `📅 Conflicting Date: ${formattedDate}\n` +
                  `🕐 Conflicting Time: ${formatTime(conflictedStartTime)} - ${formatTime(conflictedEndTime)}\n\n` +
                  `📋 EXISTING BOOKING DETAILS:\n` +
                  `👤 Customer Name: ${customerName}\n` +
                  `📧 Email Address: ${customerEmail}\n` +
                  `📦 Service Package: ${packageName}\n` +
                  `🆔 Booking Reference: #${conflictedBooking.booking_reference || conflictedBooking.id}\n\n` +
                  `💡 SOLUTION:\n` +
                  `• Choose a different time slot, OR\n` +
                  `• Cancel the existing booking first\n\n` +
                  `Note: You can edit or cancel the existing booking using the reference ID above.`
        };
      }
      
      return { hasConflict: false };
    } catch (error) {
      console.error('Error checking for conflicting bookings:', error);
      return {
        hasConflict: false,
        message: 'Error checking for existing bookings. Please try again.'
      };
    }
  };

  const handleConfirmBooking = async (booking: BookingFormData) => {    const bookingId = booking.id?.toString() || '';

    // Add booking to confirming set
    setConfirmingBookings(prev => new Set([...prev, bookingId]));

    try {
      // Helper function to normalize time format (remove seconds if present)
      const normalizeTime = (timeStr: string): string => {
        if (!timeStr) return '';
        return timeStr.substring(0, 5); // Get HH:MM format, removing seconds
      };

      // Check if this is a full-day booking
      const isFullDayBooking = booking.timeslot_start_time === 'full-day' ||
                              booking.timeslot_end_time === 'full-day' ||
                              (normalizeTime(booking.timeslot_start_time || '') === '09:00' && normalizeTime(booking.timeslot_end_time || '') === '17:00');

      if (isFullDayBooking) {
        // For full-day bookings, check if there are ANY available slots during business hours
        const bookingDate = booking.booking_date?.split('T')[0] || booking.appointment_date;

        if (!bookingDate) {
          showError('Cannot Confirm Booking', 'Booking date is required for full-day booking.');
          return;
        }

        // First check if there are any available slots for this date for validation
        const { data: availableSlots, error: slotsError } = await supabase
          .from('availability')
          .select('id, start_time, end_time, is_available')
          .eq('date', bookingDate)
          .eq('is_available', true);

        if (slotsError) {
          console.error('Error checking availability for full-day booking:', slotsError);
          showError('Cannot Confirm Booking', 'Error checking availability. Please try again.');
          return;
        }

        if (!availableSlots || availableSlots.length === 0) {
          showError('Cannot Confirm Booking', 'No available time slots found for this date. Please check the availability calendar.');
          return;
        }

        // Now get ALL slots for the date (both available and unavailable) to mark them as unavailable
        const { data: allSlots } = await supabase
          .from('availability')
          .select('id, start_time, end_time, is_available')
          .eq('date', bookingDate);

        if (slotsError) {
          console.error('❌ Error checking availability for full-day booking:', slotsError);
          showError('Cannot Confirm Booking', 'Error checking availability. Please try again.');
          return;
        }

        if (!availableSlots || availableSlots.length === 0) {
          showError('Cannot Confirm Booking', 'No available time slots found for this date. Please check the availability calendar.');
          return;
        }

        console.log(`✅ Found ${availableSlots.length} available slots for full-day booking`);

        // Update booking status
        const updateData: Record<string, unknown> = {
          status: 'confirmed'
        };

        const { error } = await supabase
          .from('bookings')
          .update(updateData)
          .eq('id', booking.id);

        if (error) {
          console.error('Database update error:', error);
          throw new Error(`Failed to update booking: ${error.message}`);
        }

        // Mark availability slots between 9am-5pm as unavailable
        const timeToMinutes = (timeStr: string): number => {
          const [hours, minutes] = timeStr.split(':').map(Number);
          return hours * 60 + minutes;
        };

        const allDayStartMinutes = timeToMinutes('09:00');
        const allDayEndMinutes = timeToMinutes('17:00');

        // Filter ALL slots that overlap with 9am-5pm range (not just available ones)
        const slotsToUpdate = allSlots?.filter(slot => {
          const slotStartMinutes = timeToMinutes(slot.start_time);
          const slotEndMinutes = timeToMinutes(slot.end_time);
          // Check if slot overlaps with 9am-5pm range
          return !(slotEndMinutes <= allDayStartMinutes || slotStartMinutes >= allDayEndMinutes);
        }) || [];

        if (slotsToUpdate.length > 0) {
          const slotIds = slotsToUpdate.map(slot => slot.id);

          const { error: availabilityError } = await supabase
            .from('availability')
            .update({ is_available: false })
            .in('id', slotIds);

          if (availabilityError) {
            console.error('Failed to update availability slots for all-day booking:', availabilityError);
            // Don't throw error - booking is already confirmed, just log the issue
          }
        }
      } else {
        // Regular time-specific booking logic
        // Check availability before confirming and try to find matching slot
        const availabilityCheck = await checkBookingAvailabilityWithAutoMatch(booking);

        if (!availabilityCheck.hasAvailability) {
          console.log('⚠️ No matching availability slot found, attempting to auto-create one...');
          
          // Extract booking date and time for auto-creation
          const bookingDate = booking.booking_date?.split('T')[0] || booking.appointment_date;
          const bookingStartTime = booking.timeslot_start_time || '10:00:00';
          const bookingEndTime = booking.timeslot_end_time || '10:50:00';
          
          if (bookingDate && bookingStartTime && bookingEndTime) {
            try {
              console.log('🔧 Auto-creating availability slot:', {
                date: bookingDate,
                start_time: bookingStartTime,
                end_time: bookingEndTime
              });
              
              // Create the missing availability slot
              const { data: newSlot, error: createSlotError } = await supabase
                .from('availability')
                .insert([{
                  date: bookingDate,
                  start_time: bookingStartTime,
                  start: bookingStartTime, // Also set the 'start' field for compatibility
                  end_time: bookingEndTime,
                  is_available: false, // Mark as unavailable since we're confirming the booking
                  slot_type: 'in-hour' // Default slot type
                }])
                .select()
                .single();
              
              if (createSlotError) {
                console.error('❌ Failed to auto-create availability slot:', createSlotError);
                showError('Cannot Confirm Booking', availabilityCheck.message || 'No availability found for this booking time.');
                return;
              }
              
              console.log('✅ Auto-created availability slot:', newSlot);
              
              // Continue with confirmation since we just created the slot
            } catch (createError) {
              console.error('❌ Error auto-creating availability slot:', createError);
              showError('Cannot Confirm Booking', availabilityCheck.message || 'No availability found for this booking time.');
              return;
            }
          } else {
            showError('Cannot Confirm Booking', availabilityCheck.message || 'No availability found for this booking time.');
            return;
          }
        }
        
        // Check for conflicting bookings
        const conflictCheck = await checkForConflictingBookings(booking);

        if (conflictCheck.hasConflict) {          showError('Booking Conflict Detected', conflictCheck.message || 'This time slot is already taken by another confirmed booking.');
          return;
        }

        // Update booking with confirmed status and matched slot time if available
        const updateData: Record<string, unknown> = {
          status: 'confirmed'
        };

        if (availabilityCheck.matchedSlot) {
          // Update the timeslot fields to ensure consistency
          const slotStartTime = availabilityCheck.matchedSlot.start_time || availabilityCheck.matchedSlot.start;
          const slotEndTime = availabilityCheck.matchedSlot.end_time;

          if (slotStartTime) {
            updateData.timeslot_start_time = slotStartTime;
            if (slotEndTime) {
              updateData.timeslot_end_time = slotEndTime;
            }

            // Don't update booking_date during confirmation to avoid timezone issues
            // The booking should keep its original booking_date and we only update the status and slot fields
          }
        }

        const { error } = await supabase
          .from('bookings')
          .update(updateData)
          .eq('id', booking.id);

        if (error) {
          console.error('Database update error:', error);
          throw new Error(`Failed to update booking: ${error.message}`);
        }

        // CRITICAL: Update the availability table to mark the slot as unavailable
        if (availabilityCheck.matchedSlot && availabilityCheck.matchedSlot.id) {

          const { error: availabilityError } = await supabase
            .from('availability')
            .update({ is_available: false })
            .eq('id', availabilityCheck.matchedSlot.id);

          if (availabilityError) {
            console.error('Failed to update availability slot:', availabilityError);
            // Don't throw error - booking is already confirmed, just log the issue
          }
        }
      }

      const updatedBookings = [...allBookings];
      const actualIndex = allBookings.findIndex(b => b.id === booking.id);
      if (actualIndex !== -1) {
        updatedBookings[actualIndex] = { ...updatedBookings[actualIndex], status: 'confirmed' };
        setAllBookings(updatedBookings);
      }

      // Send booking confirmation emails using the proper workflow
      try {
        const { integrateAdminConfirmationEmailWorkflow } = await import('../../utils/emailWorkflowIntegration');
        
        const result = await integrateAdminConfirmationEmailWorkflow(
          booking.id!,
          'info@khtherapy.ie' // Admin email
        );

        if (result.success) {
          showSuccess('Booking Confirmed', 'Booking confirmed and confirmation emails sent to customer and admin!');
        } else {
          const errorDetails = result.errors?.length > 0 ? result.errors.join('; ') : 'Unknown email error';
          showError('Email Failed', `Booking confirmed but email sending failed: ${errorDetails}. Please contact customer manually.`);
        }

        // Trigger availability view refresh to show the booking as confirmed
        // Add a small delay to ensure database transaction is committed
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('bookingUpdated'));
        }, 500);
      } catch (emailError) {
        const errorMessage = emailError instanceof Error ? emailError.message : 'Unknown error';
        showError('Email Failed', `Booking confirmed but email system failed: ${errorMessage}. Please contact customer manually.`);

        // Trigger availability view refresh even if email failed
        // Add a small delay to ensure database transaction is committed
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('bookingUpdated'));
        }, 500);
      }
    } catch (error) {
      console.error('❌ BOOKING CONFIRMATION ERROR: Full error details:', {
        error,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        bookingId: booking.id,
        bookingDate: booking.booking_date
      });
      showError('Error', `Failed to confirm booking. ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      // Remove booking from confirming set
      setConfirmingBookings(prev => {
        const updated = new Set(prev);
        updated.delete(bookingId);
        return updated;
      });
    }
  };


  // Payment request functions
  const checkBookingPaymentStatus = async (booking: BookingFormData, retryCount = 0) => {
    if (!booking.customer_id) return { paymentRequest: null, payment: null, paymentType: null };


    const maxRetries = 3;
    const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 5000); // Exponential backoff, max 5s

    try {
      // Check for payment requests - first try to match by booking_id, then fall back to customer_id + service matching
      const paymentRequestQuery = await supabase
        .from('payment_requests')
        .select('*')
        .eq('booking_id', booking.id)
        .order('created_at', { ascending: false });

      let paymentRequests = paymentRequestQuery.data;
      const requestError = paymentRequestQuery.error;

      if (requestError) {
        console.error('Error checking payment requests by booking_id:', requestError);


        // Check if this is a network/QUIC error that we should retry
        if (requestError.message?.includes('Failed to fetch') || requestError.message?.includes('QUIC') || requestError.message?.includes('network')) {
          if (retryCount < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            return checkBookingPaymentStatus(booking, retryCount + 1);
          } else {
            console.error('Max retries reached for payment status check');
            throw requestError;
          }
        }
      }

      // If no booking_id match found, fall back to customer_id and service name matching (for legacy requests)
      if (!paymentRequests || paymentRequests.length === 0) {
        const { data: legacyRequests, error: legacyError } = await supabase
          .from('payment_requests')
          .select('*')
          .eq('customer_id', booking.customer_id)
          .order('created_at', { ascending: false });

        if (legacyError) {
          console.error('Error checking legacy payment requests:', legacyError);

          // Record the failure for circuit breaker

          // Check if this is a network/QUIC error that we should retry
          if (legacyError.message?.includes('Failed to fetch') || legacyError.message?.includes('QUIC') || legacyError.message?.includes('network')) {
            if (retryCount < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, retryDelay));
              return checkBookingPaymentStatus(booking, retryCount + 1);
            }
          }
        }

        // Filter by service name in notes for legacy requests
        if (legacyRequests && booking.package_name) {
          paymentRequests = legacyRequests.filter(req => 
            req.notes && req.notes.toLowerCase().includes(booking.package_name.toLowerCase())
          );
        }
      }

      // Get the most recent matching payment request
      const matchingPaymentRequest = paymentRequests && paymentRequests.length > 0 ? paymentRequests[0] : null;

      // Check for completed payments - match by booking_id first, then fallback to service name matching
      const { data: payments, error: paymentError } = await supabase
        .from('payments')
        .select('*')
        .eq('customer_id', booking.customer_id)
        .in('status', ['paid', 'processing'])
        .order('created_at', { ascending: false });

      if (paymentError) {
        console.error('Error checking payments:', paymentError);

        // Record the failure for circuit breaker

        // Check if this is a network/QUIC error that we should retry
        if (paymentError.message?.includes('Failed to fetch') || paymentError.message?.includes('QUIC') || paymentError.message?.includes('network')) {
          if (retryCount < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            return checkBookingPaymentStatus(booking, retryCount + 1);
          }
        }
      }

      // Try to match payment by booking_id first (most accurate)
      let matchingPayment = null;
      if (payments && booking.id) {
        matchingPayment = payments.find(payment => payment.booking_id === booking.id);
        
        // Fallback: try to match by service name in notes (for legacy payments)
        if (!matchingPayment && booking.package_name) {
          matchingPayment = payments.find(payment => 
            payment.notes && payment.notes.toLowerCase().includes(booking.package_name.toLowerCase())
          );
          
          if (matchingPayment) {
            // Payment found by service name matching for legacy payments
          }
        }
        
        // Last resort: don't use any payment to avoid showing wrong amounts
        // This prevents showing incorrect payment amounts for different services
      }

      // Determine payment type from payment request notes field
      let paymentType: 'deposit' | 'full' | null = null;
      if (matchingPaymentRequest?.notes) {
        const notes = matchingPaymentRequest.notes.toLowerCase();
        if (notes.includes('deposit') || notes.includes('20%')) {
          paymentType = 'deposit';
        } else if (notes.includes('full') || notes.includes('100%') || notes.includes('full payment')) {
          paymentType = 'full';
        }
      }

      // If payment exists, also check its payment type field
      if (matchingPayment) {
        // Check sumup_payment_type field in payments table
        const paymentTypeField = (matchingPayment as any).sumup_payment_type;
        if (paymentTypeField === 'deposit' || paymentTypeField === 'full') {
          paymentType = paymentTypeField;
        }
        // Also check notes in payment record
        if (!paymentType && matchingPayment.notes) {
          const paymentNotes = matchingPayment.notes.toLowerCase();
          if (paymentNotes.includes('deposit') || paymentNotes.includes('20%')) {
            paymentType = 'deposit';
          } else if (paymentNotes.includes('full') || paymentNotes.includes('100%') || paymentNotes.includes('full payment')) {
            paymentType = 'full';
          }
        }
      }

      return {
        paymentRequest: matchingPaymentRequest,
        payment: matchingPayment,
        paymentType
      };
    } catch (error) {
      console.error('Error checking payment status:', error);

      // Record the failure for circuit breaker

      return { paymentRequest: null, payment: null, paymentType: null };
    }
  };

  // Manual booking status fix function
  const handleFixBookingStatus = async (booking: BookingFormData) => {
    if (!booking.id) {
      showError('Error', 'Booking ID is missing');
      return;
    }

    try {
      setLoadingPaymentStatus(true);
      console.log('🔧 Manually fixing booking status for:', booking.id);

      const result = await fixBookingStatusBasedOnPayments(booking.id);

      if (result.success) {
        showSuccess('Booking Status Fixed', result.message);

        // Refresh the booking data
        window.dispatchEvent(new CustomEvent('refreshBookings'));

      } else {
        showError('Fix Failed', result.message);
      }
    } catch (error) {
      console.error('Error fixing booking status:', error);
      showError('Error', 'Failed to fix booking status');
    } finally {
      setLoadingPaymentStatus(false);
    }
  };

  const handleCreatePaymentRequest = async (booking: BookingFormData) => {
    if (!booking.customer_id || !booking.package_name) {
      showError('Error', 'Missing customer or service information');
      return;
    }

    try {
      setLoadingPaymentStatus(true);
      
      await createPaymentRequest(
        booking.customer_id,
        booking.package_name,
        booking.booking_date || new Date().toISOString(),
        null, // invoiceId
        booking.id // bookingId - now string UUID
      );

      showSuccess('Payment Request Created', 'Deposit payment request has been sent to the customer');
      
    } catch (error) {
      console.error('Error creating payment request:', error);
      showError('Error', 'Failed to create payment request. Please try again.');
    } finally {
      setLoadingPaymentStatus(false);
    }
  };


  // Load payment status for visible bookings
  useEffect(() => {
    const loadPaymentStatus = async () => {
      if (currentPageBookings.length === 0) return;
      
      setLoadingPaymentStatus(true);
      try {
        const statusMap = new Map();
        const depositMap = new Map();
        
        for (const booking of currentPageBookings) {
          if (booking.customer_id && booking.id) {
            // Fetch actual payment status for each booking
            const paymentStatus = await checkBookingPaymentStatus(booking);
            statusMap.set(booking.id, paymentStatus);

            // Calculate deposit amount for this booking (cached/simplified)
            if (booking.package_name) {
              // Use a simple default amount instead of API call
              const depositAmount = 75; // Default deposit amount
              depositMap.set(booking.id, depositAmount);
            }
          }
        }
        
        setBookingPaymentStatus(statusMap);
        setBookingDepositAmounts(depositMap);
      } catch (error) {
        console.error('Error loading payment status:', error);
      } finally {
        setLoadingPaymentStatus(false);
      }
    };

    loadPaymentStatus();
  }, [currentPage, searchTerm, statusFilter, filterDate, filterRange]);

  // Helper function to process booking data for editing
  // Delete booking
  const handleDeleteBooking = async () => {
    if (!bookingToDelete) return;

    try {
      // First, delete associated payment requests to prevent orphaned records
      console.log('🗑️ Deleting associated payment requests for booking:', bookingToDelete.id);
      const { data: deletedPaymentRequests, error: paymentRequestError } = await supabase
        .from('payment_requests')
        .delete()
        .eq('booking_id', bookingToDelete.id)
        .select('id, service_name, amount');

      if (paymentRequestError) {
        console.error('❌ Failed to delete associated payment requests:', {
          error: paymentRequestError,
          bookingId: bookingToDelete.id
        });
        // Don't throw error - continue with booking deletion
      } else {
        console.log('✅ Deleted associated payment requests:', {
          count: deletedPaymentRequests?.length || 0,
          requests: deletedPaymentRequests
        });
      }

      // Also delete associated payments
      const { data: deletedPayments, error: paymentError } = await supabase
        .from('payments')
        .delete()
        .eq('booking_id', bookingToDelete.id)
        .select('id, amount');

      if (paymentError) {
        console.error('❌ Failed to delete associated payments:', {
          error: paymentError,
          bookingId: bookingToDelete.id
        });
        // Don't throw error - continue with booking deletion
      } else {
        console.log('✅ Deleted associated payments:', {
          count: deletedPayments?.length || 0,
          payments: deletedPayments
        });
      }

      // Second, find the matching availability slot if the booking was confirmed
      let matchingSlot = null;
      if (bookingToDelete.status === 'confirmed') {
        console.log('🔍 Finding availability slot to restore for deleted booking:', bookingToDelete.id);
        matchingSlot = await findMatchingAvailabilitySlot(bookingToDelete);
      }

      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('id', bookingToDelete.id);

      if (error) throw error;

      // Restore availability slot if one was found
      if (matchingSlot) {
        const { data: updateData, error: availabilityError } = await supabase
          .from('availability')
          .update({ is_available: true })
          .eq('id', matchingSlot.id)
          .select();

        if (availabilityError) {
          console.error('❌ Failed to restore availability slot:', {
            error: availabilityError,
            slotId: matchingSlot.id
          });
          // Don't throw error - booking is already deleted
        } else {
          console.log('✅ Availability slot restored to available:', {
            updatedData: updateData,
            slotId: matchingSlot.id
          });
        }
      } else {
        console.log('❌ No matching slot found to restore - this may be expected if booking was not confirmed or slot was manually created');
      }

      setAllBookings(allBookings.filter(booking => booking.id !== bookingToDelete.id));

      setShowDeleteConfirmModal(false);
      setBookingToDelete(null);
      showSuccess('Booking Deleted', 'The booking has been deleted successfully.');

      // Trigger availability view refresh
      setTimeout(() => {
        console.log('📡 Dispatching bookingUpdated event from booking deletion...');
        window.dispatchEvent(new CustomEvent('bookingUpdated'));
      }, 500);

    } catch (error) {
      console.error('Error deleting booking:', error);
      showError('Error', 'Failed to delete booking. Please try again.');
    }
  };

  // Cancel booking
  const handleCancelBooking = async () => {
    if (!bookingToCancel) return;

    const bookingId = bookingToCancel.id?.toString() || '';
    
    // Add booking to cancelling set to prevent multiple clicks
    setCancellingBookings(prev => new Set([...prev, bookingId]));

    try {
      // First, find the matching availability slot if the booking was confirmed
      let matchingSlot = null;
      if (bookingToCancel.status === 'confirmed') {
        console.log('🔍 Finding availability slot to restore for cancelled booking:', bookingToCancel.id);
        matchingSlot = await findMatchingAvailabilitySlot(bookingToCancel);
      }

      // Use the integrated booking cancellation workflow that handles email notification and payment request cancellation
      const { integrateBookingCancellationWorkflow } = await import('../../utils/emailWorkflowIntegration');
      
      const cancellationResult = await integrateBookingCancellationWorkflow(
        bookingToCancel.id!,
        'Booking cancelled by admin',
        'If you made a payment, our team will contact you about refund processing within 2-3 business days.'
      );

      if (!cancellationResult.success) {
        console.error('❌ Email notification failed:', cancellationResult.errors);
        // Show warning but don't stop the process since booking was already cancelled
        showError('Warning', `Booking cancelled successfully, but email notification failed: ${cancellationResult.errors.join(', ')}`);
      } else {
        console.log('✅ Booking cancellation workflow completed successfully');
        showSuccess('Booking Cancelled', 'The booking has been cancelled successfully. Customer has been notified via email and any pending payment requests have been cancelled.');
      }

      // Restore availability slot if one was found
      if (matchingSlot) {
        const { data: updateData, error: availabilityError } = await supabase
          .from('availability')
          .update({ is_available: true })
          .eq('id', matchingSlot.id)
          .select();

        if (availabilityError) {
          console.error('❌ Failed to restore availability slot:', {
            error: availabilityError,
            slotId: matchingSlot.id
          });
          showError('Warning', 'Booking cancelled but failed to restore availability slot. Please check availability manually.');
        } else {
          console.log('✅ Availability slot restored to available:', {
            updatedData: updateData,
            slotId: matchingSlot.id
          });
        }
      } else if (bookingToCancel.status === 'confirmed') {
        console.log('⚠️ No matching slot found to restore - this may be expected if booking was manually created without slot reservation');
      }

      const updatedBookings = allBookings.map(booking =>
        booking.id === bookingToCancel.id
          ? { ...booking, status: 'cancelled' }
          : booking
      );
      setAllBookings(updatedBookings);

      setShowCancelConfirmModal(false);
      setBookingToCancel(null);

      // Trigger availability view refresh
      setTimeout(() => {
        console.log('📡 Dispatching bookingUpdated event from booking cancellation...');
        window.dispatchEvent(new CustomEvent('bookingUpdated'));
      }, 500);

    } catch (error) {
      console.error('Error cancelling booking:', error);
      showError('Error', 'Failed to cancel booking. Please try again.');
    } finally {
      // Remove booking from cancelling set
      setCancellingBookings(prev => {
        const newSet = new Set(prev);
        newSet.delete(bookingId);
        return newSet;
      });
    }
  };

  // Reschedule booking
  const handleReschedule = (booking: BookingFormData) => {
    setBookingToReschedule(booking);
    setShowRescheduleModal(true);
  };

  const handleRescheduleComplete = async (
    oldDate?: string,
    oldTime?: string,
    newDate?: string,
    newTime?: string,
    reason?: string
  ) => {
    setShowRescheduleModal(false);
    
    try {
      // If we have rescheduling details, send email notification
      if (bookingToReschedule && oldDate && oldTime && newDate && newTime) {
        console.log('📧 Sending rescheduling email notification...');
        
        // Import the rescheduling workflow integration
        const { integrateBookingReschedulingWorkflow } = await import('../../utils/emailWorkflowIntegration');
        
        const result = await integrateBookingReschedulingWorkflow(
          bookingToReschedule.id!,
          newDate,
          newTime,
          {
            reschedule_reason: reason || 'Rescheduled by admin',
            reschedule_note: 'Your appointment has been rescheduled. Please check the new details below.',
            rescheduled_by: 'admin',
            old_appointment_date: oldDate,
            old_appointment_time: oldTime
          }
        );

        if (result.success) {
          console.log('✅ Rescheduling email notification sent successfully');
          showSuccess('Success', 'Booking rescheduled and customer notified via email');
        } else {
          console.error('❌ Failed to send rescheduling email:', result.errors);
          showError('Warning', 'Booking rescheduled but email notification failed');
        }
      }
    } catch (error) {
      console.error('Error in rescheduling workflow:', error);
      showError('Warning', 'Booking rescheduled but email notification failed');
    }
    
    setBookingToReschedule(null);
    // Refresh bookings data
    window.dispatchEvent(new CustomEvent('refreshBookings'));
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
      const transformedServices: ServiceType[] = [];
      data?.forEach((service) => {
        const hasInHour = service.in_hour_price && typeof service.in_hour_price === 'string' && service.in_hour_price.trim() !== '';
        const hasOutOfHour = service.out_of_hour_price && typeof service.out_of_hour_price === 'string' && service.out_of_hour_price.trim() !== '';
        const hasMainPrice = service.price && typeof service.price === 'string' && service.price.trim() !== '';

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

  // Helper function to get full package information with pricing
  const getFullPackageInfo = (serviceName: string): string => {
    if (!serviceName) return 'Not specified';
    
    // If the service name already contains pricing information (parentheses with €), return as-is
    if (serviceName.includes('(€') || serviceName.includes('($')) {
      return serviceName;
    }
    
    // If no pricing info, find the package in treatmentPackages and add basic info
    const pkg = treatmentPackages.find(p => p.name === serviceName);
    if (!pkg) return serviceName; // Return original if not found
    
    // For services without existing pricing, just add a simple indicator that it's a package
    // This handles cases where the service name is stored without pricing details
    if (pkg.price) {
      return `${pkg.name} (${pkg.price})`;
    } else if (pkg.inHourPrice && pkg.outOfHourPrice) {
      // Only show "Package" indicator since we don't know which rate was booked
      return `${pkg.name} (Package)`;
    } else if (pkg.inHourPrice) {
      return `${pkg.name} (${pkg.inHourPrice})`;
    } else if (pkg.outOfHourPrice) {
      return `${pkg.name} (${pkg.outOfHourPrice})`;
    }
    
    return serviceName;
  };

  // Helper function to check if a service is "Contact for Quote"
  const isContactForQuoteService = (serviceDisplayName: string): boolean => {
    // First check the processed services list (this handles displayNames with pricing)
    const selectedService = services.find(s => s.displayName === serviceDisplayName);
    if (selectedService) {
      return (
        (selectedService.price && typeof selectedService.price === 'string' && selectedService.price.toLowerCase().includes('contact for quote')) ||
        (selectedService.in_hour_price && selectedService.in_hour_price.toLowerCase().includes('contact for quote')) ||
        (selectedService.out_of_hour_price && selectedService.out_of_hour_price.toLowerCase().includes('contact for quote'))
      ) ? true : false;
    }
    
    // Fallback: check against original packages data (for raw service names from database)
    const originalPackage = treatmentPackages.find(pkg => pkg.name === serviceDisplayName);
    if (originalPackage) {
      return Boolean(
        (originalPackage.price && originalPackage.price.toLowerCase().includes('contact for quote')) ||
        (originalPackage.inHourPrice && originalPackage.inHourPrice.toLowerCase().includes('contact for quote')) ||
        (originalPackage.outOfHourPrice && originalPackage.outOfHourPrice.toLowerCase().includes('contact for quote'))
      );
    }
    
    // Final fallback: if service name doesn't contain amount in parentheses and not found in packages
    return !serviceDisplayName.includes('(€') && !serviceDisplayName.includes('($');
  };

  const fetchTimeSlots = async (serviceId: string, selectedDate: string) => {
    if (!serviceId || !selectedDate) {
      setTimeSlots([]);
      return;
    }

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
      if (!actualServiceId || isNaN(actualServiceId)) {        setTimeSlots([]);
        return;
      }

      // Fetch actual available slots from availability table for the selected date
      let availabilityQuery = supabase
        .from('availability')
        .select('*')
        .eq('date', selectedDate)
        .eq('is_available', true);

      // Filter by slot_type based on service pricing type
      if (priceType === 'in-hour') {
        availabilityQuery = availabilityQuery.eq('slot_type', 'in-hour');
      } else if (priceType === 'out-of-hour') {
        availabilityQuery = availabilityQuery.eq('slot_type', 'out-of-hour');
      }
      // If priceType is 'standard' or undefined, show all slots

      const { data, error } = await availabilityQuery
        .order('start_time', { ascending: true });
      if (error) {
        console.error('Error fetching time slots:', error);
        setTimeSlots([]);
        return;
      }

      // Use available slots directly (filtering already done at database level)
      const availableSlots = data || [];

      console.log(`📅 Admin booking modal - fetched ${availableSlots.length} available slots for service type "${priceType}" on ${selectedDate}`);

      // Filter out past time slots if the selected date is today
      const today = new Date().toISOString().split('T')[0];
      const currentTime = new Date();
      const currentHours = currentTime.getHours();
      const currentMinutes = currentTime.getMinutes();
      const currentTimeInMinutes = currentHours * 60 + currentMinutes;

      const filteredSlots = availableSlots.filter(slot => {
        // If the selected date is not today, include all slots
        if (selectedDate !== today) {
          return true;
        }

        // For today's date, only include slots that haven't started yet
        const startTime = (slot.start || slot.start_time || '').substring(0, 5);
        const [slotHours, slotMinutes] = startTime.split(':').map(Number);
        const slotTimeInMinutes = slotHours * 60 + slotMinutes;

        // Only include slots that start in the future (with a small buffer)
        return slotTimeInMinutes > currentTimeInMinutes;
      });

      console.log(`📅 Admin booking modal - after filtering past slots: ${filteredSlots.length} slots remaining for ${selectedDate}`);

      // Convert availability slots to formatted time options
      const timeOptions: string[] = [];

      filteredSlots.forEach(slot => {
        // Handle both legacy 'start' field and new 'start_time' field
        const startTime = (slot.start || slot.start_time || '').substring(0, 5);
        const endTime = slot.end_time.substring(0, 5);

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
      customStartTime: '',
      customEndTime: '',
      notes: '',
      status: 'pending'
    });
    setTimeSlots([]);
  };

  const handleNewBookingInputChange = (field: string, value: string) => {
    // Validate input in real-time
    let error = '';

    switch (field) {
      case 'firstName':
      case 'lastName':
        if (!validateName(value)) {
          error = 'Name can only contain letters, spaces, and apostrophes';
        } else if (value.length > 50) {
          error = 'Name cannot exceed 50 characters';
        }
        break;
      case 'email':
        if (value && !validateEmail(value)) {
          error = 'Please enter a valid email address';
        }
        break;
      case 'phone':
        if (value && !validatePhoneNumber(value)) {
          error = 'Phone number can only contain numbers, spaces, hyphens, parentheses, and + sign';
        }
        break;
      case 'notes':
        if (value && !validateNotes(value)) {
          error = 'Notes can only contain letters, numbers, spaces, and basic punctuation';
        } else if (value.length > 1000) {
          error = 'Notes cannot exceed 1000 characters';
        }
        break;
    }

    // Update form errors
    setFormErrors(prev => ({
      ...prev,
      [field]: error
    }));

    setNewBookingData(prev => {
      const updated = { ...prev, [field]: value };

      // Fetch time slots when service or date changes for all services
      if (field === 'service' || field === 'date') {
        const serviceName = field === 'service' ? value : updated.service;
        const date = field === 'date' ? value : updated.date;
        if (serviceName && date) {
          // Find the service object to get the ID
          const selectedService = services.find(s => s.displayName === serviceName);
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

    // Additional validation for custom time selection
    const isContactQuote = isContactForQuoteService(newBookingData.service);
    if (isContactQuote && newBookingData.time === 'custom') {
      if (!newBookingData.customStartTime || !newBookingData.customEndTime) {
        showError('Missing Custom Time', 'Please provide both start and end times when using custom time.');
        return;
      }
    }

    setCreatingBooking(true);
    
    try {
      // Find the selected service to get proper service name with pricing
      const selectedService = services.find(s => s.displayName === newBookingData.service);
      const serviceName = selectedService ? selectedService.displayName : newBookingData.service;
      const isContactQuote = isContactForQuoteService(newBookingData.service);

      // Extract timeslot information
      let timeslotStartTime = null;
      let timeslotEndTime = null;
      let bookingDateTime = newBookingData.date;
      
      if (isContactQuote) {
        // Handle contact for quote services
        if (newBookingData.time === 'custom') {
          // Custom time selected - use custom time inputs (validation already ensures they exist)
          timeslotStartTime = newBookingData.customStartTime;
          timeslotEndTime = newBookingData.customEndTime;
          bookingDateTime = `${newBookingData.date}T${newBookingData.customStartTime}`;
        } else if (newBookingData.time && newBookingData.time !== '') {
          // Regular time slot selected for contact for quote services
          if (newBookingData.time.includes('-')) {
            const [startTime, endTime] = newBookingData.time.split('-');
            timeslotStartTime = startTime;
            timeslotEndTime = endTime;
            bookingDateTime = `${newBookingData.date}T${startTime}`;
          } else {
            timeslotStartTime = newBookingData.time;
            bookingDateTime = `${newBookingData.date}T${newBookingData.time}`;
          }
        } else {
          // No time slot selected - this is a full-day booking for contact quote services too (9 AM - 5 PM)
          console.log('📅 Creating full-day contact quote booking (no specific time selected)');
          timeslotStartTime = '09:00';
          timeslotEndTime = '17:00';
          bookingDateTime = `${newBookingData.date}T09:00:00`;
        }
      } else {
        // Handle regular services
        if (newBookingData.time && newBookingData.time !== '') {
          if (newBookingData.time.includes('-')) {
            const [startTime, endTime] = newBookingData.time.split('-');
            timeslotStartTime = startTime;
            timeslotEndTime = endTime;
            bookingDateTime = `${newBookingData.date}T${startTime}`;
          } else {
            timeslotStartTime = newBookingData.time;
            bookingDateTime = `${newBookingData.date}T${newBookingData.time}`;
          }
        } else {
          // No time selected - this is a full-day booking (9 AM - 5 PM)
          console.log('📅 Creating full-day booking (no specific time selected)');
          timeslotStartTime = '09:00';
          timeslotEndTime = '17:00';
          bookingDateTime = `${newBookingData.date}T09:00:00`;
        }
      }

      // Skip availability checks for contact for quote services and full-day bookings
      const isFullDayBooking = timeslotStartTime === 'full-day' || timeslotEndTime === 'full-day' ||
                              (timeslotStartTime === '09:00' && timeslotEndTime === '17:00');

      if (!isContactQuote && !isFullDayBooking && newBookingData.status === 'confirmed' && bookingDateTime) {
        const availabilityCheck = await checkBookingAvailability({
          booking_date: bookingDateTime,
          appointment_date: newBookingData.date,
          appointment_time: timeslotStartTime,
          status: newBookingData.status
        } as BookingFormData);

        if (!availabilityCheck.hasAvailability) {
          showError('Cannot Create Confirmed Booking', availabilityCheck.message || 'No availability found for this booking time.');
          return;
        }

        // Check for conflicting bookings
        const conflictCheck = await checkForConflictingBookings({
          booking_date: bookingDateTime,
          appointment_date: newBookingData.date,
          appointment_time: timeslotStartTime,
          status: newBookingData.status
        } as BookingFormData);

        if (conflictCheck.hasConflict) {
          showError('Booking Conflict Detected', conflictCheck.message || 'This time slot is already taken by another confirmed booking.');
          return;
        }
      } else if (isFullDayBooking) {
        console.log('📅 Skipping availability checks for full-day booking during creation');
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

      // Respect the user's selected status - NO auto-confirmation from admin booking modal
      // Admin bookings should follow the normal booking creation and confirmation process
      const finalBookingData = { ...bookingData };

      console.log('📝 Admin booking modal - respecting user-selected status:', newBookingData.status);
      console.log('📝 Admin booking modal - skipping auto-confirmation to maintain manual control');

      // Only perform availability checks if user explicitly selected 'confirmed' status
      // This allows admin to manually confirm later through the normal process
      if (newBookingData.status === 'confirmed' && !isContactQuote && !isFullDayBooking && timeslotStartTime && timeslotEndTime) {
        // User explicitly wants to create a confirmed booking - check availability
        const tempBooking = {
          id: '0',
          booking_date: bookingDateTime,
          appointment_date: newBookingData.date,
          timeslot_start_time: timeslotStartTime,
          timeslot_end_time: timeslotEndTime,
          package_name: serviceName,
          status: 'pending',
          customer_name: '',
          customer_email: '',
          customer_phone: ''
        } as BookingFormData;

        const availabilityCheck = await checkBookingAvailabilityWithAutoMatch(tempBooking);

        if (availabilityCheck.hasAvailability && availabilityCheck.matchedSlot) {
          console.log('✅ Admin requested confirmed status - matching slot found:', availabilityCheck.matchedSlot);

          // Update booking time to match the available slot
          const slotStartTime = availabilityCheck.matchedSlot.start_time || availabilityCheck.matchedSlot.start;
          const slotEndTime = availabilityCheck.matchedSlot.end_time;
          if (slotStartTime && slotEndTime) {
            // Keep in local time without timezone conversion to avoid timezone shifts
            // Ensure slotStartTime has proper HH:MM:SS format (add :00 if only HH:MM)
            const formattedSlotStartTime = slotStartTime.includes(':00') ? slotStartTime : `${slotStartTime}:00`;
            finalBookingData.booking_date = `${newBookingData.date}T${formattedSlotStartTime}`;
            finalBookingData.timeslot_start_time = slotStartTime;
            finalBookingData.timeslot_end_time = slotEndTime;
          }
        } else {
          console.log('⚠️ Admin requested confirmed status but no matching slot found - creating as pending');
          finalBookingData.status = 'pending'; // Override to pending if no slot available
        }
      } else if (isFullDayBooking) {
        console.log('📅 Full-day booking - will be handled during manual confirmation process');
      }

      const { booking, customer, error } = await createBookingWithCustomer(customerData, finalBookingData, true);

      if (error) {
        showError('Booking Failed', error);
        return;
      }

      if (booking && customer && customer.id) {
        // Add the new booking to the list
        const newBookingForList: BookingFormData = {
          ...booking,
          customer_details: {
            id: customer.id,
            first_name: customer.first_name,
            last_name: customer.last_name,
            email: customer.email,
            phone: customer.phone,
            created_at: customer.created_at,
            updated_at: customer.updated_at
          },
          customer_name: `${customer.first_name} ${customer.last_name}`,
          customer_email: customer.email,
          customer_phone: customer.phone || ''
        };
        
        setAllBookings([newBookingForList, ...allBookings]);
        
        // Show appropriate success message based on service type and final status
        if (isContactQuote) {
          showSuccess('Booking Created', 'Contact for quote booking has been created successfully. No payment request will be generated.');
        } else if (finalBookingData.status === 'confirmed') {
          showSuccess('Booking Created & Confirmed', 'New booking has been created with confirmed status and matching availability slot found.');
        } else {
          showSuccess('Booking Created', `New booking has been created successfully with "${finalBookingData.status}" status. Use the confirmation process to manage availability and payments.`);
        }
        
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
      'Service': getFullPackageInfo(booking.package_name || booking.service || ''),
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
        getFullPackageInfo(booking.package_name || booking.service || ''),
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
      didParseCell: (data: { cell: { raw: unknown; text: string[] } }) => {
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
    else if (booking.status === 'paid') backgroundColor = '#8b5cf6'; // purple for paid (awaiting confirmation)
    else if (booking.status === 'deposit_paid') backgroundColor = '#3b82f6'; // blue
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
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'confirmed' | 'cancelled')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="all">All Status</option>
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
                    return !!booking.booking_date && /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(booking.booking_date);
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
                                <span className="font-medium">Service:</span> {getFullPackageInfo(booking.package_name || booking.service || '')}
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

                        {/* Payment Status - Hide for Contact for Quote services */}
                        {booking.customer_id && booking.package_name && !isContactForQuoteService(booking.package_name) && (
                          <div className="flex items-start space-x-2">
                            <Euro className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                            <div className="min-w-0">
                              {(() => {
                                const status = bookingPaymentStatus.get(booking.id || '');
                                const depositAmount = bookingDepositAmounts.get(booking.id || '') || 75; // Default fallback
                                const paymentType = status?.paymentType;

                                // Check if payment request is marked as 'paid' (primary source of truth)
                                const isPaymentRequestPaid = status?.paymentRequest?.status === 'paid';
                                
                                // If payment request is marked as 'paid', show payment completed
                                if (isPaymentRequestPaid && status?.paymentRequest) {
                                  const amount = status.paymentRequest.amount;
                                  const paymentTypeLabel = paymentType === 'full' ? 'Full Payment' : 
                                                          paymentType === 'deposit' ? 'Deposit' : 
                                                          'Payment';
                                  const paymentTypeColor = paymentType === 'full' ? 'text-purple-700' : 'text-green-700';
                                  
                                  return (
                                    <div className="space-y-1">
                                      <p className={`text-xs font-medium ${paymentTypeColor}`}>
                                        ✓ {paymentTypeLabel} Completed - €{amount.toFixed(2)}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        {paymentType && (
                                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 mr-2">
                                            {paymentType === 'deposit' ? '20% Deposit' : '100% Full'}
                                          </span>
                                        )}
                                        Paid: {status.paymentRequest.updated_at ?
                                          new Date(status.paymentRequest.updated_at).toLocaleDateString() :
                                          new Date(status.paymentRequest.created_at).toLocaleDateString()}
                                      </p>
                                    </div>
                                  );
                                }

                                // If payment exists in payments table (backup check)
                                if (status?.payment) {
                                  const amount = status.payment.amount;
                                  const paymentTypeLabel = paymentType === 'full' ? 'Full Payment' : 
                                                          paymentType === 'deposit' ? 'Deposit' : 
                                                          'Payment';
                                  const paymentTypeColor = paymentType === 'full' ? 'text-purple-700' : 'text-green-700';
                                  
                                  return (
                                    <div className="space-y-1">
                                      <p className={`text-xs font-medium ${paymentTypeColor}`}>
                                        ✓ {paymentTypeLabel} Completed - €{amount.toFixed(2)}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        {paymentType && (
                                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 mr-2">
                                            {paymentType === 'deposit' ? '20% Deposit' : '100% Full'}
                                          </span>
                                        )}
                                        Paid: {status.payment.payment_date ?
                                          new Date(status.payment.payment_date).toLocaleDateString() :
                                          new Date(status.payment.created_at).toLocaleDateString()}
                                      </p>
                                    </div>
                                  );
                                }
                                
                                // If payment request exists but not paid yet
                                if (status?.paymentRequest && status.paymentRequest.status !== 'paid') {
                                  const isExpired = status.paymentRequest.payment_due_date &&
                                    new Date(status.paymentRequest.payment_due_date) < new Date();
                                  const requestType = paymentType === 'full' ? 'full payment' : 'deposit';

                                  return (
                                    <div className="space-y-1">
                                      <p className={`text-xs font-medium ${
                                        isExpired ? 'text-red-600' : 'text-blue-600'
                                      }`}>
                                        {isExpired ? '⚠ Overdue' : '📧 Request sent'} - €{status.paymentRequest.amount.toFixed(2)} {requestType}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        {paymentType && (
                                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 mr-2">
                                            {paymentType === 'deposit' ? '20% Deposit' : '100% Full'}
                                          </span>
                                        )}
                                        Status: {status.paymentRequest.status} • Due: {status.paymentRequest.payment_due_date ?
                                          new Date(status.paymentRequest.payment_due_date).toLocaleDateString() : 'N/A'}
                                      </p>
                                    </div>
                                  );
                                }
                                
                                // No payment request exists
                                // Don't show payment request options for confirmed, paid, deposit_paid, or cancelled bookings
                                if (booking.status === 'confirmed' || booking.status === 'paid' || booking.status === 'deposit_paid' || booking.status === 'cancelled') {
                                  const statusText = booking.status === 'confirmed' ? 'confirmed' : 
                                                   booking.status === 'paid' ? 'paid (awaiting confirmation)' : 
                                                   booking.status === 'deposit_paid' ? 'deposit paid' :
                                                   'cancelled';
                                  const statusColor = booking.status === 'cancelled' ? 'text-red-600' : 'text-green-600';
                                  const statusIcon = booking.status === 'cancelled' ? '❌' : '✅';
                                  return (
                                    <div className="space-y-1">
                                      <p className={`text-xs ${statusColor}`}>
                                        {statusIcon} Booking {statusText} - No action needed
                                      </p>
                                    </div>
                                  );
                                }

                                return (
                                  <div className="space-y-1">
                                    <div className="flex items-center space-x-2">
                                      <p className="text-xs text-amber-600">
                                        ⚠ No payment request - €{depositAmount.toFixed(2)} deposit needed
                                      </p>
                                      <button
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          handleCreatePaymentRequest(booking);
                                        }}
                                        disabled={loadingPaymentStatus}
                                        className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition-colors disabled:opacity-50"
                                        title="Create Payment Request"
                                      >
                                        {loadingPaymentStatus ? '...' : 'Create Request'}
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          handleFixBookingStatus(booking);
                                        }}
                                        disabled={loadingPaymentStatus}
                                        className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded hover:bg-orange-200 transition-colors disabled:opacity-50"
                                        title="Fix Booking Status Based on Payments"
                                      >
                                        {loadingPaymentStatus ? '...' : 'Fix Status'}
                                      </button>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        )}

                        {/* Contact for Quote Service Indicator */}
                        {booking.package_name && isContactForQuoteService(booking.package_name) && (
                          <div className="flex items-start space-x-2">
                            <div className="w-4 h-4 mt-0.5 flex-shrink-0 flex items-center justify-center">
                              <div className="w-3 h-3 rounded-full bg-purple-500" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs text-purple-700 font-medium">
                                📞 Contact for Quote Service
                              </p>
                            </div>
                          </div>
                        )}

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
                                disabled={confirmingBookings.has(booking.id?.toString() || '')}
                                className={`flex items-center justify-center w-10 h-10 rounded-full transition-colors cursor-pointer ${
                                  confirmingBookings.has(booking.id?.toString() || '')
                                    ? 'bg-green-200 text-green-500 cursor-not-allowed'
                                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                                }`}
                                title={confirmingBookings.has(booking.id?.toString() || '') ? "Confirming..." : "Confirm Booking"}
                                type="button"
                              >
                                {confirmingBookings.has(booking.id?.toString() || '') ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Check className="w-4 h-4" />
                                )}
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleReschedule(booking);
                              }}
                              className="flex items-center justify-center w-10 h-10 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors cursor-pointer"
                              title="Reschedule Booking"
                              type="button"
                            >
                              <Calendar className="w-4 h-4" />
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
                disabled={cancellingBookings.has(bookingToCancel.id?.toString() || '')}
                className={`px-4 py-2 text-sm font-medium border border-gray-300 rounded-md transition-colors ${
                  cancellingBookings.has(bookingToCancel.id?.toString() || '')
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Keep Booking
              </button>
              <button
                onClick={handleCancelBooking}
                disabled={cancellingBookings.has(bookingToCancel.id?.toString() || '')}
                className={`px-4 py-2 text-sm font-medium border border-transparent rounded-md transition-colors flex items-center ${
                  cancellingBookings.has(bookingToCancel.id?.toString() || '')
                    ? 'bg-orange-400 text-orange-200 cursor-not-allowed'
                    : 'bg-orange-600 text-white hover:bg-orange-700'
                }`}
              >
                {cancellingBookings.has(bookingToCancel.id?.toString() || '') ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  'Cancel Booking'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {showRescheduleModal && bookingToReschedule && (
        <RescheduleModal
          isOpen={showRescheduleModal}
          onClose={() => {
            setShowRescheduleModal(false);
            setBookingToReschedule(null);
          }}
          booking={{
            id: bookingToReschedule.id || '',
            booking_reference: bookingToReschedule.booking_reference,
            customer_id: bookingToReschedule.customer_id || 0,
            package_name: bookingToReschedule.package_name,
            booking_date: bookingToReschedule.booking_date,
            timeslot_start_time: bookingToReschedule.timeslot_start_time,
            timeslot_end_time: bookingToReschedule.timeslot_end_time,
            notes: bookingToReschedule.notes,
            status: bookingToReschedule.status
          }}
          onRescheduleComplete={handleRescheduleComplete}
        />
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
                        disabled={confirmingBookings.has(selectedBooking.id?.toString() || '')}
                        className={`min-w-[140px] flex-1 py-2 px-4 rounded-lg transition-colors text-sm font-medium flex items-center justify-center ${
                          confirmingBookings.has(selectedBooking.id?.toString() || '')
                            ? 'bg-green-400 text-green-200 cursor-not-allowed'
                            : 'bg-green-600 text-white hover:bg-green-700'
                        }`}
                      >
                        {confirmingBookings.has(selectedBooking.id?.toString() || '') ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Confirming...
                          </>
                        ) : (
                          'Confirm Booking'
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setShowBookingModal(false);
                        handleReschedule(selectedBooking);
                      }}
                      className="min-w-[120px] flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center justify-center"
                    >
                      <Calendar className="w-4 h-4 mr-1" />
                      Reschedule
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
                          <p className="text-sm text-gray-600">{getFullPackageInfo(booking.package_name || booking.service || '')}</p>
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
                                : booking.status === 'deposit_paid'
                                ? 'bg-blue-100 text-blue-800'
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
                                handleReschedule(booking);
                              }}
                              className="px-3 py-1 bg-orange-600 text-white text-xs rounded hover:bg-orange-700 transition-colors flex items-center"
                            >
                              <Calendar className="w-3 h-3 mr-1" />
                              Reschedule
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
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                      formErrors.firstName ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="John"
                  />
                  {formErrors.firstName && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.firstName}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Last Name *</label>
                  <input
                    type="text"
                    value={newBookingData.lastName}
                    onChange={(e) => handleNewBookingInputChange('lastName', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                      formErrors.lastName ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="Doe"
                  />
                  {formErrors.lastName && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.lastName}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                  <input
                    type="email"
                    value={newBookingData.email}
                    onChange={(e) => handleNewBookingInputChange('email', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                      formErrors.email ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="john@example.com"
                  />
                  {formErrors.email && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.email}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={newBookingData.phone}
                    onChange={(e) => handleNewBookingInputChange('phone', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                      formErrors.phone ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="+353 123 456 789"
                  />
                  {formErrors.phone && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.phone}</p>
                  )}
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
                    {/* Add Custom Time option for Contact for Quote services */}
                    {isContactForQuoteService(newBookingData.service) && (
                      <option value="custom">Custom Time</option>
                    )}
                  </select>
                  {loadingTimeSlots && (
                    <p className="text-xs text-gray-500 mt-1">Loading available times...</p>
                  )}
                  {!loadingTimeSlots && timeSlots.length === 0 && newBookingData.service && newBookingData.date && !isContactForQuoteService(newBookingData.service) && (
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
                    <option value="deposit_paid">Deposit Paid</option>
                    <option value="paid">Paid (Awaiting Confirmation)</option>
                    <option value="confirmed">Confirmed</option>
                  </select>
                </div>
              </div>

              {/* Custom Time Fields - Show when "Custom Time" is selected */}
              {isContactForQuoteService(newBookingData.service) && newBookingData.time === 'custom' && (
                <div className="border-t border-gray-200 pt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Custom Time Range</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Start Time *</label>
                      <input
                        type="time"
                        value={newBookingData.customStartTime}
                        onChange={(e) => handleNewBookingInputChange('customStartTime', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">End Time *</label>
                      <input
                        type="time"
                        value={newBookingData.customEndTime}
                        onChange={(e) => handleNewBookingInputChange('customEndTime', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        required
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Both start and end times are required when using custom time.
                  </p>
                </div>
              )}

              {/* Info message for when no time slot is selected */}
              {isContactForQuoteService(newBookingData.service) && !newBookingData.time && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-700">
                    If no time slot is selected, this will be treated as a full-day booking and mark the entire day unavailable when confirmed.
                  </p>
                </div>
              )}

              {/* Info message for regular services when no time slot is selected */}
              {!isContactForQuoteService(newBookingData.service) && newBookingData.service && newBookingData.date && !newBookingData.time && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-700">
                    If no time slot is selected, this will be treated as a full-day booking and mark the entire day unavailable when confirmed.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={newBookingData.notes}
                  onChange={(e) => handleNewBookingInputChange('notes', e.target.value)}
                  rows={3}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                    formErrors.notes ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="Additional notes or special requirements..."
                />
                {formErrors.notes && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.notes}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  {newBookingData.notes.length}/1000 characters
                </p>
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
                         !newBookingData.email || !newBookingData.service || !newBookingData.date ||
                         (isContactForQuoteService(newBookingData.service) && newBookingData.time === 'custom' && 
                          (!newBookingData.customStartTime || !newBookingData.customEndTime))}
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


