create or replace function private.update_project_state_opportunity_basics_command(project_state_input uuid, basics_input jsonb)
returns public.project_states
language plpgsql security definer set search_path = '' as $$
declare uid uuid:=auth.uid(); ps public.project_states; clean_name text;
begin
 if uid is null then raise exception 'authentication_required'; end if;
 select * into ps from public.project_states where id=project_state_input for update;
 if ps.id is null then raise exception 'project_state_not_found'; end if;
 if not public.is_workspace_member(ps.workspace_id) then raise exception 'workspace_access_denied'; end if;
 if ps.status <> 'active' then raise exception 'opportunity_edit_not_allowed_for_status:%',ps.status; end if;
 if ps.stage <> 'opportunity' then raise exception 'opportunity_edit_not_allowed_from_stage:%',ps.stage; end if;
 clean_name:=nullif(trim(coalesce(basics_input->>'name',ps.name)),'');
 if clean_name is null then raise exception 'project_state_name_required'; end if;
 update public.project_states set name=clean_name,
 site_location=case when basics_input?'site_location' then nullif(trim(basics_input->>'site_location'),'') else site_location end,
 sector=case when basics_input?'sector' then nullif(trim(basics_input->>'sector'),'') else sector end,
 source_context=case when basics_input?'source_context' then nullif(trim(basics_input->>'source_context'),'') else source_context end,
 summary=case when basics_input?'summary' then nullif(trim(basics_input->>'summary'),'') else summary end,
 next_action=case when basics_input?'next_action' then nullif(trim(basics_input->>'next_action'),'') else next_action end,
 updated_at=now() where id=ps.id returning * into ps;
 perform public.refresh_project_state_opportunity_requirements(ps.id); return ps;
end $$;
create or replace function public.update_project_state_opportunity_basics(project_state_input uuid, basics_input jsonb)
returns public.project_states language sql security invoker set search_path='' as $$ select private.update_project_state_opportunity_basics_command(project_state_input,basics_input) $$;

create or replace function private.advance_project_state_to_qualification_command(project_state_input uuid)
returns public.project_states language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); ps public.project_states; incomplete_count integer;
begin
 if uid is null then raise exception 'authentication_required'; end if;
 select * into ps from public.project_states where id=project_state_input for update;
 if ps.id is null then raise exception 'project_state_not_found'; end if;
 if not public.is_workspace_member(ps.workspace_id) then raise exception 'workspace_access_denied'; end if;
 if ps.status <> 'active' then raise exception 'stage_advance_not_allowed_for_status:%',ps.status; end if;
 if ps.stage <> 'opportunity' then raise exception 'stage_advance_not_allowed_from:%',ps.stage; end if;
 perform public.refresh_project_state_opportunity_requirements(ps.id);
 select count(*) into incomplete_count from public.project_state_stage_requirements where project_state_id=ps.id and stage='opportunity' and required and status<>'satisfied';
 if incomplete_count>0 then raise exception 'opportunity_requirements_incomplete:%',incomplete_count; end if;
 update public.project_states set stage='qualification',updated_at=now() where id=ps.id returning * into ps; return ps;
end $$;
create or replace function public.advance_project_state_to_qualification(project_state_input uuid)
returns public.project_states language sql security invoker set search_path='' as $$ select private.advance_project_state_to_qualification_command(project_state_input) $$;

revoke all on function private.update_project_state_opportunity_basics_command(uuid,jsonb) from public,anon;
revoke all on function private.advance_project_state_to_qualification_command(uuid) from public,anon;
grant execute on function private.update_project_state_opportunity_basics_command(uuid,jsonb) to authenticated,service_role;
grant execute on function private.advance_project_state_to_qualification_command(uuid) to authenticated,service_role;
revoke all on function public.update_project_state_opportunity_basics(uuid,jsonb) from public,anon;
revoke all on function public.advance_project_state_to_qualification(uuid) from public,anon;
grant execute on function public.update_project_state_opportunity_basics(uuid,jsonb) to authenticated,service_role;
grant execute on function public.advance_project_state_to_qualification(uuid) to authenticated,service_role;