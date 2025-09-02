import React, { useState, useEffect } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Menu, X, User } from 'lucide-react';
import Logo from '../shared/Logo';
import { useUserAuth } from '../../contexts/UserAuthContext';

const Header: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { authUser, user } = useUserAuth();
  
  // Check if user is admin - Supabase Auth user without customer profile is admin
  const isAdmin = !!authUser && !user;

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
      className={`fixed w-full z-50 transition-all duration-300 overflow-visible ${
        isScrolled 
          ? 'bg-white shadow-md py-2' 
          : 'bg-white/90 backdrop-blur-sm py-4'
      }`}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative overflow-visible">
        <div className="flex justify-between items-center">
          <Link to="/" className="flex items-center space-x-2" onClick={closeMenu}>
            <Logo className="w-12 h-12" />
            <img 
              src="/KHtherapy.png" 
              alt="KH Therapy" 
              className="h-8 w-auto"
            />
          </Link>

          {/* Desktop Navigation - Hide all navigation for admin users */}
          {!isAdmin && (
            <nav className="hidden md:flex items-center justify-center flex-1 space-x-4">
              <NavLink to="/" className={navLinkClasses} end>Home</NavLink>
              <NavLink to="/about" className={navLinkClasses}>About</NavLink>
              <NavLink to="/services" className={navLinkClasses}>Services</NavLink>
              <NavLink to="/testimonials" className={navLinkClasses}>Testimonials</NavLink>
              <NavLink to="/contact" className={navLinkClasses}>Contact</NavLink>
              <NavLink to="/admin" className={navLinkClasses}>Admin</NavLink>
            </nav>
          )}

          {/* Book Now Button and My Account - Hide for admin users */}
          {!isAdmin && (
            <div className="hidden md:flex items-center space-x-3">
              <Link 
                to="/my-account" 
                className="flex items-center px-3 py-2 rounded-md border border-primary-600 text-primary-600 hover:bg-primary-50 transition-colors text-sm font-medium"
              >
                <User className="w-4 h-4 mr-2" />
                My Account
              </Link>
              <Link 
                to="/booking" 
                className="px-4 py-2 rounded-md bg-[#71db77] text-white hover:bg-[#5fcf68] transition-colors text-sm font-medium"
              >
                Book Now
              </Link>
            </div>
          )}

          {/* Emergency Contact */}
          {/* 
          <div className="hidden lg:flex items-center">
            <a 
              href="tel:+353123456789" 
              className="flex items-center px-4 py-2 bg-secondary-500 text-white rounded-md hover:bg-secondary-600 transition-colors"
            >
              <Phone size={16} className="mr-2" />
              <span className="font-medium">Emergency: (01) 234-5678</span>
            </a>
          </div>
          */}

          {/* Mobile Navigation Button - Hide for admin users */}
          {!isAdmin && (
            <button 
              className="md:hidden text-neutral-800 focus:outline-none" 
              onClick={toggleMenu}
              aria-label="Toggle menu"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          )}
        </div>
      </div>

      {/* Mobile Navigation Menu - Hide for admin users */}
      {isOpen && !isAdmin && (
        <div className="md:hidden absolute top-full left-0 w-full bg-white shadow-lg z-50 border-t border-gray-200 animate-fade-in">
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
          <NavLink 
            to="/admin" 
            className={({ isActive }) => 
              `block px-3 py-2 rounded-md ${isActive ? 'bg-primary-50 text-primary-600' : 'text-neutral-700 hover:bg-gray-50'}`
            } 
            onClick={closeMenu}
          >
            Admin
          </NavLink>
          {/* Mobile Book Now Button and My Account */}
              <Link 
                to="/my-account" 
                className="flex items-center px-3 py-2 mt-4 rounded-md border border-primary-600 text-primary-600 hover:bg-primary-50 transition-colors font-medium"
                onClick={closeMenu}
              >
                <User className="w-4 h-4 mr-2" />
                My Account
              </Link>
              <Link 
                to="/booking" 
                className="block w-full mt-2 px-4 py-2 text-center rounded-md bg-[#71db77] text-white hover:bg-[#5fcf68] transition-colors font-medium"
                onClick={closeMenu}
              >
                Book Now
              </Link>
          {/* 
          <a 
            href="tel:+353123456789" 
            className="flex items-center justify-center w-full mt-2 px-4 py-2 bg-secondary-500 text-white rounded-md hover:bg-secondary-600 transition-colors"
            onClick={closeMenu}
          >
            <Phone size={16} className="mr-2" />
            <span className="font-medium">Emergency: (01) 234-5678</span>
          </a>
          */}
        </div>
      </div>
      )}
    </header>
  );
};

export default Header;