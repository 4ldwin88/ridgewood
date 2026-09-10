alter function public.authorize_project_state(uuid, text, jsonb) security definer;
alter function public.authorize_project_state(uuid, text, jsonb) set search_path = public;
revoke all on function public.authorize_project_state(uuid, text, jsonb) from public;
revoke all on function public.authorize_project_state(uuid, text, jsonb) from anon;
grant execute on function public.authorize_project_state(uuid, text, jsonb) to authenticated;
grant execute on function public.authorize_project_state(uuid, text, jsonb) to service_role;
