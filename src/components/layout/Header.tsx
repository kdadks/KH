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
    `relative px-4 py-2.5 text-sm font-semibold transition-all duration-300 rounded-full ${
      isActive
        ? 'text-white'
        : 'text-gray-700 hover:text-primary-600'
    }`;

  return (
    <header
      className="fixed w-full z-50 transition-all duration-500 overflow-visible py-4"
    >
      {/* Glossy background blur */}
      <div className="absolute inset-0 bg-gradient-to-r from-white/70 via-white/80 to-white/70 backdrop-blur-xl"></div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="flex justify-between items-center">
          {/* Logo Section */}
          <Link
            to="/"
            className="flex items-center space-x-2 z-10 transition-transform duration-300 hover:scale-105"
            onClick={closeMenu}
          >
            <Logo className="w-12 h-12 drop-shadow-lg" />
            <img
              src="/KHtherapy.png"
              alt="KH Therapy"
              className="h-8 w-auto drop-shadow-md"
            />
          </Link>

          {/* Desktop Navigation - Curved Center Bar with All Items */}
          {!isAdmin && (
            <nav className="hidden md:flex items-center justify-center absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="
                flex items-center gap-1 px-3 py-2
                bg-gradient-to-br from-white/90 via-white/95 to-white/90
                backdrop-blur-2xl
                rounded-full
                shadow-[0_8px_32px_rgba(0,0,0,0.12)]
                border border-white/60
                transition-all duration-500
              ">
                <NavLink
                  to="/"
                  className={({ isActive }) =>
                    `${navLinkClasses({ isActive })} ${isActive ? 'bg-gradient-to-r from-primary-500 to-primary-600 shadow-lg shadow-primary-500/40' : ''}`
                  }
                  end
                >
                  Home
                </NavLink>
                <NavLink
                  to="/about"
                  className={({ isActive }) =>
                    `${navLinkClasses({ isActive })} ${isActive ? 'bg-gradient-to-r from-primary-500 to-primary-600 shadow-lg shadow-primary-500/40' : ''}`
                  }
                >
                  About
                </NavLink>
                <NavLink
                  to="/services"
                  className={({ isActive }) =>
                    `${navLinkClasses({ isActive })} ${isActive ? 'bg-gradient-to-r from-primary-500 to-primary-600 shadow-lg shadow-primary-500/40' : ''}`
                  }
                >
                  Services
                </NavLink>
                <NavLink
                  to="/testimonials"
                  className={({ isActive }) =>
                    `${navLinkClasses({ isActive })} ${isActive ? 'bg-gradient-to-r from-primary-500 to-primary-600 shadow-lg shadow-primary-500/40' : ''}`
                  }
                >
                  Testimonials
                </NavLink>
                <NavLink
                  to="/contact"
                  className={({ isActive }) =>
                    `${navLinkClasses({ isActive })} ${isActive ? 'bg-gradient-to-r from-primary-500 to-primary-600 shadow-lg shadow-primary-500/40' : ''}`
                  }
                >
                  Contact
                </NavLink>

                {/* Divider */}
                <div className="w-px h-6 bg-gray-300/50 mx-1"></div>

                {/* My Account */}
                <Link
                  to="/my-account"
                  className="flex items-center px-4 py-2.5 text-sm font-semibold text-primary-600 hover:text-primary-700 transition-all duration-300 rounded-full hover:bg-primary-50"
                >
                  <User className="w-4 h-4 mr-1.5" />
                  My Account
                </Link>

                {/* Book Now */}
                <Link
                  to="/booking"
                  className="
                    px-5 py-2.5 rounded-full
                    bg-gradient-to-r from-[#71db77] to-[#5fcf68]
                    text-white font-semibold text-sm
                    shadow-[0_4px_20px_rgba(113,219,119,0.4)]
                    hover:shadow-[0_6px_28px_rgba(113,219,119,0.5)]
                    transition-all duration-300
                    hover:scale-105
                    hover:from-[#5fcf68] hover:to-[#4dbd58]
                  "
                >
                  Book Now
                </Link>
              </div>
            </nav>
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

      {/* Mobile Navigation Menu - Glossy Design */}
      {isOpen && !isAdmin && (
        <div className="md:hidden absolute top-full left-0 w-full z-50 animate-fade-in">
          <div className="mx-4 mt-2 mb-4 p-4 rounded-3xl bg-white/90 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.15)] border border-white/60">
            <div className="space-y-2">
              <NavLink
                to="/"
                className={({ isActive }) =>
                  `block px-4 py-3 rounded-2xl font-semibold transition-all duration-300 ${
                    isActive
                      ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg'
                      : 'text-gray-700 hover:bg-primary-50 hover:text-primary-600'
                  }`
                }
                onClick={closeMenu}
                end
              >
                Home
              </NavLink>
              <NavLink
                to="/about"
                className={({ isActive }) =>
                  `block px-4 py-3 rounded-2xl font-semibold transition-all duration-300 ${
                    isActive
                      ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg'
                      : 'text-gray-700 hover:bg-primary-50 hover:text-primary-600'
                  }`
                }
                onClick={closeMenu}
              >
                About
              </NavLink>
              <NavLink
                to="/services"
                className={({ isActive }) =>
                  `block px-4 py-3 rounded-2xl font-semibold transition-all duration-300 ${
                    isActive
                      ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg'
                      : 'text-gray-700 hover:bg-primary-50 hover:text-primary-600'
                  }`
                }
                onClick={closeMenu}
              >
                Services
              </NavLink>
              <NavLink
                to="/testimonials"
                className={({ isActive }) =>
                  `block px-4 py-3 rounded-2xl font-semibold transition-all duration-300 ${
                    isActive
                      ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg'
                      : 'text-gray-700 hover:bg-primary-50 hover:text-primary-600'
                  }`
                }
                onClick={closeMenu}
              >
                Testimonials
              </NavLink>
              <NavLink
                to="/contact"
                className={({ isActive }) =>
                  `block px-4 py-3 rounded-2xl font-semibold transition-all duration-300 ${
                    isActive
                      ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg'
                      : 'text-gray-700 hover:bg-primary-50 hover:text-primary-600'
                  }`
                }
                onClick={closeMenu}
              >
                Contact
              </NavLink>

              {/* Mobile Book Now Button and My Account */}
              <div className="pt-4 space-y-2 border-t border-gray-200/50 mt-4">
                <Link
                  to="/my-account"
                  className="
                    flex items-center justify-center px-4 py-3 rounded-2xl
                    bg-white/80 backdrop-blur-md
                    border border-primary-500/30
                    text-primary-600 font-semibold
                    shadow-md hover:shadow-lg
                    transition-all duration-300
                  "
                  onClick={closeMenu}
                >
                  <User className="w-4 h-4 mr-2" />
                  My Account
                </Link>
                <Link
                  to="/booking"
                  className="
                    block w-full px-4 py-3 text-center rounded-2xl
                    bg-gradient-to-r from-[#71db77] to-[#5fcf68]
                    text-white font-semibold
                    shadow-[0_4px_20px_rgba(113,219,119,0.4)]
                    hover:shadow-[0_6px_28px_rgba(113,219,119,0.5)]
                    transition-all duration-300
                  "
                  onClick={closeMenu}
                >
                  Book Now
                </Link>
              </div>
            </div>
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