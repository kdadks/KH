import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Calendar, X } from 'lucide-react';
import SEOHead from '../components/utils/SEOHead';
import Container from '../components/shared/Container';
import SectionHeading from '../components/shared/SectionHeading';
import Button from '../components/shared/Button';
import PaymentModal from '../components/shared/PaymentModal';
import { createBookingWithCustomer } from '../utils/customerBookingUtils';

interface BookingFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  service: string;
  date: string;
  time: string;
  notes: string;
}

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

interface PaymentState {
  showPayment: boolean;
  paymentRequest: any;
  booking: any;
  customer: any;
  checkoutUrl?: string;
  paymentCompleted: boolean;
  paymentOptions?: {
    deposit: { amount: number; percentage: number };
    full: { amount: number };
  };
  selectedPaymentType?: 'deposit' | 'full';
}

const BookingPage: React.FC = () => {
  const { register, handleSubmit, formState: { errors }, reset, watch } = useForm<BookingFormData>();
  const navigate = useNavigate();
  const [successMsg, setSuccessMsg] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [loadingTimeSlots, setLoadingTimeSlots] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
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

  // Watch the service and date fields to trigger time slot updates
  const watchedService = watch('service');
  const watchedDate = watch('date');

  // Handle countdown reaching zero
  useEffect(() => {
    if (countdown === 0 && paymentState.paymentCompleted) {
      redirectToHome();
    }
  }, [countdown, paymentState.paymentCompleted]);

  // Handle escape key to close modals
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && (paymentState.showPayment || paymentState.paymentCompleted)) {
        if (paymentState.paymentCompleted) {
          redirectToHome();
        } else {
          resetForm();
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [paymentState.showPayment, paymentState.paymentCompleted]);

  // Memoize time slot rendering to prevent excessive re-renders
  const timeSlotOptions = useMemo(() => {
    if (!selectedService) {
      return <option disabled>Please select a service first</option>;
    }
    if (!watchedDate) {
      return <option disabled>Please select a date first</option>;
    }
    if (loadingTimeSlots) {
      return <option disabled>Loading available times...</option>;
    }
    if (timeSlots.length === 0) {
      const dateSelected = watchedDate;
      if (dateSelected) {
        const selectedDateObj = new Date(dateSelected);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        selectedDateObj.setHours(0, 0, 0, 0);

        if (selectedDateObj.getTime() === today.getTime()) {
          return <option disabled>No available time slots for today (all slots may be in the past)</option>;
        } else {
          return <option disabled>No available time slots for {new Date(dateSelected).toLocaleDateString('en-IE')}</option>;
        }
      }
      return <option disabled>No time slots available for selected service</option>;
    }
    return timeSlots.map((slot, index) => {
      const [timeValue, displayTime] = slot.split('|');
      return (
        <option key={index} value={timeValue}>
          {displayTime}
        </option>
      );
    });
  }, [selectedService, loadingTimeSlots, timeSlots, watchedDate]);

  useEffect(() => {
    fetchServices();
  }, []);

  // Fetch time slots when service or date changes
  useEffect(() => {
    if (watchedService) {
      // Find by displayName first (since that's what shows in the dropdown)
      let service = services.find(s => s.displayName === watchedService);
      if (!service) {
        // Fallback to name matching
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

  const fetchTimeSlots = async (service: Service, selectedDate?: string) => {
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

      // Get current date and time for filtering
      const now = new Date();
      const currentDate = now.toISOString().split('T')[0];
      const currentTime = now.toTimeString().substring(0, 5); // HH:MM format

      // Determine the minimum date to fetch slots from
      let minimumDate = currentDate;
      if (selectedDate && selectedDate >= currentDate) {
        minimumDate = selectedDate;
      }

      // Fetch available time slots from availability table, filtering by service type if applicable
      let availabilityQuery = supabase
        .from('availability')
        .select('*')
        .gte('date', minimumDate) // Only from selected date or current date onwards
        .eq('is_available', true); // Only available slots

      // Filter by slot_type based on service pricing type
      if (service.priceType === 'in-hour') {
        availabilityQuery = availabilityQuery.eq('slot_type', 'in-hour');
      } else if (service.priceType === 'out-of-hour') {
        availabilityQuery = availabilityQuery.eq('slot_type', 'out-of-hour');
      }
      // If priceType is 'standard' or undefined, show all slots

      const { data: availabilityData, error: availError } = await availabilityQuery
        .order('date', { ascending: true })
        .order('start', { ascending: true });

      if (availError) {
        console.error('Error fetching availability:', availError);
        setTimeSlots([]);
        return;
      }

      // Filter availability slots based on date selection and time validation
      // Note: slot_type filtering is now done at database level above
      let relevantSlots = (availabilityData || []).filter(slot => {
        const slotDate = slot.date;
        const startTime = (slot.start || slot.start_time || '').substring(0, 5);

        // If user has selected a specific date, only show slots for that exact date
        if (selectedDate) {
          // Only include slots on the exact selected date
          if (slotDate !== selectedDate) {
            return false; // Skip slots not on the selected date
          }

          // If slot is today, check if time is in the future
          if (slotDate === currentDate) {
            return startTime > currentTime;
          }

          // It's the selected date and not today, show all times
          return true;
        }

        // If no date selected, use default filtering (current behavior)
        if (slotDate === currentDate) {
          return startTime > currentTime; // Only show future times for today
        }

        return slotDate > currentDate; // Show all slots for future dates
      });

      console.log(`📅 Booking slots for service "${service.displayName}":`, {
        serviceType: service.priceType,
        totalFromDB: availabilityData?.length || 0,
        afterTimeFiltering: relevantSlots.length,
        selectedDate,
        sampleSlots: relevantSlots.slice(0, 3).map(s => ({
          date: s.date,
          time: s.start || s.start_time,
          slotType: s.slot_type
        }))
      });

      // Convert availability slots to formatted time options grouped by date
      const timeOptionsByDate: Record<string, string[]> = {};

      relevantSlots.forEach(slot => {
        const slotDate = slot.date;
        const startTime = (slot.start || slot.start_time || '').substring(0, 5);
        const endTime = slot.end_time.substring(0, 5);

        if (!timeOptionsByDate[slotDate]) {
          timeOptionsByDate[slotDate] = [];
        }

        const startDisplay = formatTimeForDisplay(startTime);
        const endDisplay = formatTimeForDisplay(endTime);

        // Create time range value and display format
        // Still keep date in the value for processing, but only show time in display
        const timeRange = `${slotDate}T${startTime}-${endTime}`;
        const displayRange = `${startDisplay} - ${endDisplay}`; // Only display time range, not date
        const timeOption = `${timeRange}|${displayRange}`;

        if (!timeOptionsByDate[slotDate].includes(timeOption)) {
          timeOptionsByDate[slotDate].push(timeOption);
        }
      });

      // Flatten and sort all time options
      const allTimeOptions = Object.values(timeOptionsByDate).flat().sort((a, b) => {
        const timeA = a.split('|')[0];
        const timeB = b.split('|')[0];
        return timeA.localeCompare(timeB);
      });

      setTimeSlots(allTimeOptions);

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
    } finally {
      setLoadingServices(false);
    }
  };

  const sendBookingEmail = async (booking: BookingFormData, bookingRecord: any) => {
    setSendingEmail(true);
    try {
      // Import the proper email utility
      const { sendSimpleBookingConfirmation } = await import('../utils/emailUtils');
      
      // Prepare booking confirmation data
      const bookingConfirmationData = {
        customer_name: `${booking.firstName} ${booking.lastName}`,
        customer_email: booking.email,
        service_name: booking.service,
        appointment_date: new Date(booking.date).toLocaleDateString('en-IE'),
        appointment_time: booking.time || 'To be scheduled',
        total_amount: 0, // No payment required for these bookings
        booking_reference: bookingRecord.booking_reference || `KH-${bookingRecord.id}`,
        therapist_name: 'KH Therapy Team',
        clinic_address: 'KH Therapy Clinic, Dublin, Ireland',
        special_instructions: booking.notes || 'We will contact you to schedule your appointment'
      };

      const emailSent = await sendSimpleBookingConfirmation(booking.email, bookingConfirmationData);
      
      if (emailSent) {
        console.log('✅ Booking confirmation email sent successfully');
        setSuccessMsg('Booking confirmed! Confirmation email sent.');
      } else {
        console.warn('⚠️ Failed to send booking confirmation email');
        setSuccessMsg('Booking confirmed, but failed to send email.');
      }
    } catch (error) {
      console.error('❌ Error sending booking confirmation email:', error);
      setSuccessMsg('Booking confirmed, but failed to send email.');
    }
    setSendingEmail(false);
  };

  const onSubmit = async (data: BookingFormData) => {
    setSendingEmail(true);
    setSuccessMsg('');

    try {
      // Check for existing pending/confirmed bookings to prevent duplicates
      // Note: We'll skip this check for now since customer data is now in a separate customers table
      // Duplicate checking to be implemented in future version with customer relationships
      const existingBookings: any[] = [];
      const checkError = null;

      if (checkError) {
        console.error('Error checking existing bookings:', checkError);
      } else if (existingBookings && existingBookings.length > 0) {
        const recentBooking = existingBookings[0];
        setSuccessMsg(`You already have a ${recentBooking.status} booking for this service. Please contact us if you need to make changes.`);
        setSendingEmail(false);
        return;
      }

      // Map form data to booking data
      // Extract date and time from the combined value (e.g., "2024-01-15T09:00-17:00")
      let bookingDateTime = data.date;
      let timeslotStartTime = null;
      let timeslotEndTime = null;

      console.log('🔍 BookingPage - Form data received:', { date: data.date, time: data.time });

      if (data.time && data.time.includes('T')) {
        // Parse the combined datetime-range format (e.g., "2024-09-18T09:00-17:00")
        const lastDashIndex = data.time.lastIndexOf('-');
        if (lastDashIndex === -1) {
          console.error('❌ No dash separator found in time:', data.time);
          setSuccessMsg('Error: Invalid time format. Please try again.');
          setSendingEmail(false);
          return;
        }
        const dateTimeStr = data.time.substring(0, lastDashIndex);
        const endTime = data.time.substring(lastDashIndex + 1);
        const [dateStr, startTime] = dateTimeStr.split('T');

        if (!dateStr || !startTime || !endTime) {
          console.error('❌ Missing components after parsing:', { dateStr, startTime, endTime, originalTime: data.time });
          setSuccessMsg('Error: Invalid time format. Please try again.');
          setSendingEmail(false);
          return;
        }

        // Update booking date from time slot
        timeslotStartTime = startTime;
        timeslotEndTime = endTime;
        // Ensure proper timestamp format with seconds
        if (!startTime) {
          console.error('❌ StartTime is undefined:', { dateStr, startTime, endTime });
          setSuccessMsg('Error: Invalid time selection. Please try again.');
          setSendingEmail(false);
          return;
        }
        const formattedStartTime = startTime.includes(':') ?
          (startTime.split(':').length === 2 ? `${startTime}:00` : startTime) :
          `${startTime}:00:00`;
        bookingDateTime = `${dateStr}T${formattedStartTime}`;

        console.log('✅ Parsed datetime-range format:', { dateStr, startTime, endTime, bookingDateTime });
      } else if (data.time && data.time.includes('-')) {
        // Legacy format: just time range (e.g., "09:00-17:00")
        const [startTime, endTime] = data.time.split('-');

        if (!startTime || !endTime) {
          console.error('❌ Missing time components in legacy format:', { startTime, endTime, originalTime: data.time });
          setSuccessMsg('Error: Invalid time format. Please try again.');
          setSendingEmail(false);
          return;
        }

        timeslotStartTime = startTime;
        timeslotEndTime = endTime;
        // Ensure proper timestamp format with seconds
        const formattedStartTime = startTime.includes(':') ?
          (startTime.split(':').length === 2 ? `${startTime}:00` : startTime) :
          `${startTime}:00:00`;
        bookingDateTime = `${data.date}T${formattedStartTime}`;

        console.log('✅ Parsed time-range format:', { startTime, endTime, bookingDateTime });
      } else if (data.time) {
        // Fallback for single time value
        if (!data.time) {
          console.error('❌ Empty time value');
          setSuccessMsg('Error: Please select a time.');
          setSendingEmail(false);
          return;
        }

        timeslotStartTime = data.time;
        // Ensure proper timestamp format with seconds
        const formattedTime = data.time.includes(':') ?
          (data.time.split(':').length === 2 ? `${data.time}:00` : data.time) :
          `${data.time}:00:00`;
        bookingDateTime = `${data.date}T${formattedTime}`;

        console.log('✅ Parsed single time format:', { time: data.time, bookingDateTime });
      } else {
        // No time selected - use date only with default time
        bookingDateTime = `${data.date}T09:00:00`; // Default to 9 AM if no time selected
        console.log('⚠️ No time selected, using default:', { bookingDateTime });
      }

      // Validate that we have a proper booking date time
      if (!bookingDateTime || bookingDateTime.includes('undefined')) {
        console.error('❌ Invalid booking datetime generated:', bookingDateTime);
        setSuccessMsg('Error: Invalid date/time selection. Please try again.');
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

      // Prepare booking data
      const bookingData = {
        package_name: data.service,
        booking_date: bookingDateTime,
        // Only include timeslot fields if they have values
        ...(timeslotStartTime && { timeslot_start_time: timeslotStartTime }),
        ...(timeslotEndTime && { timeslot_end_time: timeslotEndTime }),
        notes: data.notes || '',
        status: 'pending'
      };

      console.log('📋 BookingPage - Final booking data:', bookingData);

      console.log('📝 BookingPage - About to create booking with:', {
        customerData,
        bookingData,
        serviceValue: data.service
      });

      // Create booking with customer integration
      const { booking, customer, paymentRequest, error } = await createBookingWithCustomer(customerData, bookingData);

      if (error) {
        console.error('❌ BookingPage - Booking creation failed:', error);
        setSuccessMsg('Booking failed: ' + error);
        setSendingEmail(false);
        return;
      }

      if (booking && customer) {
        console.log('✅ BookingPage - Booking created successfully:', {
          booking,
          customer,
          paymentRequest: paymentRequest ? 'Created' : 'Not created',
          paymentRequestDetails: paymentRequest
        });

        // Dispatch event to notify admin views of booking update
        window.dispatchEvent(new CustomEvent('bookingUpdated', {
          detail: { booking, customer, paymentRequest }
        }));
        
        if (paymentRequest && paymentRequest.amount > 0) {
          console.log('💳 Payment request created with amount > 0, showing payment interface');

          // Calculate actual service cost based on selected service and time slot
          let actualServiceCost = paymentRequest.amount; // Fallback to payment request amount

          try {
            console.log('🔍 Calculating actual service cost for:', data.service);

            // Import pricing functions
            const { fetchServicePricing, getServicePrice, extractBaseServiceName, determineTimeSlotType } = await import('../services/pricingService');

            // Extract base service name and determine time slot type
            const baseServiceName = extractBaseServiceName(data.service);
            const timeSlotType = determineTimeSlotType(data.service);

            console.log('📊 Service pricing calculation:', {
              originalService: data.service,
              baseServiceName,
              timeSlotType,
              serviceLength: data.service.length,
              baseServiceLength: baseServiceName.length
            });

            // Fetch service pricing from database
            const servicePricing = await fetchServicePricing(baseServiceName);

            if (servicePricing) {
              actualServiceCost = getServicePrice(servicePricing, timeSlotType);
              console.log('✅ Service cost calculated from database:', {
                servicePricing,
                actualServiceCost,
                originalPaymentAmount: paymentRequest.amount
              });
            } else {
              console.log('⚠️ Service pricing not found in database, trying packages data...');

              // Fallback to packages data
              try {
                const { treatmentPackages } = await import('../data/packages');
                const packageData = treatmentPackages.find(pkg =>
                  pkg.name.toLowerCase() === baseServiceName.toLowerCase()
                );

                if (packageData) {
                  console.log('✅ Found package data:', packageData);

                  if (packageData.price) {
                    // Flat price service
                    const { extractNumericPrice } = await import('../services/pricingService');
                    actualServiceCost = extractNumericPrice(packageData.price);
                  } else if (timeSlotType === 'in_hour' && packageData.inHourPrice) {
                    const { extractNumericPrice } = await import('../services/pricingService');
                    actualServiceCost = extractNumericPrice(packageData.inHourPrice);
                  } else if (timeSlotType === 'out_of_hour' && packageData.outOfHourPrice) {
                    const { extractNumericPrice } = await import('../services/pricingService');
                    actualServiceCost = extractNumericPrice(packageData.outOfHourPrice);
                  }

                  console.log('✅ Service cost calculated from packages:', {
                    packageData,
                    timeSlotType,
                    actualServiceCost,
                    originalPaymentAmount: paymentRequest.amount
                  });
                } else {
                  console.log('⚠️ Service not found in packages data either, using payment request amount:', paymentRequest.amount);
                }
              } catch (packageError) {
                console.error('❌ Error accessing packages data:', packageError);
                console.log('⚠️ Using payment request amount as final fallback:', paymentRequest.amount);
              }
            }
          } catch (error) {
            console.error('❌ Error calculating service cost:', error);
            console.log('⚠️ Falling back to payment request amount:', paymentRequest.amount);
          }

          // Calculate payment options (20% deposit vs full amount) based on actual service cost
          const fullAmount = actualServiceCost;
          const depositAmount = Math.round(fullAmount * 0.2 * 100) / 100; // 20% deposit rounded to 2 decimals

          const paymentOptions = {
            deposit: { amount: depositAmount, percentage: 20 },
            full: { amount: fullAmount }
          };

          console.log('💰 Final payment options calculated:', {
            selectedService: data.service,
            actualServiceCost,
            paymentOptions: {
              deposit: `€${paymentOptions.deposit.amount} (${paymentOptions.deposit.percentage}%)`,
              full: `€${paymentOptions.full.amount}`
            },
            originalPaymentRequestAmount: paymentRequest.amount,
            calculationSource: actualServiceCost !== paymentRequest.amount ? 'Pricing Service' : 'Payment Request'
          });

          // Show payment interface for immediate payment only if amount > 0
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
            console.log('⚠️ BookingPage - Payment request created with 0 amount - treating as no payment needed');
            setSuccessMsg('Booking submitted successfully! Payment request created for record keeping.');
          } else {
            console.warn('⚠️ BookingPage - No payment request was created for this booking');
            setSuccessMsg('Booking submitted successfully! Contact Physiotherapist for more details about rate card for services.');
          }
          // Send email notification for bookings without payment or with 0 amount
          await sendBookingEmail(data, booking);
          reset(); // Clear the form after successful booking
        }
      }
    } catch (error) {
      console.error('Error submitting booking:', error);
      setSuccessMsg('An error occurred while submitting your booking. Please try again.');
    } finally {
      setSendingEmail(false);
    }
  };

  const handlePayNow = async (paymentType: 'deposit' | 'full') => {
    try {
      // Open the PaymentModal with the payment request
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
            first_name: customerData.first_name || customerData.firstName || '',
            last_name: customerData.last_name || customerData.lastName || '',
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
        console.error('Missing payment request or customer data:', {
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

  const handlePaymentModalComplete = async () => {
    // Close the payment modal
    setShowPaymentModal(false);
    setSelectedPaymentRequest(null);
    
    // Show success state
    handlePaymentSuccess();
  };

  const handlePaymentSuccess = () => {
    setPaymentState(prev => ({ ...prev, paymentCompleted: true }));
    setSuccessMsg('Payment completed successfully! Your booking is confirmed.');
    setCountdown(20);

    // Dispatch event to notify admin views of payment completion
    window.dispatchEvent(new CustomEvent('bookingUpdated', {
      detail: {
        booking: paymentState.booking,
        customer: paymentState.customer,
        paymentCompleted: true
      }
    }));

    // Start countdown timer
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const redirectToHome = () => {
    resetForm();
    navigate('/');
  };

  const resetForm = () => {
    reset();
    setSuccessMsg('');
    setCountdown(20);
    setShowPaymentModal(false);
    setSelectedPaymentRequest(null);
    setPaymentState({
      showPayment: false,
      paymentRequest: null,
      booking: null,
      customer: null,
      paymentCompleted: false
    });
  };

  return (
    <>
      <SEOHead
        title="Book Your Appointment | PhysioLife"
        description="Book your physiotherapy appointment online. Choose from our range of services and select a time that suits you best."
        canonicalUrl="/booking"
      />
      
      <div className="py-24 bg-neutral-50">
        <Container size="md">
          <SectionHeading
            title="Book Your Appointment"
            subtitle="Schedule your physiotherapy session with our experienced specialists."
            centered={true}
          />

          {/* Payment Success Modal */}
          {paymentState.paymentCompleted && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fadeIn">
              <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto transform animate-slideUp">
                <div className="p-6 md:p-8">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-gray-900">Booking Confirmed! 🎉</h2>
                    <button
                      onClick={redirectToHome}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </div>
                  
                  <div className="text-center mb-6">
                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                      <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-gray-600 mb-6">
                      Your payment has been processed and your booking is confirmed.
                    </p>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <h3 className="font-semibold text-gray-900 mb-3">What's Next?</h3>
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li className="flex items-start">
                        <span className="inline-block w-5 h-5 bg-blue-100 text-blue-600 rounded-full text-xs font-bold mr-2 mt-0.5 text-center leading-5">1</span>
                        Check your email for booking confirmation and receipt
                      </li>
                      <li className="flex items-start">
                        <span className="inline-block w-5 h-5 bg-blue-100 text-blue-600 rounded-full text-xs font-bold mr-2 mt-0.5 text-center leading-5">2</span>
                        We'll contact you to schedule your appointment
                      </li>
                      <li className="flex items-start">
                        <span className="inline-block w-5 h-5 bg-blue-100 text-blue-600 rounded-full text-xs font-bold mr-2 mt-0.5 text-center leading-5">3</span>
                        <div>
                          <strong>Access your dashboard:</strong>
                          <div className="ml-1 mt-1">
                            <a href="/my-account" className="text-blue-600 hover:text-blue-800 underline">
                              Login here
                            </a> using your email: <strong>{paymentState.customer?.email}</strong>
                          </div>
                          <div className="text-xs text-gray-500 ml-1 mt-1">
                            (Check your email for temporary password if this is your first booking)
                          </div>
                        </div>
                      </li>
                    </ul>
                  </div>

                  <div className="text-center">
                    <Button onClick={redirectToHome} variant="primary" className="w-full">
                      Return to Home
                    </Button>
                    <p className="text-xs text-gray-500 mt-2">
                      This modal will close automatically in <span className="font-medium text-blue-600">{countdown}</span> seconds
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Payment Modal */}
          {paymentState.showPayment && !paymentState.paymentCompleted && paymentState.paymentOptions && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fadeIn">
              <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto transform animate-slideUp">
                <div className="p-6 md:p-8">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-gray-800">Complete Your Payment</h2>
                    <button
                      onClick={resetForm}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
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
                                ✓ No remaining balance
                              </div>
                            </div>
                          </div>
                          <Button
                            onClick={() => handlePayNow('full')}
                            variant="secondary"
                            className="w-full"
                          >
                            Pay Full Amount - €{paymentState.paymentOptions.full.amount}
                          </Button>
                        </div>
                      </div>

                      <div className="mt-4 text-center text-sm text-blue-700 bg-blue-100 rounded p-2">
                        💡 Both options will immediately confirm your booking
                      </div>
                    </div>

                    <div className="text-center">
                      <button
                        onClick={resetForm}
                        className="text-gray-500 hover:text-gray-700 text-sm underline"
                      >
                        Cancel and start over
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Main Booking Form - Only show if not in payment flow */}
          {!paymentState.showPayment && (
          <>
          <div className="bg-white rounded-lg shadow-md p-6 md:p-8 mt-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-neutral-700 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    {...register('firstName', { required: 'First name is required' })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    placeholder="John"
                  />
                  {errors.firstName && (
                    <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-neutral-700 mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    {...register('lastName', { required: 'Last name is required' })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Doe"
                  />
                  {errors.lastName && (
                    <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="email"
                    {...register('email', { 
                      required: 'Email is required',
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: 'Invalid email address'
                      }
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    placeholder="john@example.com"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-neutral-700 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    {...register('phone', { required: 'Phone number is required' })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    placeholder="(01) 234-5678"
                  />
                  {errors.phone && (
                    <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="service" className="block text-sm font-medium text-neutral-700 mb-1">
                    Service Type *
                  </label>
                  <select
                    id="service"
                    {...register('service', { required: 'Please select a service' })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">Select a service</option>
                    {loadingServices ? (
                      <option disabled>Loading services...</option>
                    ) : (
                      services.filter(service => {
                        // Filter out "Contact for Quote" entries for booking forms
                        const serviceText = service.displayName || service.name || '';
                        return !/contact\s+for\s+quote/i.test(serviceText);
                      }).map((service) => (
                        <option key={service.id} value={service.displayName || service.name}>
                          {service.displayName || service.name}
                        </option>
                      ))
                    )}
                  </select>
                  {errors.service && (
                    <p className="mt-1 text-sm text-red-600">{errors.service.message}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="date" className="block text-sm font-medium text-neutral-700 mb-1">
                    Preferred Date *
                  </label>
                  <input
                    type="date"
                    id="date"
                    min={new Date().toISOString().split('T')[0]} // Prevent past dates
                    {...register('date', {
                      required: 'Please select a date',
                      validate: (value) => {
                        if (!value) return 'Please select a date';

                        const selectedDate = new Date(value + 'T00:00:00');
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);

                        if (selectedDate < today) {
                          return 'Cannot book appointments in the past';
                        }

                        // If selected date is today, validation will be done when time slots are loaded
                        if (selectedDate.getTime() === today.getTime()) {
                          return true;
                        }

                        return true;
                      }
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  />
                  {errors.date && (
                    <p className="mt-1 text-sm text-red-600">{errors.date.message}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="time" className="block text-sm font-medium text-neutral-700 mb-1">
                    Available Times for Selected Date *
                  </label>
                  <select
                    id="time"
                    {...register('time', {
                      required: 'Please select a time',
                      validate: (value) => {
                        if (!value) return 'Please select a time';

                        try {
                          console.log('🔍 Time validation - Input value:', value);

                          // Parse the datetime-range format (e.g., "2024-01-15T09:00-17:00")
                          if (value.includes('T') && value.includes('-')) {
                            // Find the last occurrence of '-' to properly split datetime and end time
                            const lastDashIndex = value.lastIndexOf('-');
                            if (lastDashIndex === -1) {
                              console.log('❌ Time validation - No dash separator found');
                              return 'Invalid time slot format';
                            }

                            const dateTimeStr = value.substring(0, lastDashIndex);
                            const endTimeStr = value.substring(lastDashIndex + 1);

                            console.log('🔍 Time validation - Split result:', { dateTimeStr, endTimeStr });

                            if (!dateTimeStr.includes('T')) {
                              console.log('❌ Time validation - No T separator in datetime string');
                              return 'Invalid time slot format';
                            }

                            // Basic validation of end time format
                            if (!endTimeStr || endTimeStr.length < 4) {
                              console.log('❌ Time validation - Invalid end time format:', endTimeStr);
                              return 'Invalid time slot format';
                            }

                            const [dateStr, timeStr] = dateTimeStr.split('T');

                            if (!dateStr || !timeStr) {
                              console.log('❌ Time validation - Missing date or time component:', { dateStr, timeStr });
                              return 'Invalid time slot format';
                            }

                            // Additional validation for date format (YYYY-MM-DD)
                            if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
                              console.log('❌ Time validation - Invalid date format:', dateStr);
                              return 'Invalid date format';
                            }

                            // Additional validation for time format (HH:MM)
                            if (!/^\d{2}:\d{2}$/.test(timeStr)) {
                              console.log('❌ Time validation - Invalid time format:', timeStr);
                              return 'Invalid time format';
                            }

                            // Add seconds (we know timeStr is HH:MM format from regex validation)
                            const formattedTimeStr = `${timeStr}:00`;

                            const selectedDateTime = new Date(`${dateStr}T${formattedTimeStr}`);
                            const now = new Date();

                            console.log('✅ Time validation - Parsed datetime:', {
                              dateStr,
                              timeStr,
                              formattedTimeStr,
                              selectedDateTime: selectedDateTime.toISOString(),
                              now: now.toISOString()
                            });

                            if (isNaN(selectedDateTime.getTime())) {
                              console.log('❌ Time validation - Invalid date object created');
                              return 'Invalid date/time selected';
                            }

                            if (selectedDateTime <= now) {
                              console.log('❌ Time validation - Selected time is in the past');
                              return 'Selected time slot is in the past or too close to current time';
                            }

                            console.log('✅ Time validation - Success');
                            return true;
                          }

                          // For other formats (legacy or simple time), allow through
                          // This handles cases like "09:00-17:00" or single time values
                          console.log('✅ Time validation - Non-datetime format, allowing through:', value);
                          return true;
                        } catch (error) {
                          console.error('❌ Time validation error:', error);
                          // In case of any validation errors, allow through to prevent form blocking
                          // This ensures the booking flow continues even if validation fails
                          console.log('⚠️ Time validation - Error occurred, allowing through to prevent blocking');
                          return true;
                        }
                      }
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">Select a time</option>
                    {timeSlotOptions}
                  </select>
                  {errors.time && (
                    <p className="mt-1 text-sm text-red-600">{errors.time.message}</p>
                  )}
                </div>
              </div>
              
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-neutral-700 mb-1">
                  Additional Notes
                </label>
                <textarea
                  id="notes"
                  {...register('notes')}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Please provide any additional information about your condition or specific requirements"
                ></textarea>
              </div>
              
              <div className="flex flex-col items-center">
                <Button type="submit" variant="primary" size="lg" icon={<Calendar size={20} />} disabled={sendingEmail}>
                  {sendingEmail ? 'Processing...' : 'Book Appointment'}
                </Button>
                {successMsg && <p className="text-green-600 mt-4">{successMsg}</p>}
                <p className="text-sm text-neutral-500 mt-4">
                  By booking, you agree to our{' '}
                  <a href="/terms-of-service" className="text-primary-600 hover:underline">Terms of Service</a>
                  {' '}and{' '}
                  <a href="/privacy-policy" className="text-primary-600 hover:underline">Privacy Policy</a>
                </p>
              </div>
            </form>
          </div>

          <div className="mt-12 bg-primary-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-neutral-800 mb-2">Important Information</h3>
            <ul className="list-disc list-inside space-y-2 text-neutral-600">
              <li>Please arrive 10 minutes before your appointment time</li>
              <li>Wear comfortable clothing that allows easy access to the affected area</li>
              <li>Bring any relevant medical reports or imaging results</li>
              <li>24-hour cancellation notice required to avoid charges</li>
            </ul>
          </div>
          </>
          )}
        </Container>
      </div>

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
    </>
  );
};

export default BookingPage;