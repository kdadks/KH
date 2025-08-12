import React, { useState } from 'react';
import { useToast } from './shared/toastContext';
import { createBookingWithCustomer } from '../utils/customerBookingUtils';

const BookingForm: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [packageName, setPackageName] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('pending');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const customerData = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: customerEmail,
      phone: customerPhone
    };

    const bookingData = {
      package_name: packageName,
      notes: notes,
      status: status
    };
    
    const { error } = await createBookingWithCustomer(customerData, bookingData);
    
    if (error) {
      showError('Booking Failed', error);
    } else {
      showSuccess('Booking Submitted!', 'We will contact you soon to confirm your appointment.');
      setFirstName('');
      setLastName('');
      setCustomerEmail('');
      setCustomerPhone('');
      setPackageName('');
      setNotes('');
      setStatus('pending');
    }
    
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Book a Service</h2>
      <input
        type="text"
        placeholder="First Name"
        value={firstName}
        onChange={e => setFirstName(e.target.value)}
        required
      />
      <input
        type="text"
        placeholder="Last Name"
        value={lastName}
        onChange={e => setLastName(e.target.value)}
        required
      />
      <input
        type="email"
        placeholder="Email"
        value={customerEmail}
        onChange={e => setCustomerEmail(e.target.value)}
        required
      />
      <input
        type="tel"
        placeholder="Phone Number"
        value={customerPhone}
        onChange={e => setCustomerPhone(e.target.value)}
        required
      />
      <input
        type="text"
        placeholder="Package Name"
        value={packageName}
        onChange={e => setPackageName(e.target.value)}
        required
      />
      <textarea
        placeholder="Notes (optional)"
        value={notes}
        onChange={e => setNotes(e.target.value)}
      />
      <select value={status} onChange={e => setStatus(e.target.value)}>
        <option value="pending">Pending</option>
        <option value="confirmed">Confirmed</option>
        <option value="cancelled">Cancelled</option>
      </select>
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Submitting...' : 'Submit Booking'}
      </button>
    </form>
  );
};

export default BookingForm;
