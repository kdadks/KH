import { supabase } from '../supabaseClient';

// Cache admin check results to avoid repeated failed requests
const adminCheckCache = new Map<string, { result: boolean; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
let tableExists: boolean | null = null; // null = unknown, false = doesn't exist, true = exists

/**
 * Check if a user is an admin by verifying against the admins table
 * @param email - User's email address
 * @returns Promise<boolean> - True if user is an active admin
 */
export const isUserAdmin = async (email: string | undefined): Promise<boolean> => {
  if (!email) return false;

  // If we've determined the table doesn't exist, skip the check entirely
  if (tableExists === false) {
    return false;
  }

  const normalizedEmail = email.toLowerCase();

  // Check cache first
  const cached = adminCheckCache.get(normalizedEmail);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.result;
  }

  try {
    const { data, error } = await supabase
      .from('admins')
      .select('id, email, is_active')
      .eq('email', normalizedEmail)
      .eq('is_active', true)
      .maybeSingle(); // Use maybeSingle() to handle missing table/no results gracefully

    // Silently handle errors (table might not exist, RLS might block, etc.)
    if (error) {
      // Mark table as non-existent if we get a 406 or PGRST error
      if (error.code === 'PGRST116' || error.message.includes('406') || error.message.includes('relation')) {
        tableExists = false;
      }

      // Cache the negative result
      adminCheckCache.set(normalizedEmail, { result: false, timestamp: Date.now() });
      return false;
    }

    tableExists = true;
    const result = !!data;

    // Cache the result
    adminCheckCache.set(normalizedEmail, { result, timestamp: Date.now() });
    return result;
  } catch (error) {
    // Silently fail - admin table may not exist yet
    tableExists = false;
    adminCheckCache.set(normalizedEmail, { result: false, timestamp: Date.now() });
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
      .maybeSingle(); // Use maybeSingle() to handle missing table/no results gracefully

    if (error) {
      // Don't log 406 errors
      if (error.code !== 'PGRST116' && !error.message.includes('406')) {
        console.warn('[Admin Fetch] Failed silently:', error.code);
      }
      return { admin: null, error };
    }

    return { admin: data, error: null };
  } catch (error) {
    // Silently fail - admin table may not exist yet
    return { admin: null, error };
  }
};
