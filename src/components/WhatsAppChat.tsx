import React from 'react';

const WhatsAppChat: React.FC = () => (
  <a
    href="https://wa.me/0838009404" // Replace with your WhatsApp number
    target="_blank"
    rel="noopener noreferrer"
    className="fixed bottom-6 right-6 z-50"
    aria-label="Chat on WhatsApp"
  >
    <img
      src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg"
      alt="WhatsApp"
      className="w-14 h-14 rounded-full shadow-lg hover:scale-110 transition"
    />
  </a>
);

export default WhatsAppChat;