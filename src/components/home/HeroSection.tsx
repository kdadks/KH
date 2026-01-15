import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Calendar, User } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import Button from '../shared/Button';
import PaymentModal from '../shared/PaymentModal';
import { supabase } from '../../supabaseClient';
import { createBookingWithCustomer } from '../../utils/customerBookingUtils';
import { cancelPaymentRequest } from '../../utils/paymentCancellation';
import { PaymentRequestWithCustomer } from '../../types/paymentTypes';
import logger from '../../utils/logger';
import {
  emailValidation,
  phoneValidation,
  firstNameValidation,
  lastNameValidation,
  serviceValidation,
  validateEmailRealTime,
  validatePhoneRealTime,
  validateNameRealTime
} from '../../utils/formValidation';

interface Service {
  id: number | string;
  name: string;
  category: string;
  price?: string;
  in_hour_price?: string;
  out_of_hour_price?: string;
  displayName?: string;
  priceType?: string;
  booking_type?: 'book_now' | 'contact_me';
}

interface BookingRecord {
  id: number;
  created_at: string;
  customer_id: number;
  service_id: number;
  booking_date: string;
  booking_time: string;
  status: string;
  notes?: string;
  payment_status?: string;
  total_amount?: number;
  package_name?: string;
  booking_reference?: string;
}

interface PaymentRequest {
  id: number;
  customer_id: number;
  booking_id: string | null;
  amount: number;
  currency: string;
  status: string;
  payment_method?: string;
  created_at: string;
  updated_at: string;
  due_date?: string;
}

interface PaymentCustomer {
  id?: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  created_at?: string;
  updated_at?: string;
}

interface PaymentState {
  showPayment: boolean;
  paymentRequest: PaymentRequest | null;
  booking: BookingRecord | null;
  customer: PaymentCustomer | null;
  paymentCompleted: boolean;
  paymentOptions?: {
    deposit: { amount: number; percentage: number };
    full: { amount: number };
  };
  selectedPaymentType?: 'deposit' | 'full';
}

