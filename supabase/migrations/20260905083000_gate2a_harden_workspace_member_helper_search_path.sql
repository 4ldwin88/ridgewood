-- Gate 2A hardening: keep the workspace-membership RLS helper callable only by
-- authenticated application sessions/service role while pinning SECURITY DEFINER
-- name resolution to trusted schemas.
alter function public.is_workspace_member(uuid)
  set search_path = pg_catalog, public;

revoke execute on function public.is_workspace_member(uuid) from public, anon;
grant execute on function public.is_workspace_member(uuid) to authenticated, service_role;
