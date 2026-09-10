import { createClient } from '@supabase/supabase-js';
import { resolveSupabaseUrl } from '../database/supabaseProject';

const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

if (!publishableKey) {
  throw new Error('Missing VITE_SUPABASE_PUBLISHABLE_KEY.');
}

export const supabase = createClient(resolveSupabaseUrl(import.meta.env.MODE, import.meta.env.DEV), publishableKey);
