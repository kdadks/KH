import React, { useState, useEffect, useMemo } from 'react';
import { X, Calendar, Clock, User, FileText, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useToast } from '../shared/toastContext';
import { createPaymentRequest } from '../../utils/paymentRequestUtils';
import PaymentModal from '../shared/PaymentModal';
import { fetchServicePricing, extractNumericPrice } from '../../services/pricingService';
import { validateNotesRealTime } from '../../utils/formValidation';

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

interface PaymentState {
  showPayment: boolean;
  paymentRequest: any;
  booking: any;
  customer: any;
  paymentCompleted: boolean;
  paymentOptions?: {
    deposit: { amount: number; percentage: number };
    full: { amount: number };
  };
  selectedPaymentType?: 'deposit' | 'full';
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
  const navigate = useNavigate();
  const [services, setServices] = useState<Service[]>([]);
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [loadingTimeSlots, setLoadingTimeSlots] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentState, setPaymentState] = useState<PaymentState>({
    showPayment: false,
    paymentRequest: null,
    booking: null,
    customer: null,
    paymentCompleted: false
  });
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPaymentRequest, setSelectedPaymentRequest] = useState<any>(null);
  const [nextAvailableSlot, setNextAvailableSlot] = useState<{date: string, time: string, display: string} | null>(null);
  const [loadingNextSlot, setLoadingNextSlot] = useState(false);

  const [formData, setFormData] = useState({
    service: '',
    date: '',
    time: '',
    notes: ''
  });

  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});

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
      setPaymentState({
        showPayment: false,
        paymentRequest: null,
        booking: null,
        customer: null,
        paymentCompleted: false
      });
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

  // Fetch time slots when date changes
  useEffect(() => {
    if (selectedService && formData.date) {
      fetchTimeSlotsForDate(formData.date, selectedService);
    } else {
      setTimeSlots([]);
    }
  }, [selectedService, formData.date]);

  // Fetch next available slot when service changes
  useEffect(() => {
    if (formData.service && services.length > 0) {
      // Find selected service
      let service = services.find(s => s.displayName === formData.service);
      if (!service) {
        service = services.find(s => s.name === formData.service);
      }

      if (service) {
        fetchNextAvailableSlot(service);
      } else {
        setNextAvailableSlot(null);
      }
    } else {
      setNextAvailableSlot(null);
    }
  }, [formData.service, services]);

  const fetchNextAvailableSlot = async (service: Service) => {
    try {
      setLoadingNextSlot(true);

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
        console.log('Invalid serviceId for next slot calculation');
        setNextAvailableSlot(null);
        return;
      }

      // Get current date and time for filtering
      const now = new Date();
      const currentDate = now.toISOString().split('T')[0];
      const currentTime = now.toTimeString().substring(0, 5); // HH:MM format

      // Fetch available slots starting from current date
      let availabilityQuery = supabase
        .from('availability')
        .select('*')
        .gte('date', currentDate) // From today onwards
        .eq('is_available', true)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true })
        .limit(50); // Get first 50 slots to find the next available one

      // Filter by slot_type based on service pricing type
      if (service.priceType === 'in-hour') {
        availabilityQuery = availabilityQuery.eq('slot_type', 'in-hour');
      } else if (service.priceType === 'out-of-hour') {
        availabilityQuery = availabilityQuery.eq('slot_type', 'out-of-hour');
      }

      const { data, error } = await availabilityQuery;

      if (error) {
        console.error('Error fetching next available slot:', error);
        setNextAvailableSlot(null);
        return;
      }

      // Find the first available slot that's in the future
      const nextSlot = data?.find(slot => {
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
        const startTime = nextSlot.start_time.substring(0, 5);
        const endTime = nextSlot.end_time.substring(0, 5);
        const displayTime = `${formatTimeForDisplay(startTime)} - ${formatTimeForDisplay(endTime)}`;
        const displayDate = new Date(nextSlot.date).toLocaleDateString('en-IE', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });

        setNextAvailableSlot({
          date: nextSlot.date,
          time: `${startTime}-${endTime}|${displayTime}`, // Format for the modal time field
          display: `${displayDate} at ${displayTime}`
        });
      } else {
        setNextAvailableSlot(null);
      }

    } catch (error) {
      console.error('Error fetching next available slot:', error);
      setNextAvailableSlot(null);
    } finally {
      setLoadingNextSlot(false);
    }
  };

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

      // This will be called when user selects a date, for now just set empty
      // The actual time fetching will happen when user selects a date
      setTimeSlots([]);
      
    } catch (error) {
      console.error('Error fetching time slots:', error);
      setTimeSlots([]);
    } finally {
      setLoadingTimeSlots(false);
    }
  };

  const fetchTimeSlotsForDate = async (selectedDate: string, service: Service) => {
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

      // Fetch available slots for the selected date
      let availabilityQuery = supabase
        .from('availability')
        .select('*')
        .eq('date', selectedDate)
        .eq('is_available', true)
        .order('start_time', { ascending: true });

      // Filter by slot_type based on service pricing type
      if (service.priceType === 'in-hour') {
        availabilityQuery = availabilityQuery.eq('slot_type', 'in-hour');
      } else if (service.priceType === 'out-of-hour') {
        availabilityQuery = availabilityQuery.eq('slot_type', 'out-of-hour');
      }
      // If service.priceType is 'standard' or undefined, show all slots

      const { data, error } = await availabilityQuery;

      if (error) {
        console.error('Error fetching availability for date:', error);
        setTimeSlots([]);
        return;
      }

      // Convert availability slots to time options
      const timeOptions: string[] = [];

      data?.forEach(slot => {
        const startTime = slot.start_time.substring(0, 5); // Remove seconds (09:00:00 -> 09:00)
        const endTime = slot.end_time.substring(0, 5);     // Remove seconds (17:00:00 -> 17:00)

        const startDisplay = formatTimeForDisplay(startTime);
        const endDisplay = formatTimeForDisplay(endTime);

        // Format: "HH:MM-HH:MM|Display String"
        const timeRange = `${startTime}-${endTime}`;
        const displayRange = `${startDisplay} - ${endDisplay}`;
        const timeOption = `${timeRange}|${displayRange}`;

        // Only add if not already in array
        if (!timeOptions.includes(timeOption)) {
          timeOptions.push(timeOption);
        }
      });

      // Remove duplicates and sort by start time
      const uniqueTimeOptions = Array.from(new Set(timeOptions)).sort((a, b) => {
        const timeA = a.split('|')[0].split('-')[0];
        const timeB = b.split('|')[0].split('-')[0];
        return timeA.localeCompare(timeB);
      });

      setTimeSlots(uniqueTimeOptions);

    } catch (error) {
      console.error('Error fetching time slots for date:', error);
      setTimeSlots([]);
    } finally {
      setLoadingTimeSlots(false);
    }
  };

  const handlePayNow = async (paymentType: 'deposit' | 'full') => {
    try {
      // Open the PaymentModal with the payment request
      if (paymentState.paymentRequest && paymentState.customer && paymentState.paymentOptions) {
        const customerData = paymentState.customer;

        // Get the amount based on payment type
        const selectedAmount = paymentType === 'deposit'
          ? paymentState.paymentOptions.deposit.amount
          : paymentState.paymentOptions.full.amount;

        // Transform the payment request to match PaymentRequestWithCustomer structure
        const paymentRequestWithCustomer = {
          ...paymentState.paymentRequest,
          amount: selectedAmount, // Use selected payment amount
          payment_type: paymentType, // Add payment type for tracking
          customer: {
            first_name: customerData.first_name,
            last_name: customerData.last_name,
            email: customerData.email
          },
          service_name: paymentState.booking?.package_name,
          booking_date: paymentState.booking?.booking_date,
          booking_id: paymentState.paymentRequest.booking_id // Ensure booking_id is preserved
        };

        console.log('Opening PaymentModal with:', { paymentType, amount: selectedAmount, paymentRequestWithCustomer });

        setSelectedPaymentRequest(paymentRequestWithCustomer);
        setShowPaymentModal(true);
        showSuccess(`Opening secure payment modal for ${paymentType === 'deposit' ? '20% deposit' : 'full payment'}...`, '');
      } else {
        console.error('Missing payment request or customer data');
        showError('Payment Error', 'Missing payment information. Please try again.');
      }
    } catch (error) {
      console.error('Error opening payment modal:', error);
      showError('Payment Error', 'Failed to open payment interface. Please try again.');
    }
  };

  const handlePaymentModalComplete = async () => {
    // Close the payment modal
    setShowPaymentModal(false);
    setSelectedPaymentRequest(null);

    // Get payment type from the selected payment request
    const paymentType = selectedPaymentRequest?.payment_type || 'deposit';

    // Send email confirmation for payment completion
    try {
      const { sendBookingNotificationWithPaymentStatus } = await import('../../utils/emailUtils');

      await sendBookingNotificationWithPaymentStatus(
        selectedPaymentRequest.customer.email,
        {
          customer_name: `${selectedPaymentRequest.customer.first_name} ${selectedPaymentRequest.customer.last_name}`,
          customer_email: selectedPaymentRequest.customer.email,
          service_name: selectedPaymentRequest.service_name,
          appointment_date: new Date(selectedPaymentRequest.booking_date).toLocaleDateString('en-IE'),
          appointment_time: new Date(selectedPaymentRequest.booking_date).toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit' }),
          booking_reference: selectedPaymentRequest.booking_reference || selectedPaymentRequest.id.toString(),
          payment_status: 'completed',
          payment_amount: selectedPaymentRequest.amount,
          next_steps: paymentType === 'deposit'
            ? 'Your deposit has been received. You will need to pay the remaining balance before your appointment.'
            : 'Your payment is complete. Your booking is confirmed!',
          therapist_name: 'KH Therapy Team',
          clinic_address: 'KH Therapy Clinic, Dublin, Ireland'
        }
      );
    } catch (emailError) {
      console.error('Error sending payment confirmation email:', emailError);
    }

    showSuccess(
      'Payment Completed!',
      paymentType === 'deposit'
        ? 'Your deposit has been processed successfully. Your booking is now confirmed!'
        : 'Your payment has been processed successfully. Your booking is confirmed!'
    );

    // Reset form and close modal
    setFormData({
      service: '',
      date: '',
      time: '',
      notes: ''
    });

    // Close modal and refresh bookings
    onClose();
    onBookingCreated();
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

      // Parse the time slot format: "HH:MM-HH:MM|Display String"
      const [timeRange] = formData.time.split('|');
      const [startTime, endTime] = timeRange.split('-');

      // Create booking data without timezone conversion to avoid offset issues
      const bookingData = {
        customer_id: customer.id,
        package_name: formData.service, // Use the selected service with full display name including pricing
        booking_date: `${formData.date}T${startTime}:00`, // Store as local time string, not converted to UTC
        timeslot_start_time: startTime + ':00', // Add seconds
        timeslot_end_time: endTime + ':00',
        notes: formData.notes.trim() || null,
        status: 'pending', // Booking will be pending until admin review
        created_at: new Date().toISOString()
      };

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

      // Check if this is a service that doesn't need payment (Contact for Quote, per-session pricing, etc.)
      const needsQuoteOrPerSession = /contact\s+for\s+quote|€\d+\s*\/\s*(class|session)|€\d+\s*per\s*(class|session)/i.test(formData.service);

      // For contact for quote services, redirect to contact page with data
      if (needsQuoteOrPerSession) {
        // Prepare data for contact page
        const contactParams = new URLSearchParams({
          name: `${customer.first_name} ${customer.last_name}`,
          email: customer.email,
          service: selectedService ? String(selectedService.id) : formData.service,
          message: `Hi, I'm interested in booking ${formData.service}. ` +
                  `Preferred date: ${formData.date ? new Date(formData.date).toLocaleDateString('en-IE') : 'Not specified'}. ` +
                  `Preferred time: ${formData.time ? formData.time.split('|')[1] || formData.time : 'Not specified'}. ` +
                  `${formData.notes ? `Additional notes: ${formData.notes}` : ''}`.trim()
        });

        // Close modal first
        onClose();

        // Navigate to contact page with pre-filled data
        navigate(`/contact?${contactParams.toString()}`);

        return;
      }

      // Only show payment options for services that have fixed pricing
      if (!needsQuoteOrPerSession) {
        try {
          console.log('🔄 Calling createPaymentRequest with:', {
            customerId: customer.id,
            serviceName: formData.service,
            bookingDate: bookingData.booking_date,
            bookingId: data.id
          });

          const paymentRequest = await createPaymentRequest(
            customer.id,
            formData.service, // This contains the full service name with pricing
            bookingData.booking_date,
            null, // invoiceId
            data.id // bookingId - add the booking ID to link payment request to booking
          );

          console.log('📋 Payment request result:', paymentRequest);

          if (paymentRequest && paymentRequest.amount > 0) {
            // Calculate actual service cost for payment options
            let actualServiceCost = paymentRequest.amount;

            try {
              // Extract base service name from display name (remove pricing info)
              // e.g., "Massage - In Hour (€90)" -> "Massage"
              const baseServiceName = formData.service.split(' - ')[0].trim();
              console.log('🔍 Extracted base service name:', baseServiceName, 'from:', formData.service);

              const servicePricing = await fetchServicePricing(baseServiceName);
              console.log('📋 Service pricing result:', servicePricing);

              if (servicePricing) {
                let priceToUse = '';

                // Determine which price field to use based on service type
                if (formData.service.includes('In Hour') && servicePricing.in_hour_price) {
                  priceToUse = servicePricing.in_hour_price;
                  console.log('💰 Using in_hour_price:', priceToUse);
                } else if (formData.service.includes('Out of Hour') && servicePricing.out_of_hour_price) {
                  priceToUse = servicePricing.out_of_hour_price;
                  console.log('💰 Using out_of_hour_price:', priceToUse);
                } else if (servicePricing.price) {
                  priceToUse = servicePricing.price;
                  console.log('💰 Using standard price:', priceToUse);
                }

                if (priceToUse) {
                  const extractedPrice = extractNumericPrice(priceToUse);
                  console.log('🔢 Extracted numeric price:', extractedPrice, 'from:', priceToUse);

                  if (extractedPrice > 0) {
                    actualServiceCost = extractedPrice;
                    console.log('✅ Using pricing service cost:', actualServiceCost);
                  } else {
                    console.log('⚠️ No valid price extracted, using payment request amount:', paymentRequest.amount);
                  }
                } else {
                  console.log('⚠️ No suitable price field found, using payment request amount:', paymentRequest.amount);
                }
              } else {
                console.log('⚠️ Service pricing not found, using payment request amount:', paymentRequest.amount);
              }
            } catch (error) {
              console.error('❌ Error calculating service cost:', error);
              console.log('⚠️ Falling back to payment request amount:', paymentRequest.amount);
            }

            // Calculate payment options (20% deposit vs full amount)
            const fullAmount = actualServiceCost;
            const depositAmount = Math.round(fullAmount * 0.2 * 100) / 100; // 20% deposit rounded to 2 decimals

            const paymentOptions = {
              deposit: { amount: depositAmount, percentage: 20 },
              full: { amount: fullAmount }
            };

            console.log('💰 Payment options calculated:', {
              selectedService: formData.service,
              actualServiceCost,
              paymentOptions: {
                deposit: `€${paymentOptions.deposit.amount} (${paymentOptions.deposit.percentage}%)`,
                full: `€${paymentOptions.full.amount}`
              }
            });

            // Show payment interface for immediate payment
            setPaymentState({
              showPayment: true,
              paymentRequest,
              booking: data,
              customer,
              paymentCompleted: false,
              paymentOptions,
              selectedPaymentType: 'deposit' // Default to deposit
            });

            // Don't close the modal yet, show payment options first
            return;
          }
        } catch (paymentError) {
          console.error('Error creating payment request:', paymentError);
          // Don't fail the booking creation, but log the error
          showError('Payment Request Warning', 'Booking created successfully, but there was an issue creating the payment request. Please contact support.');
        }
      }
      
      // Email will be sent when payment is completed or from payment flow
      
      // Show success message for services without payment requirements (Contact for Quote)
      showSuccess('Booking Request Submitted!', 'Your booking request has been submitted successfully. We will contact you shortly to discuss pricing and confirm your appointment.');
      
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
      const [, displayText] = slot.split('|');
      return (
        <option key={index} value={slot}>
          {displayText}
        </option>
      );
    });
  }, [selectedService, loadingTimeSlots, timeSlots]);


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

          {/* Content - Only show if not in payment flow */}
        {!paymentState.showPayment && (
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
                <p className="mt-1 text-xs text-gray-600">
                  ℹ️ 8am-9am and 5pm-9pm is out of hours
                </p>
              </div>

              {/* Next Available Slot Recommendation */}
              {formData.service && (
                <div className="col-span-2 mb-4">
                  {loadingNextSlot ? (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-blue-800 text-sm">
                        🔍 Finding next available slot...
                      </p>
                    </div>
                  ) : nextAvailableSlot ? (
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
                            // Set the recommended date and time
                            setFormData(prev => ({
                              ...prev,
                              date: nextAvailableSlot.date,
                              time: nextAvailableSlot.time
                            }));
                          }}
                          className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors ml-3"
                        >
                          Select This Slot
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <p className="text-yellow-800 text-sm">
                        📅 No available slots found for this service. Please contact us directly.
                      </p>
                    </div>
                  )}
                </div>
              )}

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
                    onChange={(e) => {
                      setFormData({ ...formData, date: e.target.value, time: '' });
                      setTimeSlots([]); // Clear time slots when date changes
                    }}
                    min={new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                    className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Earliest available date: {new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString()}
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
                onChange={(e) => {
                  const value = e.target.value;
                  const error = validateNotesRealTime(value);
                  setFormErrors(prev => ({ ...prev, notes: error }));
                  setFormData({ ...formData, notes: value });
                }}
                rows={4}
                placeholder="Any special requests, medical conditions, or additional information..."
                className={`w-full pl-10 pr-3 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none ${
                  formErrors.notes ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              />
            </div>
            {formErrors.notes && (
              <p className="mt-1 text-sm text-red-600">{formErrors.notes}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              {formData.notes.length}/1000 characters
            </p>
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
              className="px-6 py-3 text-sm font-medium text-white bg-[#71db77] border border-transparent rounded-lg hover:bg-[#5fcf68] focus:outline-none focus:ring-2 focus:ring-[#71db77] focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
        )}

        {/* Payment Options Section */}
        {paymentState.showPayment && !paymentState.paymentCompleted && paymentState.paymentOptions && (
          <div className="border-t border-gray-200 p-6 bg-gray-50">
            <div className="mb-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <p className="text-green-800 font-medium">✅ Booking Created Successfully!</p>
                <p className="text-green-600 text-sm mt-1">
                  Service: {paymentState.booking?.package_name}
                </p>
                {paymentState.booking?.booking_date && (
                  <p className="text-green-600 text-sm">
                    Date & Time: {new Date(paymentState.booking.booking_date).toLocaleString('en-IE')}
                  </p>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-4 text-center">Choose Your Payment Option</h3>

                <div className="space-y-4">
                  {/* 20% Deposit Option */}
                  <div className="border-2 border-blue-300 rounded-lg p-4 bg-blue-25">
                    <div className="flex justify-between items-center mb-3">
                      <div>
                        <h4 className="font-semibold text-blue-800">20% Deposit</h4>
                        <p className="text-sm text-blue-600">Secure your booking now, pay the rest later</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-blue-700">
                          €{paymentState.paymentOptions.deposit.amount}
                        </div>
                        <div className="text-xs text-blue-600">
                          of €{paymentState.paymentOptions.full.amount} total
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handlePayNow('deposit')}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      Pay 20% Deposit - €{paymentState.paymentOptions.deposit.amount}
                    </button>
                  </div>

                  {/* Full Payment Option */}
                  <div className="border-2 border-gray-300 rounded-lg p-4 bg-gray-25">
                    <div className="flex justify-between items-center mb-3">
                      <div>
                        <h4 className="font-semibold text-gray-800">Full Payment</h4>
                        <p className="text-sm text-gray-600">Pay the complete amount upfront</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-700">
                          €{paymentState.paymentOptions.full.amount}
                        </div>
                        <div className="text-xs text-green-600">
                          ✓ No remaining balance
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handlePayNow('full')}
                      className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
                    >
                      Pay Full Amount - €{paymentState.paymentOptions.full.amount}
                    </button>
                  </div>
                </div>
              </div>

              <div className="text-center mt-4">
                <p className="text-sm text-gray-600">
                  Payment is required to complete your booking
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {(() => {
        console.log('🔍 PaymentModal render condition:', { showPaymentModal, selectedPaymentRequest: !!selectedPaymentRequest });
        return showPaymentModal && selectedPaymentRequest && (
          <PaymentModal
            isOpen={showPaymentModal}
            paymentRequest={selectedPaymentRequest}
            onClose={() => setShowPaymentModal(false)}
            onPaymentComplete={handlePaymentModalComplete}
            paymentOptions={paymentState.paymentOptions}
            selectedPaymentType={selectedPaymentRequest.payment_type || 'deposit'}
          />
        );
      })()}
    </div>
  );
};

export default BookingModal;
