import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, momentLocalizer, View, Views } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '../../styles/calendar.css';
import moment from 'moment';
import { 
  Plus, 
  Clock, 
  Trash2, 
  Calendar as CalendarIcon,
  List,
  AlertCircle,
  
} from 'lucide-react';
import { useToast } from '../shared/toastContext';
import { supabase } from '../../supabaseClient';
import { decryptCustomerDataForAdmin, logAdminDataAccess } from '../../utils/adminGdprUtils';
import { QuickScheduleGenerator } from './availability/QuickScheduleGenerator';

// Configure moment for 24-hour format
moment.updateLocale('en', {
  longDateFormat: {
    LT: 'HH:mm',
    LTS: 'HH:mm:ss',
    L: 'DD/MM/YYYY',
    LL: 'D MMMM YYYY',
    LLL: 'D MMMM YYYY HH:mm',
    LLLL: 'dddd, D MMMM YYYY HH:mm'
  }
});

const localizer = momentLocalizer(moment);

interface AvailabilitySlot {
  id?: number;
  date: string;
  start?: string; // legacy
  start_time?: string; // new schema
  end_time: string;
  is_available?: boolean; // flag to mark slot as unavailable when booked
}

interface BookedSlot {
  id: string;
  customer_name: string;
  package_name: string;
  booking_date: string;
  status: string;
  timeslot_start_time?: string;
  timeslot_end_time?: string;
  appointment_date?: string; // Optional fallback fields
  appointment_time?: string; // Optional fallback fields
}

type AvailabilityProps = Record<string, never>; // no props

