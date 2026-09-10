create schema if not exists private;

create or replace function private.authorize_project_state_command(project_state_input uuid, authority_basis_input text, verification_input jsonb)
returns public.project_states
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  ps public.project_states;
  auth_id uuid := gen_random_uuid();
  readiness_snapshot jsonb;
  verification_time timestamptz;
  verification_ref text;
  authority_ok boolean := false;
begin
  if uid is null then raise exception 'authentication_required'; end if;
  select * into ps from public.project_states where id=project_state_input for update;
  if ps.id is null then raise exception 'project_state_not_found'; end if;
  if not public.is_workspace_member(ps.workspace_id) then raise exception 'workspace_access_denied'; end if;
  if ps.status <> 'active' or ps.archived_at is not null then raise exception 'project_authorization_not_allowed'; end if;
  if ps.stage <> 'authorization' then raise exception 'project_authorization_not_allowed_from_stage:%', ps.stage; end if;
  if not public.has_app_permission(ps.workspace_id, 'project.authorize') then raise exception 'missing_project_authorize_permission'; end if;

  select exists(
    select 1 from public.position_assignments p
    where p.workspace_id=ps.workspace_id and p.user_id=uid and p.status='active' and p.role_family='executive'
      and p.effective_from <= pg_catalog.now() and (p.effective_until is null or pg_catalog.now() < p.effective_until)
      and ((p.scope->>'type')='workspace' or ((p.scope->>'type')='project_state' and (p.scope->>'id')=ps.id::text))
    union all
    select 1 from public.authority_delegations d
    where d.workspace_id=ps.workspace_id and d.grantee_user_id=uid and d.status='active' and d.authority_key='project.authorize' and d.revoked_at is null
      and d.effective_from <= pg_catalog.now() and (d.effective_until is null or pg_catalog.now() < d.effective_until)
      and ((d.scope->>'type')='workspace' or ((d.scope->>'type')='project_state' and (d.scope->>'id')=ps.id::text))
  ) into authority_ok;
  if not authority_ok then raise exception 'missing_project_authority'; end if;

  if coalesce((verification_input->>'verified')::boolean,false) is not true or coalesce((verification_input->>'userVerified')::boolean,false) is not true then raise exception 'fresh_verification_required'; end if;
  verification_ref := nullif(pg_catalog.btrim(verification_input->>'verificationReference'),'');
  if verification_ref is null then raise exception 'verification_reference_required'; end if;
  begin verification_time := (verification_input->>'verifiedAt')::timestamptz; exception when others then raise exception 'verification_timestamp_invalid'; end;
  if verification_time is null or verification_time < pg_catalog.now() - interval '5 minutes' or verification_time > pg_catalog.now() + interval '30 seconds' then raise exception 'verification_not_fresh'; end if;
  if exists(select 1 from public.audit_events a where a.event_type='project_authorized' and a.payload->>'verificationReference'=verification_ref) then raise exception 'verification_replay_detected'; end if;

  perform public.ensure_project_state_predevelopment_domains(ps.id);
  if exists(select 1 from public.predevelopment_domains d where d.project_state_id=ps.id and d.readiness not in ('satisfied'::public.readiness_state,'not_applicable'::public.readiness_state)) then raise exception 'authorization_readiness_incomplete'; end if;
  if exists(select 1 from public.project_state_stage_requirements r where r.project_state_id=ps.id and r.stage='authorization' and r.required and r.status not in ('satisfied'::public.readiness_state,'not_applicable'::public.readiness_state)) then raise exception 'authorization_gate_requirements_incomplete'; end if;

  select coalesce(jsonb_agg(jsonb_build_object('domain',d.domain_key,'readiness',d.readiness,'notes',d.notes) order by d.domain_key),'[]'::jsonb)
    into readiness_snapshot
    from public.predevelopment_domains d
    where d.project_state_id=ps.id;
  insert into public.authorization_records(id,project_state_id,outcome,authority_basis,readiness_snapshot,evidence_snapshot,actor_user_id,created_at)
  values(auth_id,ps.id,'approved',nullif(pg_catalog.btrim(authority_basis_input),''),readiness_snapshot,coalesce(verification_input->'evidence','[]'::jsonb),uid,pg_catalog.now());
  update public.project_states set stage='project_authorization_setup',commercial_stage='project_authorization_setup',updated_at=pg_catalog.now() where id=ps.id returning * into ps;
  insert into public.audit_events(project_state_id,event_type,actor_user_id,payload,occurred_at)
  values(ps.id,'project_authorized',uid,jsonb_build_object('workspaceId',ps.workspace_id,'authorizationRecordId',auth_id,'authorityBasis',nullif(pg_catalog.btrim(authority_basis_input),''),'gate','gate_01_project_authorization_contract_commitment','verificationReference',verification_ref,'verificationMethod',verification_input->>'method','verifiedAt',verification_time,'nextStage','project_authorization_setup'),pg_catalog.now());
  return ps;
end
$$;

revoke all on function private.authorize_project_state_command(uuid,text,jsonb) from public, anon;
grant usage on schema private to authenticated, service_role;
grant execute on function private.authorize_project_state_command(uuid,text,jsonb) to authenticated, service_role;

create or replace function public.authorize_project_state(project_state_input uuid, authority_basis_input text, verification_input jsonb)
returns public.project_states
language sql
security invoker
set search_path = ''
as $$
  select private.authorize_project_state_command(project_state_input, authority_basis_input, verification_input);
$$;

revoke all on function public.authorize_project_state(uuid,text,jsonb) from public, anon;
grant execute on function public.authorize_project_state(uuid,text,jsonb) to authenticated, service_role;
