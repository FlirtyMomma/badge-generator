import { createClient } from '@supabase/supabase-api'; // or @supabase/supabase-js

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // FIXED: Forces tokens to disappear the instant the tab or browser closes
    storage: window.sessionStorage, 
    autoRefreshToken: true,
    persistSession: true
  }
});