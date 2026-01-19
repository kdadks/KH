import { supabase } from '../supabaseClient';

/**
 * Check if a user is an admin by verifying against the admins table
 * @param email - User's email address
 * @returns Promise<boolean> - True if user is an active admin
 */
export const isUserAdmin = async (email: string | undefined): Promise<boolean> => {
  if (!email) return false;

  try {
    const { data, error } = await supabase
      .from('admins')
      .select('id, email, is_active')
      .eq('email', email.toLowerCase())
      .eq('is_active', true)
      .single();

    if (error) {
      // User is not an admin
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
};

/**
 * Get admin details from the admins table
 * @param email - User's email address
 * @returns Promise with admin data or null
 */
export const getAdminByEmail = async (email: string) => {
  try {
    const { data, error } = await supabase
      .from('admins')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('is_active', true)
      .single();

    if (error) {
      return { admin: null, error };
    }

    return { admin: data, error: null };
  } catch (error) {
    console.error('Error fetching admin details:', error);
    return { admin: null, error };
  }
};
