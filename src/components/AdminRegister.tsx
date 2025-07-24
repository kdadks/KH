import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useToast } from './shared/Toast';

const AdminRegister: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    const { error } = await supabase.auth.signUp({ email, password });
    
    if (error) {
      showError('Registration Failed', error.message);
    } else {
      // Insert into admins table
      await supabase.from('admins').insert([{ email }]);
      showSuccess('Registration Successful!', 'Please check your email to confirm your account.');
      setEmail('');
      setPassword('');
    }
    
    setIsLoading(false);
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
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Registering...' : 'Register'}
      </button>
    </form>
  );
};

export default AdminRegister;
