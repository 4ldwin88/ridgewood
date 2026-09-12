-- Development candidate: replay only against the disposable CI backend.
-- Generate the final forward migration with Supabase CLI after contract verification.
create table public.project_setup_versions (
  id uuid primary key default gen_random_uuid(),
  project_state_id uuid not null references public.project_states(id) on delete restrict,
  version integer not null check(version > 0),
  request_id uuid not null,
  authorization_record_id uuid not null references public.authorization_records(id) on delete restrict,
  evidence jsonb not null check(jsonb_typeof(evidence)='array'),
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique(project_state_id,version), unique(project_state_id,request_id)
);
alter table public.project_setup_versions enable row level security;
revoke all on public.project_setup_versions from public,anon,authenticated;
grant select on public.project_setup_versions to authenticated;
create policy setup_versions_read on public.project_setup_versions for select to authenticated
using(exists(select 1 from public.project_states p where p.id=project_state_id and public.is_workspace_member(p.workspace_id)));

insert into public.app_permissions(permission_key,description) values
('project.setup.edit','Save Setup evidence and accountable responsibilities; does not confer approval authority.'),
('project.gate01.decide','Record a Gate 01 decision, subject to separately confirmed owner authority.')
on conflict do nothing;
-- Deliberately no role grants or real user grants.

create function private.setup_requirement_keys() returns text[] language sql immutable set search_path='' as $$
select array['contracting_party','contract_review','scope','commercial_terms','contractual_risks','permits','leadership','budget_basis','delivery_folder','access','communications','controls']::text[]
$$;

create function private.setup_unmet(evidence_input jsonb, workspace_input uuid)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare k text; e jsonb; reasons jsonb:='[]';
begin
  foreach k in array private.setup_requirement_keys() loop
    select value into e from jsonb_array_elements(evidence_input) where value->>'requirement'=k;
    if e is null or coalesce(e->>'materialBlocker','false')='true'
      or nullif(btrim(e->>'details'),'') is null or nullif(btrim(e->>'evidenceReference'),'') is null
      or not exists(select 1 from public.workspace_memberships m where m.workspace_id=workspace_input and m.user_id::text=e->>'accountableUserId' and m.status='active')
      or not(coalesce(e->>'state','')='satisfied' or (k='permits' and e->>'state'='not_applicable' and nullif(btrim(e->>'notApplicableReason'),'') is not null))
    then reasons:=reasons||jsonb_build_array(k); end if;
  end loop;
  return reasons;
end $$;

