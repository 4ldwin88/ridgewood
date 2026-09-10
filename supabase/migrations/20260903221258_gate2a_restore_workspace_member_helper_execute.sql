-- RLS policies depend on this internal membership helper. Keep it inaccessible to signed-out callers while allowing authenticated policy evaluation.
revoke execute on function public.is_workspace_member(uuid) from public;
revoke execute on function public.is_workspace_member(uuid) from anon;
grant execute on function public.is_workspace_member(uuid) to authenticated;
grant execute on function public.is_workspace_member(uuid) to service_role;
