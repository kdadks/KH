import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, momentLocalizer, View, Views } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import moment from 'moment';
import { 
  Plus, 
  Clock, 
  Trash2, 
  Calendar as CalendarIcon,
  List,
  AlertCircle
} from 'lucide-react';
import { useToast } from '../shared/toastContext';
import { supabase } from '../../supabaseClient';

const localizer = momentLocalizer(moment);

interface AvailabilitySlot {
  id?: number;
  date: string;
  start: string;
  end_time: string;
}

interface BookedSlot {
  id: string;
  customer_name: string;
  package_name: string;
  booking_date: string;
  status: string;
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
  const [slotToDelete, setSlotToDelete] = useState<AvailabilitySlot | null>(null);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
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

  const fetchAvailabilitySlots = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('availability')
        .select('*')
        .order('date', { ascending: true })
        .order('start', { ascending: true });

      if (error) {
        showError('Error', `Database error: ${error.message}`);
        return;
      }

      setAvailabilitySlots(data || []);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      showError('Error', `Failed to load availability slots: ${errorMessage}`);
    }
  }, [showError]);

  const fetchBookedSlots = useCallback(async () => {
    try {
      // First, try the new structure with customers join
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id, 
          package_name, 
          booking_date, 
          status,
          customer_id,
          customers!inner (
            first_name,
            last_name,
            email
          )
        `)
        .in('status', ['confirmed', 'completed'])
        .order('booking_date', { ascending: true });

      if (error) {
        // If the join fails, try a simpler query without the join
        console.warn('Join query failed, trying simple query:', error.message);
        
        const { data: simpleData, error: simpleError } = await supabase
          .from('bookings')
          .select('id, package_name, booking_date, status, customer_id')
          .in('status', ['confirmed', 'completed'])
          .order('booking_date', { ascending: true });

        if (simpleError) {
          showError('Error', `Database error: ${simpleError.message}`);
          return;
        }

        // For simple data, try to fetch customer names separately
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
                customerName = `${customerData.first_name} ${customerData.last_name}`;
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
            appointment_date: undefined,
            appointment_time: undefined
          };
        }));

        setBookedSlots(transformedSimpleData);
        return;
      }

      // Transform the data to match our BookedSlot interface
      const transformedData = (data || []).map((booking: any) => ({
        id: booking.id,
        customer_name: booking.customers 
          ? `${booking.customers.first_name} ${booking.customers.last_name}`.trim()
          : `Customer ID: ${booking.customer_id}`,
        package_name: booking.package_name,
        booking_date: booking.booking_date,
        status: booking.status,
        appointment_date: undefined,
        appointment_time: undefined
      }));

      setBookedSlots(transformedData);
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

  // Convert slots to calendar events  
  const formatTime = (t: string) => {
    if (!t) return t;
    const parts = t.split(':');
    return parts.length >= 2 ? `${parts[0]}:${parts[1]}` : t;
  };

  // Helper function to extract date and time from booking_date
  const getBookingDateTime = (booking: BookedSlot) => {
    if (booking.booking_date) {
      const bookingDateTime = new Date(booking.booking_date);
      if (!isNaN(bookingDateTime.getTime())) {
        const year = bookingDateTime.getFullYear();
        const month = String(bookingDateTime.getMonth() + 1).padStart(2, '0');
        const day = String(bookingDateTime.getDate()).padStart(2, '0');
        const hours = String(bookingDateTime.getHours()).padStart(2, '0');
        const minutes = String(bookingDateTime.getMinutes()).padStart(2, '0');
        
        return {
          date: `${year}-${month}-${day}`,
          time: `${hours}:${minutes}`
        };
      }
    }
    
    // Fallback to appointment_date and appointment_time if they exist
    if (booking.appointment_date && booking.appointment_time) {
      return {
        date: booking.appointment_date,
        time: booking.appointment_time
      };
    }
    
    return null;
  };

  // Create available slot events
  const availableSlotEvents = availabilitySlots.map(slot => {
    const startFmt = formatTime(slot.start);
    const endFmt = formatTime(slot.end_time);
    
    // Check if this slot conflicts with any booked slot
    const isBooked = bookedSlots.some(booking => {
      const bookingDateTime = getBookingDateTime(booking);
      if (!bookingDateTime) return false;
      
      return bookingDateTime.date === slot.date && 
             bookingDateTime.time >= slot.start && 
             bookingDateTime.time < slot.end_time;
    });

    return {
      id: `available-${slot.id}`,
      title: isBooked ? `${startFmt} - ${endFmt} (Booked)` : `${startFmt} - ${endFmt}`,
      start: new Date(`${slot.date}T${slot.start}`),
      end: new Date(`${slot.date}T${slot.end_time}`),
      resource: slot,
      type: isBooked ? 'booked-slot' : 'available-slot',
      style: {
        backgroundColor: isBooked ? '#9CA3AF' : '#10B981',
        borderColor: isBooked ? '#6B7280' : '#059669',
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
        bookingDateTime.time >= slot.start &&
        bookingDateTime.time < slot.end_time
      );
      
      return !hasAvailabilitySlot;
    })
    .map(booking => {
      const bookingDateTime = getBookingDateTime(booking);
      if (!bookingDateTime) return null;

      // Assume 1-hour duration if we don't have end time
      const startTime = new Date(`${bookingDateTime.date}T${bookingDateTime.time}:00`);
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

      return {
        id: `booking-${booking.id}`,
        title: `${bookingDateTime.time} - ${booking.customer_name}`,
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
      const { error } = await supabase
        .from('availability')
        .insert([{
          date: newSlotDate,
          start: newSlotStartTime,
          end_time: newSlotEndTime
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

  // Delete availability slot
  const handleDeleteSlot = (slot: AvailabilitySlot) => {
    setSlotToDelete(slot);
    setShowDeleteConfirmModal(true);
  };

  const confirmDeleteSlot = async () => {
    if (!slotToDelete?.id) return;

    try {
      const { error } = await supabase
        .from('availability')
        .delete()
        .eq('id', slotToDelete.id);

      if (error) throw error;

      showSuccess('Success', 'Availability slot deleted successfully');
      setShowDeleteConfirmModal(false);
      setSlotToDelete(null);
      
      // Refresh the data
      await fetchAvailabilitySlots();
      await fetchBookedSlots();
    } catch (error) {
      console.error('Error deleting availability slot:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      showError('Error', `Failed to delete availability slot: ${errorMessage}`);
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
        </div>
        <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-3">
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

      {/* Availability Slots Container (Calendar/List unified like Bookings) */}
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
                      // If multiple for date open modal, else proceed to delete confirmation
                      if (!openSlotsModalIfMultiple(slot.date)) {
                        handleDeleteSlot(slot);
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
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {availabilitySlots.map((slot) => {
                          // Check if this slot is booked
                          const isBooked = bookedSlots.some(booking => {
                            const bookingDateTime = getBookingDateTime(booking);
                            if (!bookingDateTime) return false;
                            
                            return bookingDateTime.date === slot.date && 
                                   bookingDateTime.time >= slot.start && 
                                   bookingDateTime.time < slot.end_time;
                          });
                          
                          return (
                            <div
                              key={slot.id || `${slot.date}-${slot.start}-${slot.end_time}`}
                              className={`p-4 border rounded-lg relative transition-colors ${
                                isBooked 
                                  ? 'border-gray-300 bg-gray-50' 
                                  : 'border-emerald-200 bg-emerald-50 hover:border-emerald-300'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className={`font-medium ${isBooked ? 'text-gray-700' : 'text-gray-900'}`}>
                                    {slot.date}
                                  </p>
                                  <p className={`text-sm ${isBooked ? 'text-gray-500' : 'text-emerald-600'}`}>
                                    {formatTime(slot.start)} - {formatTime(slot.end_time)}
                                    {isBooked && ' (Booked)'}
                                  </p>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Clock className={`w-5 h-5 ${isBooked ? 'text-gray-400' : 'text-emerald-500'}`} />
                                  {!isBooked && (
                                    <button
                                      onClick={() => handleDeleteSlot(slot)}
                                      className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                      title="Delete availability slot"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Booked Appointments Without Availability Slots */}
                  {bookedSlots.filter(booking => {
                    const bookingDateTime = getBookingDateTime(booking);
                    if (!bookingDateTime) return false;
                    
                    const hasAvailabilitySlot = availabilitySlots.some(slot => 
                      slot.date === bookingDateTime.date &&
                      bookingDateTime.time >= slot.start &&
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
                            bookingDateTime.time >= slot.start &&
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
                              bookingDateTime.time >= slot.start &&
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

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmModal && slotToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center mb-4">
              <AlertCircle className="w-6 h-6 text-red-600 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">Delete Availability Slot</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">Are you sure you want to delete this slot? This action cannot be undone.</p>
            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-sm text-gray-700">
              <div className="flex justify-between"><span className="text-gray-500">Date:</span><span className="font-medium text-gray-900">{slotToDelete.date}</span></div>
              <div className="flex justify-between mt-1"><span className="text-gray-500">Time:</span><span className="font-medium text-gray-900">{slotToDelete.start} - {slotToDelete.end_time}</span></div>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => { setShowDeleteConfirmModal(false); setSlotToDelete(null); }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteSlot}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Multi Slots Modal */}
      {showMultiSlotsModal && selectedDateSlots.length > 1 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <div className="flex items-center mb-4">
              <CalendarIcon className="w-6 h-6 text-primary-600 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">Slots - {selectedDateLabel}</h3>
            </div>
            <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
              {selectedDateSlots.map(slot => (
                <div key={slot.id || `${slot.date}-${slot.start}-${slot.end_time}`}
                  className="flex items-center justify-between border border-gray-200 rounded-md px-4 py-2">
                  <span className="text-sm font-medium text-gray-800">{formatTime(slot.start)} - {formatTime(slot.end_time)}</span>
                  <button
                    onClick={() => handleDeleteSlot(slot)}
                    className="px-3 py-1 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700 transition-colors"
                  >
                    Delete
                  </button>
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
    </div>
  );
};
