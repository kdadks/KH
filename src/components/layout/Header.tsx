import React, { useState, useEffect } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Menu, X, Phone } from 'lucide-react';
import Logo from '../shared/Logo';

const Header: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const closeMenu = () => {
    setIsOpen(false);
  };

  const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 text-sm font-medium transition-colors ${
      isActive 
        ? 'text-primary-600 hover:text-primary-700' 
        : 'text-neutral-700 hover:text-primary-600'
    }`;

  return (
    <header 
      className={`fixed w-full z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-white shadow-md py-2' 
          : 'bg-white/90 backdrop-blur-sm py-4'
      }`}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <Link to="/" className="flex items-center space-x-2" onClick={closeMenu}>
            <Logo className="w-12 h-12" />
            <span className="text-primary-600 font-bold text-2xl">KH Therapy</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-4">
            <NavLink to="/" className={navLinkClasses} end>Home</NavLink>
            <NavLink to="/about" className={navLinkClasses}>About</NavLink>
            <NavLink to="/services" className={navLinkClasses}>Services</NavLink>
            <NavLink to="/testimonials" className={navLinkClasses}>Testimonials</NavLink>
            <NavLink to="/contact" className={navLinkClasses}>Contact</NavLink>
            <Link 
              to="/booking" 
              className="ml-4 px-4 py-2 rounded-md bg-primary-600 text-white hover:bg-primary-700 transition-colors text-sm font-medium"
            >
              Book Now
            </Link>
          </nav>

          {/* Emergency Contact */}
          <div className="hidden lg:flex items-center">
            <a 
              href="tel:+353123456789" 
              className="flex items-center px-4 py-2 bg-secondary-500 text-white rounded-md hover:bg-secondary-600 transition-colors"
            >
              <Phone size={16} className="mr-2" />
              <span className="font-medium">Emergency: (01) 234-5678</span>
            </a>
          </div>

          {/* Mobile Navigation Button */}
          <button 
            className="md:hidden text-neutral-800 focus:outline-none" 
            onClick={toggleMenu}
            aria-label="Toggle menu"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      <div 
        className={`md:hidden absolute top-full left-0 w-full bg-white shadow-md transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="px-4 pt-2 pb-4 space-y-1">
          <NavLink 
            to="/" 
            className={({ isActive }) => 
              `block px-3 py-2 rounded-md ${isActive ? 'bg-primary-50 text-primary-600' : 'text-neutral-700 hover:bg-gray-50'}`
            } 
            onClick={closeMenu}
            end
          >
            Home
          </NavLink>
          <NavLink 
            to="/about" 
            className={({ isActive }) => 
              `block px-3 py-2 rounded-md ${isActive ? 'bg-primary-50 text-primary-600' : 'text-neutral-700 hover:bg-gray-50'}`
            } 
            onClick={closeMenu}
          >
            About
          </NavLink>
          <NavLink 
            to="/services" 
            className={({ isActive }) => 
              `block px-3 py-2 rounded-md ${isActive ? 'bg-primary-50 text-primary-600' : 'text-neutral-700 hover:bg-gray-50'}`
            } 
            onClick={closeMenu}
          >
            Services
          </NavLink>
          <NavLink 
            to="/testimonials" 
            className={({ isActive }) => 
              `block px-3 py-2 rounded-md ${isActive ? 'bg-primary-50 text-primary-600' : 'text-neutral-700 hover:bg-gray-50'}`
            } 
            onClick={closeMenu}
          >
            Testimonials
          </NavLink>
          <NavLink 
            to="/contact" 
            className={({ isActive }) => 
              `block px-3 py-2 rounded-md ${isActive ? 'bg-primary-50 text-primary-600' : 'text-neutral-700 hover:bg-gray-50'}`
            } 
            onClick={closeMenu}
          >
            Contact
          </NavLink>
          <Link 
            to="/booking" 
            className="block w-full mt-4 px-4 py-2 text-center rounded-md bg-primary-600 text-white hover:bg-primary-700 transition-colors font-medium"
            onClick={closeMenu}
          >
            Book Now
          </Link>
          <a 
            href="tel:+353123456789" 
            className="flex items-center justify-center w-full mt-2 px-4 py-2 bg-secondary-500 text-white rounded-md hover:bg-secondary-600 transition-colors"
            onClick={closeMenu}
          >
            <Phone size={16} className="mr-2" />
            <span className="font-medium">Emergency: (01) 234-5678</span>
          </a>
        </div>
      </div>
    </header>
  );
};

export default Header;