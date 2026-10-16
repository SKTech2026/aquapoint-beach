import { createClient } from '@supabase/supabase-js';

const projectUrl = __AQUAPOINT_SUPABASE_URL__;
const publishableKey = __AQUAPOINT_SUPABASE_PUBLISHABLE_KEY__;

export const supabase = projectUrl && publishableKey
  ? createClient(projectUrl, publishableKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false
    }
  })
  : null;

globalThis.__aquapointSupabase = supabase;