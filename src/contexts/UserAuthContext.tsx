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
  getCustomerById,
  getAllPatientsByEmail
} from '../utils/userManagementUtils';
import { hashPassword, verifyPassword, isPasswordHashed } from '../utils/passwordUtils';
import { 
  requestPasswordReset as requestPasswordResetUtil, 
  validatePasswordResetToken as validatePasswordResetTokenUtil, 
  resetPasswordWithToken as resetPasswordWithTokenUtil 
} from '../utils/passwordResetUtils';
import { withTimeout, logPerformance } from '../utils/performanceUtils';
import { isRateLimited, recordLoginAttempt, getRemainingAttempts, resetLoginAttempts } from '../utils/loginRateLimiter';
import { performBreachCheck, getBreachWarning } from '../utils/breachDetection';
import { isUserAdmin } from '../utils/adminVerification';

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
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Multi-patient support state
  const [allPatients, setAllPatients] = useState<UserCustomer[]>([]);
  const [activePatient, setActivePatient] = useState<UserCustomer | null>(null);
  const [isMultiPatient, setIsMultiPatient] = useState(false);

  // Verify admin status against admins table
  const verifyAdminStatus = useCallback(async (email: string | undefined) => {
    if (!email) {
      setIsAdmin(false);
      return;
    }
    const adminStatus = await isUserAdmin(email);
    setIsAdmin(adminStatus);
  }, []);

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
          
          // Verify admin status on session restoration
          await verifyAdminStatus(session.user.email);
          
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
          
          // Verify admin status on sign in
          await verifyAdminStatus(session.user.email);
          
          // Only load customer profile if not in admin context
          const isAdminContext = window.location.pathname.startsWith('/admin');
          if (!isAdminContext) {
            await loadUserProfile(session.user.id);
          }
        } else if (event === 'SIGNED_OUT') {
          setAuthUser(null);
          setUser(null);
          setIsAdmin(false);
        }
        
        setLoading(false);
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, [verifyAdminStatus]);

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
  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string; breachWarning?: string }> => {
    const startTime = Date.now();
    
    try {
      const normalizedEmail = email.toLowerCase();

      // ============ SECURITY: RATE LIMITING ============
      // Check if email is rate limited due to failed login attempts
      const { limited, retryAfterSeconds } = isRateLimited(normalizedEmail);
      if (limited) {
        recordLoginAttempt(normalizedEmail, false);
        return { 
          success: false, 
          error: `Too many login attempts. Please try again in ${retryAfterSeconds} seconds.` 
        };
      }

      // Don't set global loading state - let the UserLogin component handle its own loading state

      // Add timeout to prevent hanging in production
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Login timeout - please try again')), 15000)
      );

      const loginPromise = (async () => {
        // Load all patients/customers associated with this email for multi-patient support
        const { patients, error: patientsError } = await withTimeout(
          getAllPatientsByEmail(normalizedEmail),
          8000,
          'Patients lookup timed out'
        );

        if (patientsError || !patients || patients.length === 0) {
          recordLoginAttempt(normalizedEmail, false);
          return { success: false, error: 'Invalid credentials' };
        }

        // Use the first patient for password verification (all patients share same email/password)
        const primaryPatient = patients[0];

        // ============ SECURITY: NO PLAINTEXT PASSWORDS ============
        // Only accept hashed passwords - reject any plaintext passwords
        if (!primaryPatient.password || !isPasswordHashed(primaryPatient.password)) {
          console.warn(`[SECURITY] Customer ${primaryPatient.id} has no hashed password. Blocking login.`);
          recordLoginAttempt(normalizedEmail, false);
          return { 
            success: false, 
            error: 'Account security issue. Please contact support to reset your password.' 
          };
        }

        // Verify password using bcrypt
        let isValidPassword = false;
        try {
          console.log('login: Verifying password for user ID:', primaryPatient.id);
          console.log('login: Stored password hash starts with:', primaryPatient.password?.substring(0, 10));
          isValidPassword = await verifyPassword(password, primaryPatient.password);
          console.log('login: Password verification result:', isValidPassword);
        } catch (err) {
          console.error('Password verification error:', err);
          recordLoginAttempt(normalizedEmail, false);
          return { success: false, error: 'Authentication failed. Please try again.' };
        }

        if (!isValidPassword) {
          console.log('login: Password verification failed for user ID:', primaryPatient.id);
          recordLoginAttempt(normalizedEmail, false);
          const remaining = getRemainingAttempts(normalizedEmail);
          if (remaining > 0) {
            return { success: false, error: `Invalid credentials. ${remaining} attempts remaining.` };
          } else {
            return { success: false, error: 'Invalid credentials' };
          }
        }
      
      // Check if password equals email (default password) and set must_change_password flag
      let needsPasswordChange = false;
      needsPasswordChange = password === primaryPatient.email;
      
      if (needsPasswordChange) {
        // Update flag for ALL patients with this email - don't await this
        (async () => {
          try {
            await supabase
              .from('customers')
              .update({ must_change_password: true })
              .eq('email', normalizedEmail)
              .eq('is_active', true);
            // Update local data for all patients
            patients.forEach(patient => {
              patient.must_change_password = true;
            });
          } catch (err) {
            console.warn('Failed to update password change flag for all patients:', err);
          }
        })();
      }

      // ============ SECURITY: BREACH DETECTION ============
      // Check if email or password has been compromised in known breaches
      let breachWarning: string | null = null;
      try {
        const breachResult = await performBreachCheck(normalizedEmail, password);
        breachWarning = getBreachWarning(breachResult);
        
        if (breachResult.isCompromised) {
          console.warn(`[SECURITY] Breach detected for ${normalizedEmail}:`, breachResult);
        }
      } catch (err) {
        console.warn('Breach detection check failed:', err);
      }
      
      // Set up multi-patient authentication data
      setAllPatients(patients);
      setIsMultiPatient(patients.length > 1);
      setActivePatient(primaryPatient);
      setUser(primaryPatient); // Set primary patient as current user for backwards compatibility
      
      // ============ SECURITY: RECORD SUCCESSFUL LOGIN ============
      recordLoginAttempt(normalizedEmail, true);
      
      // Update last login time for the primary patient in background - don't wait for it
      (async () => {
        try {
          await supabase
            .from('customers')
            .update({ 
              last_login: new Date().toISOString(),
              first_login: false 
            })
            .eq('id', primaryPatient.id);
        } catch (err) {
          console.warn('Failed to update last login:', err);
        }
      })();

      return { 
        success: true, 
        ...(breachWarning && { breachWarning })
      };
      })();

      // Race between login and timeout
      const result = await Promise.race([loginPromise, timeoutPromise]);
      return result;

    } catch (error) {
      console.error('Exception in login:', error);
      recordLoginAttempt(email.toLowerCase(), false);
      return { success: false, error: 'Unexpected error occurred during login' };
    } finally {
      // No need to clear loading state since we're not setting it
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
      if (!user?.id) {
        return { success: false, error: 'Not authenticated' };
      }

      console.log('changePassword: Starting password change for user ID:', user.id);

      // Hash the new password before storing it
      const hashedPassword = await hashPassword(passwordData.newPassword);
      console.log('changePassword: Password hashed successfully, length:', hashedPassword.length);
      
      // Use the Netlify function to update password (bypasses RLS issues)
      const siteUrl = import.meta.env.VITE_SITE_URL || window.location.origin;
      const functionUrl = `${siteUrl}/.netlify/functions/update-password`;
      
      try {
        const response = await fetch(functionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            customerId: user.id, 
            hashedPassword 
          })
        });

        const responseText = await response.text();
        console.log('changePassword: Server response:', responseText);
        
        if (!responseText) {
          console.warn('changePassword: Empty response from server, falling back to direct update');
          // Fall through to direct Supabase update
        } else {
          const result = JSON.parse(responseText);
          
          if (result.success) {
            console.log('changePassword: Password updated successfully via server function');
            
            // Update local user state
            const updatedUser = { ...user, must_change_password: false };
            setUser(updatedUser);
            
            // Also update allPatients array if the user is in there (multi-patient support)
            if (allPatients.length > 0) {
              const updatedPatients = allPatients.map(patient => 
                patient.id === user.id 
                  ? { ...patient, must_change_password: false }
                  : patient
              );
              setAllPatients(updatedPatients);
              
              // Update activePatient if it's the same user
              if (activePatient?.id === user.id) {
                setActivePatient({ ...activePatient, must_change_password: false });
              }
            }
            
            return { success: true };
          } else {
            console.error('changePassword: Server function failed:', result.error);
            return { success: false, error: result.error || 'Failed to update password' };
          }
        }
      } catch (fetchError) {
        console.warn('changePassword: Server function unavailable, trying direct update:', fetchError);
        // Fall through to direct Supabase update
      }
      
      // Fallback: Direct Supabase update (may be blocked by RLS)
      console.log('changePassword: Attempting direct Supabase update...');
      const { data: updateData, error: updateError } = await supabase
        .from('customers')
        .update({ 
          password: hashedPassword,
          must_change_password: false 
        })
        .eq('id', user.id)
        .select('id, password, must_change_password');

      console.log('changePassword: Update result - data:', updateData, 'error:', updateError);

      if (updateError) {
        console.error('Error updating password:', updateError);
        return { success: false, error: updateError.message };
      }

      // Verify the update was successful
      if (!updateData || updateData.length === 0) {
        console.error('changePassword: No rows were updated! This is likely an RLS policy issue.');
        console.error('changePassword: Please run the SQL in database/fix-customer-update-rls.sql in Supabase Dashboard');
        return { success: false, error: 'Failed to update password - please contact support' };
      }

      console.log('changePassword: Password updated in database successfully');

      // Update local user state
      const updatedUser = { ...user, must_change_password: false };
      setUser(updatedUser);
      
      // Also update allPatients array if the user is in there (multi-patient support)
      if (allPatients.length > 0) {
        const updatedPatients = allPatients.map(patient => 
          patient.id === user.id 
            ? { ...patient, must_change_password: false }
            : patient
        );
        setAllPatients(updatedPatients);
        
        // Update activePatient if it's the same user
        if (activePatient?.id === user.id) {
          setActivePatient({ ...activePatient, must_change_password: false });
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Exception in changePassword:', error);
      return { success: false, error: 'Unexpected error occurred' };
    }
  }, [user, allPatients, activePatient]);

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

  // Multi-patient support functions
  const switchPatient = useCallback((patientId: number) => {
    const patient = allPatients.find(p => p.id === patientId);
    if (patient) {
      setActivePatient(patient);
      
      // Update user for backwards compatibility, but preserve the original user's 
      // password change status to avoid triggering password change on patient switch
      if (user) {
        const originalPasswordStatus = user.must_change_password;
        const updatedUser = { 
          ...patient, 
          must_change_password: originalPasswordStatus 
        };
        setUser(updatedUser);
      } else {
        setUser(patient);
      }
    }
  }, [allPatients, user]);

  const refreshPatients = useCallback(async () => {
    if (!user?.email) return;
    
    try {
      const { patients, error } = await getAllPatientsByEmail(user.email);
      if (!error && patients) {
        setAllPatients(patients);
        setIsMultiPatient(patients.length > 1);
        
        // Update active patient if it still exists
        if (activePatient) {
          const updatedActivePatient = patients.find(p => p.id === activePatient.id);
          if (updatedActivePatient) {
            setActivePatient(updatedActivePatient);
            setUser(updatedActivePatient);
          } else {
            // Active patient no longer exists, switch to first patient
            setActivePatient(patients[0]);
            setUser(patients[0]);
          }
        }
      }
    } catch (error) {
      console.error('Failed to refresh patients:', error);
    }
  }, [user?.email, activePatient]);

  const contextValue: UserAuthContext & { 
    allPatients: UserCustomer[];
    activePatient: UserCustomer | null;
    isMultiPatient: boolean;
    switchPatient: (patientId: number) => void;
    refreshPatients: () => Promise<void>;
  } = useMemo(() => ({
    user,
    authUser,
    loading,
    isAdmin, // Verified against admins table with is_active = true
    login,
    logout,
    register,
    updateProfile,
    changePassword,
    requestPasswordReset,
    resetPassword,
    validateResetToken,
    refreshUser,
    recordConsent,
    // Multi-patient support
    allPatients,
    activePatient,
    isMultiPatient,
    switchPatient,
    refreshPatients
  }), [user, authUser, loading, isAdmin, login, logout, register, updateProfile, changePassword, requestPasswordReset, resetPassword, validateResetToken, refreshUser, recordConsent, allPatients, activePatient, isMultiPatient, switchPatient, refreshPatients]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
