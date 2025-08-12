import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { useForm } from 'react-hook-form';
import { Calendar } from 'lucide-react';
import SEOHead from '../components/utils/SEOHead';
import Container from '../components/shared/Container';
import SectionHeading from '../components/shared/SectionHeading';
import Button from '../components/shared/Button';

interface BookingFormData {
  name: string;
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

interface ServiceTimeSlot {
  id: number;
  service_id: number;
  slot_type: 'in-hour' | 'out-of-hour';
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

const BookingPage: React.FC = () => {
  const { register, handleSubmit, formState: { errors }, reset, watch } = useForm<BookingFormData>();
  const [successMsg, setSuccessMsg] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [loadingTimeSlots, setLoadingTimeSlots] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  // Watch the service field to trigger time slot updates
  const watchedService = watch('service');

  // Memoize time slot rendering to prevent excessive re-renders
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
      const [timeValue, displayTime] = slot.split('|');
      return (
        <option key={index} value={timeValue}>
          {displayTime}
        </option>
      );
    });
  }, [selectedService, loadingTimeSlots, timeSlots]);

  useEffect(() => {
    fetchServices();
  }, []);

  // Fetch time slots when service changes
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
        fetchTimeSlots(service);
      } else {
        setSelectedService(null);
        setTimeSlots([]);
      }
    } else {
      setSelectedService(null);
      setTimeSlots([]);
    }
  }, [watchedService, services]);

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
      
      // ONLY use database time slots - no fallbacks
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

  const sendBookingEmail = async (booking: BookingFormData) => {
    setSendingEmail(true);
    // Replace with your email API endpoint and logic
    try {
      await fetch('/api/send-booking-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(booking),
      });
      setSuccessMsg('Booking confirmed! Confirmation email sent.');
  } catch {
      setSuccessMsg('Booking confirmed, but failed to send email.');
    }
    setSendingEmail(false);
  };

  const onSubmit = async (data: BookingFormData) => {
    // Map form data to bookings table columns
    // Combine date and time into ISO string for booking_date
    let bookingDateTime = data.date;
    if (data.time) {
      // Extract start time from range (e.g., "17:00-20:00" -> "17:00")
      const startTime = data.time.includes('-') ? data.time.split('-')[0] : data.time;
      bookingDateTime = `${data.date}T${startTime}`;
    }
    const bookingData = {
      customer_name: data.name,
      customer_email: data.email,
      customer_phone: data.phone,
      package_name: data.service,
      booking_date: bookingDateTime,
      notes: data.notes,
      status: 'pending'
    };
    const { error } = await supabase.from('bookings').insert([bookingData]);
    if (error) {
      setSuccessMsg('Booking failed: ' + error.message);
    } else {
      await sendBookingEmail(data);
      reset(); // Clear the form after successful booking
    }
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
          
          <div className="bg-white rounded-lg shadow-md p-6 md:p-8 mt-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-neutral-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    {...register('name', { required: 'Name is required' })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    placeholder="John Doe"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
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
                      services.map((service) => (
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
                    {...register('date', { required: 'Please select a date' })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  />
                  {errors.date && (
                    <p className="mt-1 text-sm text-red-600">{errors.date.message}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="time" className="block text-sm font-medium text-neutral-700 mb-1">
                    Preferred Time *
                  </label>
                  <select
                    id="time"
                    {...register('time', { required: 'Please select a time' })}
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
        </Container>
      </div>
    </>
  );
};

export default BookingPage;