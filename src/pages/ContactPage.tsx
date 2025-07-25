import React, { useState } from 'react';
import { Phone, Mail, MapPin, Clock, User, Send, MessageSquare } from 'lucide-react';
import Container from '../components/shared/Container';
import SectionHeading from '../components/shared/SectionHeading';
import SEOHead from '../components/utils/SEOHead';

const ContactPage: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    service: '',
    message: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Reset form after submission
    setFormData({
      name: '',
      email: '',
      service: '',
      message: ''
    });
    setIsSubmitting(false);
    
    // You can add actual form submission logic here
    alert('Message sent successfully!');
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
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-700 leading-tight focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all duration-200" 
                      id="name" 
                      type="text" 
                      placeholder="Enter your full name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required 
                    />
                  </div>

                  {/* Email Field */}
                  <div className="group">
                    <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="email">
                      <Mail className="inline w-4 h-4 mr-2" />
                      Email Address
                    </label>
                    <input 
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-700 leading-tight focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all duration-200" 
                      id="email" 
                      type="email" 
                      placeholder="Enter your email address"
                      value={formData.email}
                      onChange={handleInputChange}
                      required 
                    />
                  </div>

                  {/* Service Type Field */}
                  <div className="group">
                    <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="service">
                      Service Type
                    </label>
                    <select 
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-700 leading-tight focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all duration-200 bg-white" 
                      id="service"
                      value={formData.service}
                      onChange={handleInputChange}
                      required
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
                  </div>

                  {/* Message Field */}
                  <div className="group">
                    <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="message">
                      <MessageSquare className="inline w-4 h-4 mr-2" />
                      Message
                    </label>
                    <textarea 
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-700 leading-tight focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all duration-200 resize-none" 
                      id="message" 
                      rows={6} 
                      placeholder="Tell us about your condition, symptoms, or any questions you have..."
                      value={formData.message}
                      onChange={handleInputChange}
                      required 
                    />
                  </div>

                  {/* Submit Button */}
                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white font-semibold py-4 px-8 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center"
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
                      <a href="tel:+353123456789" className="text-primary-600 hover:text-primary-700 transition-colors">
                        (01) 234-5678
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
                      <a href="mailto:khtherapy@hotmail.com" className="text-primary-600 hover:text-primary-700 transition-colors">
                        khtherapy@hotmail.com
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
                        Ace Enterprise Centre<br />
                        Bawnogue Road<br />
                        Clondalkin, Dublin 22
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