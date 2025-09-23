import React, { useState, useEffect, useCallback } from 'react';
import { X, Calendar, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { useToast } from '../shared/toastContext';
import { UserBooking } from '../../types/userManagement';

interface RescheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: UserBooking;
  onRescheduleComplete: (oldDate?: string, oldTime?: string, newDate?: string, newTime?: string, reason?: string) => void;
}

interface AvailabilitySlot {
  id: number;
  date: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
  slot_type: 'in-hour' | 'out-of-hour';
}

const RescheduleModal: React.FC<RescheduleModalProps> = ({
  isOpen,
  onClose,
  booking,
  onRescheduleComplete
}) => {
  const { showError, showSuccess } = useToast();
  const [availableSlots, setAvailableSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    date: '',
    timeSlot: ''
  });
  const [nextAvailableSlot, setNextAvailableSlot] = useState<{
    date: string;
    timeSlot: string;
    display: string;
  } | null>(null);

  const fetchAvailableSlots = useCallback(async () => {
    setLoading(true);
    try {
      // Get available slots for the next 30 days
      const today = new Date();
      const endDate = new Date();
      endDate.setDate(today.getDate() + 30);

      console.log('🔍 Reschedule Modal - Fetching availability between:', {
        start: today.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0],
        originalBooking: {
          package_name: booking.package_name,
          id: booking.id
        }
      });

      // Determine service type from the original booking's package_name
      let slotTypeFilter = null;
      
      if (booking.package_name) {
        // More comprehensive matching for slot types
        const packageLower = booking.package_name.toLowerCase();
        if (packageLower.includes('in hour') || packageLower.includes('in-hour')) {
          slotTypeFilter = 'in-hour';
        } else if (packageLower.includes('out of hour') || packageLower.includes('out-of-hour')) {
          slotTypeFilter = 'out-of-hour';
        }
        // If neither pattern matches, show all slots (no filter)
      }

      console.log('🎯 Determined slot type filter:', slotTypeFilter, 'from package:', booking.package_name);

      // Base query for availability - include both manual and template schedules
      let availabilityQuery = supabase
        .from('availability')
        .select('*')
        .gte('date', today.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .eq('is_available', true)
        .in('schedule_type', ['manual', 'template']) // Include both manual and template schedules
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      // Apply slot type filter if determined, otherwise show all slots
      if (slotTypeFilter) {
        availabilityQuery = availabilityQuery.eq('slot_type', slotTypeFilter);
        console.log('🔍 Applying slot type filter:', slotTypeFilter);
      } else {
        console.log('🔍 No slot type filter - showing all available slots');
      }

      const { data, error } = await availabilityQuery;

      if (error) {
        console.error('❌ Error fetching availability:', error);
        showError('Error', 'Failed to load available time slots');
        return;
      }

      console.log('📅 Raw availability data fetched:', {
        totalSlots: data?.length || 0,
        scheduleTypeBreakdown: data?.reduce((acc, slot) => {
          const type = slot.schedule_type || 'NULL';
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {}),
        sampleSlots: data?.slice(0, 3),
        dateRange: data?.length > 0 ? {
          first: data[0]?.date,
          last: data[data.length - 1]?.date
        } : null
      });

      console.log('Fetched availability slots:', data);

      // Filter out any slots with missing time data
      const validSlots = (data || []).filter(slot => {
        const hasStartTime = slot.start_time || slot.start;
        const hasEndTime = slot.end_time;
        const isValid = hasStartTime && hasEndTime;
        
        if (!isValid) {
          console.warn('❌ Filtered out invalid slot:', {
            id: slot.id,
            date: slot.date,
            start_time: slot.start_time,
            start: slot.start,
            end_time: slot.end_time,
            schedule_type: slot.schedule_type,
            reason: !hasStartTime ? 'Missing start time' : 'Missing end time'
          });
          return false;
        }
        return true;
      });

      console.log('✅ Valid slots after filtering:', {
        total: validSlots.length,
        uniqueDates: [...new Set(validSlots.map(s => s.date))].sort()
      });

      // Normalize slot data to ensure consistent field names
      const normalizedSlots = validSlots.map(slot => ({
        ...slot,
        start_time: slot.start_time || slot.start, // Use start_time if available, fallback to start
      }));

      setAvailableSlots(normalizedSlots);

      // Find next available slot recommendation
      if (normalizedSlots && normalizedSlots.length > 0) {
        const now = new Date();
        const currentDate = now.toISOString().split('T')[0];
        const currentTime = now.toTimeString().substring(0, 5);

        // Find the first slot that's in the future
        const nextSlot = normalizedSlots.find(slot => {
          const slotDate = slot.date;
          const startTime = slot.start_time.substring(0, 5);

          // If slot is today, check if time is in the future
          if (slotDate === currentDate) {
            return startTime > currentTime;
          }
          // It's a future date, so it's available
          return slotDate > currentDate;
        });

        if (nextSlot) {
          const displayDate = new Date(nextSlot.date).toLocaleDateString('en-IE', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
          const displayTime = formatTime(nextSlot.start_time, nextSlot.end_time);

          setNextAvailableSlot({
            date: nextSlot.date,
            timeSlot: `${nextSlot.start_time}-${nextSlot.end_time}`,
            display: `${displayDate} at ${displayTime}`
          });
        } else {
          setNextAvailableSlot(null);
        }
      } else {
        setNextAvailableSlot(null);
      }
    } catch (error) {
      console.error('Error fetching slots:', error);
      showError('Error', 'Failed to load available time slots');
    } finally {
      setLoading(false);
    }
  }, [booking.package_name, booking.id, showError]);

  useEffect(() => {
    if (isOpen) {
      fetchAvailableSlots();
    }
  }, [isOpen, fetchAvailableSlots]);

  const handleReschedule = async () => {
    if (!formData.date || !formData.timeSlot) {
      showError('Error', 'Please select both date and time');
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedSlot = availableSlots.find(slot =>
        slot.date === formData.date && `${slot.start_time}-${slot.end_time}` === formData.timeSlot
      );

      if (!selectedSlot) {
        showError('Error', 'Selected time slot is no longer available');
        return;
      }

      // Check if this requires approval workflow (24-hour rule for customers)
      const appointmentDateTime = new Date(`${booking.booking_date}`);
      const currentTime = new Date();
      const hoursUntilAppointment = (appointmentDateTime.getTime() - currentTime.getTime()) / (1000 * 60 * 60);
      
      const requiresApproval = hoursUntilAppointment < 24;

      if (requiresApproval) {
        // Use approval workflow for requests within 24 hours
        const { submitCustomerReschedulingRequest } = await import('../../utils/emailWorkflowIntegration');
        
        const result = await submitCustomerReschedulingRequest(
          booking.id,
          {
            newAppointmentDate: formData.date,
            newAppointmentTime: selectedSlot.start_time,
            reschedule_reason: 'Customer requested rescheduling',
            customer_notes: 'Rescheduling request submitted via customer portal'
          }
        );

        if (result.success) {
          showSuccess(
            'Request Submitted', 
            'Your rescheduling request has been submitted for admin approval. You will receive an email confirmation once processed.'
          );
          // For approval workflow, pass undefined parameters since email will be sent upon approval
          onRescheduleComplete();
        } else {
          showError('Error', result.errors?.[0] || 'Failed to submit rescheduling request');
        }
      } else {
        // Direct rescheduling for requests more than 24 hours in advance
        // Update the booking with new date and time
        const newDateTime = `${formData.date}T${selectedSlot.start_time}`;

        const { error: updateError } = await supabase
          .from('bookings')
          .update({
            booking_date: newDateTime,
            timeslot_start_time: selectedSlot.start_time,
            timeslot_end_time: selectedSlot.end_time
          })
          .eq('id', booking.id);

        if (updateError) {
          console.error('Error updating booking:', updateError);
          showError('Error', 'Failed to reschedule booking');
          return;
        }

        // Mark the new slot as unavailable
        const { error: slotError } = await supabase
          .from('availability')
          .update({ is_available: false })
          .eq('id', selectedSlot.id);

        if (slotError) {
          console.error('Error updating slot availability:', slotError);
          // Don't fail the reschedule for this, just log it
        }

        // Send immediate rescheduling notification
        try {
          const { integrateBookingReschedulingWorkflow } = await import('../../utils/emailWorkflowIntegration');
          
          await integrateBookingReschedulingWorkflow(
            booking.id,
            formData.date,
            selectedSlot.start_time,
            {
              reschedule_reason: 'Customer self-rescheduled',
              reschedule_note: 'Customer rescheduled their appointment through the customer portal.',
              rescheduled_by: 'customer',
              old_appointment_date: booking.booking_date?.split('T')[0] || '',
              old_appointment_time: booking.timeslot_start_time || ''
            }
          );
        } catch (emailError) {
          console.warn('Email notification failed:', emailError);
          // Don't fail the reschedule for email issues
        }

        showSuccess('Success', 'Booking rescheduled successfully! You will receive a confirmation email with the updated appointment details.');
        
        // Pass the rescheduling details to the callback for admin email notification
        const oldDate = booking.booking_date?.split('T')[0] || '';
        const oldTime = booking.timeslot_start_time || '';
        const newDate = formData.date;
        const newTime = selectedSlot.start_time;
        const reason = 'Customer self-rescheduled';
        
        onRescheduleComplete(oldDate, oldTime, newDate, newTime, reason);
      }

    } catch (error) {
      console.error('Error rescheduling booking:', error);
      showError('Error', 'Failed to reschedule booking');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Group slots by date
  const groupedSlots = availableSlots.reduce((acc, slot) => {
    if (!acc[slot.date]) {
      acc[slot.date] = [];
    }
    acc[slot.date].push(slot);
    return acc;
  }, {} as Record<string, AvailabilitySlot[]>);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (startTime: string, endTime: string) => {
    if (!startTime || !endTime) {
      console.warn('formatTime: Missing time data', { startTime, endTime });
      return 'Time not available';
    }
    try {
      const start = startTime.substring(0, 5);
      const end = endTime.substring(0, 5);

      // Convert to 12-hour format for better readability
      const formatTo12Hour = (time: string) => {
        const [hours, minutes] = time.split(':').map(Number);
        const period = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
        return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
      };

      return `${formatTo12Hour(start)} - ${formatTo12Hour(end)}`;
    } catch (error) {
      console.error('Error formatting time:', error, { startTime, endTime });
      return 'Time format error';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Reschedule Booking</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Current booking info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-blue-900 mb-2">Current Booking</h3>
            <div className="text-sm text-blue-700">
              <p><strong>Service:</strong> {booking.package_name}</p>
              <p><strong>Current Date:</strong> {booking.booking_date ? formatDate(booking.booking_date.split('T')[0]) : 'N/A'}</p>
              <p><strong>Current Time:</strong> {booking.timeslot_start_time ? `${booking.timeslot_start_time.substring(0, 5)} - ${booking.timeslot_end_time?.substring(0, 5) || 'N/A'}` : 'N/A'}</p>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading available time slots...</p>
            </div>
          ) : (
            <>
              {/* Next Available Slot Recommendation */}
              {nextAvailableSlot && (
                <div className="mb-6">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-green-800 font-medium text-sm mb-1">
                          ⚡ Recommended: Next Available Slot
                        </p>
                        <p className="text-green-700 text-sm">
                          {nextAvailableSlot.display}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({
                            date: nextAvailableSlot.date,
                            timeSlot: nextAvailableSlot.timeSlot
                          });
                        }}
                        className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors ml-2"
                      >
                        Select This Slot
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Date Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="inline w-4 h-4 mr-1" />
                  Select New Date
                </label>
                <select
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value, timeSlot: '' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a date...</option>
                  {Object.keys(groupedSlots).map(date => (
                    <option key={date} value={date}>
                      {formatDate(date)} ({groupedSlots[date].length} slots available)
                    </option>
                  ))}
                </select>
              </div>

              {/* Time Selection */}
              {formData.date && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Clock className="inline w-4 h-4 mr-1" />
                    Select New Time
                  </label>
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                    {groupedSlots[formData.date]?.map(slot => (
                      <button
                        key={slot.id}
                        onClick={() => setFormData({ ...formData, timeSlot: `${slot.start_time}-${slot.end_time}` })}
                        className={`p-2 text-sm border rounded-md transition-colors ${
                          formData.timeSlot === `${slot.start_time}-${slot.end_time}`
                            ? 'bg-blue-100 border-blue-500 text-blue-700'
                            : 'bg-gray-50 border-gray-300 hover:bg-gray-100'
                        }`}
                      >
                        {formatTime(slot.start_time, slot.end_time)}
                        <span className="block text-xs text-gray-500">
                          {slot.slot_type === 'out-of-hour' ? 'Out of hours' : 'Standard hours'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Warning */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 mr-2" />
                  <div className="text-sm text-yellow-700">
                    <p><strong>Please note:</strong> Rescheduling will update your appointment to the new date and time.
                    Your original time slot will become available for other bookings.</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end space-x-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleReschedule}
            disabled={isSubmitting || !formData.date || !formData.timeSlot}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Rescheduling...' : 'Reschedule Booking'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RescheduleModal;