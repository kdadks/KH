import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Calendar } from 'lucide-react';
import { useForm } from 'react-hook-form';
import Button from '../shared/Button';
import { supabase } from '../../supabaseClient';
import { useToast } from '../shared/toastContext';
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

const HeroSection: React.FC = () => {
  // Removed unused visibility state
  interface BookingFormData { firstName: string; lastName: string; email: string; phone: string; service: string; }
  const { showSuccess, showError } = useToast();
  const { register, handleSubmit, formState: { errors }, reset } = useForm<BookingFormData>();
  const [sendingEmail, setSendingEmail] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);

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

  const sendBookingEmail = async (booking: BookingFormData) => {
    setSendingEmail(true);
    try {
      await fetch('/api/send-booking-email', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(booking),
      });
      showSuccess('Booking Confirmed!', 'Confirmation email sent successfully.');
    } catch {
      showSuccess('Booking Confirmed!', 'Booking saved but email notification failed.');
    }
    setSendingEmail(false);
  };

  const onSubmit = async (data: BookingFormData) => {
    setSendingEmail(true);
    
    try {
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
        booking_date: new Date().toISOString(), // Set current date and time
        notes: 'Quick Appointment from Hero Section',
        status: 'pending'
      };

      // Create booking with customer integration
      const { booking, customer, error } = await createBookingWithCustomer(customerData, bookingData);

      if (error) {
        console.error('Booking creation error:', error);
        throw new Error(error);
      }

      if (booking && customer) {
        // Send email notification
        await sendBookingEmail(data);
        
        // Reset form on success
        reset();
      }
      
    } catch (error) {
      console.error('Error submitting hero booking:', error);
      showError('Booking Failed', 'Error submitting booking. Please try again.');
    } finally {
      setSendingEmail(false);
    }
  };  return (
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
                  Book Appointment
                </Button>
                <Button to="/services" size="lg" variant="outline" className="border-gray-600 text-gray-700 hover:bg-gray-200">
                  Explore Services
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
                   {!loadingServices && services.map((service) => (
                     <option key={service.id} value={service.displayName || service.name}>
                       {service.displayName || service.name}
                     </option>
                   ))}
                 </select>
                {errors.service && <p className="mt-1 text-sm text-red-600">{errors.service.message}</p>}
               </div>
              
              <Button type="submit" variant="primary" fullWidth size="lg" disabled={sendingEmail}>
                {sendingEmail ? 'Processing...' : 'Book Appointment'} <ArrowRight size={16} className="ml-2" />
              </Button>
              
              <p className="text-xs text-center text-neutral-500 mt-4">
                  By booking, you agree to our <a href="/terms-of-service" className="text-primary-600 hover:underline">Terms of Service</a> and <a href="/privacy-policy" className="text-primary-600 hover:underline">Privacy Policy</a>.
                </p>
            </form>
          </motion.div>
          
        </div>
      </div>
    </section>
  );
};

export default HeroSection;