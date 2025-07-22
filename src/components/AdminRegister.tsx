import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

const AdminRegister: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setMessage(error.message);
    } else {
      // Insert into admins table
      await supabase.from('admins').insert([{ email }]);
      setMessage('Registration successful! Please check your email to confirm.');
    }
  };

  return (
    <form onSubmit={handleRegister}>
      <h2>Admin Registration</h2>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        required
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        required
      />
      <button type="submit">Register</button>
      {message && <p>{message}</p>}
    </form>
  );
};

export default AdminRegister;
