import React, { useState } from 'react';
import { useUserAuth } from '../../contexts/UserAuthContext';

interface ForgotPasswordProps {
  onBack: () => void;
}

const ForgotPassword: React.FC<ForgotPasswordProps> = ({ onBack }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const { requestPasswordReset } = useUserAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await requestPasswordReset(email);
      if (result.success) {
        setIsSuccess(true);
      } else if (result.error) {
        setError(result.error);
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-8">
          {/* Logo Section */}
          <div className="text-center">
            <div className="flex justify-center items-center mb-4">
              <img 
                src="/KHtherapy.png" 
                alt="KH Therapy" 
                className="h-16 w-auto"
              />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-xl p-8 border border-gray-200">
            {/* Success Icon */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-neutral-800 mb-2">Check Your Email</h2>
              <p className="text-neutral-600">
                We've sent a password reset link to <strong>{email}</strong>
              </p>
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-medium text-blue-800 mb-2">What's next?</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Check your email inbox for the reset link</li>
                <li>• Click the link to reset your password</li>
                <li>• The link will expire in 1 hour for security</li>
                <li>• Check your spam folder if you don't see the email</li>
              </ul>
            </div>

            {/* Actions */}
            <div className="space-y-4">
              <button
                onClick={onBack}
                className="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-neutral-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
              >
                Back to Sign In
              </button>
              
              <button
                onClick={() => {
                  setIsSuccess(false);
                  setEmail('');
                }}
                className="w-full text-sm text-primary-600 hover:text-primary-500 transition-colors text-center"
              >
                Send to a different email address
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center">
            <p className="text-sm text-neutral-500">
              Having trouble? <a href="/contact" className="text-primary-600 hover:text-primary-500">Contact support</a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        {/* Logo Section */}
        <div className="text-center">
          <div className="flex justify-center items-center mb-4">
            <img 
              src="/KHtherapy.png" 
              alt="KH Therapy" 
              className="h-16 w-auto"
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-xl p-8 border border-gray-200">
          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-neutral-800 mb-2">Reset Password</h2>
            <p className="text-neutral-600">
              Enter your email address and we'll send you a link to reset your password
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-600 text-sm">
                {error}
              </div>
            )}

            {/* Email Field */}
            <div>
              <label htmlFor="reset-email" className="block text-sm font-medium text-neutral-700 mb-2">
                Email Address
              </label>
              <input
                id="reset-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-md text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                placeholder="Enter your email address"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sending Reset Link...
                </div>
              ) : (
                'Send Reset Link'
              )}
            </button>

            {/* Back to Login */}
            <div className="text-center">
              <button
                type="button"
                onClick={onBack}
                className="text-sm text-primary-600 hover:text-primary-500 transition-colors font-medium"
              >
                Back to Sign In
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-sm text-neutral-500">
            Remember your password? <button onClick={onBack} className="text-primary-600 hover:text-primary-500 font-medium">Sign in</button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
