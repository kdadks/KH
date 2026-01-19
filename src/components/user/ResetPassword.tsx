import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useUserAuth } from '../../contexts/UserAuthContext';
import { PasswordResetData } from '../../types/userManagement';

const ResetPassword: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const urlToken = searchParams.get('token');

  // SECURITY FIX 1.8: Use sessionStorage for token instead of URL
  // This prevents token leakage in browser history, server logs, referer headers
  const [token, setToken] = useState<string | null>(() => {
    // Try to get token from sessionStorage first (secure storage)
    return sessionStorage.getItem('reset_token');
  });

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isValidating, setIsValidating] = useState(true);
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [customerEmail, setCustomerEmail] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const { validateResetToken, resetPassword } = useUserAuth();

  // SECURITY FIX 1.8: Handle token from URL and move to sessionStorage
  useEffect(() => {
    if (urlToken && !token) {
      // Token is in URL (from email link), move it to sessionStorage
      sessionStorage.setItem('reset_token', urlToken);
      setToken(urlToken);
      
      // Remove token from URL to prevent history/logging exposure
      // Use replace history entry so back button doesn't reveal token
      setSearchParams({}, { replace: true });
    }
  }, [urlToken, token, setSearchParams]);

  // Validate token on component mount
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setError('Invalid reset link - no token provided');
        setIsValidating(false);
        return;
      }

      try {
        console.log('Validating reset token');
        const result = await validateResetToken(token);
        console.log('Token validation result:', result.success ? 'Valid' : 'Invalid');
        
        if (result.success && result.customerEmail) {
          setIsTokenValid(true);
          setCustomerEmail(result.customerEmail);
        } else {
          setError(result.error || 'Invalid or expired reset link');
          // Clear invalid token from sessionStorage
          sessionStorage.removeItem('reset_token');
        }
      } catch (err) {
        console.error('Error validating token:', err);
        setError('Failed to validate reset link');
        sessionStorage.removeItem('reset_token');
      } finally {
        setIsValidating(false);
      }
    };

    validateToken();
  }, [token, validateResetToken]);

  // SECURITY FIX 1.8: Cleanup token on component unmount
  useEffect(() => {
    return () => {
      // Clear token if user navigates away without completing reset
      sessionStorage.removeItem('reset_token');
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const resetData: PasswordResetData = {
        token: token!,
        newPassword: password,
        confirmPassword: confirmPassword
      };

      console.log('Attempting password reset...');
      const result = await resetPassword(resetData);
      console.log('Password reset result:', result);
      
      if (result.success) {
        console.log('Password reset successful, redirecting...');
        setIsSuccess(true);
        
        // SECURITY FIX 1.8: Clear token from sessionStorage after successful reset
        sessionStorage.removeItem('reset_token');
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/my-account', { 
            replace: true, 
            state: { fromPasswordReset: true } 
          });
        }, 3000);
      } else if (result.error) {
        setError(result.error);
      }
    } catch (err) {
      console.error('Exception during password reset:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state while validating token
  if (isValidating) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-8">
          <div className="bg-white rounded-lg shadow-xl p-8 border border-gray-200">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <p className="text-neutral-600">Validating reset link...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Invalid token state
  if (!isTokenValid) {
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
            {/* Error Icon */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-neutral-800 mb-2">Invalid Reset Link</h2>
              <p className="text-neutral-600 mb-4">{error}</p>
            </div>

            {/* Actions */}
            <div className="space-y-4">
              <button
                onClick={() => navigate('/my-account')}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
              >
                Go to Sign In
              </button>
              
              <p className="text-sm text-neutral-600 text-center">
                Need a new reset link? <a href="/my-account" className="text-primary-600 hover:text-primary-500">Request password reset</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Success state
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
              <h2 className="text-2xl font-bold text-neutral-800 mb-2">Password Reset Successful</h2>
              <p className="text-neutral-600 mb-4">
                Your password has been successfully reset. You can now sign in with your new password.
              </p>
            </div>

            {/* Auto redirect message */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-700 text-center">
                Redirecting to sign in page in a few seconds...
              </p>
            </div>

            {/* Manual redirect button */}
            <button
              onClick={() => navigate('/my-account', { 
                replace: true,
                state: { fromPasswordReset: true }
              })}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
            >
              Go to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Reset password form
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
            <h2 className="text-3xl font-bold text-neutral-800 mb-2">Set New Password</h2>
            <p className="text-neutral-600">
              Resetting password for <strong>{customerEmail}</strong>
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-600 text-sm">
                {error}
              </div>
            )}

            {/* New Password Field */}
            <div>
              <label htmlFor="new-password" className="block text-sm font-medium text-neutral-700 mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  id="new-password"
                  name="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors pr-12"
                  placeholder="Enter your new password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600 transition-colors"
                >
                  {showPassword ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L8.07 8.07m1.808 1.808l.5-.5a3 3 0 014.243 4.243M12 2c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21l-3.878-3.878m0 0a9.971 9.971 0 01-3.122.877z" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.543 7-1.275 4.057-5.065 7-9.543 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              <p className="text-xs text-neutral-500 mt-1">Must be at least 8 characters long</p>
            </div>

            {/* Confirm Password Field */}
            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-neutral-700 mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  id="confirm-password"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors pr-12"
                  placeholder="Confirm your new password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600 transition-colors"
                >
                  {showConfirmPassword ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L8.07 8.07m1.808 1.808l.5-.5a3 3 0 014.243 4.243M12 2c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21l-3.878-3.878m0 0a9.971 9.971 0 01-3.122.877z" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.543 7-1.275 4.057-5.065 7-9.543 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
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
                  Resetting Password...
                </div>
              ) : (
                'Reset Password'
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-sm text-neutral-500">
            Remember your password? <a href="/my-account" className="text-primary-600 hover:text-primary-500 font-medium">Sign in</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
