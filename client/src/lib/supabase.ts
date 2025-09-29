import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ndpryzqiwhndlokmjouo.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kcHJ5enFpd2huZGxva21qb3VvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5ODk2MzksImV4cCI6MjA3NDU2NTYzOX0.HNHb2zyfvBWk9-iJn7d_NTJA20PghCRVIDiLhhT9EiY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});