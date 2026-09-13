import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const customStorage = {
  getItem: (key) => {
    if (window.localStorage.getItem('ob_remember_device') === 'true') {
      return window.localStorage.getItem(key) || window.sessionStorage.getItem(key);
    }
    return window.sessionStorage.getItem(key);
  },
  setItem: (key, value) => {
    if (window.localStorage.getItem('ob_remember_device') === 'true') {
      window.localStorage.setItem(key, value);
    }
    window.sessionStorage.setItem(key, value);
  },
  removeItem: (key) => {
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: customStorage, 
    autoRefreshToken: true,
    persistSession: true
  }
});