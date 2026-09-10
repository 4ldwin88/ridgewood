-- Use the canonical readiness table and attribute reassessment to its actor.
create or replace function private.record_project_state_qualification_finding_command(project_state_input uuid, area_input text, assessment_input text, note_input text default null)
returns public.project_state_qualification_findings
language plpgsql
security definer
set search_path=''
as $$
declare uid uuid:=auth.uid(); ps public.project_states; finding public.project_state_qualification_findings; previous text;
begin
 if uid is null then raise exception 'authentication_required'; end if;
 if area_input not in ('opportunity_credibility','strategic_fit','relationship_authority','commercial_plausibility','execution_risk') then raise exception 'invalid_qualification_area'; end if;
 if assessment_input not in ('yes','unclear','no') then raise exception 'invalid_qualification_assessment'; end if;
 select * into ps from public.project_states where id=project_state_input for update;
 if ps.id is null then raise exception 'project_state_not_found'; end if;
 if not public.is_workspace_member(ps.workspace_id) then raise exception 'workspace_access_denied'; end if;
 if ps.status <> 'active' then raise exception 'qualification_finding_not_allowed_for_status:%',ps.status; end if;
 if ps.stage not in ('qualification','predevelopment','authorization') then raise exception 'qualification_finding_not_allowed_from_stage:%',ps.stage; end if;
 select assessment into previous from public.project_state_qualification_findings where project_state_id=ps.id and area=area_input;
 insert into public.project_state_qualification_findings(workspace_id,project_state_id,area,assessment,note,assessed_by,assessed_at,updated_at) values(ps.workspace_id,ps.id,area_input,assessment_input,nullif(pg_catalog.btrim(note_input),''),uid,pg_catalog.now(),pg_catalog.now()) on conflict(project_state_id,area) do update set assessment=excluded.assessment,note=excluded.note,assessed_by=excluded.assessed_by,assessed_at=excluded.assessed_at,updated_at=excluded.updated_at returning * into finding;
 if ps.stage in ('predevelopment','authorization') and previous is distinct from assessment_input then
   update public.predevelopment_domains set readiness=case when readiness='not_started' then readiness else 'in_progress' end,updated_at=pg_catalog.now(),updated_by=uid where project_state_id=ps.id;
 end if;
 return finding;
end $$;
