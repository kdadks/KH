import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Calendar } from 'lucide-react';
import { useForm } from 'react-hook-form';
import Button from '../shared/Button';
import PaymentModal from '../shared/PaymentModal';
import { supabase } from '../../supabaseClient';
import { createBookingWithCustomer } from '../../utils/customerBookingUtils';

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
  paymentCompleted: boolean;
}

const HeroSection: React.FC = () => {
  // Form and UI states
  interface BookingFormData { firstName: string; lastName: string; email: string; phone: string; service: string; }
  const { register, handleSubmit, formState: { errors }, reset } = useForm<BookingFormData>();
  const [sendingEmail, setSendingEmail] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [successMsg, setSuccessMsg] = useState('');
  
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
    setPaymentState({
      showPayment: false,
      paymentRequest: null,
      booking: null,
      customer: null,
      paymentCompleted: false
    });
  };

  const resetForm = () => {
    reset();
    setSuccessMsg('');
    setCountdown(20);
    setShowPaymentModal(false);
    setSelectedPaymentRequest(null);
    setPaymentProcessing(false);
    setPaymentState({
      showPayment: false,
      paymentRequest: null,
      booking: null,
      customer: null,
      paymentCompleted: false
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
      const bookingData = {
        package_name: data.service,
        booking_date: new Date().toISOString(), // Set current date and time
        notes: 'Quick Appointment from Hero Section',
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
          // Show payment interface with Pay Now button only if amount > 0
          setPaymentState({
            showPayment: true,
            paymentRequest,
            booking,
            customer,
            paymentCompleted: false
          });
          // Removed duplicate success message - booking creation is already shown in the UI
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

  const handlePayNow = async () => {
    try {
      // Open the PaymentModal with the payment request
      if (paymentState.paymentRequest && paymentState.customer) {
        // Ensure customer data is properly structured
        const customerData = paymentState.customer;
        
        // Transform the payment request to match PaymentRequestWithCustomer structure
        const paymentRequestWithCustomer = {
          ...paymentState.paymentRequest,
          customer: {
            first_name: customerData.first_name || '',
            last_name: customerData.last_name || '',
            email: customerData.email || ''
          },
          service_name: paymentState.booking?.package_name,
          booking_date: paymentState.booking?.booking_date
        };
        
        console.log('Opening PaymentModal with:', paymentRequestWithCustomer);
        
        setSelectedPaymentRequest(paymentRequestWithCustomer);
        setShowPaymentModal(true);
        // Clear any previous messages when opening modal
        setSuccessMsg('');
      } else {
        console.error('Missing payment request or customer data:', { 
          paymentRequest: paymentState.paymentRequest, 
          customer: paymentState.customer 
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
                Professional physiotherapy services with personalized care plans 
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
                  <p className="font-medium">Personalized Care</p>
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
                  <input type="text" id="firstName" {...register('firstName',{required:'First name is required'})} className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500" placeholder="John" />
                  {errors.firstName && <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>}
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-neutral-700 mb-1">
                    Last Name *
                  </label>
                  <input type="text" id="lastName" {...register('lastName',{required:'Last name is required'})} className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500" placeholder="Doe" />
                  {errors.lastName && <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>}
                </div>
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-1">
                  Email Address *
                </label>
                <input type="email" id="email" {...register('email',{required:'Email is required'})} className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500" placeholder="john@example.com" />
                {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-neutral-700 mb-1">
                  Phone Number *
                </label>
                <input type="tel" id="phone" {...register('phone',{required:'Phone number is required'})} className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500" placeholder="(01) 234-5678" />
                {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>}
              </div>
              <div>
                <label htmlFor="service" className="block text-sm font-medium text-neutral-700 mb-1">
                  Service Type *
                </label>
                <select id="service" {...register('service',{required:'Please select a service'})} className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500">
                   <option value="">
                     {loadingServices ? 'Loading services...' : 'Select a service'}
                   </option>
                   {!loadingServices && services.filter(service => {
                     // Filter out "Contact for Quote" entries for booking forms
                     const serviceText = service.displayName || service.name || '';
                     return !/contact\s+for\s+quote/i.test(serviceText);
                   }).map((service) => (
                     <option key={service.id} value={service.displayName || service.name}>
                       {service.displayName || service.name}
                     </option>
                   ))}
                 </select>
                {errors.service && <p className="mt-1 text-sm text-red-600">{errors.service.message}</p>}
               </div>
              
              <Button type="submit" variant="primary" fullWidth size="lg" disabled={sendingEmail}>
                {sendingEmail ? 'Processing...' : 'Book Now'} <ArrowRight size={16} className="ml-2" />
              </Button>
              
              <p className="text-xs text-center text-neutral-500 mt-4">
                  By booking, you agree to our <a href="/terms-of-service" className="text-primary-600 hover:underline">Terms of Service</a> and <a href="/privacy-policy" className="text-primary-600 hover:underline">Privacy Policy</a>.
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
            {paymentState.showPayment && !paymentState.paymentCompleted && (
              <div className="mt-6 p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="text-center">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                    <p className="text-green-800 font-medium">✅ Booking Created Successfully!</p>
                    <p className="text-green-600 text-sm mt-1">
                      Service: {paymentState.booking?.package_name}
                    </p>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <h3 className="font-semibold text-blue-900 mb-2">Payment Required</h3>
                    <p className="text-blue-800 text-sm mb-3">
                      A deposit payment of <strong>€{paymentState.paymentRequest?.amount}</strong> is required to confirm your booking.
                    </p>
                    <Button
                      onClick={handlePayNow}
                      variant="primary"
                      className="w-full"
                    >
                      Pay Now - €{paymentState.paymentRequest?.amount}
                    </Button>
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