import React, { useState, useEffect } from 'react';
import { Phone, Mail, MapPin, Clock, User, Send, MessageSquare } from 'lucide-react';
import { FaInstagram, FaLinkedinIn } from 'react-icons/fa';
import Container from '../components/shared/Container';
import SectionHeading from '../components/shared/SectionHeading';
import SEOHead from '../components/utils/SEOHead';
import { supabase } from '../supabaseClient';
import { useToast } from '../components/shared/toastContext';
import {
  validateEmailRealTime,
  validateNameRealTime,
  validateNotesRealTime
} from '../utils/formValidation';

interface Service {
  id: number | string;
  name: string;
  price?: string;
  in_hour_price?: string;
  out_of_hour_price?: string;
  displayName?: string;
  priceType?: string;
}

const ContactPage: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    service: '',
    message: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [realTimeErrors, setRealTimeErrors] = useState<{[key: string]: string}>({});
  const { showSuccess } = useToast();

  // Fetch services from database
  useEffect(() => {
    const fetchServices = async () => {
      try {
        setServicesLoading(true);
        const { data, error } = await supabase
          .from('services')
          .select('id, name, price, in_hour_price, out_of_hour_price, is_active')
          .eq('is_active', true)
          .order('name', { ascending: true });

        if (error) {
          console.error('Supabase error fetching services:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          });
          setServicesLoading(false);
          return;
        }

        if (data) {
          // Transform services to include separate in-hour/out-of-hour options
          const transformedServices: any[] = [];
          data.forEach(service => {
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
      } catch (err) {
        console.error('Network error fetching services:', {
          error: err instanceof Error ? err.message : 'Unknown error',
          stack: err instanceof Error ? err.stack : null
        });
      } finally {
        setServicesLoading(false);
      }
    };

    fetchServices();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { id, value } = e.target;

    // Real-time validation
    let error = '';
    switch (id) {
      case 'name':
        error = validateNameRealTime(value, 'Full name');
        break;
      case 'email':
        error = validateEmailRealTime(value);
        break;
      case 'message':
        error = validateNotesRealTime(value);
        break;
      case 'service':
        if (!value) {
          error = 'Please select a service';
        }
        break;
    }

    // Update errors state
    setRealTimeErrors(prev => ({ ...prev, [id]: error }));

    // Update form data
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Send contact form email to admin
      const response = await fetch('/.netlify/functions/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emailType: 'contact_form',
          recipientEmail: 'info@khtherapy.ie',
          data: {
            customer_name: formData.name,
            customer_email: formData.email,
            service_name: formData.service,
            message: formData.message,
            submission_date: new Date().toLocaleDateString(),
            submission_time: new Date().toLocaleTimeString()
          },
          subject: `New Contact Form Submission - ${formData.service || 'General Inquiry'}`
        })
      });

      if (!response.ok) {
        throw new Error(`Email sending failed: ${response.status}`);
      }

      // Reset form after successful submission
      setFormData({
        name: '',
        email: '',
        service: '',
        message: ''
      });

      // Clear any real-time errors
      setRealTimeErrors({});

      showSuccess('Message sent successfully! We\'ll get back to you within 24 hours.');
    } catch (error) {
      console.error('Error sending contact form:', error);
      showSuccess('Message received! If you don\'t hear back within 24 hours, please call us directly at (083) 8009404.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <SEOHead
        title="Contact Us - KH Therapy"
        description="Get in touch with KH Therapy for professional physiotherapy and rehabilitation services."
        canonicalUrl="/contact"
      />
      <main className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-16">
        <Container>
          <SectionHeading
            title="Contact Us"
            subtitle="Ready to start your journey to better health? Get in touch with our expert team today."
          />
          
          <div className="mt-16 grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Contact Form */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
                <div className="mb-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Send us a Message</h3>
                  <p className="text-gray-600">Fill out the form below and we'll get back to you within 24 hours.</p>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Name Field */}
                  <div className="group">
                    <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="name">
                      <User className="inline w-4 h-4 mr-2" />
                      Full Name
                    </label>
                    <input
                      className={`w-full border-2 rounded-xl px-4 py-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 transition-all duration-200 ${
                        realTimeErrors.name
                          ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-200'
                          : 'border-gray-200 focus:border-primary-500 focus:ring-primary-200'
                      }`}
                      id="name"
                      type="text"
                      placeholder="Enter your full name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                    />
                    {realTimeErrors.name && (
                      <p className="mt-2 text-sm text-red-600">{realTimeErrors.name}</p>
                    )}
                  </div>

                  {/* Email Field */}
                  <div className="group">
                    <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="email">
                      <Mail className="inline w-4 h-4 mr-2" />
                      Email Address
                    </label>
                    <input
                      className={`w-full border-2 rounded-xl px-4 py-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 transition-all duration-200 ${
                        realTimeErrors.email
                          ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-200'
                          : 'border-gray-200 focus:border-primary-500 focus:ring-primary-200'
                      }`}
                      id="email"
                      type="email"
                      placeholder="Enter your email address"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                    />
                    {realTimeErrors.email && (
                      <p className="mt-2 text-sm text-red-600">{realTimeErrors.email}</p>
                    )}
                  </div>

                  {/* Service Type Field */}
                  <div className="group">
                    <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="service">
                      Service Type
                    </label>
                    <select
                      className={`w-full border-2 rounded-xl px-4 py-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 transition-all duration-200 bg-white ${
                        realTimeErrors.service
                          ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-200'
                          : 'border-gray-200 focus:border-primary-500 focus:ring-primary-200'
                      }`}
                      id="service"
                      value={formData.service}
                      onChange={handleInputChange}
                      required
                      disabled={servicesLoading}
                    >
                      <option value="">
                        {servicesLoading 
                          ? "Loading services..." 
                          : services.length === 0 
                          ? "No services available" 
                          : "Select a service"
                        }
                      </option>
                      {!servicesLoading && services.map((service) => (
                        <option key={service.id} value={service.name}>
                          {service.displayName || service.name}
                        </option>
                      ))}
                    </select>
                    {realTimeErrors.service && (
                      <p className="mt-2 text-sm text-red-600">{realTimeErrors.service}</p>
                    )}
                  </div>

                  {/* Message Field */}
                  <div className="group">
                    <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="message">
                      <MessageSquare className="inline w-4 h-4 mr-2" />
                      Message
                    </label>
                    <textarea
                      className={`w-full border-2 rounded-xl px-4 py-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 transition-all duration-200 resize-none ${
                        realTimeErrors.message
                          ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-200'
                          : 'border-gray-200 focus:border-primary-500 focus:ring-primary-200'
                      }`}
                      id="message"
                      rows={6}
                      placeholder="Tell us about your condition, symptoms, or any questions you have..."
                      value={formData.message}
                      onChange={handleInputChange}
                      required
                    />
                    {realTimeErrors.message && (
                      <p className="mt-2 text-sm text-red-600">{realTimeErrors.message}</p>
                    )}
                    <p className="mt-2 text-xs text-gray-500">
                      {formData.message.length}/1000 characters
                    </p>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-gradient-to-r from-[#71db77] to-[#5fcf68] hover:from-[#5fcf68] hover:to-[#4ac85d] text-white font-semibold py-4 px-8 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-5 h-5 mr-2" />
                          Send Message
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-6">
              {/* Contact Details Card */}
              <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Get in Touch</h3>
                
                <div className="space-y-6">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                        <Phone className="w-6 h-6 text-primary-600" />
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Phone</h4>
                      <a href="tel:+353838009404" className="text-primary-600 hover:text-primary-700 transition-colors">
                        (083) 8009404
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                        <Mail className="w-6 h-6 text-primary-600" />
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Email</h4>
                      <a href="mailto:info@khtherapy.ie" className="text-primary-600 hover:text-primary-700 transition-colors">
                        info@khtherapy.ie
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                        <MapPin className="w-6 h-6 text-primary-600" />
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Address</h4>
                      <p className="text-gray-600 leading-relaxed">
                        Neilstown Village Court<br />
                        Neilstown Rd<br />
                        Clondalkin, D22E8P2
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                        <Clock className="w-6 h-6 text-primary-600" />
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Office Hours</h4>
                      <div className="text-gray-600 text-sm space-y-1">
                        <p>Monday - Friday: 8am - 7pm</p>
                        <p>Saturday: 9am - 2pm</p>
                        <p>Sunday: Closed</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-100">
                    <h4 className="font-semibold text-gray-900 mb-3">Follow Us</h4>
                    <div className="flex space-x-3">
                      <a 
                        href="https://www.instagram.com/kh.therapy/" 
                        className="flex items-center justify-center w-10 h-10 bg-primary-100 rounded-lg hover:bg-primary-200 transition-colors group"
                        aria-label="Instagram"
                        target="_blank" 
                        rel="noopener noreferrer"
                      >
                        <FaInstagram className="w-5 h-5 text-primary-600 group-hover:text-primary-700" />
                      </a>
                      <a 
                        href="https://www.linkedin.com/in/kelly-hodgins-547b05211/" 
                        className="flex items-center justify-center w-10 h-10 bg-primary-100 rounded-lg hover:bg-primary-200 transition-colors group"
                        aria-label="LinkedIn"
                        target="_blank" 
                        rel="noopener noreferrer"
                      >
                        <FaLinkedinIn className="w-5 h-5 text-primary-600 group-hover:text-primary-700" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Emergency Contact Card */}
              {/* 
              <div className="bg-gradient-to-r from-secondary-500 to-secondary-600 rounded-2xl shadow-xl p-6 text-white">
                <h3 className="text-lg font-bold mb-3">Emergency Contact</h3>
                <p className="text-secondary-100 text-sm mb-4">
                  For urgent matters outside business hours, please contact our emergency line.
                </p>
                <a 
                  href="tel:+353123456789" 
                  className="inline-flex items-center bg-white text-secondary-600 font-semibold px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Emergency: (01) 234-5678
                </a>
              </div>
              */}
            </div>
          </div>
        </Container>
      </main>
    </>
  );
};

export default ContactPage;