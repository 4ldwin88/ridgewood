-- Intake creates Project State directly. Opportunity is its initial stage.
create or replace function public.create_project_state(project_state_input jsonb)
returns public.project_states language plpgsql security invoker set search_path='' as $$
declare uid uuid:=auth.uid(); wid uuid; ps public.project_states;
begin
  if uid is null then raise exception 'authentication_required'; end if;
  select wm.workspace_id into wid from public.workspace_memberships wm where wm.user_id=uid and wm.status='active' order by wm.created_at limit 1;
  if wid is null then raise exception 'workspace_required'; end if;
  insert into public.project_states(id,workspace_id,state,name,organization_id,site_location,project_type,sector,source_context,summary,priority,commercial_stage,commercial_probability,next_action,owner_user_id,created_by,created_at,updated_at)
  values(coalesce((project_state_input->>'id')::uuid,gen_random_uuid()),wid,coalesce(project_state_input->>'state','potential'),trim(project_state_input->>'name'),nullif(project_state_input->>'organization_id','')::uuid,nullif(project_state_input->>'site_location',''),nullif(project_state_input->>'project_type',''),nullif(project_state_input->>'sector',''),nullif(project_state_input->>'source_context',''),nullif(project_state_input->>'summary',''),nullif(project_state_input->>'priority',''),nullif(project_state_input->>'commercial_stage',''),nullif(project_state_input->>'commercial_probability','')::smallint,nullif(project_state_input->>'next_action',''),uid,uid,now(),now()) returning * into ps;
  insert into public.project_state_stage_requirements(project_state_id,stage,requirement_key,label,status,required,updated_by) values
    (ps.id,'opportunity','basic_identity','Basic project identity captured',case when nullif(trim(ps.name),'') is not null then 'satisfied'::public.readiness_state else 'not_started'::public.readiness_state end,true,uid),
    (ps.id,'opportunity','initial_context','Initial context captured',case when ps.site_location is not null or ps.sector is not null or ps.source_context is not null or ps.summary is not null then 'satisfied'::public.readiness_state else 'not_started'::public.readiness_state end,true,uid),
    (ps.id,'opportunity','next_step','Next step identified',case when ps.next_action is not null then 'satisfied'::public.readiness_state else 'not_started'::public.readiness_state end,true,uid);
  return ps;
end $$;
grant execute on function public.create_project_state(jsonb) to authenticated;
revoke execute on function public.create_opportunity_with_project_state(jsonb) from authenticated, anon;
comment on function public.create_project_state(jsonb) is 'Creates the authoritative Project State directly. Opportunity is represented by the initial stage and its requirements; no Opportunity entity is created.';
comment on function public.create_opportunity_with_project_state(jsonb) is 'Retired transitional command. Opportunity is a Project State stage; runtime must call create_project_state(jsonb).';
drop policy if exists project_states_insert_workspace on public.project_states;
create policy project_states_insert_workspace on public.project_states for insert to authenticated with check (public.is_workspace_member(workspace_id) and created_by=auth.uid() and owner_user_id=auth.uid());
revoke delete,truncate,trigger,references on public.project_states from authenticated;
