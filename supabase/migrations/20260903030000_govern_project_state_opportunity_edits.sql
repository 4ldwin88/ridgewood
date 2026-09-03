create or replace function public.refresh_project_state_opportunity_requirements(project_state_input uuid)
returns setof public.project_state_stage_requirements
language plpgsql
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  ps public.project_states;
begin
  if uid is null then raise exception 'authentication_required'; end if;
  select * into ps from public.project_states where id = project_state_input;
  if ps.id is null then raise exception 'project_state_not_found'; end if;
  if not public.is_workspace_member(ps.workspace_id) then raise exception 'workspace_access_denied'; end if;

  update public.project_state_stage_requirements r
  set status = case r.requirement_key
    when 'basic_identity' then case when nullif(trim(ps.name),'') is not null then 'satisfied'::public.readiness_state else 'not_started'::public.readiness_state end
    when 'initial_context' then case when nullif(trim(ps.site_location),'') is not null or nullif(trim(ps.sector),'') is not null or nullif(trim(ps.source_context),'') is not null or nullif(trim(ps.summary),'') is not null then 'satisfied'::public.readiness_state else 'not_started'::public.readiness_state end
    when 'next_step' then case when nullif(trim(ps.next_action),'') is not null then 'satisfied'::public.readiness_state else 'not_started'::public.readiness_state end
    else r.status end,
    updated_by = uid,
    updated_at = now()
  where r.project_state_id = ps.id and r.stage = 'opportunity';

  return query select * from public.project_state_stage_requirements where project_state_id = ps.id and stage = 'opportunity' order by requirement_key;
end
$$;

create or replace function public.update_project_state_opportunity_basics(project_state_input uuid, basics_input jsonb)
returns public.project_states
language plpgsql
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  ps public.project_states;
  clean_name text;
begin
  if uid is null then raise exception 'authentication_required'; end if;
  select * into ps from public.project_states where id = project_state_input for update;
  if ps.id is null then raise exception 'project_state_not_found'; end if;
  if not public.is_workspace_member(ps.workspace_id) then raise exception 'workspace_access_denied'; end if;
  if ps.status <> 'active' then raise exception 'opportunity_edit_not_allowed_for_status:%', ps.status; end if;
  if ps.stage <> 'opportunity' then raise exception 'opportunity_edit_not_allowed_from_stage:%', ps.stage; end if;

  clean_name := nullif(trim(coalesce(basics_input->>'name', ps.name)), '');
  if clean_name is null then raise exception 'project_state_name_required'; end if;

  update public.project_states
  set name = clean_name,
      site_location = case when basics_input ? 'site_location' then nullif(trim(basics_input->>'site_location'),'') else site_location end,
      sector = case when basics_input ? 'sector' then nullif(trim(basics_input->>'sector'),'') else sector end,
      source_context = case when basics_input ? 'source_context' then nullif(trim(basics_input->>'source_context'),'') else source_context end,
      summary = case when basics_input ? 'summary' then nullif(trim(basics_input->>'summary'),'') else summary end,
      next_action = case when basics_input ? 'next_action' then nullif(trim(basics_input->>'next_action'),'') else next_action end,
      updated_at = now()
  where id = ps.id
  returning * into ps;

  perform public.refresh_project_state_opportunity_requirements(ps.id);
  return ps;
end
$$;

grant execute on function public.update_project_state_opportunity_basics(uuid,jsonb) to authenticated;
