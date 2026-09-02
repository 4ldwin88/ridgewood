export const RIDGEWOOD_SUPABASE_PROJECT_REF = 'leikcvdfvovycjcjtflq' as const;
export const RIDGEWOOD_SUPABASE_URL = 'https://leikcvdfvovycjcjtflq.supabase.co' as const;

/**
 * Infrastructure identity only. No secret or service-role key belongs in source.
 * Browser clients must receive a publishable key through environment configuration.
 */
export function assertRidgewoodSupabaseUrl(url: string): void {
  if (url !== RIDGEWOOD_SUPABASE_URL) {
    throw new Error('Refusing to connect Ridgewood OS to a non-Ridgewood Supabase project.');
  }
}
