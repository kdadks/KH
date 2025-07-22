import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hlmqgghrrmvstbmvwsni.supabase.co'; // TODO: Replace with your Supabase project URL
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhsbXFnZ2hycm12c3RibXZ3c25pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxNzU0MTgsImV4cCI6MjA2ODc1MTQxOH0.3qjmIl_2T9sJR71uuo_QM58t2gyAoF-6HnVCdfBgj6o'; // TODO: Replace with your Supabase anon key

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
