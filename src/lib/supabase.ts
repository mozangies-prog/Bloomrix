import { createClient } from '@supabase/supabase-js';

// Try to get from Vite's import.meta.env first, then fallback to process.env (defined in vite.config.ts)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 
                    (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_URL : undefined) ||
                    'https://mjznwfstkmkzbpxswndv.supabase.co'; // Hardcoded fallback for your project

const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 
                        (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_ANON_KEY : undefined);

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
