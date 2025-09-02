import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const CookieConsent: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookieConsent');
    if (!consent) {
      setVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookieConsent', 'accepted');
    setVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem('cookieConsent', 'declined');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 bg-neutral-800 text-white p-4 flex flex-col md:flex-row justify-between items-center z-50">
      <p className="text-sm mb-2 md:mb-0">
        We use cookies to improve your experience. By clicking <span className="font-semibold">Accept</span>, you consent to our use of cookies under GDPR.{' '}
        <Link to="/privacy-policy" className="underline hover:text-primary-400">
          Learn more
        </Link>.
      </p>
      <div className="flex space-x-2">
        <button onClick={handleDecline} className="px-4 py-2 bg-gray-500 hover:bg-gray-600 rounded">
          Decline
        </button>
        <button onClick={handleAccept} className="px-4 py-2 bg-[#71db77] hover:bg-[#5fcf68] rounded">
          Accept
        </button>
      </div>
    </div>
  );
};

export default CookieConsent;
