import React from 'react';

const ContactPage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">Contact Us</h1>
      <p className="mb-6">We'd love to hear from you! Please fill out the form below or reach us at (01) 234-5678.</p>
      <form className="max-w-lg space-y-4">
        <div>
          <label className="block mb-1 font-medium" htmlFor="name">Name</label>
          <input className="w-full border rounded px-3 py-2" id="name" type="text" required />
        </div>
        <div>
          <label className="block mb-1 font-medium" htmlFor="email">Email</label>
          <input className="w-full border rounded px-3 py-2" id="email" type="email" required />
        </div>
        <div>
          <label className="block mb-1 font-medium" htmlFor="message">Message</label>
          <textarea className="w-full border rounded px-3 py-2" id="message" rows={5} required />
        </div>
        <button
          type="submit"
          className="bg-primary-600 text-white px-6 py-2 rounded hover:bg-primary-700 transition-colors"
        >
          Send Message
        </button>
      </form>
    </div>
  );
};

export default ContactPage;