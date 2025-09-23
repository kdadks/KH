/**
 * Customer Rescheduling Request Component
 * Allows customers to submit rescheduling requests with validation
 */

import React, { useState, useEffect } from 'react';
import {
  canRescheduleBooking,
  validateReschedulingRequest,
  formatTimeUntilDeadline,
  getHoursUntilRescheduleDeadline
} from '../utils/reschedulingValidation';
import { submitReschedulingRequestWithNotifications } from '../utils/reschedulingWorkflow';
import { supabase } from '../supabaseClient';

interface CustomerReschedulingFormProps {
  booking: {
    id: string;
    bookingReference: string;
    serviceName: string;
    appointmentDate: string;
    appointmentTime: string;
    bookingStatus: string;
  };
  onSuccess?: () => void;
  onCancel?: () => void;
}

const CustomerReschedulingForm: React.FC<CustomerReschedulingFormProps> = ({
  booking,
  onSuccess,
  onCancel
}) => {
  const [formData, setFormData] = useState({
    newDate: '',
    newTime: '',
    reason: '',
    customerNotes: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [canReschedule, setCanReschedule] = useState(false);
  const [timeUntilDeadline, setTimeUntilDeadline] = useState('');
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [nextAvailableSlot, setNextAvailableSlot] = useState<{
    date: string;
    time: string;
    display: string;
  } | null>(null);

  // Check if booking can be rescheduled
  useEffect(() => {
    const eligible = canRescheduleBooking(booking.appointmentDate, booking.appointmentTime);
    setCanReschedule(eligible);
    
    if (eligible) {
      const hours = getHoursUntilRescheduleDeadline(booking.appointmentDate, booking.appointmentTime);
      setTimeUntilDeadline(formatTimeUntilDeadline(hours));
      fetchAvailableSlots();
    }
  }, [booking.appointmentDate, booking.appointmentTime]);

  const fetchAvailableSlots = async () => {
    setLoadingSlots(true);
    try {
      // Get available slots for the next 30 days
      const today = new Date();
      const endDate = new Date();
      endDate.setDate(today.getDate() + 30);

      // Determine service type from the booking's service name
      let slotTypeFilter = null;
      if (booking.serviceName) {
        if (booking.serviceName.includes('In Hour')) {
          slotTypeFilter = 'in-hour';
        } else if (booking.serviceName.includes('Out of Hour')) {
          slotTypeFilter = 'out-of-hour';
        }
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
        return;
      }

      setAvailableSlots(data || []);

      // Find next available slot recommendation
      if (data && data.length > 0) {
        const now = new Date();
        const currentDate = now.toISOString().split('T')[0];
        const currentTime = now.toTimeString().substring(0, 5);

        const nextSlot = data.find(slot => {
          const slotDate = slot.date;
          const startTime = slot.start_time.substring(0, 5);

          if (slotDate === currentDate) {
            return startTime > currentTime;
          }
          return slotDate > currentDate;
        });

        if (nextSlot) {
          const displayDate = new Date(nextSlot.date).toLocaleDateString('en-IE', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
          const startTime = nextSlot.start_time.substring(0, 5);
          const endTime = nextSlot.end_time.substring(0, 5);
          const displayTime = `${formatTimeForDisplay(startTime)} - ${formatTimeForDisplay(endTime)}`;

          setNextAvailableSlot({
            date: nextSlot.date,
            time: startTime,
            display: `${displayDate} at ${displayTime}`
          });
        }
      }
    } catch (error) {
      console.error('Error fetching slots:', error);
    } finally {
      setLoadingSlots(false);
    }
  };

  const formatTimeForDisplay = (timeString: string) => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear errors when user starts typing
    if (errors.length > 0) {
      setErrors([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canReschedule) {
      setErrors(['This booking cannot be rescheduled as it is within 24 hours of the appointment time.']);
      return;
    }

    setIsSubmitting(true);
    setErrors([]);

    try {
      // Validate the form data
      const validation = validateReschedulingRequest({
        bookingId: booking.id,
        originalDate: booking.appointmentDate,
        originalTime: booking.appointmentTime,
        newDate: formData.newDate,
        newTime: formData.newTime,
        reason: formData.reason
      });

      if (!validation.isValid) {
        setErrors(validation.errors);
        setIsSubmitting(false);
        return;
      }

      // Submit the rescheduling request
      const result = await submitReschedulingRequestWithNotifications({
        bookingId: booking.id,
        originalDate: booking.appointmentDate,
        originalTime: booking.appointmentTime,
        newDate: formData.newDate,
        newTime: formData.newTime,
        reason: formData.reason,
        customerNotes: formData.customerNotes
      });

      if (result.success) {
        if (onSuccess) {
          onSuccess();
        }
      } else {
        setErrors([result.error || 'Failed to submit rescheduling request']);
      }

    } catch (error) {
      console.error('Error submitting rescheduling request:', error);
      setErrors(['An unexpected error occurred. Please try again.']);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!canReschedule) {
    return (
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Rescheduling Not Available
          </h3>
          <p className="text-gray-600 mb-4">
            This appointment cannot be rescheduled as it is within 24 hours of the scheduled time.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            For urgent changes, please contact us directly at info@khtherapy.ie or call during business hours.
          </p>
          {onCancel && (
            <button
              onClick={onCancel}
              className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition duration-200"
            >
              Close
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto bg-white rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Reschedule Appointment
        </h3>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-sm text-blue-800">
            <p className="font-medium">Current Appointment:</p>
            <p>{booking.serviceName}</p>
            <p>{new Date(booking.appointmentDate + 'T' + booking.appointmentTime).toLocaleDateString('en-IE', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })} at {new Date('2000-01-01T' + booking.appointmentTime).toLocaleTimeString('en-IE', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            })}</p>
            <p className="text-xs mt-2 text-blue-600">
              Deadline for rescheduling: {timeUntilDeadline}
            </p>
          </div>
        </div>

        {/* Next Available Slot Recommendation */}
        {nextAvailableSlot && (
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
                  setFormData(prev => ({
                    ...prev,
                    newDate: nextAvailableSlot.date,
                    newTime: nextAvailableSlot.time
                  }));
                }}
                className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors ml-2"
              >
                Select This Slot
              </button>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="newDate" className="block text-sm font-medium text-gray-700 mb-1">
            New Appointment Date *
          </label>
          <input
            type="date"
            id="newDate"
            name="newDate"
            value={formData.newDate}
            onChange={handleInputChange}
            min={new Date().toISOString().split('T')[0]}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label htmlFor="newTime" className="block text-sm font-medium text-gray-700 mb-1">
            New Appointment Time *
          </label>
          {loadingSlots ? (
            <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500">
              Loading available times...
            </div>
          ) : (
            <select
              id="newTime"
              name="newTime"
              value={formData.newTime}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select a time</option>
              {formData.newDate && availableSlots
                .filter(slot => slot.date === formData.newDate)
                .map(slot => {
                  const startTime = slot.start_time.substring(0, 5);
                  const endTime = slot.end_time.substring(0, 5);
                  const displayTime = `${formatTimeForDisplay(startTime)} - ${formatTimeForDisplay(endTime)}`;
                  return (
                    <option key={slot.id} value={startTime}>
                      {displayTime} {slot.slot_type === 'out-of-hour' ? '(Out of hours)' : ''}
                    </option>
                  );
                })
              }
              {formData.newDate && availableSlots.filter(slot => slot.date === formData.newDate).length === 0 && (
                <option value="" disabled>No available slots for this date</option>
              )}
            </select>
          )}
        </div>

        <div>
          <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">
            Reason for Rescheduling
          </label>
          <select
            id="reason"
            name="reason"
            value={formData.reason}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select a reason (optional)</option>
            <option value="Schedule conflict">Schedule conflict</option>
            <option value="Work commitment">Work commitment</option>
            <option value="Personal emergency">Personal emergency</option>
            <option value="Health issue">Health issue</option>
            <option value="Transportation issue">Transportation issue</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div>
          <label htmlFor="customerNotes" className="block text-sm font-medium text-gray-700 mb-1">
            Additional Notes
          </label>
          <textarea
            id="customerNotes"
            name="customerNotes"
            value={formData.customerNotes}
            onChange={handleInputChange}
            rows={3}
            placeholder="Any additional information or special requests..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>

        {errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <svg className="w-5 h-5 text-red-400 mt-0.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h4 className="text-sm font-medium text-red-800">
                  Please correct the following errors:
                </h4>
                <ul className="mt-1 text-sm text-red-700 list-disc list-inside">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <svg className="w-5 h-5 text-yellow-400 mt-0.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div className="text-sm text-yellow-800">
              <p className="font-medium">Important:</p>
              <ul className="mt-1 list-disc list-inside">
                <li>Your request will be reviewed by our team</li>
                <li>Your current appointment remains active until approved</li>
                <li>You will receive email confirmation once processed</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex space-x-3 pt-4">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition duration-200"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition duration-200 flex items-center justify-center"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Submitting...
              </>
            ) : (
              'Submit Request'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CustomerReschedulingForm;