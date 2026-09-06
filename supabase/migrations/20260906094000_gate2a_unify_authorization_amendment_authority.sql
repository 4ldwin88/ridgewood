alter table public.authorization_amendments
  add column if not exists document_record_id uuid references public.document_records(id),
  add column if not exists original_revision_id uuid references public.document_revisions(id),
  add column if not exists changed_fields jsonb;
alter table public.authorization_amendments drop constraint if exists authorization_amendments_changed_fields_check;
alter table public.authorization_amendments add constraint authorization_amendments_changed_fields_check check (changed_fields is null or (jsonb_typeof(changed_fields) = 'object' and changed_fields <> '{}'::jsonb));
create index if not exists authorization_amendments_authorization_idx on public.authorization_amendments(authorization_record_id, created_at desc);
create index if not exists authorization_amendments_document_idx on public.authorization_amendments(document_record_id, created_at desc) where document_record_id is not null;
drop function if exists public.record_authorization_correction(uuid,uuid,uuid,uuid,text,jsonb);
drop table if exists public.authorization_corrections;
drop function if exists public.record_authorization_amendment(uuid,text,text,text,text,jsonb);
create or replace function public.record_authorization_amendment(project_state_input uuid, amendment_type_input text, summary_input text, rationale_input text, authority_basis_input text default null, evidence_input jsonb default '[]'::jsonb, document_record_input uuid default null, original_revision_input uuid default null, changed_fields_input jsonb default null)
returns public.authorization_amendments language plpgsql security definer set search_path = '' as $$
declare uid uuid:=auth.uid(); ps public.project_states; ar public.authorization_records; result public.authorization_amendments; authority_ok boolean:=false;
begin
 if uid is null then raise exception 'authentication_required'; end if;
 if amendment_type_input not in ('correction','addendum') then raise exception 'invalid_amendment_type'; end if;
 if nullif(pg_catalog.btrim(summary_input),'') is null then raise exception 'amendment_summary_required'; end if;
 if nullif(pg_catalog.btrim(rationale_input),'') is null then raise exception 'amendment_rationale_required'; end if;
 select * into ps from public.project_states where id=project_state_input and archived_at is null;
 if ps.id is null then raise exception 'project_state_not_found'; end if;
 if not public.is_workspace_member(ps.workspace_id) then raise exception 'workspace_access_denied'; end if;
 if ps.stage not in ('project_authorization_setup','preconstruction_mobilization','construction_control','completion_turnover','project_closeout','warranty_final_close','closed') then raise exception 'post_authorization_amendment_only'; end if;
 if not public.has_app_permission(ps.workspace_id,'project.authorize') then raise exception 'missing_project_authorize_permission'; end if;
 select exists(select 1 from (select 1 from public.position_assignments p where p.workspace_id=ps.workspace_id and p.user_id=uid and p.status='active' and p.role_family='executive' and p.effective_from<=pg_catalog.now() and (p.effective_until is null or pg_catalog.now()<p.effective_until) and ((p.scope->>'type')='workspace' or ((p.scope->>'type')='project_state' and (p.scope->>'id')=ps.id::text)) union all select 1 from public.authority_delegations d where d.workspace_id=ps.workspace_id and d.grantee_user_id=uid and d.status='active' and d.authority_key='project.authorize' and d.revoked_at is null and d.effective_from<=pg_catalog.now() and (d.effective_until is null or pg_catalog.now()<d.effective_until) and ((d.scope->>'type')='workspace' or ((d.scope->>'type')='project_state' and (d.scope->>'id')=ps.id::text))) authority_rows) into authority_ok;
 if not authority_ok then raise exception 'missing_project_authority'; end if;
 select * into ar from public.authorization_records where project_state_id=ps.id and outcome='approved' order by created_at desc limit 1;
 if ar.id is null then raise exception 'authorization_record_not_found'; end if;
 if document_record_input is not null or original_revision_input is not null or changed_fields_input is not null then
  if document_record_input is null or original_revision_input is null then raise exception 'document_and_revision_required'; end if;
  if changed_fields_input is null or jsonb_typeof(changed_fields_input)<>'object' or changed_fields_input='{}'::jsonb then raise exception 'changed_fields_required'; end if;
  if not exists(select 1 from public.document_records dr where dr.id=document_record_input and dr.project_state_id=ps.id) then raise exception 'document_record_mismatch'; end if;
  if not exists(select 1 from public.document_revisions r where r.id=original_revision_input and r.document_record_id=document_record_input and r.state in ('published','superseded')) then raise exception 'frozen_published_revision_required'; end if;
  if not (ar.evidence_snapshot::text like '%'||original_revision_input::text||'%' or ar.readiness_snapshot::text like '%'||original_revision_input::text||'%') then raise exception 'revision_not_in_authorization_snapshot'; end if;
 end if;
 insert into public.authorization_amendments(project_state_id,authorization_record_id,amendment_type,summary,rationale,authority_basis,evidence_snapshot,actor_user_id,document_record_id,original_revision_id,changed_fields) values(ps.id,ar.id,amendment_type_input,pg_catalog.btrim(summary_input),pg_catalog.btrim(rationale_input),nullif(pg_catalog.btrim(authority_basis_input),''),coalesce(evidence_input,'[]'::jsonb),uid,document_record_input,original_revision_input,changed_fields_input) returning * into result;
 insert into public.audit_events(project_state_id,event_type,actor_user_id,payload,occurred_at) values(ps.id,'authorization_'||amendment_type_input||'_recorded',uid,jsonb_build_object('authorizationRecordId',ar.id,'authorizationAmendmentId',result.id,'documentRecordId',document_record_input,'originalRevisionId',original_revision_input,'changedFields',changed_fields_input,'summary',result.summary,'authorityBasis',result.authority_basis),pg_catalog.now());
 return result;
end; $$;
revoke all on function public.record_authorization_amendment(uuid,text,text,text,text,jsonb,uuid,uuid,jsonb) from public, anon;
grant execute on function public.record_authorization_amendment(uuid,text,text,text,text,jsonb,uuid,uuid,jsonb) to authenticated, service_role;
