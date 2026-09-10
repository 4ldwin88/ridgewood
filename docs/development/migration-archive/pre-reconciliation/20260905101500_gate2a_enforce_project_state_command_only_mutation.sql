-- Gate 2A: Project State mutations are now mediated by controlled commands.
-- Authenticated clients retain workspace-scoped SELECT through RLS but may no
-- longer INSERT or UPDATE public.project_states directly.
-- service_role retains its administrative privileges.

revoke insert, update on table public.project_states from authenticated;
grant select on table public.project_states to authenticated;
