import { createClient } from '@supabase/supabase-js';
import { RIDGEWOOD_SUPABASE_URL, assertRidgewoodSupabaseUrl } from '../database/supabaseProject';

const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

if (!publishableKey) {
  throw new Error('Missing VITE_SUPABASE_PUBLISHABLE_KEY.');
}

assertRidgewoodSupabaseUrl(RIDGEWOOD_SUPABASE_URL);

export const supabase = createClient(RIDGEWOOD_SUPABASE_URL, publishableKey);
