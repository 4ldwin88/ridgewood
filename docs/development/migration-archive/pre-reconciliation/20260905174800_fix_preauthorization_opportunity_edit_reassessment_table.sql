create or replace function private.update_project_state_opportunity_basics_command(project_state_input uuid, basics_input jsonb)
returns public.project_states
language plpgsql
security definer
set search_path=''
as $function$
declare uid uuid:=auth.uid(); ps public.project_states; clean_name text;
begin
 if uid is null then raise exception 'authentication_required'; end if;
 select * into ps from public.project_states where id=project_state_input for update;
 if ps.id is null then raise exception 'project_state_not_found'; end if;
 if not public.is_workspace_member(ps.workspace_id) then raise exception 'workspace_access_denied'; end if;
 if ps.status <> 'active' then raise exception 'opportunity_edit_not_allowed_for_status:%',ps.status; end if;
 if ps.stage not in ('opportunity','qualification','predevelopment','authorization') then raise exception 'opportunity_edit_not_allowed_from_stage:%',ps.stage; end if;
 clean_name:=nullif(pg_catalog.btrim(coalesce(basics_input->>'name',ps.name)),'');
 if clean_name is null then raise exception 'project_state_name_required'; end if;
 update public.project_states set name=clean_name,site_location=case when basics_input?'site_location' then nullif(pg_catalog.btrim(basics_input->>'site_location'),'') else site_location end,sector=case when basics_input?'sector' then nullif(pg_catalog.btrim(basics_input->>'sector'),'') else sector end,source_context=case when basics_input?'source_context' then nullif(pg_catalog.btrim(basics_input->>'source_context'),'') else source_context end,summary=case when basics_input?'summary' then nullif(pg_catalog.btrim(basics_input->>'summary'),'') else summary end,next_action=case when basics_input?'next_action' then nullif(pg_catalog.btrim(basics_input->>'next_action'),'') else next_action end,updated_at=pg_catalog.now() where id=ps.id returning * into ps;
 perform public.refresh_project_state_opportunity_requirements(ps.id);
 if ps.stage in ('predevelopment','authorization') then
   update public.predevelopment_domains set readiness=case when readiness='not_started' then readiness else 'in_progress' end,updated_at=pg_catalog.now(),updated_by=uid where project_state_id=ps.id;
 end if;
 return ps;
end $function$;
