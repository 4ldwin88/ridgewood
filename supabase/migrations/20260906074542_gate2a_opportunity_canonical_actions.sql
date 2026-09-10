create or replace function public.refresh_project_state_opportunity_requirements(project_state_input uuid)
returns setof public.project_state_stage_requirements
language plpgsql
set search_path to ''
as $function$
declare
  uid uuid := auth.uid();
  ps public.project_states;
  has_open_action boolean := false;
begin
  if uid is null then raise exception 'authentication_required'; end if;
  select * into ps from public.project_states where id = project_state_input;
  if ps.id is null then raise exception 'project_state_not_found'; end if;
  if not public.is_workspace_member(ps.workspace_id) then raise exception 'workspace_access_denied'; end if;

  select exists(
    select 1 from public.actions a
    where a.project_state_id = ps.id
      and coalesce(a.lifecycle_stage,'opportunity') = 'opportunity'
      and a.status in ('open','in_progress','blocked')
  ) into has_open_action;

  update public.project_state_stage_requirements r
  set status = case r.requirement_key
    when 'basic_identity' then case when nullif(pg_catalog.btrim(ps.name),'') is not null then 'satisfied'::public.readiness_state else 'not_started'::public.readiness_state end
    when 'initial_context' then case when nullif(pg_catalog.btrim(ps.site_location),'') is not null or nullif(pg_catalog.btrim(ps.sector),'') is not null or nullif(pg_catalog.btrim(ps.source_context),'') is not null or nullif(pg_catalog.btrim(ps.summary),'') is not null then 'satisfied'::public.readiness_state else 'not_started'::public.readiness_state end
    when 'next_step' then case when has_open_action then 'satisfied'::public.readiness_state else 'not_started'::public.readiness_state end
    else r.status end,
    updated_by = uid,
    updated_at = pg_catalog.now()
  where r.project_state_id = ps.id and r.stage = 'opportunity';

  return query select * from public.project_state_stage_requirements where project_state_id = ps.id and stage = 'opportunity' order by requirement_key;
end
$function$;
