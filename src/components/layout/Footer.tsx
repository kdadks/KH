import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Phone, Mail, Clock, Facebook, Instagram, Linkedin, Twitter } from 'lucide-react';
import Logo from '../shared/Logo';

const Footer: React.FC = () => {
  return (
    <footer className="bg-neutral-800 text-white pt-12 pb-6">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          
          {/* About */}
          <div>
            <div className="flex items-center mb-4">
              <Logo className="w-10 h-10 mr-2" />
              <h3 className="text-xl font-semibold">KH Therapy</h3>
            </div>
            <p className="text-neutral-300 mb-4">
              KH Therapy provides excellent high standard physiotherapy care through personalized physical therapy sessions. We help you become pain free through education, knowledge, and strengthening the body through rehabilitation and movement.
            </p>
            <div className="flex space-x-4">
              <a href="https://www.facebook.com/PhysiotherapyAndPerformance" className="text-white hover:text-primary-400 transition-colors" aria-label="Facebook" target="_blank" rel="noopener noreferrer">
                <Facebook size={20} />
              </a>
              <a href="https://www.instagram.com/galwayphysioclinic/" className="text-white hover:text-primary-400 transition-colors" aria-label="Instagram" target="_blank" rel="noopener noreferrer">
                <Instagram size={20} />
              </a>
              <a href="https://twitter.com/galway_physio" className="text-white hover:text-primary-400 transition-colors" aria-label="Twitter" target="_blank" rel="noopener noreferrer">
                <Twitter size={20} />
              </a>
              <a href="https://www.linkedin.com/in/kelly-thompson-physiotherapist" className="text-white hover:text-primary-400 transition-colors" aria-label="LinkedIn" target="_blank" rel="noopener noreferrer">
                <Linkedin size={20} />
              </a>
            </div>
          </div>
          
          {/* Quick Links */}
          <div>
            <h3 className="text-xl font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-neutral-300 hover:text-white transition-colors">Home</Link>
              </li>
              <li>
                <Link to="/about" className="text-neutral-300 hover:text-white transition-colors">About Us</Link>
              </li>
              <li>
                <Link to="/services" className="text-neutral-300 hover:text-white transition-colors">Services</Link>
              </li>
              <li>
                <Link to="/testimonials" className="text-neutral-300 hover:text-white transition-colors">Testimonials</Link>
              </li>
              <li>
                <Link to="/booking" className="text-neutral-300 hover:text-white transition-colors">Book Appointment</Link>
              </li>
              <li>
                <Link to="/contact" className="text-neutral-300 hover:text-white transition-colors">Contact Us</Link>
              </li>
            </ul>
          </div>
          
          {/* Specialized Services */}
          <div>
            <h3 className="text-xl font-semibold mb-4">Specialized Services</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/services/sports-injury" className="text-neutral-300 hover:text-white transition-colors">Sports Injury Rehabilitation</Link>
              </li>
              <li>
                <Link to="/services/manual-therapy" className="text-neutral-300 hover:text-white transition-colors">Manual Therapy</Link>
              </li>
              <li>
                <Link to="/services/chronic-pain" className="text-neutral-300 hover:text-white transition-colors">Chronic Pain Management</Link>
              </li>
              <li>
                <Link to="/services/post-surgery" className="text-neutral-300 hover:text-white transition-colors">Post-Surgery Rehabilitation</Link>
              </li>
              <li>
                <Link to="/services/neuromuscular" className="text-neutral-300 hover:text-white transition-colors">Neuromuscular Therapy</Link>
              </li>
              <li>
                <Link to="/services/ergonomic" className="text-neutral-300 hover:text-white transition-colors">Ergonomic Assessments</Link>
              </li>
            </ul>
          </div>
          
          {/* Contact Information */}
          <div>
            <h3 className="text-xl font-semibold mb-4">Contact Us</h3>
            <div className="space-y-3">
              <div className="flex items-start">
                <MapPin size={20} className="mr-3 mt-1 text-primary-400" />
                <p className="text-neutral-300">Ace Enterprise Centre, Bawnogue Road, Clondalkin, Dublin 22, Ireland</p>
              </div>
              <div className="flex items-center">
                <Phone size={20} className="mr-3 text-primary-400" />
                <a href="tel:+353123456789" className="text-neutral-300 hover:text-white transition-colors">(01) 234-5678</a>
              </div>
              <div className="flex items-center">
                <Mail size={20} className="mr-3 text-primary-400" />
                <a href="mailto:khtherapy@hotmail.com" className="text-neutral-300 hover:text-white transition-colors">khtherapy@hotmail.com</a>
              </div>
              <div className="flex items-start">
                <Clock size={20} className="mr-3 mt-1 text-primary-400" />
                <div className="text-neutral-300">
                  <p>Monday - Friday: 8am - 7pm</p>
                  <p>Saturday: 9am - 2pm</p>
                  <p>Sunday: Closed</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <hr className="border-neutral-700 my-8" />
        
        {/* Bottom Footer */}
        <div className="flex flex-col md:flex-row justify-between items-center text-sm text-neutral-400">
          <p>&copy; {new Date().getFullYear()} KH Therapy. All rights reserved.</p>
          <div className="flex space-x-4 mt-4 md:mt-0">
            <Link to="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link to="/terms-of-service" className="hover:text-white transition-colors">Terms of Service</Link>
            <Link to="/cookie-policy" className="hover:text-white transition-colors">Cookie Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;