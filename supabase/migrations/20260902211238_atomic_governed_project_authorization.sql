create or replace function public.authorize_project_atomic(
  target_opportunity_id uuid,
  target_project_id uuid,
  project_name text,
  authority_basis_text text,
  readiness_snapshot_input jsonb,
  evidence_snapshot_input jsonb,
  verification_input jsonb
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  caller uuid := (select auth.uid());
  ws uuid;
  auth_id uuid := gen_random_uuid();
begin
  if caller is null then raise exception 'authentication_required'; end if;
  select workspace_id into ws from public.opportunities where id=target_opportunity_id;
  if ws is null then raise exception 'opportunity_not_found_or_unscoped'; end if;
  if not public.has_app_permission(ws, 'project.authorize') then raise exception 'missing_project_authorize_permission'; end if;
  if not exists (
    select 1 from public.position_assignments p
    where p.workspace_id=ws and p.user_id=caller and p.status='active' and p.role_family='executive'
      and p.effective_from <= now() and (p.effective_until is null or now() < p.effective_until)
      and ((p.scope->>'type')='workspace' or ((p.scope->>'type')='opportunity' and (p.scope->>'id')=target_opportunity_id::text))
    union all
    select 1 from public.authority_delegations d
    where d.workspace_id=ws and d.grantee_user_id=caller and d.status='active' and d.authority_key='project.authorize' and d.revoked_at is null
      and d.effective_from <= now() and (d.effective_until is null or now() < d.effective_until)
      and ((d.scope->>'type')='workspace' or ((d.scope->>'type')='opportunity' and (d.scope->>'id')=target_opportunity_id::text))
  ) then raise exception 'missing_project_authority'; end if;
  if coalesce((verification_input->>'verified')::boolean,false) is not true or coalesce((verification_input->>'userVerified')::boolean,false) is not true then raise exception 'fresh_verification_required'; end if;
  if not exists (select 1 from public.opportunities where id=target_opportunity_id and lifecycle='authorization_ready') then raise exception 'opportunity_not_authorization_ready'; end if;
  if exists (select 1 from public.projects where originating_opportunity_id=target_opportunity_id) then raise exception 'project_already_established'; end if;

  insert into public.authorization_records(id,opportunity_id,outcome,authority_basis,readiness_snapshot,evidence_snapshot,actor_user_id,created_at)
  values(auth_id,target_opportunity_id,'approved',authority_basis_text,coalesce(readiness_snapshot_input,'{}'::jsonb),coalesce(evidence_snapshot_input,'{}'::jsonb),caller,now());

  insert into public.projects(id,originating_opportunity_id,authorization_record_id,name,organization_id,site_location,established_by,established_at,operational_state,state_updated_at,workspace_id)
  select target_project_id,o.id,auth_id,project_name,o.organization_id,o.site_location,caller,now(),'active',now(),ws from public.opportunities o where o.id=target_opportunity_id;

  update public.opportunities set lifecycle='authorized',updated_at=now() where id=target_opportunity_id;

  insert into public.audit_events(opportunity_id,project_id,event_type,actor_user_id,payload,occurred_at)
  values(target_opportunity_id,target_project_id,'project_authorized',caller,jsonb_build_object('workspaceId',ws,'authorizationRecordId',auth_id,'authorityBasis',authority_basis_text,'verification',verification_input),now());
  return target_project_id;
end $$;
revoke execute on function public.authorize_project_atomic(uuid,uuid,text,text,jsonb,jsonb,jsonb) from public, anon;
grant execute on function public.authorize_project_atomic(uuid,uuid,text,text,jsonb,jsonb,jsonb) to authenticated;
