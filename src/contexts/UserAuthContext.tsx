import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { User, Session } from '@supabase/supabase-js';
import { 
  UserCustomer, 
  UserAuthContext, 
  UserRegistrationData,
  UserProfileUpdateData,
  UserPasswordChangeData,
  PasswordResetData
} from '../types/userManagement';
import { 
  getCustomerByAuthId, 
  linkCustomerToAuthUser, 
  updateUserProfile, 
  getCustomerByEmail,
  getCustomerById
} from '../utils/userManagementUtils';
import { hashPassword, verifyPassword, isPasswordHashed } from '../utils/passwordUtils';
import { 
  requestPasswordReset as requestPasswordResetUtil, 
  validatePasswordResetToken as validatePasswordResetTokenUtil, 
  resetPasswordWithToken as resetPasswordWithTokenUtil 
} from '../utils/passwordResetUtils';
import { withTimeout, logPerformance } from '../utils/performanceUtils';

interface UserAuthProviderProps {
  children: React.ReactNode;
}

const AuthContext = createContext<UserAuthContext | null>(null);

export const useUserAuth = (): UserAuthContext => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useUserAuth must be used within a UserAuthProvider');
  }
  return context;
};

export const UserAuthProvider: React.FC<UserAuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<UserCustomer | null>(null);
  const [loading, setLoading] = useState(true);
  const [authUser, setAuthUser] = useState<User | null>(null);

  // Initialize authentication state
  useEffect(() => {
    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          setLoading(false);
          return;
        }

        if (session?.user) {
          setAuthUser(session.user);
          
          // Only load customer profile if not in admin context
          const isAdminContext = window.location.pathname.startsWith('/admin');
          if (!isAdminContext) {
            await loadUserProfile(session.user.id);
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen to Supabase auth changes for admin login detection
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: string, session: Session | null) => {
        if (event === 'SIGNED_IN' && session?.user) {
          setAuthUser(session.user);
          
          // Only load customer profile if not in admin context
          const isAdminContext = window.location.pathname.startsWith('/admin');
          if (!isAdminContext) {
            await loadUserProfile(session.user.id);
          }
        } else if (event === 'SIGNED_OUT') {
          setAuthUser(null);
          setUser(null);
        }
        
        setLoading(false);
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Load user profile from customers table
  const loadUserProfile = async (authUserId: string) => {
    try {
      const { customer, error } = await getCustomerByAuthId(authUserId);
      
      if (error) {
        // Don't log this as an error - admin users won't have customer records
        return;
      }

      if (customer) {
        setUser(customer);
      }
    } catch (error) {
      console.error('Exception in loadUserProfile:', error);
    }
  };

  // Register new user
  const register = useCallback(async (data: UserRegistrationData): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);

      // Check if customer already exists with this email
      const { customer: existingCustomer } = await getCustomerByEmail(data.email);
      
      if (existingCustomer && existingCustomer.auth_user_id) {
        return { success: false, error: 'An account with this email already exists' };
      }

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            first_name: data.firstName,
            last_name: data.lastName,
            phone: data.phone
          }
        }
      });

      if (authError) {
        return { success: false, error: authError.message };
      }

      if (!authData.user) {
        return { success: false, error: 'Failed to create user account' };
      }

      // If customer exists but not linked, link them
      if (existingCustomer) {
        const { success: linkSuccess, error: linkError } = await linkCustomerToAuthUser(
          existingCustomer.id!,
          authData.user.id
        );

        if (!linkSuccess) {
          console.error('Failed to link existing customer:', linkError);
          // Continue anyway, they can link later
        } else {
          setUser({ ...existingCustomer, auth_user_id: authData.user.id });
        }
      } else {
        // Create new customer record
        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert([{
            first_name: data.firstName,
            last_name: data.lastName,
            email: data.email.toLowerCase(),
            phone: data.phone || null,
            country: 'Ireland',
            is_active: true,
            auth_user_id: authData.user.id,
            is_email_verified: false
          }])
          .select()
          .single();

        if (customerError) {
          console.error('Error creating customer record:', customerError);
          // Auth user was created but customer creation failed
          // They can complete profile later
        } else if (newCustomer) {
          setUser(newCustomer);
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Exception in register:', error);
      return { success: false, error: 'Unexpected error occurred during registration' };
    } finally {
      setLoading(false);
    }
  }, []);

  // Login user
  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const startTime = Date.now();
    
    try {
      // Don't set global loading state - let the UserLogin component handle its own loading state

      // Add timeout to prevent hanging in production
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Login timeout - please try again')), 15000)
      );

      const loginPromise = (async () => {
        // Optimized customer query using utility function
        const { customer, error: customerError } = await withTimeout(
          getCustomerByEmail(email.toLowerCase()),
          8000,
          'Customer lookup timed out'
        );

        if (customerError || !customer) {
          return { success: false, error: 'Invalid credentials' };
        }

        // Verify password using bcrypt
        let isValidPassword = false;
        
        // Check if password is already hashed
        if (customer.password && isPasswordHashed(customer.password)) {
          // Verify against hashed password
          isValidPassword = await verifyPassword(password, customer.password);
        } else if (customer.password) {
          // Handle legacy plain text passwords (for backwards compatibility during transition)
          // Check if plain text password matches
          isValidPassword = customer.password === password;
          
          // If valid, hash the password and update it in the database (do this async, don't wait)
          if (isValidPassword) {
            // Don't await this - let it happen in background to improve login speed
            (async () => {
              try {
                const hashedPassword = await hashPassword(password);
                await supabase
                  .from('customers')
                  .update({ password: hashedPassword })
                  .eq('id', customer.id);
              } catch (err) {
                console.warn('Failed to migrate password:', err);
              }
            })();
          }
        }

      if (!isValidPassword) {
        return { success: false, error: 'Invalid credentials' };
      }
      
      // Check if password equals email (default password) and set must_change_password flag
      // For plain text comparison, check against the original password
      // For hashed passwords, we need to verify against the email
      let needsPasswordChange = false;
      if (customer.password && isPasswordHashed(customer.password)) {
        // For hashed passwords, check if the plain password was the email
        needsPasswordChange = password === customer.email;
      } else if (customer.password) {
        // For plain text passwords (legacy), direct comparison
        needsPasswordChange = customer.password === customer.email;
      }
      
      if (needsPasswordChange && customer.must_change_password !== true) {
        // Don't await this - update flag in background
        (async () => {
          try {
            await supabase
              .from('customers')
              .update({ must_change_password: true })
              .eq('id', customer.id);
            customer.must_change_password = true; // Update local data
          } catch (err) {
            console.warn('Failed to update password change flag:', err);
          }
        })();
      }
      
      // Set the authenticated user data immediately
      setUser(customer);
      
      // Update last login time in background - don't wait for it
      (async () => {
        try {
          await supabase
            .from('customers')
            .update({ 
              last_login: new Date().toISOString(),
              first_login: false 
            })
            .eq('id', customer.id);
        } catch (err) {
          console.warn('Failed to update last login:', err);
        }
      })();

      return { success: true };
      })();

      // Race between login and timeout
      const result = await Promise.race([loginPromise, timeoutPromise]);
      console.log('UserAuthContext: Final login result:', result);
      return result;

    } catch (error) {
      console.error('Exception in login:', error);
      return { success: false, error: 'Unexpected error occurred during login' };
    } finally {
      // No need to clear loading state since we're not setting it
      console.log('UserAuthContext: Login attempt completed');
      logPerformance('User Login', startTime);
    }
  }, []);

  // Logout user
  const logout = useCallback(async (): Promise<void> => {
    try {
      // For custom authentication, we just clear the local state
      setUser(null);
      setAuthUser(null);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  }, []);

  // Update user profile
  const updateProfile = useCallback(async (profileData: UserProfileUpdateData): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!user?.id) {
        return { success: false, error: 'Not authenticated' };
      }

      const { success, error } = await updateUserProfile(user.id, profileData);

      if (success) {
        // Reload the user data to get updated information
        const { customer } = await getCustomerById(user.id);
        if (customer) {
          setUser(customer);
        }
        return { success: true };
      }

      return { success: false, error };
    } catch (error) {
      console.error('Exception in updateProfile:', error);
      return { success: false, error: 'Unexpected error occurred' };
    }
  }, [user]);

  // Change password
  const changePassword = useCallback(async (passwordData: UserPasswordChangeData): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('changePassword called with user:', user?.id, 'must_change_password:', user?.must_change_password);
      
      if (!user?.id) {
        return { success: false, error: 'Not authenticated' };
      }

      // Hash the new password before storing it
      const hashedPassword = await hashPassword(passwordData.newPassword);
      
      console.log('Updating password in database for user:', user.id);
      const { error: updateError } = await supabase
        .from('customers')
        .update({ 
          password: hashedPassword,
          must_change_password: false 
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error updating password:', updateError);
        return { success: false, error: updateError.message };
      }

      console.log('Database update successful, updating local user state...');
      // Update local user state
      const updatedUser = { ...user, must_change_password: false };
      console.log('About to set user state to:', updatedUser);
      setUser(updatedUser);
      console.log('setUser called - React should re-render now');

      return { success: true };
    } catch (error) {
      console.error('Exception in changePassword:', error);
      return { success: false, error: 'Unexpected error occurred' };
    }
  }, [user]);

  // Refresh user data
  const refreshUser = useCallback(async (): Promise<void> => {
    if (authUser) {
      await loadUserProfile(authUser.id);
    }
  }, [authUser]);

  // Request password reset
  const requestPasswordReset = async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      return await requestPasswordResetUtil(email);
    } catch (error) {
      console.error('Exception in requestPasswordReset:', error);
      return { success: false, error: 'Unexpected error occurred' };
    }
  };

  // Validate password reset token
  const validateResetToken = async (token: string): Promise<{ success: boolean; error?: string; customerEmail?: string }> => {
    try {
      return await validatePasswordResetTokenUtil(token);
    } catch (error) {
      console.error('Exception in validateResetToken:', error);
      return { success: false, error: 'Unexpected error occurred' };
    }
  };

  // Reset password with token
  const resetPassword = async (data: PasswordResetData): Promise<{ success: boolean; error?: string }> => {
    try {
      return await resetPasswordWithTokenUtil(data);
    } catch (error) {
      console.error('Exception in resetPassword:', error);
      return { success: false, error: 'Unexpected error occurred' };
    }
  };

  // Record GDPR consent
  const recordConsent = async (consentType: string, consentGiven: boolean): Promise<{ success: boolean; error?: string }> => {
    if (!user?.id) {
      return { success: false, error: 'User not authenticated' };
    }

    try {
      const { error } = await supabase.rpc('record_consent', {
        p_customer_id: user.id,
        p_consent_type: consentType,
        p_consent_given: consentGiven,
        p_consent_method: 'web_form',
        p_legal_basis: 'consent',
        p_purpose: `${consentType} consent updated via user portal`,
        p_data_categories: consentType === 'marketing' ? ['email', 'preferences'] : ['personal_data'],
        p_retention_period: '7 years',
        p_ip_address: null,
        p_user_agent: navigator.userAgent
      });

      if (error) {
        return { success: false, error: error.message };
      }

      // Update local user state
      if (consentType === 'marketing') {
        setUser(prev => prev ? { 
          ...prev, 
          marketing_consent: consentGiven,
          marketing_consent_date: consentGiven ? new Date().toISOString() : prev.marketing_consent_date
        } : null);
      } else if (consentType === 'privacy') {
        setUser(prev => prev ? { 
          ...prev, 
          privacy_consent_given: consentGiven,
          privacy_consent_date: consentGiven ? new Date().toISOString() : prev.privacy_consent_date
        } : null);
      }

      return { success: true };
    } catch (error) {
      console.error('Exception in recordConsent:', error);
      return { success: false, error: 'Unexpected error occurred' };
    }
  };

  const contextValue: UserAuthContext = useMemo(() => ({
    user,
    authUser,
    loading,
    isAdmin: !!authUser && !user, // Admin detection: has auth user but no customer profile
    login,
    logout,
    register,
    updateProfile,
    changePassword,
    requestPasswordReset,
    resetPassword,
    validateResetToken,
    refreshUser,
    recordConsent
  }), [user, authUser, loading, login, logout, register, updateProfile, changePassword, requestPasswordReset, resetPassword, validateResetToken, refreshUser, recordConsent]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
