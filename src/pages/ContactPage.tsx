import React from 'react';
import Container from '../components/shared/Container';
import SectionHeading from '../components/shared/SectionHeading';
import Button from '../components/shared/Button';
import SEOHead from '../components/utils/SEOHead';

const ContactPage: React.FC = () => {
  return (
    <>
      <SEOHead
        title="Contact Us - KH Therapy"
        description="Get in touch with KH Therapy for professional physiotherapy and rehabilitation services."
        canonicalUrl="/contact"
      />
      <Container>
        <SectionHeading
          title="Contact Us"
          subtitle="We'd love to hear from you! Please fill out the form or reach us at (01) 234-5678."
        />
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Contact Form */}
          <div className="bg-white p-8 rounded-lg shadow-lg">
            <form className="space-y-4">
              <div>
                <label className="block mb-1 font-medium" htmlFor="name">Name</label>
                <input className="w-full border rounded px-3 py-2" id="name" type="text" required />
              </div>
              <div>
                <label className="block mb-1 font-medium" htmlFor="email">Email</label>
                <input className="w-full border rounded px-3 py-2" id="email" type="email" required />
              </div>
              <div>
                <label className="block mb-1 font-medium" htmlFor="service">Service Type</label>
                <select className="w-full border rounded px-3 py-2" id="service" required>
                  <option value="">Select a service</option>
                  <option value="Basic Wellness">Basic Wellness</option>
                  <option value="Premium Care">Premium Care</option>
                  <option value="Ultimate Health">Ultimate Health</option>
                  <option value="Sports Massage / Deep Tissue Massage">Sports Massage / Deep Tissue Massage</option>
                  <option value="Pitch Side Cover for Sporting Events">Pitch Side Cover for Sporting Events</option>
                  <option value="Pre & Post Surgery Rehab">Pre & Post Surgery Rehab</option>
                  <option value="Return to Play/Sport & Strapping & Taping">Return to Play/Sport & Strapping & Taping</option>
                  <option value="Corporate Wellness / Workplace Events">Corporate Wellness / Workplace Events</option>
                </select>
              </div>
              <div>
                <label className="block mb-1 font-medium" htmlFor="message">Message</label>
                <textarea className="w-full border rounded px-3 py-2" id="message" rows={5} required />
              </div>
              <Button type="submit" variant="primary" fullWidth>
                Send Message
              </Button>
            </form>
          </div>
          {/* Contact Details */}
          <div className="bg-white p-8 rounded-lg shadow-lg space-y-4">
            <h3 className="text-xl font-semibold text-gray-900">Get in Touch</h3>
            <p className="text-gray-700">Alternatively, you can reach us at:</p>
            <p><strong>Phone:</strong> (01) 234-5678</p>
            <p><strong>Email:</strong> info@khtherapy.ie</p>
            <p><strong>Address:</strong> Ace Enterprise Centre, Bawnogue Road, Clondalkin, Dublin 22</p>
          </div>
        </div>
      </Container>
    </>
  );
};

export default ContactPage;