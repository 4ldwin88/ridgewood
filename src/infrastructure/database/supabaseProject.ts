export const RIDGEWOOD_SUPABASE_PROJECT_REF = 'leikcvdfvovycjcjtflq' as const;
export const RIDGEWOOD_SUPABASE_URL = 'https://leikcvdfvovycjcjtflq.supabase.co' as const;

/** Disposable acceptance is opt-in and cannot enter a production build. */
export function resolveSupabaseUrl(mode: string, development: boolean): string {
  if (mode === 'acceptance') {
    if (!development) throw new Error('Acceptance backend is forbidden in production builds.');
    return 'http://127.0.0.1:54321';
  }
  return RIDGEWOOD_SUPABASE_URL;
}

/**
 * Infrastructure identity only. No secret or service-role key belongs in source.
 * Browser clients must receive a publishable key through environment configuration.
 */
export function assertRidgewoodSupabaseUrl(url: string): void {
  if (url !== RIDGEWOOD_SUPABASE_URL) {
    throw new Error('Refusing to connect Ridgewood OS to a non-Ridgewood Supabase project.');
  }
}
