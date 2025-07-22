import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

const BookingForm: React.FC = () => {
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [packageName, setPackageName] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('pending');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    const bookingData = {
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      package_name: packageName,
      notes: notes,
      status: status
    };
    const { data, error } = await supabase.from('bookings').insert([bookingData]);
    console.log('Supabase insert result:', { data, error });
    if (error) {
      setMessage(error.message);
    } else {
      setMessage('Booking submitted successfully!');
      setCustomerName('');
      setCustomerEmail('');
      setCustomerPhone('');
      setPackageName('');
      setNotes('');
      setStatus('pending');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Book a Service</h2>
      <input
        type="text"
        placeholder="Name"
        value={customerName}
        onChange={e => setCustomerName(e.target.value)}
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
      <button type="submit">Submit Booking</button>
      {message && <p>{message}</p>}
    </form>
  );
};

export default BookingForm;
