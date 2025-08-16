import React, { useState } from 'react';
import { Lock, Eye, EyeOff, Check, X, AlertCircle } from 'lucide-react';
import { useUserAuth } from '../../contexts/UserAuthContext';
import { useToast } from '../shared/toastContext';

interface FirstLoginPasswordChangeProps {
  onPasswordChanged: () => void;
}

const FirstLoginPasswordChange: React.FC<FirstLoginPasswordChangeProps> = ({
  onPasswordChanged
}) => {
  const { changePassword } = useUserAuth();
  const { showSuccess, showError } = useToast();
  
  const [passwords, setPasswords] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Password validation
  const validatePassword = (password: string) => {
    const requirements = {
      minLength: password.length >= 8,
      hasUpper: /[A-Z]/.test(password),
      hasLower: /[a-z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };
    
    const isValid = Object.values(requirements).every(req => req);
    return { requirements, isValid };
  };

  const passwordValidation = validatePassword(passwords.newPassword);
  const passwordsMatch = passwords.newPassword === passwords.confirmPassword && passwords.confirmPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!passwordValidation.isValid) {
      showError('Invalid Password', 'Please ensure your password meets all requirements');
      return;
    }
    
    if (!passwordsMatch) {
      showError('Passwords Don\'t Match', 'Please ensure both passwords are identical');
      return;
    }

    setLoading(true);
    try {
      console.log('Starting password change...');
      const result = await changePassword({
        newPassword: passwords.newPassword,
        confirmPassword: passwords.confirmPassword
      });

      console.log('Password change result:', result);

      if (result.success) {
        showSuccess('Password Updated', 'Your password has been successfully changed');
        console.log('Password change successful, calling onPasswordChanged...');
        onPasswordChanged();
      } else {
        console.error('Password change failed:', result.error);
        showError('Password Change Failed', result.error || 'Failed to update password');
      }
    } catch (err) {
      console.error('Exception during password change:', err);
      showError('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-orange-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Password Change Required</h2>
          <p className="text-gray-600">
            For security reasons, please set a new password for your account.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* New Password */}
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
              New Password
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                id="newPassword"
                value={passwords.newPassword}
                onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                className="w-full px-4 py-3 pl-12 pr-12 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter new password"
                required
              />
              <Lock className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-4 top-3.5 h-5 w-5 text-gray-400 hover:text-gray-600"
              >
                {showNewPassword ? <EyeOff /> : <Eye />}
              </button>
            </div>
          </div>

          {/* Password Requirements */}
          {passwords.newPassword && (
            <div className="text-sm space-y-1">
              <p className="font-medium text-gray-700">Password must contain:</p>
              <div className="space-y-1">
                <div className={`flex items-center space-x-2 ${passwordValidation.requirements.minLength ? 'text-green-600' : 'text-red-500'}`}>
                  {passwordValidation.requirements.minLength ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                  <span>At least 8 characters</span>
                </div>
                <div className={`flex items-center space-x-2 ${passwordValidation.requirements.hasUpper ? 'text-green-600' : 'text-red-500'}`}>
                  {passwordValidation.requirements.hasUpper ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                  <span>One uppercase letter</span>
                </div>
                <div className={`flex items-center space-x-2 ${passwordValidation.requirements.hasLower ? 'text-green-600' : 'text-red-500'}`}>
                  {passwordValidation.requirements.hasLower ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                  <span>One lowercase letter</span>
                </div>
                <div className={`flex items-center space-x-2 ${passwordValidation.requirements.hasNumber ? 'text-green-600' : 'text-red-500'}`}>
                  {passwordValidation.requirements.hasNumber ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                  <span>One number</span>
                </div>
                <div className={`flex items-center space-x-2 ${passwordValidation.requirements.hasSpecial ? 'text-green-600' : 'text-red-500'}`}>
                  {passwordValidation.requirements.hasSpecial ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                  <span>One special character</span>
                </div>
              </div>
            </div>
          )}

          {/* Confirm Password */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                value={passwords.confirmPassword}
                onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                className="w-full px-4 py-3 pl-12 pr-12 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Confirm new password"
                required
              />
              <Lock className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-3.5 h-5 w-5 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <EyeOff /> : <Eye />}
              </button>
            </div>
            {passwords.confirmPassword && (
              <div className={`mt-1 text-sm flex items-center space-x-2 ${passwordsMatch ? 'text-green-600' : 'text-red-500'}`}>
                {passwordsMatch ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                <span>{passwordsMatch ? 'Passwords match' : 'Passwords do not match'}</span>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !passwordValidation.isValid || !passwordsMatch}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              'Update Password'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default FirstLoginPasswordChange;
