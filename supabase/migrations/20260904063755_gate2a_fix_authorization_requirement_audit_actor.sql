create or replace function public.enter_project_state_authorization(project_state_input uuid)
returns public.project_states
language plpgsql
set search_path to ''
as $function$
declare
  uid uuid := auth.uid();
  ps public.project_states;
  incomplete_count integer;
begin
  if uid is null then raise exception 'authentication_required'; end if;
  select * into ps from public.project_states where id=project_state_input for update;
  if ps.id is null then raise exception 'project_state_not_found'; end if;
  if not public.is_workspace_member(ps.workspace_id) then raise exception 'workspace_access_denied'; end if;
  if ps.status <> 'active' then raise exception 'authorization_entry_not_allowed_for_status:%',ps.status; end if;
  if ps.stage <> 'predevelopment' then raise exception 'authorization_entry_not_allowed_from_stage:%',ps.stage; end if;

  perform public.ensure_project_state_predevelopment_domains(ps.id);

  select count(*) into incomplete_count
  from public.predevelopment_domains
  where project_state_id=ps.id
    and readiness not in ('satisfied','not_applicable');

  if incomplete_count > 0 then
    raise exception 'predevelopment_requirements_incomplete:%',incomplete_count;
  end if;

  insert into public.project_state_stage_requirements
    (project_state_id, stage, requirement_key, label, required, status, notes, updated_by)
  values
    (ps.id, 'authorization', 'predevelopment_readiness', 'Predevelopment readiness confirmed', true, 'satisfied', 'All seven Predevelopment domains are satisfied or not applicable at Authorization entry.', uid)
  on conflict (project_state_id, stage, requirement_key) do update
    set label = excluded.label,
        required = excluded.required,
        status = excluded.status,
        notes = excluded.notes,
        updated_by = uid,
        updated_at = now();

  update public.project_states set stage='authorization',updated_at=now() where id=ps.id returning * into ps;
  return ps;
end
$function$;
