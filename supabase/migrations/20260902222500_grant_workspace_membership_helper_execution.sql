-- RLS policies on workspace-scoped tables call this helper as the authenticated user.
-- Keep the helper unavailable to anonymous/public callers while permitting authenticated policy evaluation.
revoke all on function public.is_workspace_member(uuid) from public;
grant execute on function public.is_workspace_member(uuid) to authenticated;
