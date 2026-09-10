-- Human QA: Opportunity readiness must react immediately to governed Action mutations.
-- The next-step requirement is derived from the existence of a non-cancelled,
-- Opportunity-scoped Action rather than from a legacy next_action field.
create or replace function public.refresh_opportunity_requirements_for_action(project_state_input uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  has_action boolean := false;
begin
  select exists(
    select 1 from public.actions a
    where a.project_state_id = project_state_input
      and a.lifecycle_stage = 'opportunity'
      and a.status in ('open','in_progress','blocked','done')
  ) into has_action;

  update public.project_state_stage_requirements r
  set status = case when has_action then 'satisfied'::public.readiness_state else 'not_started'::public.readiness_state end,
      updated_at = pg_catalog.now()
  where r.project_state_id = project_state_input
    and r.stage = 'opportunity'
    and r.requirement_key = 'next_step';
end
$function$;

revoke all on function public.refresh_opportunity_requirements_for_action(uuid) from public, anon, authenticated;
grant execute on function public.refresh_opportunity_requirements_for_action(uuid) to service_role;

create or replace function public.sync_opportunity_next_step_from_action()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_opportunity_requirements_for_action(old.project_state_id);
    return old;
  end if;
  perform public.refresh_opportunity_requirements_for_action(new.project_state_id);
  if tg_op = 'UPDATE' and old.project_state_id is distinct from new.project_state_id then
    perform public.refresh_opportunity_requirements_for_action(old.project_state_id);
  end if;
  return new;
end
$function$;

revoke all on function public.sync_opportunity_next_step_from_action() from public, anon, authenticated;
grant execute on function public.sync_opportunity_next_step_from_action() to service_role;

drop trigger if exists actions_sync_opportunity_next_step on public.actions;
create trigger actions_sync_opportunity_next_step
after insert or update of status,lifecycle_stage,project_state_id or delete on public.actions
for each row execute function public.sync_opportunity_next_step_from_action();

-- Reconcile existing human-QA rows so the live state immediately reflects governed Actions.
update public.project_state_stage_requirements r
set status = 'satisfied'::public.readiness_state,
    updated_at = pg_catalog.now()
where r.stage = 'opportunity'
  and r.requirement_key = 'next_step'
  and exists (
    select 1 from public.actions a
    where a.project_state_id = r.project_state_id
      and a.lifecycle_stage = 'opportunity'
      and a.status in ('open','in_progress','blocked','done')
  );