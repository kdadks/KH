import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUserAuth } from '../../contexts/UserAuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
  redirectTo?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  adminOnly = false,
  redirectTo = '/'
}) => {
  const { user, isAdmin, loading } = useUserAuth();

  // Show loading spinner while authentication state is being determined
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
          <span className="text-gray-600">Loading...</span>
        </div>
      </div>
    );
  }

  // Check if user is authenticated
  if (!user) {
    // Redirect unauthenticated users to home page
    return <Navigate to="/" replace />;
  }

  // Check if admin access is required
  if (adminOnly && !isAdmin) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
