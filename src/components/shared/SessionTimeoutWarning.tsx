import React from 'react';
import { AlertTriangle, Clock } from 'lucide-react';

interface SessionTimeoutWarningProps {
  remainingTime: number;
  onExtendSession: () => void;
  onLogout: () => void;
}

/**
 * Modal warning for session timeout
 * Shows countdown and allows user to extend session or logout
 */
export const SessionTimeoutWarning: React.FC<SessionTimeoutWarningProps> = ({
  remainingTime,
  onExtendSession,
  onLogout,
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center space-x-3 mb-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-yellow-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">
              Session Expiring Soon
            </h3>
            <p className="text-sm text-gray-500">
              Your session is about to expire due to inactivity
            </p>
          </div>
        </div>

        {/* Countdown */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-center space-x-2">
            <Clock className="w-5 h-5 text-yellow-600" />
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">Time remaining:</p>
              <p className="text-3xl font-bold text-yellow-600 tabular-nums">
                {remainingTime}
                <span className="text-lg ml-1">seconds</span>
              </p>
            </div>
          </div>
        </div>

        {/* Message */}
        <div className="mb-6">
          <p className="text-sm text-gray-600 text-center">
            You will be automatically logged out for security reasons.
            Click "Stay Logged In" to continue your session.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onExtendSession}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Stay Logged In
          </button>
          <button
            onClick={onLogout}
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-3 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            Logout Now
          </button>
        </div>

        {/* Security Note */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            🔒 This is a security feature to protect your account from unauthorized access.
          </p>
        </div>
      </div>
    </div>
  );
};
