-- Predevelopment domains are canonical prompts, not universally mandatory work.
alter type public.readiness_state add value if not exists 'not_applicable';

create or replace function public.enter_project_state_authorization(project_state_input uuid)
returns public.project_states
language plpgsql
set search_path to ''
as $function$
declare
  uid uuid := auth.uid();
  ps public.project_states;
  incomplete_count integer;
begin
  if uid is null then raise exception 'authentication_required'; end if;
  select * into ps from public.project_states where id=project_state_input for update;
  if ps.id is null then raise exception 'project_state_not_found'; end if;
  if not public.is_workspace_member(ps.workspace_id) then raise exception 'workspace_access_denied'; end if;
  if ps.status <> 'active' then raise exception 'authorization_entry_not_allowed_for_status:%',ps.status; end if;
  if ps.stage <> 'predevelopment' then raise exception 'authorization_entry_not_allowed_from_stage:%',ps.stage; end if;

  perform public.ensure_project_state_predevelopment_domains(ps.id);

  select count(*) into incomplete_count
  from public.predevelopment_domains
  where project_state_id=ps.id
    and readiness not in ('satisfied','not_applicable');

  if incomplete_count > 0 then
    raise exception 'predevelopment_requirements_incomplete:%',incomplete_count;
  end if;

  update public.project_states set stage='authorization',updated_at=now() where id=ps.id returning * into ps;
  return ps;
end
$function$;

comment on function public.enter_project_state_authorization(uuid) is 'Moves the same Project State from Predevelopment to Authorization only when each canonical predevelopment domain is either satisfied or contextually not applicable.';
