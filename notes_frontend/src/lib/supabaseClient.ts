import { createClient } from '@supabase/supabase-js';

// PUBLIC_INTERFACE
/**
 * Returns a Supabase client instance.
 * Uses environment variables SUPABASE_URL and SUPABASE_KEY, can fallback on injected values at runtime.
 */
export function getSupabaseClient() {
  const url = import.meta.env.PUBLIC_SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL || 'https://mzxyorlnbfdkneiezgjz.supabase.co';
  const key = import.meta.env.PUBLIC_SUPABASE_KEY || process.env.PUBLIC_SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16eHlvcmxuYmZka25laWV6Z2p6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwNDUxMDksImV4cCI6MjA2NzYyMTEwOX0.URYpbwtC2u5ORBlUzpWPNspXMWq_cLBOKWMOgGbilyQ';
  return createClient(url, key);
}
