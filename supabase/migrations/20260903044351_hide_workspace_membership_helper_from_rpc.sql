revoke execute on function public.is_workspace_member(uuid) from public;
revoke execute on function public.is_workspace_member(uuid) from anon;
revoke execute on function public.is_workspace_member(uuid) from authenticated;
grant execute on function public.is_workspace_member(uuid) to service_role;
grant execute on function public.is_workspace_member(uuid) to postgres;
