import { createClient } from '@supabase/supabase-js';

// User provided credentials as final fix
const PROVIDED_URL = 'https://mjznwfstkmkzbpxswndv.supabase.co';
const PROVIDED_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qem53ZnN0a21remJweHN3bmR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3NDExNDksImV4cCI6MjA5MTMxNzE0OX0.acRI5qVCyqE6RqhX7WgTnTsRxvyfzVKX0cZF-LOxR1U';

// Try to get from Vite's import.meta.env first, then fallback to process.env, then to the provided hardcoded values
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 
                    (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_URL : undefined) ||
                    PROVIDED_URL;

const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 
                        (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_ANON_KEY : undefined) ||
                        PROVIDED_KEY;

export const configStatus = {
  hasUrl: Boolean(supabaseUrl && !supabaseUrl.includes('placeholder')),
  hasKey: Boolean(supabaseAnonKey && !supabaseAnonKey.includes('placeholder') && supabaseAnonKey !== 'undefined'),
  isConfigured: false
};

configStatus.isConfigured = configStatus.hasUrl && configStatus.hasKey;

// Export for backward compatibility
export const isConfigured = configStatus.isConfigured;

if (!isConfigured) {
  console.error('CRITICAL: Supabase credentials missing!', {
    url: configStatus.hasUrl ? 'Present' : 'Missing',
    key: configStatus.hasKey ? 'Present' : 'Missing'
  });
}

export const supabase = createClient(
  supabaseUrl, 
  supabaseAnonKey || 'placeholder-key'
);
