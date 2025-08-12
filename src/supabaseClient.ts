import { createClient } from '@supabase/supabase-js';

// Prefer env vars (set in Netlify/Vercel). Fallback to baked values for local dev only.
const envUrl = (import.meta as any)?.env?.VITE_SUPABASE_URL as string | undefined;
const envAnon = (import.meta as any)?.env?.VITE_SUPABASE_ANON_KEY as string | undefined;

const fallbackUrl = 'https://hlmqgghrrmvstbmvwsni.supabase.co';
const fallbackAnon = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhsbXFnZ2hycm12c3RibXZ3c25pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxNzU0MTgsImV4cCI6MjA2ODc1MTQxOH0.3qjmIl_2T9sJR71uuo_QM58t2gyAoF-6HnVCdfBgj6o';

const supabaseUrl = envUrl || fallbackUrl;
const supabaseAnonKey = envAnon || fallbackAnon;

if (!envUrl || !envAnon) {
  // eslint-disable-next-line no-console
  console.warn('[Supabase] Using fallback URL/key. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY for production.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: sessionStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
});
