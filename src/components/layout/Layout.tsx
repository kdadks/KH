import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import ScrollToTop from '../utils/ScrollToTop';
import CookieConsent from '../shared/CookieConsent';
import WhatsAppChat from '../../components/WhatsAppChat';

const Layout: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <ScrollToTop />
      <Header />
      <main className="flex-grow pt-20">
        <Outlet />
      </main>
      <Footer />
      <CookieConsent />
      <WhatsAppChat />
    </div>
  );
};

export default Layout;