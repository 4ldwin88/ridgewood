alter table public.opportunity_qualification_findings rename to project_state_qualification_findings;
alter table public.opportunity_qualification_decisions rename to project_state_qualification_decisions;

drop policy if exists audit_workspace_select on public.audit_events;
create policy audit_workspace_select on public.audit_events for select to authenticated using (
  project_state_id is not null and exists (
    select 1 from public.project_states ps
    where ps.id=audit_events.project_state_id and public.is_workspace_member(ps.workspace_id)
  )
);

alter table public.audit_events drop constraint if exists audit_events_project_id_fkey;
alter table public.document_records drop constraint if exists document_records_project_id_fkey;
alter table public.document_output_manifests drop constraint if exists document_output_manifests_project_id_fkey;
alter table public.audit_events drop column if exists project_id;
alter table public.document_records drop column if exists project_id;
alter table public.document_output_manifests drop column if exists project_id;
drop table public.projects;

create or replace function public.set_project_state_qualification_decision(project_state_input uuid, decision_input text, rationale_input text default null)
returns public.project_states language plpgsql security invoker set search_path='' as $$
declare uid uuid:=auth.uid(); ps public.project_states;
begin
 if uid is null then raise exception 'authentication_required'; end if;
 if decision_input not in ('advance','hold','decline') then raise exception 'invalid_qualification_decision'; end if;
 select * into ps from public.project_states where id=project_state_input for update;
 if ps.id is null then raise exception 'project_state_not_found'; end if;
 if not public.is_workspace_member(ps.workspace_id) then raise exception 'workspace_access_denied'; end if;
 if ps.status <> 'active' then raise exception 'qualification_decision_not_allowed_for_status:%',ps.status; end if;
 if ps.stage <> 'qualification' then raise exception 'qualification_decision_not_allowed_from_stage:%',ps.stage; end if;
 insert into public.project_state_qualification_decisions(workspace_id,project_state_id,decision,rationale,decided_by)
 values(ps.workspace_id,ps.id,decision_input,nullif(trim(rationale_input),''),uid);
 update public.project_states set stage=case when decision_input='advance' then 'predevelopment' else stage end,status=case decision_input when 'hold' then 'held' when 'decline' then 'declined' else 'active' end,updated_at=now() where id=ps.id returning * into ps;
 return ps;
end $$;