create function private.read_project_setup_command(project_state_input uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare p public.project_states; s public.project_setup_versions; a uuid; history jsonb;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  select * into p from public.project_states where id=project_state_input;
  if p.id is null or not public.is_workspace_member(p.workspace_id) then raise exception 'project_state_not_found_or_access_denied'; end if;
  select * into s from public.project_setup_versions where project_state_id=p.id order by version desc limit 1;
  select id into a from public.authorization_records where project_state_id=p.id and outcome='approved' order by created_at,id limit 1;
  select coalesce(jsonb_agg(jsonb_build_object('version',v.version,'actorUserId',v.actor_user_id,'createdAt',v.created_at) order by v.version desc),'[]') into history from public.project_setup_versions v where v.project_state_id=p.id;
  return jsonb_build_object('projectStateId',p.id,'version',coalesce(s.version,0),'authorizationRecordId',coalesce(s.authorization_record_id,a),
    'evidence',coalesce(s.evidence,'[]'),'unmet',private.setup_unmet(coalesce(s.evidence,'[]'),p.workspace_id),'history',history,
    'canEdit',p.stage='project_authorization_setup' and p.status='active' and p.archived_at is null and public.has_app_permission(p.workspace_id,'project.setup.edit'),
    'stage',p.stage,'approvalBlocker','Gate 01 decision service is not activated. Setup saves do not authorize advancement.');
end $$;

create function private.save_project_setup_command(project_state_input uuid, expected_version_input integer, request_id_input uuid, evidence_input jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare p public.project_states; s public.project_setup_versions; previous public.project_setup_versions; a uuid; e jsonb; key_count integer;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  select * into p from public.project_states where id=project_state_input for update;
  if p.id is null or not public.is_workspace_member(p.workspace_id) then raise exception 'project_state_not_found_or_access_denied'; end if;
  if not public.has_app_permission(p.workspace_id,'project.setup.edit') then raise exception 'missing_setup_edit_permission'; end if;
  if request_id_input is null or expected_version_input is null or expected_version_input<0 then raise exception 'invalid_save_request'; end if;
  select * into previous from public.project_setup_versions where project_state_id=p.id and request_id=request_id_input;
  if previous.id is not null then
    if previous.actor_user_id<>auth.uid() or previous.evidence is distinct from evidence_input or previous.version<>expected_version_input+1 then raise exception 'request_id_payload_mismatch'; end if;
    -- Return current state, identifying the already committed version. Never append again.
    return private.read_project_setup_command(p.id)||jsonb_build_object('savedVersion',previous.version);
  end if;
  if p.stage<>'project_authorization_setup' or p.status<>'active' or p.archived_at is not null then raise exception 'setup_edit_not_allowed'; end if;
  select * into s from public.project_setup_versions where project_state_id=p.id order by version desc limit 1;
  if expected_version_input<>coalesce(s.version,0) then raise exception 'setup_version_conflict'; end if;
  select id into a from public.authorization_records where project_state_id=p.id and outcome='approved' order by created_at,id limit 1;
  if a is null then raise exception 'missing_frozen_authorization'; end if;
  if evidence_input is null or jsonb_typeof(evidence_input)<>'array' then raise exception 'invalid_setup_evidence'; end if;
  if jsonb_array_length(evidence_input)<>12 then raise exception 'setup_requires_twelve_evidence_sections'; end if;
  select count(distinct value->>'requirement') into key_count from jsonb_array_elements(evidence_input);
  if key_count<>12 then raise exception 'duplicate_setup_requirement'; end if;
  for e in select value from jsonb_array_elements(evidence_input) loop
    if jsonb_typeof(e)<>'object' or not(coalesce(e->>'requirement','')=any(private.setup_requirement_keys()))
      or coalesce(e->>'state','') not in ('unresolved','satisfied','not_applicable')
      or jsonb_typeof(e->'materialBlocker') is distinct from 'boolean'
      or jsonb_typeof(e->'details') is distinct from 'string'
      or jsonb_typeof(e->'evidenceReference') is distinct from 'string'
      or jsonb_typeof(e->'accountableUserId') is distinct from 'string'
      or length(e::text)>20000 then raise exception 'invalid_setup_evidence'; end if;
    if nullif(e->>'accountableUserId','') is not null and not exists(select 1 from public.workspace_memberships m where m.workspace_id=p.workspace_id and m.user_id::text=e->>'accountableUserId' and m.status='active') then raise exception 'setup_owner_must_be_active_member'; end if;
  end loop;
  insert into public.project_setup_versions(project_state_id,version,request_id,authorization_record_id,evidence,actor_user_id)
  values(p.id,expected_version_input+1,request_id_input,coalesce(s.authorization_record_id,a),evidence_input,auth.uid());
  insert into public.audit_events(project_state_id,event_type,actor_user_id,payload,occurred_at)
  values(p.id,'project_setup_saved',auth.uid(),jsonb_build_object('version',expected_version_input+1,'requestId',request_id_input,'gate','gate_01'),now());
  return private.read_project_setup_command(p.id)||jsonb_build_object('savedVersion',expected_version_input+1);
end $$;

create function public.read_project_setup(project_state_input uuid) returns jsonb language sql security invoker set search_path='' as $$select private.read_project_setup_command(project_state_input)$$;
create function public.save_project_setup(project_state_input uuid,expected_version_input integer,request_id_input uuid,evidence_input jsonb) returns jsonb language sql security invoker set search_path='' as $$select private.save_project_setup_command(project_state_input,expected_version_input,request_id_input,evidence_input)$$;
revoke all on function private.setup_requirement_keys(),private.setup_unmet(jsonb,uuid),private.read_project_setup_command(uuid),private.save_project_setup_command(uuid,integer,uuid,jsonb),public.read_project_setup(uuid),public.save_project_setup(uuid,integer,uuid,jsonb) from public,anon;
grant execute on function private.read_project_setup_command(uuid),private.save_project_setup_command(uuid,integer,uuid,jsonb),public.read_project_setup(uuid),public.save_project_setup(uuid,integer,uuid,jsonb) to authenticated;

-- Close the known bypass prospectively. Preserve old requirements and audit history.
create or replace function private.enter_project_state_preconstruction_mobilization_command(project_state_input uuid)
returns public.project_states language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  raise exception 'governed_gate01_decision_required';
end $$;
