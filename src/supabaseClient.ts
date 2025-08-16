import { createClient } from '@supabase/supabase-js';

// Get Supabase configuration from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing required environment variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: sessionStorage,
    autoRefreshToken: false,  // Disabled since we're using custom auth
    persistSession: false,   // Disabled since we're using custom auth
    detectSessionInUrl: false
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'X-Client-Info': 'kh-therapy-app'
    },
    // Add production optimizations
    ...(import.meta.env.PROD && {
      fetch: (url, options = {}) => {
        return fetch(url, {
          ...options,
          keepalive: true,
          // Add timeout for production
          signal: AbortSignal.timeout(30000)
        });
      }
    })
  },
  realtime: {
    params: {
      eventsPerSecond: 2 // Limit realtime events for performance
    }
  }
});
