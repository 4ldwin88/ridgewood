create or replace function private.record_project_state_qualification_finding_command(project_state_input uuid, area_input text, assessment_input text, note_input text default null)
returns public.project_state_qualification_findings
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  ps public.project_states;
  finding public.project_state_qualification_findings;
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
  values(ps.workspace_id,ps.id,area_input,assessment_input,nullif(pg_catalog.trim(note_input),''),uid,pg_catalog.now(),pg_catalog.now())
  on conflict(project_state_id,area) do update set assessment=excluded.assessment,note=excluded.note,assessed_by=excluded.assessed_by,assessed_at=excluded.assessed_at,updated_at=excluded.updated_at
  returning * into finding;
  return finding;
end
$$;
revoke all on function private.record_project_state_qualification_finding_command(uuid,text,text,text) from public, anon;
grant execute on function private.record_project_state_qualification_finding_command(uuid,text,text,text) to authenticated;
create or replace function public.record_project_state_qualification_finding(project_state_input uuid, area_input text, assessment_input text, note_input text default null)
returns public.project_state_qualification_findings
language sql
security invoker
set search_path = ''
as $$ select private.record_project_state_qualification_finding_command(project_state_input,area_input,assessment_input,note_input); $$;
revoke all on function public.record_project_state_qualification_finding(uuid,text,text,text) from public, anon;
grant execute on function public.record_project_state_qualification_finding(uuid,text,text,text) to authenticated;
