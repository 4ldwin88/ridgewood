-- Gate 2A: move remaining lifecycle stage mutations behind private privileged commands.

create or replace function private.enter_project_state_authorization_command(project_state_input uuid)
returns public.project_states
language plpgsql
security definer
set search_path = ''
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
  select count(*) into incomplete_count from public.predevelopment_domains where project_state_id=ps.id and readiness not in ('satisfied','not_applicable');
  if incomplete_count > 0 then raise exception 'predevelopment_requirements_incomplete:%',incomplete_count; end if;
  insert into public.project_state_stage_requirements (project_state_id, stage, requirement_key, label, required, status, notes, updated_by)
  values (ps.id, 'authorization', 'predevelopment_readiness', 'Predevelopment readiness confirmed', true, 'satisfied', 'All seven Predevelopment domains are satisfied or not applicable at Authorization entry.', uid)
  on conflict (project_state_id, stage, requirement_key) do update set label=excluded.label, required=excluded.required, status=excluded.status, notes=excluded.notes, updated_by=uid, updated_at=now();
  update public.project_states set stage='authorization',updated_at=now() where id=ps.id returning * into ps;
  return ps;
end
$function$;

create or replace function public.enter_project_state_authorization(project_state_input uuid)
returns public.project_states language sql security invoker set search_path = '' as $function$
  select private.enter_project_state_authorization_command(project_state_input);
$function$;

create or replace function private.enter_project_state_preconstruction_mobilization_command(project_state_input uuid)
returns public.project_states
language plpgsql
security definer
set search_path = ''
as $function$
declare uid uuid := auth.uid(); ps public.project_states;
begin
  if uid is null then raise exception 'authentication_required'; end if;
  select * into ps from public.project_states where id=project_state_input for update;
  if ps.id is null or not public.is_workspace_member(ps.workspace_id) then raise exception 'project_state_not_found_or_access_denied'; end if;
  if ps.status <> 'active' or ps.archived_at is not null or ps.stage <> 'project_authorization_setup' then raise exception 'preconstruction_transition_not_allowed'; end if;
  perform public.ensure_project_authorization_setup_requirements(ps.id);
  if exists(select 1 from public.project_state_stage_requirements r where r.project_state_id=ps.id and r.stage='project_authorization_setup' and r.required and r.status not in ('satisfied'::public.readiness_state,'not_applicable'::public.readiness_state)) then raise exception 'project_setup_requirements_incomplete'; end if;
  update public.project_states set stage='preconstruction_mobilization',commercial_stage='preconstruction_mobilization',updated_at=now() where id=ps.id returning * into ps;
  insert into public.audit_events(project_state_id,event_type,actor_user_id,payload,occurred_at) values(ps.id,'project_entered_preconstruction_mobilization',uid,jsonb_build_object('gate','gate_02_project_start_mobilization'),now());
  return ps;
end
$function$;

create or replace function public.enter_project_state_preconstruction_mobilization(project_state_input uuid)
returns public.project_states language sql security invoker set search_path = '' as $function$
  select private.enter_project_state_preconstruction_mobilization_command(project_state_input);
$function$;

revoke execute on function private.enter_project_state_authorization_command(uuid) from public, anon;
revoke execute on function private.enter_project_state_preconstruction_mobilization_command(uuid) from public, anon;
grant execute on function private.enter_project_state_authorization_command(uuid) to authenticated, service_role;
grant execute on function private.enter_project_state_preconstruction_mobilization_command(uuid) to authenticated, service_role;
revoke execute on function public.enter_project_state_authorization(uuid) from public, anon;
revoke execute on function public.enter_project_state_preconstruction_mobilization(uuid) from public, anon;
grant execute on function public.enter_project_state_authorization(uuid) to authenticated, service_role;
grant execute on function public.enter_project_state_preconstruction_mobilization(uuid) to authenticated, service_role;
