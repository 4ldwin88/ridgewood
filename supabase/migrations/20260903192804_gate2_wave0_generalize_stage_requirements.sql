alter table public.project_state_stage_requirements add column if not exists gate_key text;

comment on table public.project_state_stage_requirements is 'Governed Project State Stage → Gate → Requirement records. Requirements are durable lifecycle-control evidence; module operational detail remains in its owning module.';
comment on column public.project_state_stage_requirements.stage is 'Canonical Project State lifecycle stage key.';
comment on column public.project_state_stage_requirements.gate_key is 'Optional canonical gate identifier associated with this requirement. Null is valid for stage requirements that are not attached to a formal gate.';

create or replace function public.list_project_state_stage_requirements(project_state_input uuid, stage_input text default null)
returns setof public.project_state_stage_requirements
language sql
security invoker
set search_path = public
as $$
  select r.*
  from public.project_state_stage_requirements r
  join public.project_states ps on ps.id = r.project_state_id
  where r.project_state_id = project_state_input
    and (stage_input is null or r.stage = stage_input)
    and public.is_workspace_member(ps.workspace_id)
  order by r.stage, r.gate_key nulls first, r.requirement_key;
$$;

revoke all on function public.list_project_state_stage_requirements(uuid,text) from public, anon;
grant execute on function public.list_project_state_stage_requirements(uuid,text) to authenticated, service_role;

create or replace function public.set_project_state_stage_requirement(
  project_state_input uuid,
  stage_input text,
  requirement_key_input text,
  label_input text,
  status_input public.readiness_state,
  required_input boolean default true,
  notes_input text default null,
  gate_key_input text default null
)
returns public.project_state_stage_requirements
language plpgsql
security invoker
set search_path = public
as $$
declare
  workspace_input uuid;
  result public.project_state_stage_requirements;
begin
  select workspace_id into workspace_input from public.project_states where id = project_state_input;
  if workspace_input is null or not public.is_workspace_member(workspace_input) then
    raise exception 'Project State not found or workspace access denied';
  end if;
  if stage_input is null or btrim(stage_input) = '' or requirement_key_input is null or btrim(requirement_key_input) = '' or label_input is null or btrim(label_input) = '' then
    raise exception 'Stage, requirement key, and label are required';
  end if;
  insert into public.project_state_stage_requirements(project_state_id, stage, gate_key, requirement_key, label, status, required, notes, updated_by, updated_at)
  values(project_state_input, stage_input, nullif(btrim(gate_key_input),''), requirement_key_input, label_input, status_input, required_input, nullif(btrim(notes_input),''), auth.uid(), now())
  on conflict(project_state_id, stage, requirement_key) do update set
    gate_key = excluded.gate_key,
    label = excluded.label,
    status = excluded.status,
    required = excluded.required,
    notes = excluded.notes,
    updated_by = excluded.updated_by,
    updated_at = now()
  returning * into result;
  return result;
end;
$$;

revoke all on function public.set_project_state_stage_requirement(uuid,text,text,text,public.readiness_state,boolean,text,text) from public, anon;
grant execute on function public.set_project_state_stage_requirement(uuid,text,text,text,public.readiness_state,boolean,text,text) to authenticated, service_role;
