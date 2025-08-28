import React from 'react';
import { MessageCircle } from 'lucide-react';

const WhatsAppChat: React.FC = () => (
  <a
    href="https://wa.me/+353838009404" // Replace with your WhatsApp number
    target="_blank"
    rel="noopener noreferrer"
    className="fixed bottom-6 right-6 z-50 bg-green-500 hover:bg-green-600 text-white p-4 rounded-full shadow-lg transition-all duration-300 transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-50"
    aria-label="Chat on WhatsApp"
    title="Chat on WhatsApp"
  >
    <MessageCircle className="w-6 h-6" />
  </a>
);

export default WhatsAppChat;