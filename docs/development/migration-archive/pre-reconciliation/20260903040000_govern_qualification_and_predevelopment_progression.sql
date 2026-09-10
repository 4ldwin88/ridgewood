create or replace function public.record_project_state_qualification_finding(project_state_input uuid, area_input text, assessment_input text, note_input text default null)
returns public.project_state_qualification_findings language plpgsql set search_path='' as $$
declare uid uuid:=auth.uid(); ps public.project_states; finding public.project_state_qualification_findings;
begin
 if uid is null then raise exception 'authentication_required'; end if;
 if area_input not in ('fit','stakeholders','site','commercial') then raise exception 'invalid_qualification_area'; end if;
 if assessment_input not in ('yes','unclear','no') then raise exception 'invalid_qualification_assessment'; end if;
 select * into ps from public.project_states where id=project_state_input for update;
 if ps.id is null then raise exception 'project_state_not_found'; end if;
 if not public.is_workspace_member(ps.workspace_id) then raise exception 'workspace_access_denied'; end if;
 if ps.status <> 'active' then raise exception 'qualification_finding_not_allowed_for_status:%',ps.status; end if;
 if ps.stage <> 'qualification' then raise exception 'qualification_finding_not_allowed_from_stage:%',ps.stage; end if;
 insert into public.project_state_qualification_findings(workspace_id,project_state_id,area,assessment,note,assessed_by,assessed_at,updated_at)
 values(ps.workspace_id,ps.id,area_input,assessment_input,nullif(trim(note_input),''),uid,now(),now())
 on conflict(project_state_id,area) do update set assessment=excluded.assessment,note=excluded.note,assessed_by=excluded.assessed_by,assessed_at=excluded.assessed_at,updated_at=excluded.updated_at
 returning * into finding;
 return finding;
end $$;

create or replace function public.ensure_project_state_predevelopment_domains(project_state_input uuid)
returns setof public.predevelopment_domains language plpgsql set search_path='' as $$
declare uid uuid:=auth.uid(); ps public.project_states; domain_key_input text;
begin
 if uid is null then raise exception 'authentication_required'; end if;
 select * into ps from public.project_states where id=project_state_input;
 if ps.id is null then raise exception 'project_state_not_found'; end if;
 if not public.is_workspace_member(ps.workspace_id) then raise exception 'workspace_access_denied'; end if;
 if ps.stage not in ('predevelopment','authorization','authorized') then raise exception 'predevelopment_not_available_from_stage:%',ps.stage; end if;
 foreach domain_key_input in array array['development_site','product_program','design_consultants','commercial_feasibility','schedule_phasing','risk_decision_evidence','delivery_strategy'] loop
  insert into public.predevelopment_domains(project_state_id,domain_key,readiness,updated_by,updated_at) values(ps.id,domain_key_input,'not_started',uid,now()) on conflict(project_state_id,domain_key) do nothing;
 end loop;
 return query select * from public.predevelopment_domains where project_state_id=ps.id order by domain_key;
end $$;

create or replace function public.update_project_state_predevelopment_domain(project_state_input uuid, domain_input text, readiness_input public.readiness_state, notes_input text default null)
returns public.predevelopment_domains language plpgsql set search_path='' as $$
declare uid uuid:=auth.uid(); ps public.project_states; domain_row public.predevelopment_domains;
begin
 if uid is null then raise exception 'authentication_required'; end if;
 if domain_input not in ('development_site','product_program','design_consultants','commercial_feasibility','schedule_phasing','risk_decision_evidence','delivery_strategy') then raise exception 'invalid_predevelopment_domain'; end if;
 select * into ps from public.project_states where id=project_state_input for update;
 if ps.id is null then raise exception 'project_state_not_found'; end if;
 if not public.is_workspace_member(ps.workspace_id) then raise exception 'workspace_access_denied'; end if;
 if ps.status <> 'active' then raise exception 'predevelopment_update_not_allowed_for_status:%',ps.status; end if;
 if ps.stage <> 'predevelopment' then raise exception 'predevelopment_update_not_allowed_from_stage:%',ps.stage; end if;
 insert into public.predevelopment_domains(project_state_id,domain_key,readiness,notes,updated_by,updated_at)
 values(ps.id,domain_input,readiness_input,nullif(trim(notes_input),''),uid,now())
 on conflict(project_state_id,domain_key) do update set readiness=excluded.readiness,notes=excluded.notes,updated_by=excluded.updated_by,updated_at=excluded.updated_at
 returning * into domain_row;
 return domain_row;
end $$;

create or replace function public.enter_project_state_authorization(project_state_input uuid)
returns public.project_states language plpgsql set search_path='' as $$
declare uid uuid:=auth.uid(); ps public.project_states; incomplete_count integer;
begin
 if uid is null then raise exception 'authentication_required'; end if;
 select * into ps from public.project_states where id=project_state_input for update;
 if ps.id is null then raise exception 'project_state_not_found'; end if;
 if not public.is_workspace_member(ps.workspace_id) then raise exception 'workspace_access_denied'; end if;
 if ps.status <> 'active' then raise exception 'authorization_entry_not_allowed_for_status:%',ps.status; end if;
 if ps.stage <> 'predevelopment' then raise exception 'authorization_entry_not_allowed_from_stage:%',ps.stage; end if;
 perform public.ensure_project_state_predevelopment_domains(ps.id);
 select count(*) into incomplete_count from public.predevelopment_domains where project_state_id=ps.id and readiness <> 'satisfied';
 if incomplete_count > 0 then raise exception 'predevelopment_requirements_incomplete:%',incomplete_count; end if;
 update public.project_states set stage='authorization',updated_at=now() where id=ps.id returning * into ps;
 return ps;
end $$;

grant execute on function public.record_project_state_qualification_finding(uuid,text,text,text) to authenticated;
grant execute on function public.ensure_project_state_predevelopment_domains(uuid) to authenticated;
grant execute on function public.update_project_state_predevelopment_domain(uuid,text,public.readiness_state,text) to authenticated;
grant execute on function public.enter_project_state_authorization(uuid) to authenticated;
