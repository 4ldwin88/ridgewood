create or replace function public.resume_held_project_state(project_state_input uuid)
returns public.project_states
language plpgsql
security invoker
set search_path = ''
as $$
declare
  result public.project_states;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select * into result
  from public.project_states ps
  where ps.id = project_state_input
    and ps.archived_at is null;

  if result.id is null then
    raise exception 'Project State not found';
  end if;

  if not public.is_workspace_member(result.workspace_id) then
    raise exception 'Workspace membership required';
  end if;

  if result.status <> 'held' then
    raise exception 'Only a held Project State can be resumed';
  end if;

  update public.project_states
  set status = 'active', updated_at = now()
  where id = project_state_input
  returning * into result;

  return result;
end;
$$;

revoke execute on function public.resume_held_project_state(uuid) from public, anon;
grant execute on function public.resume_held_project_state(uuid) to authenticated, service_role;
