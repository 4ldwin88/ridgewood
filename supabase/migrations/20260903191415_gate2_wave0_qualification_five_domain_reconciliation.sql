alter table public.project_state_qualification_findings drop constraint if exists opportunity_qualification_findings_area_check;
alter table public.project_state_qualification_findings add constraint project_state_qualification_findings_area_check check (area in ('opportunity_credibility','strategic_fit','relationship_authority','commercial_plausibility','execution_risk'));

comment on column public.project_state_qualification_findings.area is 'Canonical Qualification domain: opportunity_credibility, strategic_fit, relationship_authority, commercial_plausibility, or execution_risk.';

create or replace function public.record_project_state_qualification_finding(project_state_input uuid, area_input text, assessment_input text, note_input text default null::text)
returns public.project_state_qualification_findings
language plpgsql
set search_path to ''
as $function$
declare uid uuid:=auth.uid(); ps public.project_states; finding public.project_state_qualification_findings;
begin
 if uid is null then raise exception 'authentication_required'; end if;
 if area_input not in ('opportunity_credibility','strategic_fit','relationship_authority','commercial_plausibility','execution_risk') then raise exception 'invalid_qualification_area'; end if;
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
end $function$;

create or replace function public.set_project_state_qualification_decision(project_state_input uuid, decision_input text, rationale_input text default null::text)
returns public.project_states
language plpgsql
set search_path to ''
as $function$
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
end $function$;

revoke execute on function public.record_project_state_qualification_finding(uuid,text,text,text) from public, anon;
revoke execute on function public.set_project_state_qualification_decision(uuid,text,text) from public, anon;
grant execute on function public.record_project_state_qualification_finding(uuid,text,text,text) to authenticated;
grant execute on function public.set_project_state_qualification_decision(uuid,text,text) to authenticated;
