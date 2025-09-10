import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Phone, Mail, Clock, Facebook, Twitter } from 'lucide-react';
import { FaInstagram, FaLinkedinIn } from 'react-icons/fa';
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
              <img 
                src="/KHtherapy.png" 
                alt="KH Therapy" 
                className="h-6 w-auto"
              />
            </div>
            <p className="text-neutral-300 mb-4">
              KH Therapy provides excellent high standard physiotherapy care through personalized physical therapy sessions. We help you become pain free through education, knowledge, and strengthening the body through rehabilitation and movement.
            </p>
            <div className="flex space-x-4">
              <a href="https://www.facebook.com/share/19bD1ZcoJd/" className="text-white hover:text-primary-400 transition-colors" aria-label="Facebook" target="_blank" rel="noopener noreferrer">
                <Facebook size={20} />
              </a>
              <a href="https://www.instagram.com/kh.therapy/" className="text-white hover:text-primary-400 transition-colors" aria-label="Instagram" target="_blank" rel="noopener noreferrer">
                <FaInstagram size={20} />
              </a>
              <a href="https://twitter.com/galway_physio" className="text-white hover:text-primary-400 transition-colors" aria-label="Twitter" target="_blank" rel="noopener noreferrer">
                <Twitter size={20} />
              </a>
              <a href="https://www.linkedin.com/in/kelly-hodgins-547b05211/" className="text-white hover:text-primary-400 transition-colors" aria-label="LinkedIn" target="_blank" rel="noopener noreferrer">
                <FaLinkedinIn size={20} />
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
                <Link to="/services/wellness-assessment" className="text-neutral-300 hover:text-white transition-colors">Wellness Assessment</Link>
              </li>
            </ul>
          </div>
          
          {/* Contact Information */}
          <div>
            <h3 className="text-xl font-semibold mb-4">Contact Us</h3>
            <div className="space-y-3">
              <div className="flex items-start">
                <MapPin size={20} className="mr-3 mt-1 text-primary-400" />
                <p className="text-neutral-300">Neilstown Village Court, Neilstown Rd, Clondalkin, D22E8P2</p>
              </div>
              <div className="flex items-center">
                <Phone size={20} className="mr-3 text-primary-400" />
                <a href="tel:+353838009404" className="text-neutral-300 hover:text-white transition-colors">(083) 8009404</a>
              </div>
              <div className="flex items-center">
                <Mail size={20} className="mr-3 text-primary-400" />
                <a href="mailto:info@khtherapy.ie" className="text-neutral-300 hover:text-white transition-colors">info@khtherapy.ie</a>
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
        <div className="flex justify-between items-center text-sm text-neutral-400">
          <p>&copy; {new Date().getFullYear()} KH Therapy. All rights reserved.</p>
          <div className="text-center">
            Made by <a href="https://it-wala.com/consulting" className="hover:text-white transition-colors" target="_blank" rel="noopener noreferrer">ITWala (Kdadks Service Pvt. Ltd.)</a>
          </div>
          <div className="flex space-x-4">
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