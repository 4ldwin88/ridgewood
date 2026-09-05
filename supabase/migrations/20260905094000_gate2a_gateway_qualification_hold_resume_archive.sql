-- Gate 2A command-gateway hardening.
-- Preserve public SECURITY INVOKER RPC contracts while moving Project State
-- mutation behind narrowly validated private SECURITY DEFINER commands.

create or replace function private.set_project_state_qualification_decision_command(project_state_input uuid, decision_input text, rationale_input text default null)
returns public.project_states language plpgsql security definer set search_path = '' as $$
declare uid uuid:=auth.uid(); ps public.project_states; finding_count integer; adverse_count integer;
begin
 if uid is null then raise exception 'authentication_required'; end if;
 if decision_input not in ('advance','hold','decline') then raise exception 'invalid_qualification_decision'; end if;
 select * into ps from public.project_states where id=project_state_input for update;
 if ps.id is null then raise exception 'project_state_not_found'; end if;
 if not public.is_workspace_member(ps.workspace_id) then raise exception 'workspace_access_denied'; end if;
 if ps.status <> 'active' then raise exception 'qualification_decision_not_allowed_for_status:%',ps.status; end if;
 if ps.stage <> 'qualification' then raise exception 'qualification_decision_not_allowed_from_stage:%',ps.stage; end if;
 if decision_input='advance' then
   select count(*) into finding_count from public.project_state_qualification_findings where project_state_id=ps.id and area in ('opportunity_credibility','strategic_fit','relationship_authority','commercial_plausibility','execution_risk');
   if finding_count < 5 then raise exception 'qualification_domains_incomplete:%',5-finding_count; end if;
   select count(*) into adverse_count from public.project_state_qualification_findings where project_state_id=ps.id and assessment in ('unclear','no');
   if adverse_count > 0 and nullif(trim(rationale_input),'') is null then raise exception 'qualification_advance_rationale_required:%',adverse_count; end if;
 end if;
 insert into public.project_state_qualification_decisions(workspace_id,project_state_id,decision,rationale,decided_by) values(ps.workspace_id,ps.id,decision_input,nullif(trim(rationale_input),''),uid);
 update public.project_states set stage=case when decision_input='advance' then 'predevelopment' else stage end,status=case decision_input when 'hold' then 'held' when 'decline' then 'declined' else 'active' end,updated_at=now() where id=ps.id returning * into ps;
 return ps;
end $$;
create or replace function public.set_project_state_qualification_decision(project_state_input uuid, decision_input text, rationale_input text default null)
returns public.project_states language sql security invoker set search_path = '' as $$ select private.set_project_state_qualification_decision_command(project_state_input,decision_input,rationale_input); $$;

create or replace function private.resume_held_project_state_command(project_state_input uuid)
returns public.project_states language plpgsql security definer set search_path = '' as $$
declare result public.project_states;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 select * into result from public.project_states ps where ps.id=project_state_input and ps.archived_at is null for update;
 if result.id is null then raise exception 'Project State not found'; end if;
 if not public.is_workspace_member(result.workspace_id) then raise exception 'Workspace membership required'; end if;
 if result.status <> 'held' then raise exception 'Only a held Project State can be resumed'; end if;
 update public.project_states set status='active',updated_at=now() where id=project_state_input returning * into result;
 return result;
end $$;
create or replace function public.resume_held_project_state(project_state_input uuid)
returns public.project_states language sql security invoker set search_path = '' as $$ select private.resume_held_project_state_command(project_state_input); $$;

create or replace function private.archive_project_state_command(project_state_input uuid)
returns public.project_states language plpgsql security definer set search_path = '' as $$
declare uid uuid:=auth.uid(); ps public.project_states;
begin
 if uid is null then raise exception 'authentication_required'; end if;
 select * into ps from public.project_states where id=project_state_input for update;
 if ps.id is null then raise exception 'project_state_not_found'; end if;
 if not public.is_workspace_member(ps.workspace_id) then raise exception 'workspace_access_denied'; end if;
 if ps.archived_at is not null then raise exception 'project_state_already_archived'; end if;
 update public.project_states set archived_at=now(),archived_by=uid,updated_at=now() where id=ps.id returning * into ps;
 return ps;
end $$;
create or replace function public.archive_project_state(project_state_input uuid)
returns public.project_states language sql security invoker set search_path = '' as $$ select private.archive_project_state_command(project_state_input); $$;

revoke execute on function private.set_project_state_qualification_decision_command(uuid,text,text) from public, anon;
revoke execute on function private.resume_held_project_state_command(uuid) from public, anon;
revoke execute on function private.archive_project_state_command(uuid) from public, anon;
grant usage on schema private to authenticated, service_role;
grant execute on function private.set_project_state_qualification_decision_command(uuid,text,text) to authenticated, service_role;
grant execute on function private.resume_held_project_state_command(uuid) to authenticated, service_role;
grant execute on function private.archive_project_state_command(uuid) to authenticated, service_role;
revoke execute on function public.set_project_state_qualification_decision(uuid,text,text) from public, anon;
revoke execute on function public.resume_held_project_state(uuid) from public, anon;
revoke execute on function public.archive_project_state(uuid) from public, anon;
grant execute on function public.set_project_state_qualification_decision(uuid,text,text) to authenticated, service_role;
grant execute on function public.resume_held_project_state(uuid) to authenticated, service_role;
grant execute on function public.archive_project_state(uuid) to authenticated, service_role;
