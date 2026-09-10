create or replace function public.ensure_project_authorization_setup_requirements(project_state_input uuid)
returns setof public.project_state_stage_requirements
language plpgsql
security invoker
set search_path = public
as $$
declare
  ps public.project_states;
begin
  select * into ps from public.project_states where id=project_state_input;
  if ps.id is null or not public.is_workspace_member(ps.workspace_id) then raise exception 'project_state_not_found_or_access_denied'; end if;
  insert into public.project_state_stage_requirements(project_state_id,stage,gate_key,requirement_key,label,status,required,updated_by,updated_at)
  values
    (ps.id,'project_authorization_setup','gate_02_project_start_mobilization','delivery_ownership','Delivery ownership established','not_started',true,auth.uid(),now()),
    (ps.id,'project_authorization_setup','gate_02_project_start_mobilization','commercial_baseline','Commercial baseline established','not_started',true,auth.uid(),now()),
    (ps.id,'project_authorization_setup','gate_02_project_start_mobilization','scope_baseline','Scope baseline established','not_started',true,auth.uid(),now()),
    (ps.id,'project_authorization_setup','gate_02_project_start_mobilization','schedule_baseline','Schedule baseline established','not_started',true,auth.uid(),now()),
    (ps.id,'project_authorization_setup','gate_02_project_start_mobilization','project_controls','Core project controls initialized','not_started',true,auth.uid(),now()),
    (ps.id,'project_authorization_setup','gate_02_project_start_mobilization','document_structure','Project document structure initialized','not_started',true,auth.uid(),now())
  on conflict(project_state_id,stage,requirement_key) do update set gate_key=excluded.gate_key,label=excluded.label,required=excluded.required,updated_at=now();
  return query select r.* from public.project_state_stage_requirements r where r.project_state_id=ps.id and r.stage='project_authorization_setup' order by r.requirement_key;
end;
$$;
revoke all on function public.ensure_project_authorization_setup_requirements(uuid) from public, anon;
grant execute on function public.ensure_project_authorization_setup_requirements(uuid) to authenticated, service_role;

create or replace function public.enter_project_state_preconstruction_mobilization(project_state_input uuid)
returns public.project_states
language plpgsql
security invoker
set search_path=public
as $$
declare ps public.project_states;
begin
  select * into ps from public.project_states where id=project_state_input for update;
  if ps.id is null or not public.is_workspace_member(ps.workspace_id) then raise exception 'project_state_not_found_or_access_denied'; end if;
  if ps.status <> 'active' or ps.archived_at is not null or ps.stage <> 'project_authorization_setup' then raise exception 'preconstruction_transition_not_allowed'; end if;
  perform public.ensure_project_authorization_setup_requirements(ps.id);
  if exists(select 1 from public.project_state_stage_requirements r where r.project_state_id=ps.id and r.stage='project_authorization_setup' and r.required and r.status not in ('satisfied'::public.readiness_state,'not_applicable'::public.readiness_state)) then raise exception 'project_setup_requirements_incomplete'; end if;
  update public.project_states set stage='preconstruction_mobilization',commercial_stage='preconstruction_mobilization',updated_at=now() where id=ps.id returning * into ps;
  insert into public.audit_events(project_state_id,event_type,actor_user_id,payload,occurred_at) values(ps.id,'project_entered_preconstruction_mobilization',auth.uid(),jsonb_build_object('gate','gate_02_project_start_mobilization'),now());
  return ps;
end;
$$;
revoke all on function public.enter_project_state_preconstruction_mobilization(uuid) from public, anon;
grant execute on function public.enter_project_state_preconstruction_mobilization(uuid) to authenticated, service_role;

comment on function public.ensure_project_authorization_setup_requirements(uuid) is 'Initializes the thin Edward-reference requirements for Project Authorization & Setup leading to Gate 02 Project Start / Mobilization.';
comment on function public.enter_project_state_preconstruction_mobilization(uuid) is 'Crosses Gate 02 after required Project Authorization & Setup requirements are resolved, preserving the same Project State.';
