import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { useToast } from '../shared/toastContext';
import { UserBooking } from '../../types/userManagement';

interface Customer {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
}

interface RescheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: UserBooking;
  customer: Customer;
  onRescheduleComplete: () => void;
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
  customer,
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

  useEffect(() => {
    if (isOpen) {
      fetchAvailableSlots();
    }
  }, [isOpen]);

  const fetchAvailableSlots = async () => {
    setLoading(true);
    try {
      // Get available slots for the next 30 days
      const today = new Date();
      const endDate = new Date();
      endDate.setDate(today.getDate() + 30);

      // Determine service type from the original booking's package_name
      let slotTypeFilter = null;
      if (booking.package_name) {
        if (booking.package_name.includes('In Hour')) {
          slotTypeFilter = 'in-hour';
        } else if (booking.package_name.includes('Out of Hour')) {
          slotTypeFilter = 'out-of-hour';
        }
        // If neither, show all slots (no filter)
      }

      let availabilityQuery = supabase
        .from('availability')
        .select('*')
        .gte('date', today.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .eq('is_available', true)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      // Apply slot type filter if determined
      if (slotTypeFilter) {
        availabilityQuery = availabilityQuery.eq('slot_type', slotTypeFilter);
      }

      const { data, error } = await availabilityQuery;

      if (error) {
        console.error('Error fetching availability:', error);
        showError('Error', 'Failed to load available time slots');
        return;
      }

      setAvailableSlots(data || []);
    } catch (error) {
      console.error('Error fetching slots:', error);
      showError('Error', 'Failed to load available time slots');
    } finally {
      setLoading(false);
    }
  };

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

      showSuccess('Success', 'Booking rescheduled successfully!');
      onRescheduleComplete();
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
    const start = startTime.substring(0, 5);
    const end = endTime.substring(0, 5);
    return `${start} - ${end}`;
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