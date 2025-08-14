import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { User, AuthChangeEvent, Session } from '@supabase/supabase-js';
import { 
  UserCustomer, 
  UserAuthContext, 
  UserRegistrationData,
  UserProfileUpdateData,
  UserPasswordChangeData
} from '../types/userManagement';
import { 
  getCustomerByAuthId, 
  linkCustomerToAuthUser, 
  updateUserProfile, 
  getCustomerByEmail,
  getCustomerById
} from '../utils/userManagementUtils';

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
          await loadUserProfile(session.user.id);
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
      async (event: any, session: any) => {
        console.log('Auth state changed:', event, session?.user?.id);
        
        if (event === 'SIGNED_IN' && session?.user) {
          setAuthUser(session.user);
          await loadUserProfile(session.user.id);
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
        console.error('Error loading user profile:', error);
        return;
      }

      if (customer) {
        setUser(customer);
      } else {
        // If no customer record found, user might need to complete profile
        console.log('No customer record found for auth user:', authUserId);
      }
    } catch (error) {
      console.error('Exception in loadUserProfile:', error);
    }
  };

  // Register new user
  const register = async (data: UserRegistrationData): Promise<{ success: boolean; error?: string }> => {
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
  };

  // Login user
  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);

      // First, try to find the customer by email and password
      const { data: customers, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('email', email)
        .eq('password', password)
        .eq('is_active', true)
        .single();

      if (customerError || !customers) {
        return { success: false, error: 'Invalid credentials' };
      }

      // Customer authentication successful
      console.log('Customer authenticated:', customers.email);
      
      // Check if password equals email (default password) and set must_change_password flag
      if (customers.password === customers.email && customers.must_change_password !== true) {
        const { error: flagError } = await supabase
          .from('customers')
          .update({ must_change_password: true })
          .eq('id', customers.id);
        
        if (!flagError) {
          customers.must_change_password = true; // Update local data
        }
      }
      
      // Set the authenticated user data
      setUser(customers);
      
      // Update last login time
      const { error: updateError } = await supabase
        .from('customers')
        .update({ 
          last_login: new Date().toISOString(),
          first_login: false 
        })
        .eq('id', customers.id);

      if (updateError) {
        console.warn('Failed to update last login:', updateError);
      }

      return { success: true };
    } catch (error) {
      console.error('Exception in login:', error);
      return { success: false, error: 'Unexpected error occurred during login' };
    } finally {
      setLoading(false);
    }
  };

  // Logout user
  const logout = async (): Promise<void> => {
    try {
      // For custom authentication, we just clear the local state
      setUser(null);
      setAuthUser(null);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  // Update user profile
  const updateProfile = async (profileData: UserProfileUpdateData): Promise<{ success: boolean; error?: string }> => {
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
  };

  // Change password
  const changePassword = async (passwordData: UserPasswordChangeData): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!user?.id) {
        return { success: false, error: 'Not authenticated' };
      }

      // For custom authentication, we need to implement password change in the database
      // This is a placeholder - in production you would:
      // 1. Hash the new password
      // 2. Update the customer table
      // 3. Set must_change_password to false
      
      const { error: updateError } = await supabase
        .from('customers')
        .update({ 
          password: passwordData.newPassword,
          must_change_password: false 
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error updating password:', updateError);
        return { success: false, error: updateError.message };
      }

      // Update local user state
      setUser({ ...user, must_change_password: false });

      return { success: true };
    } catch (error) {
      console.error('Exception in changePassword:', error);
      return { success: false, error: 'Unexpected error occurred' };
    }
  };

  // Refresh user data
  const refreshUser = async (): Promise<void> => {
    if (authUser) {
      await loadUserProfile(authUser.id);
    }
  };

  const contextValue: UserAuthContext = {
    user,
    authUser,
    loading,
    login,
    logout,
    register,
    updateProfile,
    changePassword,
    refreshUser
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
