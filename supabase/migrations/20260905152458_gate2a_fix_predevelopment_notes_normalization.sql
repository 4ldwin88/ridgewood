create or replace function private.update_project_state_predevelopment_domain_command(project_state_input uuid, domain_input text, readiness_input public.readiness_state, notes_input text default null)
returns public.predevelopment_domains
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  ps public.project_states;
  domain_row public.predevelopment_domains;
begin
  if uid is null then raise exception 'authentication_required'; end if;
  if domain_input not in ('development_site','product_program','design_consultants','commercial_feasibility','schedule_phasing','risk_decision_evidence','delivery_strategy') then raise exception 'invalid_predevelopment_domain'; end if;
  select * into ps from public.project_states where id=project_state_input for update;
  if ps.id is null then raise exception 'project_state_not_found'; end if;
  if not public.is_workspace_member(ps.workspace_id) then raise exception 'workspace_access_denied'; end if;
  if ps.status <> 'active' then raise exception 'predevelopment_update_not_allowed_for_status:%',ps.status; end if;
  if ps.stage <> 'predevelopment' then raise exception 'predevelopment_update_not_allowed_from_stage:%',ps.stage; end if;
  insert into public.predevelopment_domains(project_state_id,domain_key,readiness,notes,updated_by,updated_at)
  values(ps.id,domain_input,readiness_input,nullif(pg_catalog.btrim(notes_input),''),uid,pg_catalog.now())
  on conflict(project_state_id,domain_key) do update set readiness=excluded.readiness,notes=excluded.notes,updated_by=excluded.updated_by,updated_at=excluded.updated_at
  returning * into domain_row;
  return domain_row;
end
$$;
revoke all on function private.update_project_state_predevelopment_domain_command(uuid,text,public.readiness_state,text) from public, anon;
grant execute on function private.update_project_state_predevelopment_domain_command(uuid,text,public.readiness_state,text) to authenticated;
