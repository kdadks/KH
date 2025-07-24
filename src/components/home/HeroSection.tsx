import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Calendar } from 'lucide-react';
import { useForm } from 'react-hook-form';
import Button from '../shared/Button';
import { supabase } from '../../supabaseClient';
import { useToast } from '../shared/Toast';

const HeroSection: React.FC = () => {
  // Removed unused visibility state
  interface BookingFormData { name: string; email: string; phone: string; service: string; }
  const { showSuccess, showError } = useToast();
  const { register, handleSubmit, formState: { errors }, reset } = useForm<BookingFormData>();
  const [sendingEmail, setSendingEmail] = useState(false);

  // Service mapping to convert dropdown values to display names
  const serviceMapping: { [key: string]: string } = {
    'basic-wellness': 'Basic Wellness',
    'corporate-wellness': 'Corporate Wellness / Workplace Events',
    'pitch-side-cover': 'Pitch Side Cover for Sporting Events',
    'pre-post-surgery-rehab': 'Pre & Post Surgery Rehab',
    'premium-care': 'Premium Care',
    'return-to-play': 'Return to Play/Sport & Strapping & Taping',
    'sports-massage': 'Sports Massage / Deep Tissue Massage',
    'ultimate-health': 'Ultimate Health'
  };

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
    console.log('Form data received:', data); // Debug: Check what form data we're getting
    
    setSendingEmail(true);
    
    try {
      // Convert service value to display name
      const serviceDisplayName = serviceMapping[data.service] || data.service;
      
      // Save to Supabase database
      const bookingData = {
        customer_name: data.name,
        customer_email: data.email,
        customer_phone: data.phone,
        package_name: serviceDisplayName, // Use mapped display name
        notes: 'Quick Appointment',
        status: 'pending',
        booking_date: null // Explicitly set booking_date to null (blank)
      };

      console.log('Submitting booking data to Supabase:', bookingData); // Debug log

      const { data: insertedData, error } = await supabase.from('bookings').insert([bookingData]).select();
      
      if (error) {
        console.error('Supabase error:', error);
        throw new Error(error.message);
      }

      console.log('Successfully inserted booking:', insertedData); // Debug: Confirm successful insert

      // Send email notification
      await sendBookingEmail(data);
      
      // Reset form on success
      reset();
      
    } catch (error) {
      console.error('Error submitting booking:', error);
      showError('Booking Failed', 'Error submitting booking. Please try again.');
      setSendingEmail(false);
    }
  };

  return (
    <section className="relative pt-16 pb-12 md:pt-24 md:pb-20 overflow-hidden">
      {/* Background image with overlay */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center"
        style={{ 
          backgroundImage: 'url(https://images.pexels.com/photos/7706643/pexels-photo-7706643.jpeg)',
          backgroundPosition: 'center',
          backgroundSize: 'cover',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-primary-900/80 to-primary-700/50"></div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          {/* Hero Content - Left Side */}
          <div className="lg:col-span-7 text-white">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                Your Journey to <span className="text-secondary-300">Recovery</span> and <span className="text-secondary-300">Wellness</span>
              </h1>
              
              <p className="text-lg md:text-xl mb-8 text-gray-100 max-w-2xl">
                Professional physiotherapy services with personalized care plans 
                designed to help you move better, feel better, and live better.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 mb-12">
                <Button to="/booking" size="lg" variant="secondary" icon={<Calendar size={20} />}>
                  Book Appointment
                </Button>
                <Button to="/services" size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                  Explore Services
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-center">
                  <div className="bg-white/20 rounded-full p-2 mr-3">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  </div>
                  <p className="font-medium">Certified Specialists</p>
                </div>
                <div className="flex items-center">
                  <div className="bg-white/20 rounded-full p-2 mr-3">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  </div>
                  <p className="font-medium">Modern Techniques</p>
                </div>
                <div className="flex items-center">
                  <div className="bg-white/20 rounded-full p-2 mr-3">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  </div>
                  <p className="font-medium">Personalized Care</p>
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
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-neutral-700 mb-1">
                  Full Name
                </label>
                <input type="text" id="name" {...register('name',{required:'Name is required'})} className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500" placeholder="John Doe" />
                {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-1">
                  Email Address
                </label>
                <input type="email" id="email" {...register('email',{required:'Email is required'})} className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500" placeholder="john@example.com" />
                {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-neutral-700 mb-1">
                  Phone Number
                </label>
                <input type="tel" id="phone" {...register('phone',{required:'Phone number is required'})} className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500" placeholder="(01) 234-5678" />
                {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>}
              </div>
              <div>
                <label htmlFor="service" className="block text-sm font-medium text-neutral-700 mb-1">
                  Service Type
                </label>
                <select id="service" {...register('service',{required:'Please select a service'})} className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500">
                   <option value="">Select a service</option>
                   <option value="basic-wellness">Basic Wellness</option>
                   <option value="corporate-wellness">Corporate Wellness / Workplace Events</option>
                   <option value="pitch-side-cover">Pitch Side Cover for Sporting Events</option>
                   <option value="pre-post-surgery-rehab">Pre & Post Surgery Rehab</option>
                   <option value="premium-care">Premium Care</option>
                   <option value="return-to-play">Return to Play/Sport & Strapping & Taping</option>
                   <option value="sports-massage">Sports Massage / Deep Tissue Massage</option>
                   <option value="ultimate-health">Ultimate Health</option>
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