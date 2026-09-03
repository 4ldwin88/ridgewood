create or replace function public.archive_project_state(project_state_input uuid)
returns public.project_states
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  uid uuid := auth.uid();
  ps public.project_states;
begin
  if uid is null then raise exception 'authentication_required'; end if;

  select * into ps
  from public.project_states
  where id = project_state_input
  for update;

  if ps.id is null then raise exception 'project_state_not_found'; end if;
  if not public.is_workspace_member(ps.workspace_id) then raise exception 'workspace_access_denied'; end if;
  if ps.archived_at is not null then raise exception 'project_state_already_archived'; end if;

  update public.project_states
  set archived_at = now(),
      archived_by = uid,
      updated_at = now()
  where id = ps.id
  returning * into ps;

  return ps;
end
$function$;

revoke all on function public.archive_project_state(uuid) from public;
revoke execute on function public.archive_project_state(uuid) from anon;
grant execute on function public.archive_project_state(uuid) to authenticated;