export const Availability: React.FC<AvailabilityProps> = () => {
  const { showSuccess, showError } = useToast();
  
  // State management
  const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilitySlot[]>([]);
  const [bookedSlots, setBookedSlots] = useState<BookedSlot[]>([]);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [mainTab, setMainTab] = useState<'overview' | 'default'>('overview');
  const [showDeleteDayModal, setShowDeleteDayModal] = useState(false);
  const [dateToDeleteSlots, setDateToDeleteSlots] = useState<string>('');
  // Edit slot modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [slotToEdit, setSlotToEdit] = useState<AvailabilitySlot | null>(null);
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [editError, setEditError] = useState('');
  // Multi-slots modal state
  const [showMultiSlotsModal, setShowMultiSlotsModal] = useState(false);
  const [selectedDateSlots, setSelectedDateSlots] = useState<AvailabilitySlot[]>([]);
  const [selectedDateLabel, setSelectedDateLabel] = useState<string>('');
  
  // Calendar view state
  const [calendarViewType, setCalendarViewType] = useState<View>(Views.MONTH);
  const [calendarDate, setCalendarDate] = useState(new Date());
  
  // Add slot form state
  const [newSlotDate, setNewSlotDate] = useState('');
  const [newSlotStartTime, setNewSlotStartTime] = useState('');
  const [newSlotEndTime, setNewSlotEndTime] = useState('');
  const [newSlotError, setNewSlotError] = useState('');

  // State management cleaned up - old schedule generation removed

  const fetchAvailabilitySlots = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('availability')
        .select('*')
        .order('date', { ascending: true })
        .order('start', { ascending: true });

      if (error) {
        console.error('❌ Error fetching availability slots:', error);
        showError('Error', `Database error: ${error.message}`);
        return;
      }

      setAvailabilitySlots(data || []);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('❌ Exception fetching availability slots:', error);
      showError('Error', `Failed to load availability slots: ${errorMessage}`);
    }
  }, [showError]);

  const fetchBookedSlots = useCallback(async () => {
    try {
      // Use the simple approach that works reliably - fetch bookings and customers separately
      const { data: simpleData, error: simpleError } = await supabase
        .from('bookings')
        .select('id, package_name, booking_date, status, customer_id, timeslot_start_time, timeslot_end_time')
        .in('status', ['confirmed', 'completed'])
        .order('booking_date', { ascending: true })
        .limit(500); // Add limit for performance

      if (simpleError) {
        console.error('❌ Error fetching bookings:', simpleError);
        showError('Error', `Database error: ${simpleError.message}`);
        return;
      }

      // For each booking, fetch customer names separately and decrypt them
      const transformedSimpleData = await Promise.all((simpleData || []).map(async (booking: any) => {
        let customerName = `Customer ID: ${booking.customer_id}`;
        
        if (booking.customer_id) {
          try {
            const { data: customerData, error: customerError } = await supabase
              .from('customers')
              .select('first_name, last_name')
              .eq('id', booking.customer_id)
              .single();
            
            if (!customerError && customerData) {
              // Decrypt customer data for admin viewing
              const decryptedCustomer = decryptCustomerDataForAdmin(customerData);
              customerName = `${decryptedCustomer.first_name} ${decryptedCustomer.last_name}`;
            }
          } catch (err) {
            console.warn(`Failed to fetch customer ${booking.customer_id}:`, err);
          }
        }
        
        return {
          id: booking.id,
          customer_name: customerName,
          package_name: booking.package_name,
          booking_date: booking.booking_date,
          status: booking.status,
          timeslot_start_time: booking.timeslot_start_time,
          timeslot_end_time: booking.timeslot_end_time,
          appointment_date: undefined,
          appointment_time: undefined
        };
      }));

      setBookedSlots(transformedSimpleData);
      
      // Log admin access for GDPR audit trail
      const customerIds = transformedSimpleData
        .map(booking => {
          // Extract customer ID from booking data
          const originalBooking = (simpleData || []).find((d: any) => d.id === booking.id);
          return originalBooking?.customer_id;
        })
        .filter(Boolean);
      
      if (customerIds.length > 0) {
        logAdminDataAccess(null, 'VIEW_AVAILABILITY_BOOKINGS', customerIds, 'Availability calendar booking view');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      showError('Error', `Failed to load booked slots: ${errorMessage}`);
    }
  }, [showError]);

  // Load availability slots and booked slots from database
  useEffect(() => {
    fetchAvailabilitySlots();
    fetchBookedSlots();
  }, [fetchAvailabilitySlots, fetchBookedSlots]);

  // Auto-refresh data every 30 seconds for real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      fetchAvailabilitySlots();
      fetchBookedSlots();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [fetchAvailabilitySlots, fetchBookedSlots]);

  // Listen for booking updates from other parts of the app
  useEffect(() => {
    const handleBookingUpdate = () => {
      fetchAvailabilitySlots();
      fetchBookedSlots();
    };

    const handleAvailabilityUpdate = () => {
      fetchAvailabilitySlots();
      fetchBookedSlots();
    };

    window.addEventListener('bookingUpdated', handleBookingUpdate);
    window.addEventListener('availabilityUpdated', handleAvailabilityUpdate);

    return () => {
      window.removeEventListener('bookingUpdated', handleBookingUpdate);
      window.removeEventListener('availabilityUpdated', handleAvailabilityUpdate);
    };
  }, [fetchAvailabilitySlots, fetchBookedSlots]);

  // Helpers
  const getSlotStart = (slot: AvailabilitySlot) => slot.start ?? slot.start_time ?? '';
  
  // Check if a slot is in the past (including today for safety)
  const isSlotInPast = (slot: AvailabilitySlot) => {
    const today = new Date();
    const slotDate = new Date(slot.date + 'T' + getSlotStart(slot));
    return slotDate <= today;
  };
  
  // Check if a date is in the past (including today)
  const isDateInPast = (dateStr: string) => {
    const today = new Date();
    const checkDate = new Date(dateStr + 'T00:00:00');
    today.setHours(0, 0, 0, 0); // Set to start of day for comparison
    checkDate.setHours(0, 0, 0, 0);
    return checkDate <= today;
  };

  // Convert slots to calendar events  
  const formatTime = (t: string) => {
    if (!t) return t;
    const parts = t.split(':');
    return parts.length >= 2 ? `${parts[0]}:${parts[1]}` : t;
  };

  // Memoized function to extract date and time from booking_date without timezone conversion
  const bookingDateTimeCache = new Map<string, { date: string; time: string } | null>();
  
  const getBookingDateTime = (booking: BookedSlot) => {
    // Use cache to avoid repeated parsing
    const cacheKey = `${booking.id}-${booking.booking_date}-${booking.timeslot_start_time}`;
    if (bookingDateTimeCache.has(cacheKey)) {
      return bookingDateTimeCache.get(cacheKey);
    }

    let result: { date: string; time: string } | null = null;
    
    // Priority 1: Use timeslot_start_time if available (this is the actual appointment time)
    if (booking.timeslot_start_time && booking.booking_date) {
      // Extract date from booking_date and use timeslot_start_time for time
      if (booking.booking_date.includes('T')) {
        const [dateStr] = booking.booking_date.split('T');
        // Ensure timeslot_start_time is in HH:MM format
        const timeStr = formatTime(booking.timeslot_start_time);
        
        if (dateStr && timeStr) {
          result = {
            date: dateStr,
            time: timeStr
          };
        }
      } else {
        // booking_date might just be a date string
        const timeStr = formatTime(booking.timeslot_start_time);
        if (booking.booking_date && timeStr) {
          result = {
            date: booking.booking_date,
            time: timeStr
          };
        }
      }
    }
    
    // Priority 2: Parse from booking_date if no timeslot_start_time
    if (!result && booking.booking_date) {
      // Try to parse without timezone conversion first
      if (booking.booking_date.includes('T')) {
        const [dateStr, timeWithZone] = booking.booking_date.split('T');
        const timeStr = timeWithZone.split(':').slice(0, 2).join(':'); // Get HH:MM, ignore seconds and timezone

        if (dateStr && timeStr) {
          result = {
            date: dateStr,
            time: timeStr
          };
        }
      }

      // Fallback to Date object parsing (may cause timezone shift)
      if (!result) {
        const bookingDateTime = new Date(booking.booking_date);
        if (!isNaN(bookingDateTime.getTime())) {
          const year = bookingDateTime.getFullYear();
          const month = String(bookingDateTime.getMonth() + 1).padStart(2, '0');
          const day = String(bookingDateTime.getDate()).padStart(2, '0');
          const hours = String(bookingDateTime.getHours()).padStart(2, '0');
          const minutes = String(bookingDateTime.getMinutes()).padStart(2, '0');

          result = {
            date: `${year}-${month}-${day}`,
            time: `${hours}:${minutes}`
          };
        }
      }
    }
    
    // Priority 3: Fallback to appointment_date and appointment_time if they exist
    if (!result && booking.appointment_date && booking.appointment_time) {
      result = {
        date: booking.appointment_date,
        time: booking.appointment_time
      };
    }
    
    // Cache the result for future use
    bookingDateTimeCache.set(cacheKey, result);
    
    return result;
  };

  // Create available slot events
  const availableSlotEvents = availabilitySlots.map(slot => {
    const startFmt = formatTime(getSlotStart(slot));
    const endFmt = formatTime(slot.end_time);

    // Find specific booking that matches this slot
    const matchingBooking = bookedSlots.find(booking => {
      const bookingDateTime = getBookingDateTime(booking);
      if (!bookingDateTime) return false;

      // Normalize all times to HH:MM format for comparison
      const bookingTime = formatTime(bookingDateTime.time);
      const slotStartTime = formatTime(getSlotStart(slot));
      const slotEndTime = formatTime(slot.end_time);

      // Check if booking falls within this availability slot
      return bookingDateTime.date === slot.date &&
        bookingTime >= slotStartTime &&
        bookingTime < slotEndTime;
    });

    // A slot is considered booked if:
    // 1. There's a matching booking, OR
    // 2. The availability slot is marked as unavailable in the database
    const isBooked = !!matchingBooking || slot.is_available === false;

    // Slot booking status determined

    // Create title with booking details if booked
    let title = `${startFmt} - ${endFmt}`;
    if (isBooked) {
      if (matchingBooking) {
        // Has booking details - show customer info
        const bookingDateTime = getBookingDateTime(matchingBooking);
        const bookingEndTime = matchingBooking.timeslot_end_time ||
          (bookingDateTime ? (() => {
            const [hours, minutes] = bookingDateTime.time.split(':').map(Number);
            const endMinutes = minutes + 50; // Default 50 minutes
            const endHours = hours + Math.floor(endMinutes / 60);
            const finalMinutes = endMinutes % 60;
            return `${endHours.toString().padStart(2, '0')}:${finalMinutes.toString().padStart(2, '0')}`;
          })() : '');

        const formattedStartTime = bookingDateTime ? formatTime(bookingDateTime.time) : '';
        const formattedEndTime = bookingEndTime ? formatTime(bookingEndTime) : '';
        title = `${formattedStartTime} ${formattedEndTime} ${matchingBooking.customer_name}`;

        // Slot booked with customer details

        // Slot booked with customer details
      } else if (slot.is_available === false) {
        // Slot marked unavailable - try to find ANY booking for this date/time range

        const anyBookingForSlot = bookedSlots.find(booking => {
          const bookingDateTime = getBookingDateTime(booking);
          if (!bookingDateTime) return false;

          // Check if booking is on the same date and overlaps with slot time range
          if (bookingDateTime.date !== slot.date) return false;

          // Normalize all times to HH:MM format for comparison
          const bookingStart = formatTime(bookingDateTime.time);
          const slotStart = formatTime(getSlotStart(slot));
          const slotEnd = formatTime(slot.end_time);

          // Check if booking time overlaps with slot (more flexible matching)
          const isOverlapping = bookingStart >= slotStart && bookingStart < slotEnd;

          return isOverlapping;
        });

        if (anyBookingForSlot) {
          const bookingDateTime = getBookingDateTime(anyBookingForSlot);
          const bookingEndTime = anyBookingForSlot.timeslot_end_time ||
            (bookingDateTime ? (() => {
              const [hours, minutes] = bookingDateTime.time.split(':').map(Number);
              const endMinutes = minutes + 50;
              const endHours = hours + Math.floor(endMinutes / 60);
              const finalMinutes = endMinutes % 60;
              return `${endHours.toString().padStart(2, '0')}:${finalMinutes.toString().padStart(2, '0')}`;
            })() : '');

          const formattedStartTime = bookingDateTime ? formatTime(bookingDateTime.time) : '';
          const formattedEndTime = bookingEndTime ? formatTime(bookingEndTime) : '';
          title = `${formattedStartTime} ${formattedEndTime} ${anyBookingForSlot.customer_name}`;

          // Found booking for unavailable slot
        } else {
          // Marked as unavailable but no booking details found
          title = `${startFmt} - ${endFmt} (Unavailable)`;
          // Slot marked unavailable but no booking found
        }
      }
    }

    // Create hover title with package info if booking exists
    let hoverTitle = title;
    if (matchingBooking) {
      const bookingDateTime = getBookingDateTime(matchingBooking);
      const formattedStartTime = bookingDateTime ? formatTime(bookingDateTime.time) : '';
      const bookingEndTime = matchingBooking.timeslot_end_time ||
        (bookingDateTime ? (() => {
          const [hours, minutes] = bookingDateTime.time.split(':').map(Number);
          const endMinutes = minutes + 50;
          const endHours = hours + Math.floor(endMinutes / 60);
          const finalMinutes = endMinutes % 60;
          return `${endHours.toString().padStart(2, '0')}:${finalMinutes.toString().padStart(2, '0')}`;
        })() : '');
      const formattedEndTime = bookingEndTime ? formatTime(bookingEndTime) : '';
      hoverTitle = `${formattedStartTime} ${formattedEndTime} | ${matchingBooking.customer_name} | ${matchingBooking.package_name}`;
    } else if (isBooked && slot.is_available === false) {
      // Try to find booking for hover title
      const anyBookingForSlot = bookedSlots.find(booking => {
        const bookingDateTime = getBookingDateTime(booking);
        if (!bookingDateTime) return false;
        if (bookingDateTime.date !== slot.date) return false;
        const bookingStart = bookingDateTime.time;
        const slotStart = getSlotStart(slot);
        const slotEnd = slot.end_time;
        const isOverlapping = bookingStart >= slotStart && bookingStart < slotEnd;
        return isOverlapping;
      });
      
      if (anyBookingForSlot) {
        const bookingDateTime = getBookingDateTime(anyBookingForSlot);
        const formattedStartTime = bookingDateTime ? formatTime(bookingDateTime.time) : '';
        const bookingEndTime = anyBookingForSlot.timeslot_end_time ||
          (bookingDateTime ? (() => {
            const [hours, minutes] = bookingDateTime.time.split(':').map(Number);
            const endMinutes = minutes + 50;
            const endHours = hours + Math.floor(endMinutes / 60);
            const finalMinutes = endMinutes % 60;
            return `${endHours.toString().padStart(2, '0')}:${finalMinutes.toString().padStart(2, '0')}`;
          })() : '');
        const formattedEndTime = bookingEndTime ? formatTime(bookingEndTime) : '';
        hoverTitle = `${formattedStartTime} ${formattedEndTime} | ${anyBookingForSlot.customer_name} | ${anyBookingForSlot.package_name}`;
      }
    }

    return {
      id: `available-${slot.id}`,
      title: title,
      hoverTitle: hoverTitle,
      start: new Date(`${slot.date}T${getSlotStart(slot)}`),
      end: new Date(`${slot.date}T${slot.end_time}`),
      resource: { ...slot, booking: matchingBooking },
      type: isBooked ? 'booked-slot' : 'available-slot',
      style: {
        backgroundColor: isBooked ? '#EF4444' : '#10B981', // Red for booked, green for available
        borderColor: isBooked ? '#DC2626' : '#059669',
        color: 'white',
        fontSize: '0.7rem',
        lineHeight: '0.9rem',
        fontWeight: 500,
        padding: '2px 4px'
      }
    };
  });

  // Create booked appointment events (for bookings that don't have corresponding availability slots)
  const bookedAppointmentEvents = bookedSlots
    .filter(booking => {
      const bookingDateTime = getBookingDateTime(booking);
      if (!bookingDateTime) return false;
      
      // Only show bookings that don't have a corresponding availability slot
      const hasAvailabilitySlot = availabilitySlots.some(slot => 
        slot.date === bookingDateTime.date &&
        bookingDateTime.time >= getSlotStart(slot) &&
        bookingDateTime.time < slot.end_time
      );
      
      return !hasAvailabilitySlot;
    })
    .map(booking => {
      const bookingDateTime = getBookingDateTime(booking);
      if (!bookingDateTime) return null;

      // Use actual booking end time if available, otherwise calculate from timeslot fields
      const formattedStartTime = formatTime(bookingDateTime.time);
      const startTime = new Date(`${bookingDateTime.date}T${formattedStartTime}:00`);
      let endTime: Date;

      if (booking.timeslot_end_time) {
        // Use the actual booking end time
        const formattedEndTime = formatTime(booking.timeslot_end_time);
        endTime = new Date(`${bookingDateTime.date}T${formattedEndTime}:00`);
      } else {
        // Fallback: assume 50-minute session (therapy standard)
        endTime = new Date(startTime.getTime() + 50 * 60 * 1000);
      }

      const endTimeFormatted = booking.timeslot_end_time ? 
        formatTime(booking.timeslot_end_time) : 
        formatTime(`${endTime.getHours().toString().padStart(2, '0')}:${endTime.getMinutes().toString().padStart(2, '0')}`);

      const displayTitle = `${formatTime(bookingDateTime.time)} ${endTimeFormatted} ${booking.customer_name}`;
      const hoverTitle = `${formatTime(bookingDateTime.time)} ${endTimeFormatted} | ${booking.customer_name} | ${booking.package_name}`;

      return {
        id: `booking-${booking.id}`,
        title: displayTitle,
        hoverTitle: hoverTitle,
        start: startTime,
        end: endTime,
        resource: booking,
        type: 'booked-appointment',
        style: {
          backgroundColor: '#EF4444',
          borderColor: '#DC2626',
          color: 'white',
          fontSize: '0.75rem',
          lineHeight: '1rem',
          fontWeight: 600,
          padding: '3px 5px'
        }
      };
    })
    .filter(event => event !== null);

  const calendarEvents = [...availableSlotEvents, ...bookedAppointmentEvents];

  // Open modal with all slots for a date if more than one
  const openSlotsModalIfMultiple = (dateStr: string) => {
    const slotsForDate = availabilitySlots.filter(s => s.date === dateStr);
    if (slotsForDate.length > 1) {
      setSelectedDateSlots(slotsForDate);
      setSelectedDateLabel(dateStr);
      setShowMultiSlotsModal(true);
      return true;
    }
    return false;
  };

  // Add new availability slot
  const handleAddSlot = async () => {
    setNewSlotError('');
    
    if (!newSlotDate || !newSlotStartTime || !newSlotEndTime) {
      setNewSlotError('Please fill in all fields');
      return;
    }
    
    if (newSlotStartTime >= newSlotEndTime) {
      setNewSlotError('End time must be after start time');
      return;
    }

    try {
      // Calculate slot duration in minutes
      const startTime = new Date(`1970-01-01T${newSlotStartTime}:00`);
      const endTime = new Date(`1970-01-01T${newSlotEndTime}:00`);
      const slotDuration = (endTime.getTime() - startTime.getTime()) / (1000 * 60);

      const { error } = await supabase
        .from('availability')
        .insert([{
          date: newSlotDate,
          start: newSlotStartTime,
          start_time: newSlotStartTime, // Set both start and start_time for consistency
          end_time: newSlotEndTime,
          schedule_type: 'manual', // Mark as manually created
          slot_duration: slotDuration,
          is_available: true
        }])
        .select();

      if (error) throw error;

      showSuccess('Success', 'Availability slot added successfully');
      setNewSlotDate('');
      setNewSlotStartTime('');
      setNewSlotEndTime('');
      
      // Refresh the data
      await fetchAvailabilitySlots();
      await fetchBookedSlots();
    } catch (error) {
      console.error('Error adding availability slot:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      showError('Error', `Failed to add availability slot: ${errorMessage}`);
    }
  };

  // Delete availability slot - now single step
  const handleDeleteSlot = async (slot: AvailabilitySlot) => {
    if (!slot?.id) return;

    // Check if slot is in the past
    if (isSlotInPast(slot)) {
      showError('Cannot Delete', 'Cannot delete past or current availability slots. Only future slots can be deleted.');
      return;
    }

    try {
      const { error } = await supabase
        .from('availability')
        .delete()
        .eq('id', slot.id);

      if (error) throw error;

      showSuccess('Success', 'Availability slot deleted successfully');
      
      // Refresh the data
      await Promise.all([fetchAvailabilitySlots(), fetchBookedSlots()]);
    } catch (error) {
      console.error('Error deleting availability slot:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      showError('Error', `Failed to delete availability slot: ${errorMessage}`);
    }
  };

  // Check if a date has confirmed bookings
  const hasConfirmedBookingsOnDate = (dateStr: string): boolean => {
    return bookedSlots.some(booking => 
      booking.booking_date === dateStr && 
      (booking.status === 'confirmed' || booking.status === 'completed')
    );
  };

  // Delete all slots for a specific date
  const handleDeleteAllDaySlots = (dateStr: string) => {
    const slotsForDate = availabilitySlots.filter(slot => slot.date === dateStr);
    
    if (slotsForDate.length === 0) {
      showError('No Slots', 'No availability slots found for this date.');
      return;
    }

    // Check if date is in the past
    if (isDateInPast(dateStr)) {
      showError('Cannot Delete', 'Cannot delete past or current availability slots. Only future slots can be deleted.');
      return;
    }

    if (hasConfirmedBookingsOnDate(dateStr)) {
      showError('Cannot Delete', 'This date has confirmed bookings. Please cancel the bookings first to free up the slots.');
      return;
    }

    setDateToDeleteSlots(dateStr);
    setShowDeleteDayModal(true);
  };

  const confirmDeleteAllDaySlots = async () => {
    if (!dateToDeleteSlots) return;

    try {
      const slotsForDate = availabilitySlots.filter(slot => slot.date === dateToDeleteSlots);
      const slotIds = slotsForDate.map(slot => slot.id).filter(id => id !== undefined);

      if (slotIds.length === 0) {
        showError('Error', 'No valid slots found to delete.');
        return;
      }

      const { error } = await supabase
        .from('availability')
        .delete()
        .in('id', slotIds);

      if (error) throw error;

      // Close all modals
      setShowDeleteDayModal(false);
      setShowMultiSlotsModal(false);
      setShowEditModal(false);
      
      // Clear all modal-related state
      setDateToDeleteSlots('');
      setSelectedDateSlots([]);
      setSlotToEdit(null);
      
      // Navigate to overview tab
      setMainTab('overview');
      
      // Show success message after modal closing
      showSuccess('Success', `${slotIds.length} availability slots deleted successfully`);
      
      // Refresh the data
      await fetchAvailabilitySlots();
      await fetchBookedSlots();
    } catch (error) {
      console.error('Error deleting day slots:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      showError('Error', `Failed to delete day slots: ${errorMessage}`);
    }
  };

  // Save edited slot
  const handleSaveEdit = async () => {
    if (!slotToEdit?.id) return;
    setEditError('');
    if (!editStartTime || !editEndTime) {
      setEditError('Please provide start and end time');
      return;
    }
    if (editStartTime >= editEndTime) {
      setEditError('End time must be after start time');
      return;
    }
    
    try {
      const { error } = await supabase
        .from('availability')
        .update({ start: editStartTime, end_time: editEndTime })
        .eq('id', slotToEdit.id);

      if (error) throw error;
      
      // Close the modal first
      setShowEditModal(false);
      setSlotToEdit(null);
      setEditError('');
      
      // Then refresh the data and show success message
      await Promise.all([fetchAvailabilitySlots(), fetchBookedSlots()]);
      showSuccess('Updated', 'Availability slot updated successfully');
      
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      showError('Error', `Failed to update slot: ${msg}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title & View Toggle */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Availability Management</h2>
          <p className="text-gray-600 mt-1">
            Manage your available time slots for appointments. Booked slots are automatically marked and cannot be deleted.
          </p>
          {/* Debug Info */}
          <div className="mt-2 text-sm text-gray-500">
            Debug: {availabilitySlots.length} availability slots, {bookedSlots.length} booked slots
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-3">
          {/* Main Tabs */}
          <div className="flex rounded-lg overflow-hidden border border-gray-200">
            <button
              onClick={() => setMainTab('overview')}
              className={`px-4 py-2 text-sm ${mainTab === 'overview' ? 'bg-primary-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
            >
              Overview
            </button>
            <button
              onClick={() => setMainTab('default')}
              className={`px-4 py-2 text-sm ${mainTab === 'default' ? 'bg-primary-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
            >
              Default Schedule
            </button>
          </div>
          <button
            onClick={() => setViewMode(viewMode === 'list' ? 'calendar' : 'list')}
            className={`w-full sm:w-auto flex items-center justify-center px-4 py-2 rounded-lg transition-colors ${
              viewMode === 'calendar'
                ? 'bg-primary-600 text-white hover:bg-primary-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {viewMode === 'calendar' ? (
              <>
                <List className="w-4 h-4 mr-2" />
                List View
              </>
            ) : (
              <>
                <CalendarIcon className="w-4 h-4 mr-2" />
                Calendar View
              </>
            )}
          </button>
        </div>
      </div>

      {mainTab === 'overview' ? (
        <>
          {/* Add Availability Form (always on top) */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Time Slot</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                <input
                  type="date"
                  value={newSlotDate}
                  onChange={(e) => setNewSlotDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                <input
                  type="time"
                  value={newSlotStartTime}
                  onChange={(e) => setNewSlotStartTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
                <input
                  type="time"
                  value={newSlotEndTime}
                  onChange={(e) => setNewSlotEndTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
            {newSlotError && (
              <div className="mt-4 flex items-center p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                <span className="text-sm text-red-700">{newSlotError}</span>
              </div>
            )}
            <button
              onClick={handleAddSlot}
              className="mt-4 flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Time Slot
            </button>
          </div>
        </>
      ) : (
        <>
          {/* Default Schedule Manager */}
          {/* Quick Schedule Generator - Redesigned Schedule Creation */}
          <QuickScheduleGenerator
            onScheduleGenerated={async () => {
              // Refresh availability slots after generation
              await fetchAvailabilitySlots();
            }}
          />
        </>
      )}

      {/* Availability Slots Container (Calendar/List unified like Bookings) */}
      {mainTab === 'overview' && (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Availability Overview 
              <span className="text-sm font-normal text-gray-500 ml-2">
                ({availabilitySlots.length} slots, {bookedSlots.length} bookings)
              </span>
            </h3>
          </div>
          {viewMode === 'calendar' && (
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
          {viewMode === 'calendar' ? (
            <div className="space-y-4">
              {/* Legend */}
              <div className="flex flex-wrap items-center justify-center gap-4 p-3 bg-gray-50 rounded-lg border">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-emerald-600 rounded"></div>
                  <span className="text-sm text-gray-700">Available Slots</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-gray-400 rounded"></div>
                  <span className="text-sm text-gray-700">Booked Slots</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-red-500 rounded"></div>
                  <span className="text-sm text-gray-700">Customer Appointments</span>
                </div>
                <div className="text-xs text-gray-500 italic">
                  Customer names are displayed on appointment events
                </div>
              </div>
              <div style={{ height: '600px' }} className="p-4 border rounded-lg">
                <Calendar
                  localizer={localizer}
                  events={calendarEvents}
                  startAccessor="start"
                  endAccessor="end"
                  view={calendarViewType}
                  date={calendarDate}
                  onView={setCalendarViewType}
                  onNavigate={setCalendarDate}
                  showMultiDayTimes={false}
                  formats={{
                    timeGutterFormat: 'HH:mm',
                    eventTimeRangeFormat: () => '', // Disable automatic time range display on events
                    eventTimeRangeStartFormat: () => '', // Disable start time display
                    eventTimeRangeEndFormat: () => '', // Disable end time display  
                    agendaTimeFormat: 'HH:mm',
                    agendaTimeRangeFormat: ({ start, end }, culture, localizer) => 
                      `${localizer?.format(start, 'HH:mm', culture)} - ${localizer?.format(end, 'HH:mm', culture)}`,
                    dayFormat: 'dddd DD/MM',
                    dayHeaderFormat: 'dddd DD/MM',
                    dayRangeHeaderFormat: ({ start, end }, culture, localizer) =>
                      `${localizer?.format(start, 'DD/MM/YYYY', culture)} - ${localizer?.format(end, 'DD/MM/YYYY', culture)}`,
                    selectRangeFormat: ({ start, end }, culture, localizer) =>
                      `${localizer?.format(start, 'HH:mm', culture)} - ${localizer?.format(end, 'HH:mm', culture)}`
                  }}
                  components={{
                    event: ({ event }) => {
                      // Determine display based on view type
                      const isDay = calendarViewType === Views.DAY;
                      const displayText = isDay ? event.hoverTitle || event.title : event.title;
                      const tooltipText = event.hoverTitle || event.title;
                      
                      return (
                        <div 
                          title={tooltipText} 
                          style={{ 
                            height: '100%', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            textAlign: 'center',
                            padding: '2px',
                            fontSize: 'inherit',
                            fontWeight: 'inherit'
                          }}
                        >
                          {displayText}
                        </div>
                      );
                    }
                  }}
                  selectable
                  onSelectSlot={(slotInfo) => {
                    const start = slotInfo.start as Date;
                    const end = slotInfo.end as Date;
                    const pad = (n: number) => n.toString().padStart(2, '0');
                    const dateStr = `${start.getFullYear()}-${pad(start.getMonth()+1)}-${pad(start.getDate())}`;
                    // If multiple existing slots for that date open modal; otherwise prefill form
                    if (!openSlotsModalIfMultiple(dateStr)) {
                      const startTime = `${pad(start.getHours())}:${pad(start.getMinutes())}`;
                      const endTime = `${pad(end.getHours())}:${pad(end.getMinutes())}`;
                      setNewSlotDate(dateStr);
                      setNewSlotStartTime(startTime);
                      setNewSlotEndTime(endTime);
                    }
                  }}
                  onSelectEvent={(event: any) => {
                    // Only allow deletion of available slots, not booked appointments
                    if (event.type === 'booked-appointment') {
                      showError('Cannot Delete', 'This is a confirmed booking. Please cancel the booking first to free up the slot.');
                      return;
                    }
                    
                    if (event.type === 'booked-slot') {
                      showError('Cannot Delete', 'This availability slot is booked. Please cancel the booking first to free up the slot.');
                      return;
                    }

                    if (event.resource?.id && event.type === 'available-slot') {
                      const slot = event.resource as AvailabilitySlot;
                      
                      // Check if slot is in the past
                      if (isSlotInPast(slot)) {
                        showError('Cannot Edit', 'Cannot edit past or current availability slots. Only future slots can be edited.');
                        return;
                      }
                      
                      // If multiple for date, open list modal; else open edit modal
                      if (!openSlotsModalIfMultiple(slot.date)) {
                        setSlotToEdit(slot);
                        setEditStartTime(formatTime(getSlotStart(slot)));
                        setEditEndTime(formatTime(slot.end_time));
                        setEditError('');
                        setShowEditModal(true);
                      }
                    }
                  }}
                  eventPropGetter={(event: any) => {
                    let backgroundColor = '#059669'; // Default green for available
                    let borderColor = '#047857';
                    let fontSize = '0.7rem';
                    let fontWeight = 500;
                    
                    if (event.type === 'booked-slot') {
                      backgroundColor = '#9CA3AF'; // Gray for booked availability slots
                      borderColor = '#6B7280';
                    } else if (event.type === 'booked-appointment') {
                      backgroundColor = '#EF4444'; // Red for booked appointments without availability slots
                      borderColor = '#DC2626';
                      fontSize = '0.75rem'; // Slightly larger for booked appointments
                      fontWeight = 600;
                    }
                    
                    return {
                      style: {
                        backgroundColor,
                        borderColor,
                        color: 'white',
                        fontSize,
                        lineHeight: '1rem',
                        fontWeight,
                        padding: '3px 5px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center' as const,
                        borderRadius: '4px',
                        border: `2px solid ${borderColor}`,
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                      }
                    };
                  }}
                  style={{ height: '100%' }}
                />
              </div>
            </div>
          ) : (
            <div className="p-6">
              {availabilitySlots.length === 0 && bookedSlots.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No availability slots or bookings found</p>
                  <p className="text-sm text-gray-400 mt-1">Add some time slots to get started</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Available Slots Section */}
                  {availabilitySlots.length > 0 && (
                    <div>
                      <h4 className="text-md font-semibold text-gray-800 mb-3 flex items-center">
                        <div className="w-3 h-3 bg-emerald-600 rounded mr-2"></div>
                        Available Slots ({availabilitySlots.length})
                      </h4>
                      
                      {/* Group slots by date */}
                      {Object.entries(
                        availabilitySlots.reduce((acc, slot) => {
                          const date = slot.date;
                          if (!acc[date]) acc[date] = [];
                          acc[date].push(slot);
                          return acc;
                        }, {} as Record<string, AvailabilitySlot[]>)
                      ).map(([date, slotsForDate]) => (
                        <div key={date} className="mb-6">
                          <div className="flex items-center justify-between mb-3">
                            <h5 className="text-sm font-medium text-gray-700">
                              {new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })} ({slotsForDate.length} slot{slotsForDate.length !== 1 ? 's' : ''})
                            </h5>
                            {slotsForDate.length > 1 && (
                              <button
                                onClick={() => handleDeleteAllDaySlots(date)}
                                disabled={hasConfirmedBookingsOnDate(date) || isDateInPast(date)}
                                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                                  hasConfirmedBookingsOnDate(date) || isDateInPast(date)
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-red-600 text-white hover:bg-red-700'
                                }`}
                                title={
                                  hasConfirmedBookingsOnDate(date) 
                                    ? 'Cannot delete - confirmed bookings exist'
                                    : isDateInPast(date)
                                      ? 'Cannot delete - past date'
                                      : 'Delete all slots for this day'
                                }
                              >
                                Delete All Day
                              </button>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {slotsForDate.map((slot) => {
                              // Find specific booking that matches this slot (same logic as calendar view)
                              const matchingBooking = bookedSlots.find(booking => {
                                const bookingDateTime = getBookingDateTime(booking);
                                if (!bookingDateTime) return false;

                                return bookingDateTime.date === slot.date &&
                                  bookingDateTime.time >= getSlotStart(slot) &&
                                  bookingDateTime.time < slot.end_time;
                              });

                              // A slot is considered booked if there's a matching booking OR it's marked unavailable
                              const isBooked = !!matchingBooking || slot.is_available === false;
                              
                              return (
                                <div
                                  key={slot.id || `${slot.date}-${getSlotStart(slot)}-${slot.end_time}`}
                                  className={`p-3 border rounded-lg relative transition-colors ${
                                    isBooked
                                      ? 'border-red-300 bg-red-50'
                                      : 'border-emerald-200 bg-emerald-50 hover:border-emerald-300'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                      {isBooked ? (
                                        (() => {
                          // Try to find booking details - use multiple strategies for better matching
                          let displayBooking = matchingBooking;

                          if (!displayBooking && slot.is_available === false) {
                            // Strategy 1: Look for any booking that overlaps with this slot (original logic)
                            displayBooking = bookedSlots.find(booking => {
                              const bookingDateTime = getBookingDateTime(booking);
                              if (!bookingDateTime || bookingDateTime.date !== slot.date) return false;

                              const bookingStart = bookingDateTime.time;
                              const slotStart = getSlotStart(slot);
                              const slotEnd = slot.end_time;

                              return bookingStart >= slotStart && bookingStart < slotEnd;
                            });

                            // Strategy 2: If no exact overlap, look for any booking on the same date with close times
                            if (!displayBooking) {
                              displayBooking = bookedSlots.find(booking => {
                                const bookingDateTime = getBookingDateTime(booking);
                                if (!bookingDateTime || bookingDateTime.date !== slot.date) return false;

                                // Convert times to minutes for easier comparison
                                const timeToMinutes = (time: string) => {
                                  const [hours, minutes] = time.split(':').map(Number);
                                  return hours * 60 + minutes;
                                };

                                const bookingMinutes = timeToMinutes(bookingDateTime.time);
                                const slotStartMinutes = timeToMinutes(getSlotStart(slot));
                                const slotEndMinutes = timeToMinutes(slot.end_time);

                                // Check if booking time is within 30 minutes of slot start/end (flexible matching)
                                const withinRange = Math.abs(bookingMinutes - slotStartMinutes) <= 30 || 
                                                   Math.abs(bookingMinutes - slotEndMinutes) <= 30 ||
                                                   (bookingMinutes >= slotStartMinutes && bookingMinutes <= slotEndMinutes);

                                return withinRange;
                              });
                            }

                            // Strategy 3: Last resort - find ANY booking on the same date
                            if (!displayBooking) {
                              displayBooking = bookedSlots.find(booking => {
                                const bookingDateTime = getBookingDateTime(booking);
                                return bookingDateTime && bookingDateTime.date === slot.date;
                              });
                            }
                          }

                          if (displayBooking) {
                            // Found booking for unavailable slot
                                            return (
                                              <div>
                                                <p className="text-sm font-medium text-red-700 mb-1">
                                                  📅 BOOKED
                                                </p>
                                                <p className="text-xs text-gray-700">
                                                  <strong>Customer:</strong> {displayBooking.customer_name}
                                                </p>
                                                <p className="text-xs text-gray-700">
                                                  <strong>Service:</strong> {displayBooking.package_name}
                                                </p>
                                                <p className="text-xs text-gray-600">
                                                  <strong>Time:</strong> {(() => {
                                                    const bookingDateTime = getBookingDateTime(displayBooking);
                                                    const bookingEndTime = displayBooking.timeslot_end_time ||
                                                      (bookingDateTime ? (() => {
                                                        const [hours, minutes] = bookingDateTime.time.split(':').map(Number);
                                                        const endMinutes = minutes + 50;
                                                        const endHours = hours + Math.floor(endMinutes / 60);
                                                        const finalMinutes = endMinutes % 60;
                                                        return `${endHours.toString().padStart(2, '0')}:${finalMinutes.toString().padStart(2, '0')}`;
                                                      })() : '');
                                                    return `${bookingDateTime?.time || ''} - ${bookingEndTime}`;
                                                  })()}
                                                </p>
                                              </div>
                                            );
                                          } else {
                                            // No booking found for unavailable slot
                                            
                                            return (
                                              <div>
                                                <p className="text-sm font-medium text-red-700 mb-1">
                                                  📅 UNAVAILABLE
                                                </p>
                                                <p className="text-xs text-gray-600">
                                                  This slot is not available for booking
                                                </p>
                                              </div>
                                            );
                                          }
                                        })()
                                      ) : (
                                        <p className={`text-sm font-medium ${isBooked ? 'text-gray-500' : 'text-emerald-600'}`}>
                                          {formatTime(getSlotStart(slot))} - {formatTime(slot.end_time)}
                                          {!isBooked && ' (Available)'}
                                        </p>
                                      )}
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <Clock className={`w-4 h-4 ${isBooked ? 'text-gray-400' : 'text-emerald-500'}`} />
                                      {!isBooked && !isSlotInPast(slot) && (
                                        <button
                                          onClick={() => handleDeleteSlot(slot)}
                                          className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                          title="Delete availability slot"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      )}
                                      {!isBooked && isSlotInPast(slot) && (
                                        <div className="text-xs text-gray-400 px-2 py-1 bg-gray-100 rounded">
                                          Past
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Booked Appointments Without Availability Slots */}
                  {bookedSlots.filter(booking => {
                    const bookingDateTime = getBookingDateTime(booking);
                    if (!bookingDateTime) return false;
                    
                    const hasAvailabilitySlot = availabilitySlots.some(slot => 
                      slot.date === bookingDateTime.date &&
                      bookingDateTime.time >= getSlotStart(slot) &&
                      bookingDateTime.time < slot.end_time
                    );
                    
                    return !hasAvailabilitySlot;
                  }).length > 0 && (
                    <div>
                      <h4 className="text-md font-semibold text-gray-800 mb-3 flex items-center">
                        <div className="w-3 h-3 bg-red-500 rounded mr-2"></div>
                        Customer Appointments ({bookedSlots.filter(booking => {
                          const bookingDateTime = getBookingDateTime(booking);
                          if (!bookingDateTime) return false;
                          
              const hasAvailabilitySlot = availabilitySlots.some(slot => 
                            slot.date === bookingDateTime.date &&
                bookingDateTime.time >= getSlotStart(slot) &&
                            bookingDateTime.time < slot.end_time
                          );
                          
                          return !hasAvailabilitySlot;
                        }).length})
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {bookedSlots
                          .filter(booking => {
                            const bookingDateTime = getBookingDateTime(booking);
                            if (!bookingDateTime) return false;
                            
                            const hasAvailabilitySlot = availabilitySlots.some(slot => 
                              slot.date === bookingDateTime.date &&
                              bookingDateTime.time >= getSlotStart(slot) &&
                              bookingDateTime.time < slot.end_time
                            );
                            
                            return !hasAvailabilitySlot;
                          })
                          .map((booking) => {
                            const bookingDateTime = getBookingDateTime(booking);
                            if (!bookingDateTime) return null;
                            
                            return (
                              <div
                                key={booking.id}
                                className="p-4 border border-red-200 bg-red-50 rounded-lg relative"
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="font-medium text-gray-900">{bookingDateTime.date}</p>
                                    <p className="text-sm text-red-600 font-medium">{bookingDateTime.time}</p>
                                    <p className="text-sm text-gray-800 mt-1 font-semibold">{booking.customer_name}</p>
                                    <p className="text-xs text-gray-600">{booking.package_name}</p>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Clock className="w-5 h-5 text-red-500" />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
      )}
        </div>
      </div>
    )}

      {/* Edit Slot Modal */}
      {showEditModal && slotToEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center mb-4">
              <CalendarIcon className="w-6 h-6 text-primary-600 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">Edit Availability Slot</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                <input type="date" value={slotToEdit.date} disabled className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                  <input type="time" value={editStartTime} onChange={(e) => setEditStartTime(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
                  <input type="time" value={editEndTime} onChange={(e) => setEditEndTime(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
              </div>
              {editError && (
                <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                  <span className="text-sm text-red-700">{editError}</span>
                </div>
              )}
            </div>
            <div className="flex justify-between items-center mt-6">
              <button 
                onClick={() => {
                  if (slotToEdit) {
                    setShowEditModal(false);
                    handleDeleteSlot(slotToEdit);
                  }
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 flex items-center"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </button>
              <div className="flex space-x-3">
                <button onClick={() => { setShowEditModal(false); setSlotToEdit(null); }} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200">Cancel</button>
                <button onClick={handleSaveEdit} className="px-4 py-2 text-sm font-medium text-white bg-[#71db77] border border-transparent rounded-md hover:bg-[#5fcf68]">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Multi Slots Modal */}
      {showMultiSlotsModal && selectedDateSlots.length > 1 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <CalendarIcon className="w-6 h-6 text-primary-600 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900">Slots - {selectedDateLabel}</h3>
              </div>
              <button
                onClick={() => handleDeleteAllDaySlots(selectedDateLabel)}
                disabled={hasConfirmedBookingsOnDate(selectedDateLabel) || isDateInPast(selectedDateLabel)}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                  hasConfirmedBookingsOnDate(selectedDateLabel) || isDateInPast(selectedDateLabel)
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
                title={
                  hasConfirmedBookingsOnDate(selectedDateLabel) 
                    ? 'Cannot delete - confirmed bookings exist'
                    : isDateInPast(selectedDateLabel)
                      ? 'Cannot delete - past date'
                      : 'Delete all slots for this day'
                }
              >
                Delete All Day
              </button>
            </div>
            <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
              {selectedDateSlots.map(slot => (
                <div key={slot.id || `${slot.date}-${getSlotStart(slot)}-${slot.end_time}`}
                  className="flex items-center justify-between border border-gray-200 rounded-md px-4 py-2">
                  <span className="text-sm font-medium text-gray-800">
                    {formatTime(getSlotStart(slot))} - {formatTime(slot.end_time)}
                    {isSlotInPast(slot) && ' (Past)'}
                  </span>
                  {!isSlotInPast(slot) ? (
                    <button
                      onClick={() => handleDeleteSlot(slot)}
                      className="px-3 py-1 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700 transition-colors"
                    >
                      Delete
                    </button>
                  ) : (
                    <div className="text-xs text-gray-400 px-3 py-1 bg-gray-100 rounded">
                      Past
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => { setShowMultiSlotsModal(false); setSelectedDateSlots([]); }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Day Confirmation Modal */}
      {showDeleteDayModal && dateToDeleteSlots && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center mb-4">
              <AlertCircle className="w-6 h-6 text-red-600 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">Delete All Day Slots</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to delete all availability slots for {dateToDeleteSlots}? 
              This will delete {availabilitySlots.filter(slot => slot.date === dateToDeleteSlots).length} slots. 
              This action cannot be undone.
            </p>
            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-sm text-gray-700">
              <div className="flex justify-between">
                <span className="text-gray-500">Date:</span>
                <span className="font-medium text-gray-900">{dateToDeleteSlots}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-gray-500">Slots to delete:</span>
                <span className="font-medium text-gray-900">
                  {availabilitySlots.filter(slot => slot.date === dateToDeleteSlots).length}
                </span>
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => { setShowDeleteDayModal(false); setDateToDeleteSlots(''); }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteAllDaySlots}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
              >
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
