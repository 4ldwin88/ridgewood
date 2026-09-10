-- Applied to Ridgewood Supabase project leikcvdfvovycjcjtflq on 2026-09-02.
-- Security Advisor reported public.rls_auto_enable() as SECURITY DEFINER and
-- executable by anon/authenticated. It is not an application RPC boundary.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
