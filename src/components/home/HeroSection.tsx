import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Calendar } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import Button from '../shared/Button';
import PaymentModal from '../shared/PaymentModal';
import { supabase } from '../../supabaseClient';
import { createBookingWithCustomer } from '../../utils/customerBookingUtils';
import { cancelPaymentRequest } from '../../utils/paymentCancellation';
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
  const [selectedService, setSelectedService] = useState<Service | null>(null);
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
  const [selectedPaymentRequest, setSelectedPaymentRequest] = useState<any>(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false);

  // Helper functions
  const resetFormAfterSuccess = () => {
    reset();
    setSuccessMsg('');
    setCountdown(20);
    setShowPaymentModal(false);
    setSelectedPaymentRequest(null);
    setPaymentProcessing(false);
    setTimeSlots([]);
    setSelectedService(null);
    setPaymentState({
      showPayment: false,
      paymentRequest: null,
      booking: null,
      customer: null,
      paymentCompleted: false,
      paymentOptions: undefined,
      selectedPaymentType: undefined
    });
  };

  const resetForm = async () => {
    // Cancel any active payment request - check both state locations
    const paymentRequestToCancel = selectedPaymentRequest || paymentState.paymentRequest;
    
    console.log('🔍 Analyzing payment request for cancellation:', {
      selectedPaymentRequest: selectedPaymentRequest,
      paymentStateRequest: paymentState.paymentRequest,
      paymentRequestToCancel: paymentRequestToCancel
    });
    
    if (paymentRequestToCancel?.id) {
      try {
        await cancelPaymentRequest(paymentRequestToCancel.id, 'User cancelled and started over');
        console.log('✅ Payment request cancelled during form reset:', paymentRequestToCancel.id);
      } catch (error) {
        console.error('❌ Failed to cancel payment request during form reset:', error);
      }
    } else {
      console.log('ℹ️ No active payment request ID found to cancel. Checking structure:', {
        selectedPaymentRequestStructure: selectedPaymentRequest ? Object.keys(selectedPaymentRequest) : null,
        paymentStateRequestStructure: paymentState.paymentRequest ? Object.keys(paymentState.paymentRequest) : null,
        selectedPaymentRequestId: selectedPaymentRequest?.id,
        paymentStateRequestId: paymentState.paymentRequest?.id
      });
    }

    reset();
    setSuccessMsg('');
    setCountdown(20);
    setShowPaymentModal(false);
    setSelectedPaymentRequest(null);
    setPaymentProcessing(false);
    setTimeSlots([]);
    setSelectedService(null);
    setPaymentState({
      showPayment: false,
      paymentRequest: null,
      booking: null,
      customer: null,
      paymentCompleted: false,
      paymentOptions: undefined,
      selectedPaymentType: undefined
    });
  };

  // Handle countdown reaching zero - just reset form instead of redirecting
  useEffect(() => {
    if (countdown === 0 && paymentState.paymentCompleted) {
      resetFormAfterSuccess();
    }
  }, [countdown, paymentState.paymentCompleted]);

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
  }, [showPaymentModal, paymentState.paymentCompleted, paymentState.showPayment]);

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
        setSelectedService(service);
        fetchTimeSlots(service, watchedDate);
      } else {
        setSelectedService(null);
        setTimeSlots([]);
      }
    } else {
      setSelectedService(null);
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
        console.log('✅ Auto-selected time slot:', timeValue);
        setAutoSelectTime(null); // Clear the auto-select flag
      } else {
        console.warn('⚠️ Auto-select time not found in available slots:', autoSelectTime);
        
        // Try to extract just the time part from the target
        const targetTimePart = autoSelectTime.split('|')[0];
        console.log('🔍 Trying to match just time part:', targetTimePart);
        
        const alternativeMatch = timeSlots.find(slot => {
          const [timeValue] = slot.split('|');
          return timeValue === targetTimePart;
        });
        
        if (alternativeMatch) {
          const [timeValue] = alternativeMatch.split('|');
          setValue('time', timeValue);
          console.log('✅ Auto-selected time slot (alternative match):', timeValue);
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
        const transformedServices: any[] = [];
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
        console.log('Invalid serviceId, returning');
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

  const sendBookingEmail = async (booking: BookingFormData, bookingRecord: any) => {
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
        console.log('✅ Booking confirmation email sent successfully');
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
      // Check for existing pending/confirmed bookings to prevent duplicates
      const { data: existingBookings, error: checkError } = await supabase
        .from('bookings')
        .select('id, status, created_at')
        .eq('customer_email', data.email)
        .eq('package_name', data.service)
        .in('status', ['pending', 'confirmed', 'paid'])
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Last 24 hours

      if (checkError) {
        console.error('Error checking existing bookings:', checkError);
      } else if (existingBookings && existingBookings.length > 0) {
        const recentBooking = existingBookings[0];
        setSuccessMsg(`You already have a ${recentBooking.status} booking for this service. Please contact us if you need to make changes.`);
        setSendingEmail(false);
        return;
      }

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

      console.log('📝 HeroSection - About to create booking with:', {
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
        console.log('✅ HeroSection - Booking created successfully:', {
          booking,
          customer,
          paymentRequest: paymentRequest ? 'Created' : 'Not created',
          paymentRequestDetails: paymentRequest
        });

        if (paymentRequest && paymentRequest.amount > 0) {
          console.log('💳 Payment request created with amount > 0, showing payment interface');

          // Calculate actual service cost and payment options similar to main booking system
          let actualServiceCost = paymentRequest.amount; // Fallback to payment request amount

          try {
            console.log('🔍 Calculating actual service cost for:', data.service);

            // Import pricing functions
            const { fetchServicePricing, getServicePrice, extractBaseServiceName, determineTimeSlotType } = await import('../../services/pricingService');

            // Extract base service name and determine time slot type
            const baseServiceName = extractBaseServiceName(data.service);
            const timeSlotType = determineTimeSlotType(data.service);

            // Fetch service pricing from database
            const servicePricing = await fetchServicePricing(baseServiceName);

            if (servicePricing) {
              actualServiceCost = getServicePrice(servicePricing, timeSlotType);
              console.log('✅ Service cost calculated from database:', actualServiceCost);
            } else {
              console.log('⚠️ Service pricing not found in database, using payment request amount');
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

          console.log('💰 Payment options calculated:', {
            selectedService: data.service,
            actualServiceCost,
            paymentOptions: {
              deposit: `€${paymentOptions.deposit.amount} (${paymentOptions.deposit.percentage}%)`,
              full: `€${paymentOptions.full.amount}`
            }
          });

          // Show payment interface with deposit/full payment options
          setPaymentState({
            showPayment: true,
            paymentRequest,
            booking,
            customer,
            paymentCompleted: false,
            paymentOptions,
            selectedPaymentType: 'deposit' // Default to deposit
          });
        } else {
          // No payment request created OR payment request with 0 amount
          if (paymentRequest && paymentRequest.amount === 0) {
            console.log('⚠️ HeroSection - Payment request created with 0 amount - treating as no payment needed');
            setSuccessMsg('Booking submitted successfully! Payment request created for record keeping.');
          } else {
            console.warn('⚠️ HeroSection - No payment request was created for this booking');
            setSuccessMsg('Booking submitted successfully! Contact Physiotherapist for more details about rate card for services.');
          }
          // Send email notification for bookings without payment or with 0 amount
          await sendBookingEmail(data, booking);
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
    try {
      if (paymentState.paymentRequest && paymentState.customer && paymentState.paymentOptions) {
        // Ensure customer data is properly structured
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
            first_name: customerData.first_name || '',
            last_name: customerData.last_name || '',
            email: customerData.email || ''
          },
          service_name: paymentState.booking?.package_name,
          booking_date: paymentState.booking?.booking_date
        };

        console.log('Opening PaymentModal with:', { paymentType, amount: selectedAmount, paymentRequestWithCustomer });

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
      }
    } catch (error) {
      console.error('Error opening payment modal:', error);
      setSuccessMsg('Payment Error: Failed to open payment interface. Please try again.');
    }
  };

  const handlePaymentModalComplete = () => {
    // Prevent duplicate completion calls
    if (paymentProcessing || paymentState.paymentCompleted) return;
    
    setPaymentProcessing(true);
    
    // Close the payment modal
    setShowPaymentModal(false);
    setSelectedPaymentRequest(null);
    
    // Clear any lingering messages and update payment state to completed
    setSuccessMsg('');
    setPaymentState(prev => ({ ...prev, paymentCompleted: true }));
    setCountdown(20);
  };

  return (
  <section className="relative pt-16 pb-12 md:pt-24 md:pb-20 overflow-hidden bg-gray-100">
      {/* Light grey background applied via Tailwind class */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
  <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center" style={{ color: '#333333' }}>
          
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
                Professional physiotherapy services with personalised care plans 
                designed to help you move better, feel better, and live better.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mb-12">
                <Button to="/booking" size="lg" variant="secondary" icon={<Calendar size={20} />}>
                  Book Now
                </Button>
                <Button to="/services" size="lg" variant="outline" className="border-gray-600 text-gray-700 hover:bg-gray-200">
                  Explore Services
                </Button>
                <Button to="/services?category=corporate-packages" size="lg" variant="primary" className="bg-[#71db77] text-white hover:bg-[#5fcf68]">
                  Corporate Packages
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="flex items-center">
                  <div className="bg-gray-300 rounded-full p-2 mr-3">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  </div>
                  <p className="font-medium">Certified Specialists</p>
                </div>
                <div className="flex items-center">
                  <div className="bg-gray-300 rounded-full p-2 mr-3">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  </div>
                  <p className="font-medium">Modern Techniques</p>
                </div>
                <div className="flex items-center">
                  <div className="bg-gray-300 rounded-full p-2 mr-3">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  </div>
                  <p className="font-medium">Personalised Care</p>
                </div>
              </div>
              
              {/* Brand Associations */}
              <div className="mt-8">
                <p className="text-sm font-medium text-gray-600 mb-6 text-center"></p>
                <div className="flex justify-center items-center gap-8 md:gap-12 lg:gap-16">
                  <img 
                    src="/vhi.png" 
                    alt="VHI Healthcare" 
                    className="h-24 md:h-24 lg:h-28 w-auto object-contain hover:scale-105 transition-transform duration-300"
                  />
                  <img 
                    src="/IAPT Logo.png" 
                    alt="IAPT - Improving Access to Psychological Therapies" 
                    className="h-20 md:h-24 lg:h-28 w-auto object-contain hover:scale-105 transition-transform duration-300"
                  />
                  <img 
                    src="/laya_conservative.png" 
                    alt="Laya Healthcare" 
                    className="h-20 md:h-24 lg:h-28 w-auto object-contain hover:scale-105 transition-transform duration-300"
                  />
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
                            console.log('🎯 Hero Select This Slot clicked:', {
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
                                console.log('✅ Hero time slots loaded, auto-select will trigger');
                              } catch (error) {
                                console.error('❌ Error loading time slots:', error);
                                // Fallback - try direct setValue with delay
                                setTimeout(() => {
                                  setValue('time', nextAvailableSlot.time);
                                  console.log('✅ Hero time slot set (error fallback):', nextAvailableSlot.time);
                                }, 200);
                              }
                            } else {
                              console.warn('⚠️ Service not found, using fallback timing');
                              // Fallback - wait for useEffect to trigger, then set time
                              setTimeout(() => {
                                setValue('time', nextAvailableSlot.time);
                                console.log('✅ Hero time slot set (service fallback):', nextAvailableSlot.time);
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
                        >
                          Pay 20% Deposit - €{paymentState.paymentOptions.deposit.amount}
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
                        >
                          Pay Full Amount - €{paymentState.paymentOptions.full.amount}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="text-center">
                    <button
                      onClick={() => {
                        console.log('🔄 Cancel and start over clicked in HeroSection');
                        console.log('Current state:', {
                          selectedPaymentRequest: selectedPaymentRequest?.id,
                          paymentStateRequest: paymentState.paymentRequest?.id,
                          showPaymentModal,
                          paymentCompleted: paymentState.paymentCompleted
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
              }}
              paymentRequest={selectedPaymentRequest}
              onPaymentComplete={handlePaymentModalComplete}
              context="booking" // Booking context - redirect to home
            />
          )}
          
        </div>
      </div>
    </section>
  );
};

export default HeroSection;