const HeroSection: React.FC = () => {
  // Form and UI states
  interface BookingFormData { firstName: string; lastName: string; email: string; phone: string; service: string; preferredDate?: string; time?: string; }
  const { register, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm<BookingFormData>();
  const navigate = useNavigate();
  const [sendingEmail, setSendingEmail] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [successMsg, setSuccessMsg] = useState('');
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [loadingTimeSlots, setLoadingTimeSlots] = useState(false);
  // Removed unused selectedService state
  const [realTimeErrors, setRealTimeErrors] = useState<{[key: string]: string}>({});
  const [nextAvailableSlot, setNextAvailableSlot] = useState<{date: string, time: string, display: string} | null>(null);
  const [loadingNextSlot, setLoadingNextSlot] = useState(false);
  const [autoSelectTime, setAutoSelectTime] = useState<string | null>(null); // Track time to auto-select

  // Watch form fields for time slot fetching
  const watchedService = watch('service');
  const watchedDate = watch('preferredDate');

  // Helper function to format time for display
  const formatTimeForDisplay = (time24: string): string => {
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
  };
  
  // Payment states
  const [paymentState, setPaymentState] = useState<PaymentState>({
    showPayment: false,
    paymentRequest: null,
    booking: null,
    customer: null,
    paymentCompleted: false
  });
  const [countdown, setCountdown] = useState<number>(20);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPaymentRequest, setSelectedPaymentRequest] = useState<PaymentRequestWithCustomer | null>(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false);

  // Helper functions
  const resetFormAfterSuccess = useCallback(() => {
    reset();
    setSuccessMsg('');
    setCountdown(20);
    setShowPaymentModal(false);
    setSelectedPaymentRequest(null);
    setPaymentProcessing(false);
    setTimeSlots([]);
    setPaymentState({
      showPayment: false,
      paymentRequest: null,
      booking: null,
      customer: null,
      paymentCompleted: false,
      paymentOptions: undefined,
      selectedPaymentType: undefined
    });
  }, [reset]);

  const resetForm = useCallback(async () => {
    // Cancel any active payment request - check both state locations
    const paymentRequestToCancel = selectedPaymentRequest || paymentState.paymentRequest;
    
    // Analyzing payment request for cancellation
    
    if (paymentRequestToCancel?.id) {
      try {
        await cancelPaymentRequest(paymentRequestToCancel.id, 'User cancelled and started over');
        // Payment request cancelled during form reset
      } catch (error) {
        console.error('❌ Failed to cancel payment request during form reset:', error);
      }
    } else {
      logger.devOnly(() => console.log('ℹ️ No active payment request ID found to cancel. Checking structure:', {
        selectedPaymentRequestStructure: selectedPaymentRequest ? Object.keys(selectedPaymentRequest) : null,
        paymentStateRequestStructure: paymentState.paymentRequest ? Object.keys(paymentState.paymentRequest) : null,
        selectedPaymentRequestId: selectedPaymentRequest?.id,
        paymentStateRequestId: paymentState.paymentRequest?.id
      }));
    }

    reset();
    setSuccessMsg('');
    setCountdown(20);
    setShowPaymentModal(false);
    setSelectedPaymentRequest(null);
    setPaymentProcessing(false);
    setTimeSlots([]);
    setPaymentState({
      showPayment: false,
      paymentRequest: null,
      booking: null,
      customer: null,
      paymentCompleted: false,
      paymentOptions: undefined,
      selectedPaymentType: undefined
    });
  }, [reset, selectedPaymentRequest, paymentState.paymentRequest]);

  // Scroll to Why Choose Us section
  const scrollToWhyChooseUs = () => {
    const element = document.getElementById('why-choose-us');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Handle countdown reaching zero - just reset form instead of redirecting
  useEffect(() => {
    if (countdown === 0 && paymentState.paymentCompleted) {
      resetFormAfterSuccess();
    }
  }, [countdown, paymentState.paymentCompleted, resetFormAfterSuccess]);

  // Handle countdown timer
  useEffect(() => {
    let countdownInterval: NodeJS.Timeout | null = null;
    
    if (paymentState.paymentCompleted && countdown > 0) {
      countdownInterval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (countdownInterval) {
        clearInterval(countdownInterval);
      }
    };
  }, [paymentState.paymentCompleted, countdown]);

  // Handle escape key to close modals
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && (showPaymentModal || paymentState.paymentCompleted || paymentState.showPayment)) {
        if (paymentState.paymentCompleted) {
          resetFormAfterSuccess();
        } else {
          resetForm();
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showPaymentModal, paymentState.paymentCompleted, paymentState.showPayment, resetForm, resetFormAfterSuccess]);

  // Fetch services from database on component mount
  useEffect(() => {
    fetchServices();
  }, []);

  // Watch for service and date changes to fetch time slots
  useEffect(() => {
    if (watchedService && watchedDate) {
      // Find selected service
      let service = services.find(s => s.displayName === watchedService);
      if (!service) {
        service = services.find(s => s.name === watchedService);
      }

      if (service) {
        fetchTimeSlots(service, watchedDate);
      } else {
        setTimeSlots([]);
      }
    } else {
      setTimeSlots([]);
    }
  }, [watchedService, watchedDate, services]);

  // Watch for service changes to fetch next available slot recommendation
  useEffect(() => {
    if (watchedService && services.length > 0) {
      // Find selected service
      let service = services.find(s => s.displayName === watchedService);
      if (!service) {
        service = services.find(s => s.name === watchedService);
      }

      if (service && service.booking_type !== 'contact_me') {
        fetchNextAvailableSlot(service);
      } else {
        setNextAvailableSlot(null);
      }
    } else {
      setNextAvailableSlot(null);
    }
  }, [watchedService, services]);

  // Auto-select time when time slots are loaded (for "Select This Slot" functionality)
  useEffect(() => {
    if (autoSelectTime && timeSlots.length > 0 && !loadingTimeSlots) {
      // Find the matching time slot in the available options
      const matchingSlot = timeSlots.find(slot => {
        const [timeValue] = slot.split('|');
        return timeValue === autoSelectTime;
      });
      
      if (matchingSlot) {
        const [timeValue] = matchingSlot.split('|');
        setValue('time', timeValue);
        // Auto-selected time slot
        setAutoSelectTime(null); // Clear the auto-select flag
      } else {
        console.warn('⚠️ Auto-select time not found in available slots:', autoSelectTime);
        
        // Try to extract just the time part from the target
        const targetTimePart = autoSelectTime.split('|')[0];
        // Trying alternative time match
        
        const alternativeMatch = timeSlots.find(slot => {
          const [timeValue] = slot.split('|');
          return timeValue === targetTimePart;
        });
        
        if (alternativeMatch) {
          const [timeValue] = alternativeMatch.split('|');
          setValue('time', timeValue);
          // Auto-selected time slot (alternative match)
        } else {
          console.error('❌ No matching time slot found at all');
        }
        
        setAutoSelectTime(null); // Clear the flag even if not found
      }
    }
  }, [autoSelectTime, timeSlots, loadingTimeSlots, setValue]);

  const fetchServices = async () => {
    try {
      setLoadingServices(true);
      const { data, error } = await supabase
        .from('services')
        .select('id, name, category, price, in_hour_price, out_of_hour_price, booking_type')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching services:', error);
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
              priceType: 'in-hour',
              booking_type: service.booking_type || 'book_now'
            });
            transformedServices.push({
              ...service,
              id: `${service.id}-out`,
              displayName: `${service.name} - Out of Hour (${service.out_of_hour_price})`,
              name: service.name,
              priceType: 'out-of-hour',
              booking_type: service.booking_type || 'book_now'
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
              priceType,
              booking_type: service.booking_type || 'book_now'
            });
          } else {
            // No pricing info, just show service name
            transformedServices.push({
              ...service,
              displayName: service.name,
              priceType: 'standard',
              booking_type: service.booking_type || 'book_now'
            });
          }
        });
        setServices(transformedServices);
      }
    } catch (error) {
      console.error('Error fetching services:', error);
    } finally {
      setLoadingServices(false);
    }
  };

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
        logger.devOnly(() => console.log('Invalid serviceId for next slot calculation'));
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
          time: `${startTime}-${endTime}|${displayTime}`, // Format to match timeSlots format: "timeValue|displayTime"
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

  const fetchTimeSlots = async (service: Service, selectedDate: string) => {
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
        logger.devOnly(() => console.log('Invalid serviceId, returning'));
        setTimeSlots([]);
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

        timeOptions.push(timeOption);
      });

      setTimeSlots(timeOptions);
    } catch (error) {
      console.error('Error fetching time slots:', error);
      setTimeSlots([]);
    } finally {
      setLoadingTimeSlots(false);
    }
  };

  // Service mapping is no longer needed as we use service names directly

  const sendBookingEmail = async (booking: BookingFormData, bookingRecord: BookingRecord) => {
    setSendingEmail(true);
    try {
      // Import the proper email utility
      const { sendSimpleBookingConfirmation } = await import('../../utils/emailUtils');
      
      // Prepare booking confirmation data
      const bookingConfirmationData = {
        customer_name: `${booking.firstName} ${booking.lastName}`,
        customer_email: booking.email,
        service_name: booking.service,
        appointment_date: new Date().toLocaleDateString('en-IE'),
        appointment_time: 'To be scheduled',
        total_amount: 0, // No payment required for these bookings
        booking_reference: bookingRecord.booking_reference || `KH-${bookingRecord.id}`,
        therapist_name: 'KH Therapy Team',
        clinic_address: 'KH Therapy Clinic, Dublin, Ireland',
        special_instructions: 'Quick Appointment from Hero Section - We will contact you to schedule your appointment'
      };

      const emailSent = await sendSimpleBookingConfirmation(booking.email, bookingConfirmationData);
      
      if (emailSent) {
        logger.devOnly(() => console.log('✅ Booking confirmation email sent successfully'));
      } else {
        console.warn('⚠️ Failed to send booking confirmation email');
      }
    } catch (error) {
      console.error('❌ Error sending booking confirmation email:', error);
    }
    setSendingEmail(false);
  };

  const onSubmit = async (data: BookingFormData) => {
    setSendingEmail(true);
    setSuccessMsg('');

    try {
      // Check if selected service is "Contact Me" type
      const selectedServiceObj = services.find(s =>
        s.displayName === data.service || s.name === data.service
      );

      if (selectedServiceObj?.booking_type === 'contact_me') {
        // Handle "Contact Me" services by redirecting to contact page with pre-filled data
        const contactParams = new URLSearchParams({
          name: `${data.firstName} ${data.lastName}`,
          email: data.email,
          service: String(selectedServiceObj.id),
          message: `Hi, I'm interested in ${selectedServiceObj.displayName || selectedServiceObj.name} and would like to schedule a consultation. Please contact me to discuss my needs and availability.`
        });

        // Navigate to contact page with pre-filled data
        navigate(`/contact?${contactParams.toString()}`);
        setSendingEmail(false);
        return;
      }
      // Note: Removed duplicate booking check as business now allows multiple customers with same email

      // Prepare customer data
      const customerData = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone
      };

      // Prepare booking data for hero section (quick appointment)
      let bookingDate: string;

      if (data.preferredDate) {
        // Use the customer's preferred date
        bookingDate = data.preferredDate;
      } else {
        // Set to next business day at 9 AM for scheduling
        const nextBusinessDay = new Date();
        nextBusinessDay.setDate(nextBusinessDay.getDate() + 1);
        // If tomorrow is weekend, move to Monday
        if (nextBusinessDay.getDay() === 0) nextBusinessDay.setDate(nextBusinessDay.getDate() + 1); // Sunday -> Monday
        if (nextBusinessDay.getDay() === 6) nextBusinessDay.setDate(nextBusinessDay.getDate() + 2); // Saturday -> Monday

        bookingDate = nextBusinessDay.toISOString().split('T')[0]; // YYYY-MM-DD format
      }

      // Handle time slot selection
      let startTime = '09:00:00'; // Default 9 AM start time
      let endTime = '10:00:00';   // Default 1 hour session

      if (data.time) {
        // Parse selected time slot (format: "09:00-10:00")
        const [start, end] = data.time.split('-');
        if (start && end) {
          startTime = `${start}:00`;
          endTime = `${end}:00`;
        }
      }

      const bookingData = {
        package_name: data.service,
        booking_date: bookingDate,
        timeslot_start_time: startTime,
        timeslot_end_time: endTime,
        notes: data.preferredDate || data.time
          ? `Quick Appointment from Hero Section${data.preferredDate ? ` - Customer preferred date: ${data.preferredDate}` : ''}${data.time ? ` - Requested time: ${data.time}` : ''}. Please contact to confirm.`
          : 'Quick Appointment from Hero Section - Please contact customer to confirm exact time',
        status: 'pending'
      };

      logger.debug('HeroSection - About to create booking with:', {
        customerData,
        bookingData,
        serviceValue: data.service
      });

      // Create booking with customer integration
      const { booking, customer, paymentRequest, error } = await createBookingWithCustomer(customerData, bookingData);

      if (error) {
        console.error('❌ HeroSection - Booking creation failed:', error);
        setSuccessMsg('Booking failed: ' + error);
        setSendingEmail(false);
        return;
      }

      if (booking && customer) {
        logger.debug('HeroSection - Booking created successfully:', {
          booking,
          customer,
          paymentRequest: paymentRequest ? 'Created' : 'Not created',
          paymentRequestDetails: paymentRequest
        });

        if (paymentRequest && paymentRequest.amount > 0) {
          logger.debug('Payment request created with amount > 0, showing payment interface');

          // Calculate actual service cost and payment options similar to main booking system
          let actualServiceCost = paymentRequest.amount; // Fallback to payment request amount

          try {
            logger.debug('Calculating actual service cost for:', data.service);

            // Import pricing functions
            const { fetchServicePricing, getServicePrice, extractBaseServiceName, determineTimeSlotType } = await import('../../services/pricingService');

            // Extract base service name and determine time slot type
            const baseServiceName = extractBaseServiceName(data.service);
            const timeSlotType = determineTimeSlotType(data.service);

            // Fetch service pricing from database
            const servicePricing = await fetchServicePricing(baseServiceName);

            if (servicePricing) {
              actualServiceCost = getServicePrice(servicePricing, timeSlotType);
              logger.debug('Service cost calculated from database:', actualServiceCost);
            } else {
              logger.devOnly(() => console.log('⚠️ Service pricing not found in database, using payment request amount'));
            }
          } catch (pricingError) {
            console.error('Error calculating service cost:', pricingError);
          }

          // Calculate payment options (20% deposit, full payment)
          const depositPercentage = 20;
          const depositAmount = Math.round(actualServiceCost * (depositPercentage / 100));
          const paymentOptions = {
            deposit: { amount: depositAmount, percentage: depositPercentage },
            full: { amount: actualServiceCost }
          };

          logger.debug('Payment options calculated:', {
            selectedService: data.service,
            actualServiceCost,
            paymentOptions: {
              deposit: `€${paymentOptions.deposit.amount} (${paymentOptions.deposit.percentage}%)`,
              full: `€${paymentOptions.full.amount}`
            }
          });

          // Show payment interface with deposit/full payment options
          // Convert utils types to local interface types
          const localBookingRecord: BookingRecord = {
            id: parseInt(booking.id) || 0,
            created_at: booking.created_at || new Date().toISOString(),
            customer_id: booking.customer_id,
            service_id: 0, // Default service_id since it's required but not in utils booking
            booking_date: booking.booking_date || '',
            booking_time: booking.appointment_time || '',
            status: booking.status || 'confirmed',
            notes: booking.notes,
            payment_status: 'pending',
            total_amount: booking.service_cost,
            package_name: booking.package_name,
            booking_reference: booking.booking_reference
          };
          
          const localPaymentRequest: PaymentRequest = {
            id: paymentRequest.id,
            customer_id: paymentRequest.customer_id,
            booking_id: paymentRequest.booking_id || null,
            amount: paymentRequest.amount,
            currency: paymentRequest.currency,
            status: paymentRequest.status,
            created_at: paymentRequest.created_at,
            updated_at: paymentRequest.updated_at,
            due_date: paymentRequest.payment_due_date || undefined
          };
          
          setPaymentState({
            showPayment: true,
            paymentRequest: localPaymentRequest,
            booking: localBookingRecord,
            customer,
            paymentCompleted: false,
            paymentOptions,
            selectedPaymentType: 'deposit' // Default to deposit
          });
        } else {
          // No payment request created OR payment request with 0 amount
          if (paymentRequest && paymentRequest.amount === 0) {
            logger.devOnly(() => console.log('⚠️ HeroSection - Payment request created with 0 amount - treating as no payment needed'));
            setSuccessMsg('Booking submitted successfully! Payment request created for record keeping.');
          } else {
            console.warn('⚠️ HeroSection - No payment request was created for this booking');
            setSuccessMsg('Booking submitted successfully! Contact Physiotherapist for more details about rate card for services.');
          }
          // Send email notification for bookings without payment or with 0 amount
          // Convert utils booking record to local booking record format
          const localBookingRecord: BookingRecord = {
            id: parseInt(booking.id) || 0,
            created_at: booking.created_at || new Date().toISOString(),
            customer_id: booking.customer_id,
            service_id: 0, // Default service_id since it's required but not in utils booking
            booking_date: booking.booking_date || '',
            booking_time: booking.appointment_time || '',
            status: booking.status || 'confirmed',
            notes: booking.notes,
            payment_status: 'pending',
            total_amount: booking.service_cost,
            package_name: booking.package_name,
            booking_reference: booking.booking_reference
          };
          await sendBookingEmail(data, localBookingRecord);
          reset(); // Clear the form after successful booking
        }
      }
    } catch (error) {
      console.error('Error submitting hero booking:', error);
      setSuccessMsg('An error occurred while submitting your booking. Please try again.');
    } finally {
      setSendingEmail(false);
    }
  };

  const handlePayNow = async (paymentType: 'deposit' | 'full' = 'deposit') => {
    if (paymentProcessing) return; // Prevent multiple clicks
    
    try {
      setPaymentProcessing(true);
      
      if (paymentState.paymentRequest && paymentState.customer && paymentState.paymentOptions) {
        // Ensure customer data is properly structured
        const customerData = paymentState.customer;

        // Get the amount based on payment type
        const selectedAmount = paymentType === 'deposit'
          ? paymentState.paymentOptions.deposit.amount
          : paymentState.paymentOptions.full.amount;

        // Update payment request with selected amount first
        console.log(`🔄 Updating payment request from €${paymentState.paymentRequest.amount} to €${selectedAmount} (${paymentType} payment)`);
        
        const { supabase } = await import('../../supabaseClient');
        const { error: updateError } = await supabase
          .from('payment_requests')
          .update({ 
            amount: selectedAmount,
            notes: paymentType === 'full' 
              ? `Full payment for ${paymentState.booking?.package_name || 'Service'}`
              : `20% deposit for ${paymentState.booking?.package_name || 'Service'}`
          })
          .eq('id', paymentState.paymentRequest.id);

        if (updateError) {
          console.error('❌ Error updating payment request amount:', updateError);
          setSuccessMsg('Error updating payment amount. Please try again.');
          return;
        }
        
        console.log(`✅ Payment request updated to ${paymentType} amount: €${selectedAmount}`);

        // Send payment request email with the correct amount
        try {
          const { sendPaymentRequestNotification } = await import('../../utils/paymentRequestUtils');
          console.log(`📧 Sending payment request email with ${paymentType} amount: €${selectedAmount}`);
          const { success: emailSuccess, error: emailError } = await sendPaymentRequestNotification(paymentState.paymentRequest.id);
          if (!emailSuccess) {
            console.error('❌ Failed to send payment request email:', emailError);
            // Don't block payment flow if email fails
          } else {
            console.log('✅ Payment request email sent successfully');
          }
        } catch (emailError) {
          console.error('❌ Payment request email failed:', emailError);
          // Don't block payment flow if email fails
        }

        // Transform the payment request to match PaymentRequestWithCustomer structure
        const paymentRequestWithCustomer = {
          ...paymentState.paymentRequest!,
          amount: selectedAmount, // Use selected payment amount
          payment_type: paymentType, // Store payment type for tracking
          customer: {
            first_name: customerData.first_name || '',
            last_name: customerData.last_name || '',
            email: customerData.email || ''
          },
          service_name: paymentState.booking?.package_name,
          booking_date: paymentState.booking?.booking_date
        } as PaymentRequestWithCustomer;

        logger.devOnly(() => console.log('Opening PaymentModal with:', { paymentType, amount: selectedAmount, paymentRequestWithCustomer }));

        setSelectedPaymentRequest(paymentRequestWithCustomer);
        setShowPaymentModal(true);
        setSuccessMsg(`Opening secure payment modal for ${paymentType === 'deposit' ? '20% deposit' : 'full payment'}...`);
      } else {
        console.error('Missing payment request, customer data, or payment options:', {
          paymentRequest: paymentState.paymentRequest,
          customer: paymentState.customer,
          paymentOptions: paymentState.paymentOptions
        });
        setSuccessMsg('Payment Error: Missing payment information. Please try again.');
        setPaymentProcessing(false);
      }
    } catch (error) {
      console.error('Error opening payment modal:', error);
      setSuccessMsg('Payment Error: Failed to open payment interface. Please try again.');
      setPaymentProcessing(false);
    }
  };

  const handlePaymentModalComplete = () => {
    // Prevent duplicate completion calls
    if (paymentState.paymentCompleted) return;
    
    // Close the payment modal
    setShowPaymentModal(false);
    setSelectedPaymentRequest(null);
    
    // Clear any lingering messages and update payment state to completed
    setSuccessMsg('');
    setPaymentState(prev => ({ 
      ...prev, 
      paymentCompleted: true,
      showPayment: false // Hide payment options interface
    }));
    setCountdown(20);
    
    // Reset payment processing flag after a short delay
    setTimeout(() => {
      setPaymentProcessing(false);
    }, 500);
  };

  const handlePaymentModalFailed = () => {
    // Close the payment modal
    setShowPaymentModal(false);
    setSelectedPaymentRequest(null);
    
    // Reset payment processing flag
    setPaymentProcessing(false);
    
    // Optionally show an error message
    setSuccessMsg('Payment was cancelled or failed. Please try again.');
  };

  return (
  <section className="relative pt-8 pb-12 md:pt-12 md:pb-20 overflow-hidden bg-gray-100">
      {/* Light grey background applied via Tailwind class */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
  <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start" style={{ color: '#333333' }}>
          
          {/* Hero Content - Left Side */}
          <div className="lg:col-span-7">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                Your Journey to <span>Recovery</span> and <span>Wellness</span>
              </h1>
              <p className="text-lg md:text-xl mb-8 max-w-2xl">
                Professional physiotherapy & Pilates services with personalised care plans 
                designed to help you move better, feel better, and live better.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mb-12">
                <Button onClick={scrollToWhyChooseUs} size="lg" variant="secondary" icon={<User size={20} />}>
                  Why Kelly
                </Button>
                <Button to="/services" size="lg" variant="outline" className="border-gray-600 text-gray-700 hover:bg-gray-200">
                  Explore Services
                </Button>
                <Button to="/services?category=corporate-packages" size="lg" variant="primary" className="bg-[#71db77] text-white hover:bg-[#5fcf68]">
                  Corporate Packages
                </Button>
              </div>
              
              {/* Combined Badges, Logos and Stats Grid */}
              <div className="mt-8 grid grid-cols-3 md:grid-cols-3 gap-3 md:gap-6 md:-ml-4">
                {/* Row 1: Badges */}
                <div className="flex items-center">
                  <div className="bg-gray-300 rounded-full p-1.5 md:p-2 mr-2 md:mr-3 flex-shrink-0">
                    <svg className="w-4 h-4 md:w-6 md:h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  </div>
                  <p className="font-medium text-sm md:text-base">Certified Specialists</p>
                </div>
                <div className="flex items-center">
                  <div className="bg-gray-300 rounded-full p-1.5 md:p-2 mr-2 md:mr-3 flex-shrink-0">
                    <svg className="w-4 h-4 md:w-6 md:h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  </div>
                  <p className="font-medium text-sm md:text-base">Modern Techniques</p>
                </div>
                <div className="flex items-center">
                  <div className="bg-gray-300 rounded-full p-1.5 md:p-2 mr-2 md:mr-3 flex-shrink-0">
                    <svg className="w-4 h-4 md:w-6 md:h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  </div>
                  <p className="font-medium text-sm md:text-base">Personalised Care</p>
                </div>

                {/* Row 2: Brand Logos */}
                <div className="flex items-center justify-center">
                  <img
                    src="/vhi.png"
                    alt="VHI Healthcare"
                    className="h-12 md:h-24 lg:h-28 w-auto object-contain hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="flex items-center justify-center">
                  <img
                    src="/IAPT Logo.png"
                    alt="IAPT - Improving Access to Psychological Therapies"
                    className="h-10 md:h-20 lg:h-24 w-auto object-contain hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="flex items-center justify-center">
                  <img
                    src="/laya_conservative.png"
                    alt="Laya Healthcare"
                    className="h-10 md:h-20 lg:h-24 w-auto object-contain hover:scale-105 transition-transform duration-300"
                  />
                </div>

                {/* Row 3: Stats */}
                <div className="flex flex-col items-center justify-center p-2 md:p-4">
                  <div className="text-xl md:text-2xl font-bold text-primary-600 mb-1">5+</div>
                  <div className="text-xs md:text-sm text-gray-600">Years Experience</div>
                </div>
                <div className="flex flex-col items-center justify-center p-2 md:p-4">
                  <div className="text-xl md:text-2xl font-bold text-primary-600 mb-1">2000+</div>
                  <div className="text-xs md:text-sm text-gray-600">Satisfied Patients</div>
                </div>
                <div className="flex flex-col items-center justify-center p-2 md:p-4">
                  <div className="text-xl md:text-2xl font-bold text-primary-600 mb-1">90%+</div>
                  <div className="text-xs md:text-sm text-gray-600">Satisfaction Rate</div>
                </div>
              </div>
            </motion.div>
          </div>
          
          {/* Booking Form - Right Side */}
          <motion.div 
            className="lg:col-span-5 bg-white p-6 md:p-8 rounded-lg shadow-xl"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-neutral-800">Book Your First Session</h2>
              <p className="text-neutral-600 mt-2">Quick appointment booking</p>
            </div>
            
            {/* Main Booking Form - Only show if not in payment flow */}
            {!paymentState.showPayment && !paymentState.paymentCompleted && (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-neutral-700 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    {...register('firstName', firstNameValidation)}
                    onChange={(e) => {
                      const error = validateNameRealTime(e.target.value, 'First name');
                      setRealTimeErrors(prev => ({ ...prev, firstName: error }));
                      register('firstName', firstNameValidation).onChange(e);
                    }}
                    className={`w-full px-4 py-2 border rounded-md focus:ring-primary-500 focus:border-primary-500 ${
                      realTimeErrors.firstName || errors.firstName ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="John"
                  />
                  {(realTimeErrors.firstName || errors.firstName) && (
                    <p className="mt-1 text-sm text-red-600">
                      {realTimeErrors.firstName || errors.firstName?.message}
                    </p>
                  )}
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-neutral-700 mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    {...register('lastName', lastNameValidation)}
                    onChange={(e) => {
                      const error = validateNameRealTime(e.target.value, 'Last name');
                      setRealTimeErrors(prev => ({ ...prev, lastName: error }));
                      register('lastName', lastNameValidation).onChange(e);
                    }}
                    className={`w-full px-4 py-2 border rounded-md focus:ring-primary-500 focus:border-primary-500 ${
                      realTimeErrors.lastName || errors.lastName ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="Doe"
                  />
                  {(realTimeErrors.lastName || errors.lastName) && (
                    <p className="mt-1 text-sm text-red-600">
                      {realTimeErrors.lastName || errors.lastName?.message}
                    </p>
                  )}
                </div>
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  id="email"
                  {...register('email', emailValidation)}
                  onChange={(e) => {
                    const error = validateEmailRealTime(e.target.value);
                    setRealTimeErrors(prev => ({ ...prev, email: error }));
                    register('email', emailValidation).onChange(e);
                  }}
                  className={`w-full px-4 py-2 border rounded-md focus:ring-primary-500 focus:border-primary-500 ${
                    realTimeErrors.email || errors.email ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="john@example.com"
                />
                {(realTimeErrors.email || errors.email) && (
                  <p className="mt-1 text-sm text-red-600">
                    {realTimeErrors.email || errors.email?.message}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-neutral-700 mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  id="phone"
                  {...register('phone', phoneValidation)}
                  onChange={(e) => {
                    const error = validatePhoneRealTime(e.target.value);
                    setRealTimeErrors(prev => ({ ...prev, phone: error }));
                    register('phone', phoneValidation).onChange(e);
                  }}
                  className={`w-full px-4 py-2 border rounded-md focus:ring-primary-500 focus:border-primary-500 ${
                    realTimeErrors.phone || errors.phone ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="+353 1 234 5678"
                />
                {(realTimeErrors.phone || errors.phone) && (
                  <p className="mt-1 text-sm text-red-600">
                    {realTimeErrors.phone || errors.phone?.message}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="service" className="block text-sm font-medium text-neutral-700 mb-1">
                  Service Type *
                </label>
                <select id="service" {...register('service', serviceValidation)} className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500">
                   <option value="">
                     {loadingServices ? 'Loading services...' : 'Select a service'}
                   </option>
                   {!loadingServices && services.map((service) => (
                     <option key={service.id} value={service.displayName || service.name}>
                       {service.displayName || service.name} {service.booking_type === 'contact_me' ? ' (Consultation Required)' : ''}
                     </option>
                   ))}
                 </select>
                {errors.service && <p className="mt-1 text-sm text-red-600">{errors.service.message}</p>}
                <p className="mt-1 text-xs text-gray-600">
                  ℹ️ 8am-9am and 5pm-9pm is out of hours
                </p>
               </div>

              {/* Next Available Slot Recommendation */}
              {watchedService && services.find(s => s.displayName === watchedService || s.name === watchedService)?.booking_type !== 'contact_me' && (
                <div className="mb-4">
                  {loadingNextSlot ? (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-blue-800 text-sm">
                        🔍 Finding next available slot...
                      </p>
                    </div>
                  ) : nextAvailableSlot ? (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-green-800 font-medium text-sm mb-1">
                            ⚡ Next Available Slot
                          </p>
                          <p className="text-green-700 text-sm">
                            {nextAvailableSlot.display}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            logger.debug('Hero Select This Slot clicked:', {
                              date: nextAvailableSlot.date,
                              time: nextAvailableSlot.time,
                              display: nextAvailableSlot.display
                            });

                            // Set the date first
                            setValue('preferredDate', nextAvailableSlot.date);
                            
                            // Extract just the time part (before |) for auto-select
                            const timeValue = nextAvailableSlot.time.split('|')[0];
                            setAutoSelectTime(timeValue);
                            
                            // Find the selected service and trigger time slots loading
                            const selectedService = services.find(s => 
                              s.displayName === watchedService || s.name === watchedService
                            );
                            
                            if (selectedService) {
                              try {
                                // Manually trigger time slots loading for the new date
                                await fetchTimeSlots(selectedService, nextAvailableSlot.date);
                                logger.debug('Hero time slots loaded, auto-select will trigger');
                              } catch (error) {
                                console.error('❌ Error loading time slots:', error);
                                // Fallback - try direct setValue with delay
                                setTimeout(() => {
                                  setValue('time', nextAvailableSlot.time);
                                  logger.devOnly(() => console.log('✅ Hero time slot set (error fallback):', nextAvailableSlot.time));
                                }, 200);
                              }
                            } else {
                              console.warn('⚠️ Service not found, using fallback timing');
                              // Fallback - wait for useEffect to trigger, then set time
                              setTimeout(() => {
                                setValue('time', nextAvailableSlot.time);
                                logger.devOnly(() => console.log('✅ Hero time slot set (service fallback):', nextAvailableSlot.time));
                              }, 300);
                            }
                          }}
                          className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors ml-2"
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

              {/* Date Selection - Mandatory for Book Now services */}
              {(!watchedService || services.find(s => s.displayName === watchedService || s.name === watchedService)?.booking_type !== 'contact_me') && (
                <div>
                  <label htmlFor="preferredDate" className="block text-sm font-medium text-neutral-700 mb-1">
                    Preferred Date *
                  </label>
                  <input
                    type="date"
                    id="preferredDate"
                    {...register('preferredDate', {
                      required: watchedService && services.find(s => s.displayName === watchedService || s.name === watchedService)?.booking_type !== 'contact_me' ? 'Please select a date' : false,
                      validate: (value) => {
                        if (!value && watchedService && services.find(s => s.displayName === watchedService || s.name === watchedService)?.booking_type !== 'contact_me') {
                          return 'Please select a date';
                        }
                        if (value) {
                          const selectedDate = new Date(value + 'T00:00:00');
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          if (selectedDate < today) {
                            return 'Cannot book appointments in the past';
                          }
                        }
                        return true;
                      }
                    })}
                    className={`w-full px-4 py-2 border rounded-md focus:ring-primary-500 focus:border-primary-500 ${
                      errors.preferredDate ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    min={new Date().toISOString().split('T')[0]}
                  />
                  {errors.preferredDate && (
                    <p className="mt-1 text-sm text-red-600">{errors.preferredDate.message}</p>
                  )}
                  {!watchedDate && watchedService && services.find(s => s.displayName === watchedService || s.name === watchedService)?.booking_type !== 'contact_me' && (
                    <p className="text-xs text-red-500 mt-1">
                      Please select a date to see available time slots
                    </p>
                  )}
                </div>
              )}

              {/* Time Selection - Mandatory if date is selected AND service is book_now type */}
              {watchedDate && watchedService && services.find(s => s.displayName === watchedService || s.name === watchedService)?.booking_type !== 'contact_me' && (
                <div>
                  <label htmlFor="time" className="block text-sm font-medium text-neutral-700 mb-1">
                    Preferred Time *
                  </label>
                  <select
                    id="time"
                    {...register('time', {
                      required: watchedDate && watchedService && services.find(s => s.displayName === watchedService || s.name === watchedService)?.booking_type !== 'contact_me' ? 'Please select a time slot' : false
                    })}
                    className={`w-full px-4 py-2 border rounded-md focus:ring-primary-500 focus:border-primary-500 ${
                      errors.time ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                  >
                    <option value="">
                      {!watchedService ? 'Please select a service first' :
                       loadingTimeSlots ? 'Loading available times...' :
                       timeSlots.length === 0 ? `No available slots for ${new Date(watchedDate).toLocaleDateString('en-IE')}` :
                       'Select a time slot'}
                    </option>
                    {timeSlots.map((slot, index) => {
                      const [timeValue, displayTime] = slot.split('|');
                      return (
                        <option key={index} value={timeValue}>
                          {displayTime}
                        </option>
                      );
                    })}
                  </select>
                  {errors.time && (
                    <p className="mt-1 text-sm text-red-600">{errors.time.message}</p>
                  )}
                  <p className="text-xs text-neutral-500 mt-1">
                    Available time slots based on our availability. Time selection is required.
                  </p>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                fullWidth
                size="lg"
                disabled={Boolean(
                  sendingEmail ||
                  (watchedService &&
                   services.find(s => s.displayName === watchedService || s.name === watchedService)?.booking_type !== 'contact_me' &&
                   (!watchedDate || !watch('time')))
                )}
              >
                {sendingEmail ? 'Processing...' :
                 watchedService && services.find(s => s.displayName === watchedService || s.name === watchedService)?.booking_type === 'contact_me'
                   ? 'Contact for Consultation'
                   : 'Book Now'
                } <ArrowRight size={16} className="ml-2" />
              </Button>

              {/* Service Type Guidance */}
              {watchedService && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-xs text-blue-800">
                    {services.find(s => s.displayName === watchedService || s.name === watchedService)?.booking_type === 'contact_me'
                      ? '📞 This service requires a consultation. We\'ll redirect you to our contact page to discuss your specific needs.'
                      : '📅 You can book this service directly! Complete the form and choose your preferred time.'
                    }
                  </p>
                </div>
              )}

              <p className="text-xs text-center text-neutral-500 mt-4">
                  By submitting, you agree to our <a href="/terms-of-service" className="text-primary-600 hover:underline">Terms of Service</a> and <a href="/privacy-policy" className="text-primary-600 hover:underline">Privacy Policy</a>.
                </p>
            </form>
            )}

            {/* Success/Status Message */}
            {successMsg && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-blue-800 text-sm">{successMsg}</p>
              </div>
            )}



            {/* Payment Interface - Only show when payment is required but not yet completed */}
            {paymentState.showPayment && !paymentState.paymentCompleted && paymentState.paymentOptions && (
              <div className="mt-6 p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="text-center">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                    <p className="text-green-800 font-medium">✅ Booking Created Successfully!</p>
                    <p className="text-green-600 text-sm mt-1">
                      Service: {paymentState.booking?.package_name}
                    </p>
                  </div>

                  <div className="mb-6">
                    <h3 className="font-semibold text-gray-900 mb-4 text-lg">Choose Your Payment Option</h3>

                    <div className="space-y-4">
                      {/* Deposit Payment Option */}
                      <div className="border-2 border-primary-300 rounded-lg p-4 bg-primary-25">
                        <div className="flex justify-between items-center mb-3">
                          <div>
                            <h4 className="font-semibold text-primary-800">20% Deposit</h4>
                            <p className="text-sm text-primary-600">Secure your booking now, pay the rest later</p>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-primary-700">
                              €{paymentState.paymentOptions.deposit.amount}
                            </div>
                            <div className="text-xs text-primary-600">
                              of €{paymentState.paymentOptions.full.amount} total
                            </div>
                          </div>
                        </div>
                        <Button
                          onClick={() => handlePayNow('deposit')}
                          variant="primary"
                          className="w-full"
                          disabled={paymentProcessing}
                        >
                          {paymentProcessing ? (
                            <span className="flex items-center justify-center">
                              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Processing...
                            </span>
                          ) : (
                            `Pay 20% Deposit - €${paymentState.paymentOptions.deposit.amount}`
                          )}
                        </Button>
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
                              No further payments needed
                            </div>
                          </div>
                        </div>
                        <Button
                          onClick={() => handlePayNow('full')}
                          variant="outline"
                          className="w-full border-gray-400 text-gray-700 hover:bg-gray-200"
                          disabled={paymentProcessing}
                        >
                          {paymentProcessing ? (
                            <span className="flex items-center justify-center">
                              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Processing...
                            </span>
                          ) : (
                            `Pay Full Amount - €${paymentState.paymentOptions.full.amount}`
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="text-center">
                    <button
                      onClick={() => {
                        logger.devOnly(() => {
                          console.log('🔄 Cancel and start over clicked in HeroSection');
                          console.log('Current state:', {
                            selectedPaymentRequest: selectedPaymentRequest?.id,
                            paymentStateRequest: paymentState.paymentRequest?.id,
                            showPaymentModal,
                            paymentCompleted: paymentState.paymentCompleted
                          });
                        });
                        resetForm();
                      }}
                      className="text-gray-500 hover:text-gray-700 text-sm underline"
                    >
                      Cancel and start over
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Success Countdown */}
            {paymentState.paymentCompleted && (
              <div className="mt-6 p-6 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-green-900">Payment Completed Successfully!</h3>
                    <p className="text-green-700 mt-1">Your booking is confirmed. We will contact you soon.</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-green-600">Form will reset in:</p>
                    <p className="text-2xl font-bold text-green-900">{countdown}s</p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>

          {/* PaymentModal */}
          {showPaymentModal && selectedPaymentRequest && (
            <PaymentModal
              isOpen={showPaymentModal}
              onClose={() => {
                setShowPaymentModal(false);
                setSelectedPaymentRequest(null);
                setPaymentProcessing(false);
              }}
              paymentRequest={selectedPaymentRequest}
              onPaymentComplete={handlePaymentModalComplete}
              onPaymentFailed={handlePaymentModalFailed}
              context="booking" // Booking context - redirect to home
              paymentOptions={paymentState.paymentOptions}
              selectedPaymentType={selectedPaymentRequest.payment_type || 'deposit'}
            />
          )}
          
        </div>
      </div>
    </section>
  );
};

export default HeroSection;