import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isConfigured = Boolean(supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('placeholder'));

if (!isConfigured) {
  console.error('CRITICAL: Supabase credentials missing! Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment variables in the Settings menu.');
}

export const supabase = createClient(
  supabaseUrl || 'https://mjznwfstkmkzbpxswndv.supabase.co', 
  supabaseAnonKey || 'placeholder-key'
);
