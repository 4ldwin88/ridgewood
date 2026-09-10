create or replace function public.set_project_state_preauthorization_disposition(project_state_input uuid, disposition_input text, reason_input text default null, basis_input text default null) returns public.project_states language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); ps public.project_states; prior_status_value text; prior_stage_value text; next_status text;
begin
 if uid is null then raise exception 'authentication_required'; end if;
 if disposition_input not in ('hold','resume','decline','withdraw_lost') then raise exception 'invalid_disposition'; end if;
 if nullif(trim(reason_input),'') is null then raise exception 'disposition_reason_required'; end if;
 select * into ps from public.project_states where id=project_state_input and archived_at is null for update;
 if ps.id is null then raise exception 'project_state_not_found'; end if;
 if not public.is_workspace_member(ps.workspace_id) then raise exception 'workspace_access_denied'; end if;
 if ps.stage in ('project_authorization_setup','preconstruction_mobilization','construction_control','completion_turnover','project_closeout','warranty_final_close','closed') then raise exception 'preauthorization_disposition_not_allowed_after_authorization'; end if;
 prior_status_value:=ps.status; prior_stage_value:=ps.stage;
 if disposition_input='resume' then if ps.status<>'held' then raise exception 'only_held_project_state_can_resume'; end if; next_status:='active';
 elsif disposition_input='hold' then if ps.status<>'active' then raise exception 'only_active_project_state_can_hold'; end if; next_status:='held';
 else if ps.status not in ('active','held') then raise exception 'inactive_project_state_required_restore'; end if; next_status:=case disposition_input when 'decline' then 'declined' else 'withdrawn_lost' end;
 end if;
 update public.project_states set status=next_status,updated_at=now() where id=ps.id returning * into ps;
 insert into public.project_state_disposition_events(workspace_id,project_state_id,event_type,prior_status,new_status,prior_stage,reason,basis,actor_user_id) values(ps.workspace_id,ps.id,disposition_input,prior_status_value,next_status,prior_stage_value,trim(reason_input),nullif(trim(basis_input),''),uid);
 return ps;
end $$;

create or replace function public.archive_preauthorization_project_state(project_state_input uuid, reason_input text, basis_input text default null) returns public.project_states language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); ps public.project_states; prior_status_value text; prior_stage_value text;
begin
 if uid is null then raise exception 'authentication_required'; end if;
 if nullif(trim(reason_input),'') is null then raise exception 'archive_reason_required'; end if;
 select * into ps from public.project_states where id=project_state_input and archived_at is null for update;
 if ps.id is null then raise exception 'project_state_not_found'; end if;
 if not public.is_workspace_member(ps.workspace_id) then raise exception 'workspace_access_denied'; end if;
 if ps.stage in ('project_authorization_setup','preconstruction_mobilization','construction_control','completion_turnover','project_closeout','warranty_final_close','closed') then raise exception 'preauthorization_archive_not_allowed_after_authorization'; end if;
 prior_status_value:=ps.status; prior_stage_value:=ps.stage;
 update public.project_states set archived_at=now(),archived_by=uid,updated_at=now() where id=ps.id returning * into ps;
 insert into public.project_state_disposition_events(workspace_id,project_state_id,event_type,prior_status,new_status,prior_stage,reason,basis,actor_user_id) values(ps.workspace_id,ps.id,'archive',prior_status_value,'archived',prior_stage_value,trim(reason_input),nullif(trim(basis_input),''),uid);
 return ps;
end $$;

revoke all on function public.set_project_state_preauthorization_disposition(uuid,text,text,text) from public,anon; grant execute on function public.set_project_state_preauthorization_disposition(uuid,text,text,text) to authenticated;
revoke all on function public.archive_preauthorization_project_state(uuid,text,text) from public,anon; grant execute on function public.archive_preauthorization_project_state(uuid,text,text) to authenticated;
