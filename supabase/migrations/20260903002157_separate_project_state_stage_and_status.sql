alter table public.project_states add column if not exists stage text;
alter table public.project_states add column if not exists status text;

update public.project_states
set stage = case state
  when 'potential' then 'opportunity'
  when 'opportunity' then 'opportunity'
  when 'qualification' then 'qualification'
  when 'predevelopment' then 'predevelopment'
  when 'authorization_ready' then 'authorization'
  when 'authorized' then 'authorized'
  when 'held' then 'qualification'
  when 'declined' then 'qualification'
  when 'lost' then 'qualification'
  else 'opportunity'
end,
status = case state
  when 'held' then 'held'
  when 'declined' then 'declined'
  when 'lost' then 'lost'
  else 'active'
end
where stage is null or status is null;

alter table public.project_states alter column stage set default 'opportunity';
alter table public.project_states alter column status set default 'active';
alter table public.project_states alter column stage set not null;
alter table public.project_states alter column status set not null;
alter table public.project_states add constraint project_states_stage_check check (stage in ('opportunity','qualification','predevelopment','authorization','authorized'));
alter table public.project_states add constraint project_states_status_check check (status in ('active','held','declined','lost'));

update public.project_states set state=stage;
alter table public.project_states drop column state;

create index if not exists project_states_workspace_stage_status_idx on public.project_states(workspace_id,stage,status) where archived_at is null;
comment on column public.project_states.stage is 'Current lifecycle stage of the authoritative Project State.';
comment on column public.project_states.status is 'Current operating status/outcome, independent of lifecycle stage.';

create or replace function public.create_project_state(project_state_input jsonb)
returns public.project_states language plpgsql security invoker set search_path='' as $$
declare uid uuid:=auth.uid(); wid uuid; ps public.project_states; clean_name text;
begin
  if uid is null then raise exception 'authentication_required'; end if;
  clean_name:=nullif(trim(project_state_input->>'name'),'');
  if clean_name is null then raise exception 'project_state_name_required'; end if;
  select wm.workspace_id into wid from public.workspace_memberships wm where wm.user_id=uid and wm.status='active' order by wm.created_at limit 1;
  if wid is null then raise exception 'active_workspace_required'; end if;
  insert into public.project_states(workspace_id,stage,status,created_by,name,organization_id,site_location,project_type,sector,source_context,summary,priority,commercial_stage,commercial_probability,next_action,owner_user_id)
  values(wid,'opportunity','active',uid,clean_name,nullif(project_state_input->>'organization_id','')::uuid,nullif(trim(project_state_input->>'site_location'),''),nullif(trim(project_state_input->>'project_type'),''),nullif(trim(project_state_input->>'sector'),''),nullif(trim(project_state_input->>'source_context'),''),nullif(trim(project_state_input->>'summary'),''),coalesce(nullif(trim(project_state_input->>'priority'),''),'medium'),coalesce(nullif(trim(project_state_input->>'commercial_stage'),''),'unknown'),nullif(project_state_input->>'commercial_probability','')::smallint,nullif(trim(project_state_input->>'next_action'),''),uid)
  returning * into ps;
  insert into public.project_state_stage_requirements(project_state_id,stage,requirement_key,label,status,required,updated_by)
  values
    (ps.id,'opportunity','basic_identity','Basic project identity captured','satisfied',true,uid),
    (ps.id,'opportunity','initial_context','Initial context captured',case when ps.site_location is not null or ps.sector is not null or ps.source_context is not null or ps.summary is not null then 'satisfied' else 'not_started' end,true,uid),
    (ps.id,'opportunity','next_step','Next step identified',case when ps.next_action is not null then 'satisfied' else 'not_started' end,true,uid);
  return ps;
end $$;

drop function if exists public.set_project_state_qualification_decision(uuid,text,text);
create function public.set_project_state_qualification_decision(project_state_input uuid, decision_input text, rationale_input text default null)
returns public.project_states language plpgsql security invoker set search_path='' as $$
declare uid uuid:=auth.uid(); ps public.project_states;
begin
  if uid is null then raise exception 'authentication_required'; end if;
  if decision_input not in ('advance','hold','decline') then raise exception 'invalid_qualification_decision'; end if;
  select * into ps from public.project_states where id=project_state_input for update;
  if ps.id is null then raise exception 'project_state_not_found'; end if;
  if not public.is_workspace_member(ps.workspace_id) then raise exception 'workspace_access_denied'; end if;
  if ps.status <> 'active' then raise exception 'qualification_decision_not_allowed_for_status:%',ps.status; end if;
  if ps.stage not in ('opportunity','qualification') then raise exception 'qualification_decision_not_allowed_from_stage:%',ps.stage; end if;
  insert into public.opportunity_qualification_decisions(workspace_id,project_state_id,decision,rationale,decided_by)
  values(ps.workspace_id,ps.id,decision_input,nullif(trim(rationale_input),''),uid);
  update public.project_states set
    stage=case when decision_input='advance' then 'predevelopment' else stage end,
    status=case decision_input when 'hold' then 'held' when 'decline' then 'declined' else 'active' end,
    updated_at=now()
  where id=ps.id returning * into ps;
  return ps;
end $$;
grant execute on function public.set_project_state_qualification_decision(uuid,text,text) to authenticated;
