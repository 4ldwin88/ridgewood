-- Gate 2A: begin command-only Project State mutation boundary.
-- Keep the Data API-facing RPC SECURITY INVOKER while moving the privileged
-- table mutation into a non-exposed private SECURITY DEFINER command.

create or replace function private.create_project_state_command(project_state_input jsonb)
returns public.project_states
language plpgsql
security definer
set search_path = ''
as $function$
declare
  uid uuid := auth.uid();
  wid uuid;
  ps public.project_states;
  clean_name text;
begin
  if uid is null then raise exception 'authentication_required'; end if;
  clean_name := nullif(pg_catalog.trim(project_state_input->>'name'),'');
  if clean_name is null then raise exception 'project_state_name_required'; end if;

  select wm.workspace_id into wid
  from public.workspace_memberships wm
  where wm.user_id = uid and wm.status = 'active'
  order by wm.created_at
  limit 1;
  if wid is null then raise exception 'active_workspace_required'; end if;
  if not public.is_workspace_member(wid) then raise exception 'workspace_access_denied'; end if;

  insert into public.project_states(
    workspace_id,stage,status,created_by,name,organization_id,site_location,project_type,sector,
    source_context,summary,priority,commercial_stage,commercial_probability,next_action,owner_user_id
  ) values (
    wid,'opportunity','active',uid,clean_name,
    nullif(project_state_input->>'organization_id','')::uuid,
    nullif(pg_catalog.trim(project_state_input->>'site_location'),''),
    nullif(pg_catalog.trim(project_state_input->>'project_type'),''),
    nullif(pg_catalog.trim(project_state_input->>'sector'),''),
    nullif(pg_catalog.trim(project_state_input->>'source_context'),''),
    nullif(pg_catalog.trim(project_state_input->>'summary'),''),
    coalesce(nullif(pg_catalog.trim(project_state_input->>'priority'),''),'medium'),
    coalesce(nullif(pg_catalog.trim(project_state_input->>'commercial_stage'),''),'unknown'),
    nullif(project_state_input->>'commercial_probability','')::smallint,
    nullif(pg_catalog.trim(project_state_input->>'next_action'),''),uid
  ) returning * into ps;

  insert into public.project_state_stage_requirements(project_state_id,stage,requirement_key,label,status,required,updated_by)
  values
    (ps.id,'opportunity','basic_identity','Basic project identity captured','satisfied'::public.readiness_state,true,uid),
    (ps.id,'opportunity','initial_context','Initial context captured',case when ps.site_location is not null or ps.sector is not null or ps.source_context is not null or ps.summary is not null then 'satisfied'::public.readiness_state else 'not_started'::public.readiness_state end,true,uid),
    (ps.id,'opportunity','next_step','Next step identified',case when ps.next_action is not null then 'satisfied'::public.readiness_state else 'not_started'::public.readiness_state end,true,uid);
  return ps;
end
$function$;

revoke all on function private.create_project_state_command(jsonb) from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.create_project_state_command(jsonb) to authenticated, service_role;

create or replace function public.create_project_state(project_state_input jsonb)
returns public.project_states
language plpgsql
security invoker
set search_path = ''
as $function$
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  return private.create_project_state_command(project_state_input);
end
$function$;

revoke all on function public.create_project_state(jsonb) from public, anon;
grant execute on function public.create_project_state(jsonb) to authenticated, service_role;
