create or replace function public.refresh_project_state_opportunity_requirements(project_state_input uuid)
returns setof public.project_state_stage_requirements
language plpgsql
security invoker
set search_path=''
as $$
declare
  uid uuid:=auth.uid();
  ps public.project_states;
begin
  if uid is null then raise exception 'authentication_required'; end if;
  select * into ps from public.project_states where id=project_state_input;
  if ps.id is null then raise exception 'project_state_not_found'; end if;
  if not public.is_workspace_member(ps.workspace_id) then raise exception 'workspace_access_denied'; end if;

  update public.project_state_stage_requirements r
  set status=case r.requirement_key
      when 'basic_identity' then case when nullif(trim(ps.name),'') is not null then 'satisfied'::public.readiness_state else 'not_started'::public.readiness_state end
      when 'initial_context' then case when ps.site_location is not null or ps.sector is not null or ps.source_context is not null or ps.summary is not null then 'satisfied'::public.readiness_state else 'not_started'::public.readiness_state end
      when 'next_step' then case when ps.next_action is not null then 'satisfied'::public.readiness_state else 'not_started'::public.readiness_state end
      else r.status
    end,
    updated_by=uid,
    updated_at=now()
  where r.project_state_id=ps.id and r.stage='opportunity';

  return query select * from public.project_state_stage_requirements where project_state_id=ps.id and stage='opportunity' order by requirement_key;
end $$;

grant execute on function public.refresh_project_state_opportunity_requirements(uuid) to authenticated;

create or replace function public.advance_project_state_to_qualification(project_state_input uuid)
returns public.project_states
language plpgsql
security invoker
set search_path=''
as $$
declare
  uid uuid:=auth.uid();
  ps public.project_states;
  incomplete_count integer;
begin
  if uid is null then raise exception 'authentication_required'; end if;
  select * into ps from public.project_states where id=project_state_input for update;
  if ps.id is null then raise exception 'project_state_not_found'; end if;
  if not public.is_workspace_member(ps.workspace_id) then raise exception 'workspace_access_denied'; end if;
  if ps.status <> 'active' then raise exception 'stage_advance_not_allowed_for_status:%',ps.status; end if;
  if ps.stage <> 'opportunity' then raise exception 'stage_advance_not_allowed_from:%',ps.stage; end if;

  perform public.refresh_project_state_opportunity_requirements(ps.id);
  select count(*) into incomplete_count
  from public.project_state_stage_requirements
  where project_state_id=ps.id and stage='opportunity' and required and status <> 'satisfied';
  if incomplete_count > 0 then raise exception 'opportunity_requirements_incomplete:%',incomplete_count; end if;

  update public.project_states set stage='qualification',updated_at=now() where id=ps.id returning * into ps;
  return ps;
end $$;

grant execute on function public.advance_project_state_to_qualification(uuid) to authenticated;

create or replace function public.set_project_state_qualification_decision(project_state_input uuid, decision_input text, rationale_input text default null)
returns public.project_states language plpgsql security invoker set search_path='' as $$
declare uid uuid:=auth.uid(); ps public.project_states;
begin
  if uid is null then raise exception 'authentication_required'; end if;
  if decision_input not in ('advance','hold','decline') then raise exception 'invalid_qualification_decision'; end if;
  select * into ps from public.project_states where id=project_state_input for update;
  if ps.id is null then raise exception 'project_state_not_found'; end if;
  if not public.is_workspace_member(ps.workspace_id) then raise exception 'workspace_access_denied'; end if;
  if ps.status <> 'active' then raise exception 'qualification_decision_not_allowed_for_status:%',ps.status; end if;
  if ps.stage <> 'qualification' then raise exception 'qualification_decision_not_allowed_from_stage:%',ps.stage; end if;
  insert into public.opportunity_qualification_decisions(workspace_id,project_state_id,decision,rationale,decided_by)
  values(ps.workspace_id,ps.id,decision_input,nullif(trim(rationale_input),''),uid);
  update public.project_states set
    stage=case when decision_input='advance' then 'predevelopment' else stage end,
    status=case decision_input when 'hold' then 'held' when 'decline' then 'declined' else 'active' end,
    updated_at=now()
  where id=ps.id returning * into ps;
  return ps;
end $$;
