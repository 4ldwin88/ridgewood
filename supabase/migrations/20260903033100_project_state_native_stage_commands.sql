-- New stage records no longer require the transitional Opportunity row.
alter table public.opportunity_qualification_findings alter column opportunity_id drop not null;
alter table public.opportunity_qualification_decisions alter column opportunity_id drop not null;
alter table public.predevelopment_domains alter column opportunity_id drop not null;

-- Qualification decision and lifecycle transition are one governed transaction.
create or replace function public.set_project_state_qualification_decision(project_state_input uuid, decision_input text, rationale_input text default null)
returns public.project_states language plpgsql security invoker set search_path='' as $$
declare uid uuid:=auth.uid(); ps public.project_states; target_state text;
begin
  if uid is null then raise exception 'authentication_required'; end if;
  if decision_input not in ('advance','hold','decline') then raise exception 'invalid_qualification_decision'; end if;
  select * into ps from public.project_states where id=project_state_input for update;
  if ps.id is null then raise exception 'project_state_not_found'; end if;
  if not public.is_workspace_member(ps.workspace_id) then raise exception 'workspace_access_denied'; end if;
  if ps.state not in ('potential','opportunity','qualification') then raise exception 'qualification_decision_not_allowed_from_state:%',ps.state; end if;
  target_state:=case decision_input when 'advance' then 'predevelopment' when 'hold' then 'held' else 'declined' end;
  insert into public.opportunity_qualification_decisions(workspace_id,project_state_id,decision,rationale,decided_by)
  values(ps.workspace_id,ps.id,decision_input,nullif(trim(rationale_input),''),uid);
  update public.project_states set state=target_state,updated_at=now() where id=ps.id returning * into ps;
  return ps;
end $$;
grant execute on function public.set_project_state_qualification_decision(uuid,text,text) to authenticated;
comment on function public.set_project_state_qualification_decision(uuid,text,text) is 'Atomically records the Qualification-stage decision and advances the authoritative Project State lifecycle.';
