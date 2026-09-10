import { describe, expect, it } from 'vitest';
import { assertRidgewoodSupabaseUrl, resolveSupabaseUrl, RIDGEWOOD_SUPABASE_URL } from '../../src/infrastructure/database/supabaseProject';

describe('backend environment boundary', () => {
  it('binds ordinary development and production to Ridgewood', () => {
    expect(resolveSupabaseUrl('development', true)).toBe(RIDGEWOOD_SUPABASE_URL);
    expect(resolveSupabaseUrl('production', false)).toBe(RIDGEWOOD_SUPABASE_URL);
  });
  it('allows the fixed disposable URL only in acceptance development', () => {
    expect(resolveSupabaseUrl('acceptance', true)).toBe('http://127.0.0.1:54321');
    expect(() => resolveSupabaseUrl('acceptance', false)).toThrow();
    expect(() => assertRidgewoodSupabaseUrl('https://other.supabase.co')).toThrow();
  });
});
