import React, { useState, useEffect, useMemo } from 'react';
import { X, Calendar, Clock, User, FileText, AlertCircle } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { useToast } from '../shared/toastContext';
import { createPaymentRequest } from '../../utils/paymentRequestUtils';

interface Service {
  id: number | string;
  name: string;
  category: string;
  price?: string;
  in_hour_price?: string;
  out_of_hour_price?: string;
  displayName?: string;
  priceType?: string;
}

interface Customer {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
}

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer;
  onBookingCreated: () => void;
}

const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  onClose,
  customer,
  onBookingCreated
}) => {
  const { showError, showSuccess } = useToast();
  const [services, setServices] = useState<Service[]>([]);
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [loadingTimeSlots, setLoadingTimeSlots] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    service: '',
    date: '',
    time: '',
    notes: ''
  });

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        service: '',
        date: '',
        time: '',
        notes: ''
      });
      setSelectedService(null);
      setTimeSlots([]);
      fetchServices();
    }
  }, [isOpen]);

  // Fetch time slots when service changes
  useEffect(() => {
    if (formData.service) {
      // Find by displayName first (since that's what shows in the dropdown)
      let service = services.find(s => s.displayName === formData.service);
      if (!service) {
        // Fallback to name matching
        service = services.find(s => s.name === formData.service);
      }
      
      if (service) {
        setSelectedService(service);
        fetchTimeSlots(service);
      } else {
        setSelectedService(null);
        setTimeSlots([]);
      }
    } else {
      setSelectedService(null);
      setTimeSlots([]);
    }
  }, [formData.service, services]);

  const fetchServices = async () => {
    try {
      setLoadingServices(true);
      const { data, error } = await supabase
        .from('services')
        .select('id, name, category, price, in_hour_price, out_of_hour_price')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching services:', error);
        showError('Error', 'Failed to load services');
      } else {
        // Transform services to include separate in-hour/out-of-hour options
        const transformedServices: Service[] = [];
        (data || []).forEach(service => {
          const hasInHour = service.in_hour_price && service.in_hour_price.trim() !== '';
          const hasOutOfHour = service.out_of_hour_price && service.out_of_hour_price.trim() !== '';
          const hasMainPrice = service.price && service.price.trim() !== '';

          if (hasInHour && hasOutOfHour) {
            // Both in-hour and out-of-hour prices exist
            transformedServices.push({
              ...service,
              id: `${service.id}-in`,
              displayName: `${service.name} - In Hour (${service.in_hour_price})`,
              name: service.name,
              priceType: 'in-hour'
            });
            transformedServices.push({
              ...service,
              id: `${service.id}-out`,
              displayName: `${service.name} - Out of Hour (${service.out_of_hour_price})`,
              name: service.name,
              priceType: 'out-of-hour'
            });
          } else if (hasInHour || hasOutOfHour || hasMainPrice) {
            // Only one pricing option or main price
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
          } else {
            // No pricing info, just show service name
            transformedServices.push({
              ...service,
              displayName: service.name,
              priceType: 'standard'
            });
          }
        });
        setServices(transformedServices);
      }
    } catch (error) {
      console.error('Error fetching services:', error);
      showError('Error', 'Failed to load services');
    } finally {
      setLoadingServices(false);
    }
  };

  const fetchTimeSlots = async (service: Service) => {
    try {
      setLoadingTimeSlots(true);
      
      // Extract service ID from compound ID if needed (e.g., "7-out" -> 7)
      let serviceId: number;
      if (typeof service.id === 'string') {
        if (service.id.includes('-')) {
          serviceId = parseInt(service.id.split('-')[0]);
        } else {
          serviceId = parseInt(service.id);
        }
      } else {
        serviceId = service.id;
      }

      if (!serviceId || isNaN(serviceId)) {
        console.log('Invalid serviceId, returning');
        return;
      }

      // Fetch time slots for the selected service
      const { data, error } = await supabase
        .from('services_time_slots')
        .select('*')
        .eq('service_id', serviceId)
        .eq('is_available', true)
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Error fetching time slots:', error);
        setTimeSlots([]);
        return;
      }

      // Filter time slots based on service price type
      let relevantSlots = data || [];
      if (service.priceType === 'in-hour') {
        relevantSlots = relevantSlots.filter(slot => slot.slot_type === 'in-hour');
      } else if (service.priceType === 'out-of-hour') {
        relevantSlots = relevantSlots.filter(slot => slot.slot_type === 'out-of-hour');
      }

      // Convert time slots to formatted time options
      const timeOptions: string[] = [];
      
      relevantSlots.forEach(slot => {
        // Show the actual time range from database instead of generating hourly slots
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.service || !formData.date || !formData.time) {
      showError('Validation Error', 'Please fill in all required fields');
      return;
    }

    try {
      setIsSubmitting(true);

      // Parse the time range to get start and end times
      const [timeRange] = formData.time.split('|');
      const [startTime, endTime] = timeRange.split('-');

      // Create booking data
      const bookingData = {
        customer_id: customer.id,
        package_name: formData.service, // Use the selected service with full display name including pricing
        booking_date: new Date(`${formData.date}T${startTime}:00`).toISOString(),
        timeslot_start_time: startTime + ':00', // Add seconds
        timeslot_end_time: endTime + ':00',
        notes: formData.notes.trim() || null,
        status: 'pending', // Booking will be pending until admin review
        created_at: new Date().toISOString()
      };

      console.log('Attempting to create booking with data:', bookingData);

      // Insert the booking
      const { data, error } = await supabase
        .from('bookings')
        .insert([bookingData])
        .select()
        .single();

      if (error) {
        console.error('Error creating booking:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        showError('Booking Failed', `Failed to create your booking request: ${error.message}`);
        return;
      }

      console.log('Booking created successfully:', data);
      
      // Check if this is a service that doesn't need payment (Contact for Quote, per-session pricing, etc.)
      const needsQuoteOrPerSession = /contact\s+for\s+quote|€\d+\s*\/\s*(class|session)|€\d+\s*per\s*(class|session)/i.test(formData.service);
      let paymentRequestCreated = false;
      
      // Only create payment request for services that have fixed pricing
      if (!needsQuoteOrPerSession) {
        try {
          console.log('Creating payment request for booking:', data.id);
          const paymentRequest = await createPaymentRequest(
            customer.id,
            formData.service, // This contains the full service name with pricing
            bookingData.booking_date,
            null, // invoiceId
            data.id // bookingId - add the booking ID to link payment request to booking
          );
          if (paymentRequest && paymentRequest.amount > 0) {
            console.log('Payment request created successfully with amount > 0:', paymentRequest);
            paymentRequestCreated = true;
          } else if (paymentRequest && paymentRequest.amount === 0) {
            console.log('Payment request created with 0 amount - treating as no payment needed:', paymentRequest);
            paymentRequestCreated = false; // Treat 0-amount as no payment needed
          } else {
            console.log('No payment request created - service may not require upfront payment');
          }
        } catch (paymentError) {
          console.error('Error creating payment request:', paymentError);
          // Don't fail the booking creation, but log the error
          showError('Payment Request Warning', 'Booking created successfully, but there was an issue creating the payment request. Please contact support.');
        }
      }
      
      // Send appropriate confirmation email based on payment requirement
      try {
        if (paymentRequestCreated) {
          // Send booking confirmation with payment status for services requiring payment
          console.log('Sending booking confirmation email with payment requirement for:', data.id);
          const { sendBookingNotificationWithPaymentStatus } = await import('../../utils/emailUtils');
          
          const emailResult = await sendBookingNotificationWithPaymentStatus(
            customer.email,
            {
              customer_name: `${customer.first_name} ${customer.last_name}`,
              customer_email: customer.email,
              service_name: formData.service,
              appointment_date: new Date(bookingData.booking_date).toLocaleDateString('en-IE'),
              appointment_time: formData.time.split('|')[0], // Get just the time range part
              booking_reference: data.id.toString(),
              payment_status: 'pending',
              payment_amount: undefined, // Will be set by the email template based on service
              next_steps: 'Please complete the 20% deposit payment to confirm your booking. You can pay through your dashboard or click the payment link in your payment request email.',
              therapist_name: 'KH Therapy Team',
              clinic_address: 'KH Therapy Clinic, Dublin, Ireland',
              special_instructions: formData.notes || undefined
            }
          );
          
          if (emailResult) {
            console.log('Booking confirmation email with payment status sent successfully');
          } else {
            console.error('Failed to send booking confirmation email with payment status');
          }
        } else {
          // Send simple booking confirmation for services without payment requirements
          console.log('Sending simple booking confirmation email for:', data.id);
          const { sendSimpleBookingConfirmation } = await import('../../utils/emailUtils');
          
          const emailResult = await sendSimpleBookingConfirmation(
            customer.email,
            {
              customer_name: `${customer.first_name} ${customer.last_name}`,
              customer_email: customer.email,
              service_name: formData.service,
              appointment_date: new Date(bookingData.booking_date).toLocaleDateString('en-IE'),
              appointment_time: formData.time.split('|')[0], // Get just the time range part
              total_amount: 0, // No amount for contact for quote
              booking_reference: data.id.toString(),
              therapist_name: 'KH Therapy Team',
              clinic_address: 'KH Therapy Clinic, Dublin, Ireland',
              special_instructions: formData.notes || undefined
            }
          );
          
          if (emailResult) {
            console.log('Simple booking confirmation email sent successfully');
          } else {
            console.error('Failed to send simple booking confirmation email');
          }
        }
      } catch (emailError) {
        console.error('Error sending booking confirmation email:', emailError);
        // Don't fail the booking, just log the error
      }
      
      // Show appropriate success message based on service type
      if (needsQuoteOrPerSession) {
        showSuccess('Booking Request Submitted!', 'Your booking request has been submitted successfully. We will contact you shortly to discuss pricing and confirm your appointment.');
      } else {
        if (paymentRequestCreated) {
          showSuccess('Booking Created!', 'Your booking has been created successfully. Please complete the 20% deposit payment to confirm your appointment.');
          // Dispatch event to navigate to dashboard for payment
          window.dispatchEvent(new CustomEvent('navigateToDashboardForPayment'));
        } else {
          showSuccess('Booking Created!', 'Your booking request has been submitted successfully. You will receive a confirmation email once it\'s reviewed.');
        }
      }
      
      // Reset form
      setFormData({
        service: '',
        date: '',
        time: '',
        notes: ''
      });
      
      // Close modal and refresh bookings
      onClose();
      onBookingCreated();
      
    } catch (error) {
      console.error('Error submitting booking:', error);
      showError('Booking Failed', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Memoize time slot options to prevent excessive re-renders
  const timeSlotOptions = useMemo(() => {
    if (!selectedService) {
      return <option disabled>Please select a service first</option>;
    }
    if (loadingTimeSlots) {
      return <option disabled>Loading available times...</option>;
    }
    if (timeSlots.length === 0) {
      return <option disabled>No time slots available for selected service</option>;
    }
    return timeSlots.map((slot, index) => {
      const [, displayTime] = slot.split('|');
      return (
        <option key={index} value={slot}>
          {displayTime}
        </option>
      );
    });
  }, [selectedService, loadingTimeSlots, timeSlots]);

  // Get minimum date (tomorrow)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Book New Appointment</h2>
            <p className="text-sm text-gray-600 mt-1">Schedule your session with {customer.first_name} {customer.last_name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-white rounded-lg"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Customer Info Display */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center mb-2">
              <User className="w-5 h-5 text-blue-600 mr-2" />
              <span className="text-sm font-medium text-blue-900">Booking for:</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-medium text-gray-900">
                  {customer.first_name} {customer.last_name}
                </p>
                <p className="text-sm text-gray-600">{customer.email}</p>
                {customer.phone && (
                  <p className="text-sm text-gray-600">{customer.phone}</p>
                )}
              </div>
            </div>
          </div>

          {/* Form Fields in Two Columns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Service Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Service Type *
                </label>
                <select
                  value={formData.service}
                  onChange={(e) => setFormData({ ...formData, service: e.target.value, time: '' })}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  required
                  disabled={loadingServices}
                >
                  <option value="">
                    {loadingServices ? 'Loading services...' : 'Select a service'}
                  </option>
                  {services.map((service) => (
                    <option key={service.id} value={service.displayName}>
                      {service.displayName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Preferred Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Date *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    min={minDate}
                    className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Earliest available date: {new Date(minDate).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Preferred Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Time *
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <select
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                    disabled={!selectedService}
                  >
                    <option value="">Select preferred time</option>
                    {timeSlotOptions}
                  </select>
                </div>
                {!selectedService && (
                  <p className="text-xs text-gray-500 mt-1">
                    Please select a service first to see available time slots
                  </p>
                )}
              </div>

              {/* Service Price Display */}
              {selectedService && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-green-900">Selected Service</p>
                  <p className="text-sm text-green-700">{selectedService.displayName}</p>
                  {/* Show appropriate price based on service type */}
                  {selectedService.priceType === 'in-hour' && selectedService.in_hour_price && (
                    <p className="text-xs text-green-600 mt-1">In-Hour Price: {selectedService.in_hour_price}</p>
                  )}
                  {selectedService.priceType === 'out-of-hour' && selectedService.out_of_hour_price && (
                    <p className="text-xs text-green-600 mt-1">Out-of-Hour Price: {selectedService.out_of_hour_price}</p>
                  )}
                  {selectedService.priceType === 'standard' && selectedService.price && (
                    <p className="text-xs text-green-600 mt-1">Price: {selectedService.price}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Notes - Full Width */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Notes (Optional)
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 text-gray-400" size={20} />
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={4}
                placeholder="Any special requests, medical conditions, or additional information..."
                className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              />
            </div>
          </div>

          {/* Important Notice */}
          <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-yellow-600 mr-3 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium mb-2">Important Notice:</p>
                <p>
                  This is a booking request. Your appointment will be reviewed and confirmed by our team. 
                  You will receive a confirmation email once your booking is approved and scheduled.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 border border-transparent rounded-lg hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Submitting...
                </span>
              ) : (
                'Submit Booking Request'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BookingModal;
