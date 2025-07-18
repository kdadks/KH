import React, { useState } from 'react';
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

const BookingPage: React.FC = () => {
  const { register, handleSubmit, formState: { errors } } = useForm<BookingFormData>();
  const [successMsg, setSuccessMsg] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

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
    } catch (err) {
      setSuccessMsg('Booking confirmed, but failed to send email.');
    }
    setSendingEmail(false);
  };

  const onSubmit = async (data: BookingFormData) => {
    // Save booking to localStorage
    const bookings = JSON.parse(localStorage.getItem('bookings') || '[]');
    bookings.push(data);
    localStorage.setItem('bookings', JSON.stringify(bookings));
    await sendBookingEmail(data);
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
                    <option value="Basic Wellness">Basic Wellness</option>
                    <option value="Premium Care">Premium Care</option>
                    <option value="Ultimate Health">Ultimate Health</option>
                    <option value="Sports Massage / Deep Tissue Massage">Sports Massage / Deep Tissue Massage</option>
                    <option value="Pitch Side Cover for Sporting Events">Pitch Side Cover for Sporting Events</option>
                    <option value="Pre & Post Surgery Rehab">Pre & Post Surgery Rehab</option>
                    <option value="Return to Play/Sport & Strapping & Taping">Return to Play/Sport & Strapping & Taping</option>
                    <option value="Corporate Wellness / Workplace Events">Corporate Wellness / Workplace Events</option>
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
                    <option value="09:00">09:00 AM</option>
                    <option value="10:00">10:00 AM</option>
                    <option value="11:00">11:00 AM</option>
                    <option value="12:00">12:00 PM</option>
                    <option value="14:00">02:00 PM</option>
                    <option value="15:00">03:00 PM</option>
                    <option value="16:00">04:00 PM</option>
                    <option value="17:00">05:00 PM</option>
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