create or replace function public.restore_preauthorization_project_state(project_state_input uuid, reason_input text, basis_input text default null) returns public.project_states language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); ps public.project_states; prior_status_value text; prior_stage_value text; reassessment_note text;
begin
 if uid is null then raise exception 'authentication_required'; end if;
 if nullif(trim(reason_input),'') is null then raise exception 'restore_reason_required'; end if;
 select * into ps from public.project_states where id=project_state_input for update;
 if ps.id is null then raise exception 'project_state_not_found'; end if;
 if not public.is_workspace_member(ps.workspace_id) then raise exception 'workspace_access_denied'; end if;
 if ps.stage in ('project_authorization_setup','preconstruction_mobilization','construction_control','completion_turnover','project_closeout','warranty_final_close','closed') then raise exception 'preauthorization_restore_not_allowed_after_authorization'; end if;
 if ps.status not in ('declined','withdrawn_lost','lost') and ps.archived_at is null then raise exception 'inactive_project_state_required_restore'; end if;
 prior_status_value:=case when ps.archived_at is not null then 'archived' else ps.status end; prior_stage_value:=ps.stage;
 update public.project_states set status='active',archived_at=null,archived_by=null,updated_at=now() where id=ps.id returning * into ps;
 reassessment_note:='Restored/reopened on '||to_char(now(),'YYYY-MM-DD')||'. Reassess time-sensitive or stale prior work before relying on it. Restore reason: '||trim(reason_input);
 insert into public.project_state_stage_requirements(project_state_id,stage,requirement_key,label,status,required,notes,updated_by,updated_at,gate_key)
 values(ps.id,ps.stage,'restoration_reassessment','Restoration reassessment','in_progress'::public.readiness_state,true,reassessment_note,uid,now(),'restoration_reassessment')
 on conflict (project_state_id,stage,requirement_key) do update set status='in_progress'::public.readiness_state,required=true,notes=excluded.notes,updated_by=uid,updated_at=now(),gate_key='restoration_reassessment';
 insert into public.project_state_disposition_events(workspace_id,project_state_id,event_type,prior_status,new_status,prior_stage,reason,basis,actor_user_id) values(ps.workspace_id,ps.id,'restore',prior_status_value,'active',prior_stage_value,trim(reason_input),nullif(trim(basis_input),''),uid);
 return ps;
end $$;
revoke all on function public.restore_preauthorization_project_state(uuid,text,text) from public,anon; grant execute on function public.restore_preauthorization_project_state(uuid,text,text) to authenticated;
