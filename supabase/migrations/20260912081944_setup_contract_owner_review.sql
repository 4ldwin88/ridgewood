-- Phase 1 company rule: confirmed owner only; no inferred or seeded delegation.
create table public.workspace_business_owners (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id),
 user_id uuid not null references auth.users(id), evidence_reference text not null check(btrim(evidence_reference)<>''),
 effective_from timestamptz not null, effective_until timestamptz, revoked_at timestamptz,
 check(effective_until is null or effective_until>effective_from)
);
alter table public.workspace_business_owners enable row level security;
revoke all on public.workspace_business_owners from public,anon,authenticated;
grant select on public.workspace_business_owners to authenticated;
create policy business_owners_read on public.workspace_business_owners for select to authenticated using(public.is_workspace_member(workspace_id));
insert into public.app_permissions(permission_key,description) values
 ('project.contract.review','Record an internal contract-basis decision with separately verified business authority and strong session.') on conflict do nothing;
-- No role or real-user permission grants. Controlled administration must verify owner identity.

-- The shared decision record owns outcome/reason/actor. This immutable extension owns
-- only contract-specific source/version/authority/verification context.
create table public.project_contract_review_decisions (
 decision_id uuid primary key references public.decisions(id) on delete restrict,
 project_state_id uuid not null references public.project_states(id) on delete restrict,
 contract_version_id uuid not null references public.project_contract_versions(id) on delete restrict,
 review_request_id uuid not null references public.project_contract_review_requests(id) on delete restrict,
 sequence integer not null check(sequence>0), request_id uuid not null,
 owner_authority_id uuid not null references public.workspace_business_owners(id),
 authority_snapshot jsonb not null, risk_snapshot jsonb not null, verification_snapshot jsonb not null,
 confirmations jsonb not null,
 unique(project_state_id,request_id), unique(contract_version_id,sequence)
);
alter table public.project_contract_review_decisions enable row level security;
revoke all on public.project_contract_review_decisions from public,anon,authenticated;
grant select on public.project_contract_review_decisions to authenticated;
create policy contract_decisions_read on public.project_contract_review_decisions for select to authenticated
 using(exists(select 1 from public.project_states p where p.id=project_state_id and public.is_workspace_member(p.workspace_id)));
create trigger contract_review_decisions_immutable before update or delete on public.project_contract_review_decisions
 for each row execute function private.reject_setup_history_mutation();
create function private.protect_contract_decision() returns trigger language plpgsql set search_path='' as $$
begin
 if exists(select 1 from public.project_contract_review_decisions where decision_id=old.id) then raise exception 'contract_decision_is_immutable'; end if;
 if tg_op='UPDATE' then return new; end if;
 return old;
end $$;
-- Definer is needed only to inspect the protected extension even if a caller lacks read access.
alter function private.protect_contract_decision() security definer;
create trigger protect_contract_decision before update or delete on public.decisions for each row execute function private.protect_contract_decision();
revoke all on function private.protect_contract_decision() from public,anon,authenticated;

create function private.contract_strong_session() returns boolean language sql stable security definer set search_path='' as $$
 select coalesce(auth.uid() is not null and auth.jwt()->>'aal'='aal2'
 and exists(select 1 from auth.sessions s where s.id::text=auth.jwt()->>'session_id' and s.user_id=auth.uid() and (s.not_after is null or s.not_after>now()))
 and exists(select 1 from jsonb_array_elements(coalesce(auth.jwt()->'amr','[]')) m
  where m->>'method'='totp' and case when m->>'timestamp' ~ '^[0-9]{1,12}(\.[0-9]+)?$'
   then (m->>'timestamp')::numeric between extract(epoch from now()-interval '5 minutes') and extract(epoch from now()+interval '30 seconds') else false end),false)
$$;
create function private.contract_risk_snapshot(project_state_input uuid) returns jsonb language sql stable set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(r) order by r.id),'[]') from public.risk_issues r where r.project_state_id=project_state_input
$$;
revoke all on function private.contract_strong_session(),private.contract_risk_snapshot(uuid) from public,anon,authenticated;

-- Order risk changes against contract decisions and gate advancement on the same
-- Project State lock. A later risk change invalidates the recorded snapshot.
create function private.serialize_contract_risk_change() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op<>'INSERT' then
  perform 1 from public.project_states p where p.id=old.project_state_id for update;
 end if;
 if tg_op<>'DELETE' then
  perform 1 from public.project_states p where p.id=new.project_state_id for update;
  return new;
 end if;
 return old;
end $$;
revoke all on function private.serialize_contract_risk_change() from public,anon,authenticated;
create trigger serialize_contract_risk_change before insert or update or delete on public.risk_issues
 for each row execute function private.serialize_contract_risk_change();

alter function private.read_project_contract_command(uuid) rename to read_project_contract_before_decisions;
revoke all on function private.read_project_contract_before_decisions(uuid) from public,anon,authenticated;
create function private.read_project_contract_command(project_state_input uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; p public.project_states; v public.project_contract_versions; latest public.project_contract_review_decisions; outcome text; current_approval boolean:=false;
begin
 result:=private.read_project_contract_before_decisions(project_state_input);
 select * into p from public.project_states where id=project_state_input;
 select * into v from public.project_contract_versions where project_state_id=p.id order by version desc limit 1;
 select * into latest from public.project_contract_review_decisions where contract_version_id=v.id order by sequence desc limit 1;
 select d.outcome into outcome from public.decisions d where d.id=latest.decision_id;
 current_approval:=coalesce(outcome='approved' and latest.risk_snapshot=private.contract_risk_snapshot(p.id)
  and (v.data->>'effectiveUntil'='' or (v.data->>'effectiveUntil')::date>=current_date)
  and (v.data->>'effectiveFrom'='' or (v.data->>'effectiveFrom')::date<=current_date)
  and (v.data->>'agreementRevisionId'='' or exists(select 1 from public.document_revisions r where r.id::text=v.data->>'agreementRevisionId' and r.state='published' and r.published_source_snapshot is not null)),false);
 return result||jsonb_build_object('approvalVerified',current_approval,'status',case when current_approval then 'approved' when outcome='approved' then 'review_stale' else coalesce(outcome,'preparation') end,
  'reviewSequence',coalesce(latest.sequence,0),
  'reviewAccess',jsonb_build_object('hasPermission',public.has_app_permission(p.workspace_id,'project.contract.review'),
   'strongSession',private.contract_strong_session(),
   'ownerAuthorities',(select coalesce(jsonb_agg(jsonb_build_object('id',o.id,'reference',o.evidence_reference)),'[]') from public.workspace_business_owners o
    where o.workspace_id=p.workspace_id and o.user_id=auth.uid() and o.revoked_at is null and o.effective_from<=now() and (o.effective_until is null or o.effective_until>now()))),
  'reviewDecisions',(select coalesce(jsonb_agg(jsonb_build_object('id',d.id,'version',c.version,'sequence',r.sequence,'outcome',d.outcome,'rationale',d.rationale,'actorUserId',d.actor_user_id,'createdAt',d.created_at,'authorityReference',r.authority_snapshot->>'evidence_reference','confirmations',r.confirmations) order by c.version desc,r.sequence desc),'[]')
   from public.project_contract_review_decisions r join public.decisions d on d.id=r.decision_id join public.project_contract_versions c on c.id=r.contract_version_id where r.project_state_id=p.id));
end $$;

create function private.decide_project_contract_review_command(project_state_input uuid,version_input integer,sequence_input integer,request_id_input uuid,authority_id_input uuid,outcome_input text,rationale_input text,confirmations_input jsonb)
 returns jsonb language plpgsql security definer set search_path='' as $$
declare p public.project_states; v public.project_contract_versions; a public.workspace_business_owners; prior public.project_contract_review_decisions; d public.decisions; request_record uuid; next_sequence integer; risks jsonb; k text;
begin
 if auth.uid() is null then raise exception 'authentication_required'; end if;
 select * into p from public.project_states where id=project_state_input for update;
 if p.id is null or not public.is_workspace_member(p.workspace_id) then raise exception 'project_state_not_found_or_access_denied'; end if;
 if not public.has_app_permission(p.workspace_id,'project.contract.review') then raise exception 'missing_contract_review_permission'; end if;
 if request_id_input is null or version_input is null or version_input<1 or sequence_input is null or sequence_input<0 or outcome_input is null or outcome_input not in ('approved','held','rejected')
  or nullif(btrim(rationale_input),'') is null or length(rationale_input)>4000 or confirmations_input is null or jsonb_typeof(confirmations_input)<>'object' then raise exception 'invalid_contract_review_decision'; end if;
 if (select count(*) from jsonb_object_keys(confirmations_input))<>4 then raise exception 'invalid_review_confirmations'; end if;
 foreach k in array array['agreementAuthorized','commercialTermsReviewed','effectivenessReviewed','noMaterialBlockers'] loop
  if jsonb_typeof(confirmations_input->k) is distinct from 'boolean' then raise exception 'invalid_review_confirmations'; end if;
 end loop;
 select * into prior from public.project_contract_review_decisions where project_state_id=p.id and request_id=request_id_input;
 if prior.decision_id is not null then
  select * into d from public.decisions where id=prior.decision_id;
  if d.actor_user_id<>auth.uid() or prior.owner_authority_id is distinct from authority_id_input or prior.sequence<>sequence_input+1 or d.outcome<>outcome_input or d.rationale<>btrim(rationale_input) or prior.confirmations<>confirmations_input
   or not exists(select 1 from public.project_contract_versions c where c.id=prior.contract_version_id and c.version=version_input) then raise exception 'request_id_payload_mismatch'; end if;
  -- Recover an already committed result without requiring another approval ceremony.
  return private.read_project_contract_command(p.id)||jsonb_build_object('savedDecisionId',d.id);
 end if;
 if p.stage<>'project_authorization_setup' or p.status<>'active' or p.archived_at is not null then raise exception 'contract_review_not_applicable'; end if;
 select * into a from public.workspace_business_owners where id=authority_id_input for share;
 if a.id is null or a.workspace_id<>p.workspace_id or a.user_id<>auth.uid() or a.revoked_at is not null or a.effective_from>now() or (a.effective_until is not null and a.effective_until<=now()) then raise exception 'contract_owner_authority_required'; end if;
 if not private.contract_strong_session() then raise exception 'contract_strong_verification_required'; end if;
 select * into v from public.project_contract_versions where project_state_id=p.id order by version desc limit 1;
 if v.id is null or v.version<>version_input then raise exception 'contract_version_conflict'; end if;
 select coalesce(max(sequence),0)+1 into next_sequence from public.project_contract_review_decisions where contract_version_id=v.id;
 if next_sequence<>sequence_input+1 then raise exception 'contract_review_sequence_conflict'; end if;
 select id into request_record from public.project_contract_review_requests where contract_version_id=v.id;
 if request_record is null then raise exception 'contract_review_request_required'; end if;
 risks:=private.contract_risk_snapshot(p.id);
 if outcome_input='approved' then
  if exists(select 1 from jsonb_array_elements((select evidence from public.project_setup_versions where project_state_id=p.id order by version desc limit 1)) e
   where e->>'requirement' in ('contracting_party','contract_review','commercial_terms','contractual_risks') and e->>'materialBlocker'='true') then raise exception 'contract_risk_resolution_required'; end if;
  if cardinality(private.contract_review_request_blockers(v.data))>0 then raise exception 'incomplete_contract_review_basis'; end if;
  if exists(select 1 from jsonb_each(confirmations_input) x where x.value<>'true'::jsonb) then raise exception 'review_confirmations_required'; end if;
  -- There is no governed risk-acceptance or exception contract yet: do not infer it
  -- from a manually closed risk or from the reviewer being the owner.
  if jsonb_array_length(v.data->'riskIds')>0 or v.data->>'riskAssessment'<>'none_identified'
   or exists(select 1 from jsonb_array_elements(risks) r where r->>'kind'='blocker' or lower(coalesce(r->>'severity','')) in ('high','critical')) then raise exception 'contract_risk_resolution_required'; end if;
  if v.data->>'effectiveFrom'<>'' and (v.data->>'effectiveFrom')::date>current_date then raise exception 'contract_agreement_not_effective'; end if;
  if v.data->>'effectiveUntil'<>'' and (v.data->>'effectiveUntil')::date<current_date then raise exception 'contract_agreement_expired'; end if;
  if v.data->>'agreementRevisionId'<>'' and not exists(select 1 from public.document_revisions r where r.id::text=v.data->>'agreementRevisionId' and r.state='published' and r.published_source_snapshot is not null) then raise exception 'contract_agreement_not_current'; end if;
 end if;
 insert into public.decisions(project_state_id,decision_type,outcome,rationale,authority_basis,actor_user_id,capability_key)
 values(p.id,'contract_review',outcome_input,btrim(rationale_input),a.evidence_reference,auth.uid(),'setup_contract') returning * into d;
 insert into public.project_contract_review_decisions(decision_id,project_state_id,contract_version_id,review_request_id,sequence,request_id,owner_authority_id,authority_snapshot,risk_snapshot,verification_snapshot,confirmations)
 values(d.id,p.id,v.id,request_record,next_sequence,request_id_input,a.id,to_jsonb(a),risks,
  jsonb_build_object('aal',auth.jwt()->>'aal','sessionId',auth.jwt()->>'session_id','amr',auth.jwt()->'amr','checkedAt',now()),confirmations_input);
 insert into public.audit_events(project_state_id,event_type,actor_user_id,payload,occurred_at)
 values(p.id,'contract_review_decided',auth.uid(),jsonb_build_object('decisionId',d.id,'contractVersionId',v.id,'sequence',next_sequence,'outcome',outcome_input),now());
 return private.read_project_contract_command(p.id)||jsonb_build_object('savedDecisionId',d.id);
end $$;
create function public.decide_project_contract_review(project_state_input uuid,version_input integer,sequence_input integer,request_id_input uuid,authority_id_input uuid,outcome_input text,rationale_input text,confirmations_input jsonb)
 returns jsonb language sql security invoker set search_path='' as $$ select private.decide_project_contract_review_command(project_state_input,version_input,sequence_input,request_id_input,authority_id_input,outcome_input,rationale_input,confirmations_input) $$;
revoke all on function private.read_project_contract_command(uuid),private.decide_project_contract_review_command(uuid,integer,integer,uuid,uuid,text,text,jsonb),public.decide_project_contract_review(uuid,integer,integer,uuid,uuid,text,text,jsonb) from public,anon;
grant execute on function private.read_project_contract_command(uuid),private.decide_project_contract_review_command(uuid,integer,integer,uuid,uuid,text,text,jsonb),public.decide_project_contract_review(uuid,integer,integer,uuid,uuid,text,text,jsonb) to authenticated;

-- Canonical contract decisions project into the four legacy checklist aliases.
-- Historical setup versions remain untouched; gate snapshots capture the projection.
create function private.project_contract_setup_evidence(project_state_input uuid,evidence_input jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare c jsonb; result jsonb; k text; prior jsonb; decision jsonb;
begin
 c:=private.read_project_contract_command(project_state_input);
 if (c->>'version')::integer=0 then return evidence_input; end if;
 decision:=c->'reviewDecisions'->0;
 select coalesce(jsonb_agg(e),'[]') into result from jsonb_array_elements(evidence_input) e where e->>'requirement' not in ('contracting_party','contract_review','commercial_terms','contractual_risks');
 foreach k in array array['contracting_party','contract_review','commercial_terms','contractual_risks'] loop
  select e into prior from jsonb_array_elements(evidence_input) e where e->>'requirement'=k;
  result:=result||jsonb_build_array(jsonb_build_object('requirement',k,'state',case when c->>'approvalVerified'='true' then 'satisfied' else 'unresolved' end,
   'details','Contract version '||(c->>'version')||' · '||(c->>'status'),
   'evidenceReference',coalesce(decision->>'id',''),'accountableUserId',coalesce(decision->>'actorUserId',''),
   'materialBlocker',coalesce(prior->'materialBlocker','false'::jsonb)));
 end loop;
 return result;
end $$;
revoke all on function private.project_contract_setup_evidence(uuid,jsonb) from public,anon,authenticated;
create or replace function private.read_project_setup_command(project_state_input uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; projected jsonb; workspace uuid; contract_version integer;
begin
 result:=private.read_project_setup_before_contract(project_state_input);
 select workspace_id into workspace from public.project_states where id=project_state_input;
 select max(version) into contract_version from public.project_contract_versions where project_state_id=project_state_input;
 if contract_version is null then return result; end if;
 projected:=private.project_contract_setup_evidence(project_state_input,result->'evidence');
 return result||jsonb_build_object('contractPreparationVersion',contract_version,'evidence',projected,'unmet',private.setup_unmet(projected,workspace),
  'approvalBlocker','Contractual readiness uses the current authorized review. Gate authority and remaining Setup conditions are evaluated separately.');
end $$;
create or replace function private.decide_project_gate01_command(project_state_input uuid,version_input integer,request_id_input uuid,authority_id_input uuid,disposition_input text,rationale_input text,obligations_input jsonb) returns public.project_gate01_decisions language plpgsql security definer set search_path='' as $$
begin
 perform private.read_project_setup_command(project_state_input);
 perform 1 from public.project_states where id=project_state_input for update;
 -- Recover a previously committed gate decision through the original idempotency check.
 if not exists(select 1 from public.project_gate01_decisions where project_state_id=project_state_input and request_id=request_id_input)
  and disposition_input in ('go','conditional_go') and exists(select 1 from public.project_contract_versions where project_state_id=project_state_input)
  and private.read_project_contract_command(project_state_input)->>'approvalVerified'<>'true' then raise exception 'contract_authorized_review_required'; end if;
 return private.decide_project_gate01_before_contract(project_state_input,version_input,request_id_input,authority_id_input,disposition_input,rationale_input,obligations_input);
end $$;

create or replace function private.decide_project_gate01_before_contract(project_state_input uuid,version_input integer,request_id_input uuid,authority_id_input uuid,disposition_input text,rationale_input text,obligations_input jsonb)
returns public.project_gate01_decisions language plpgsql security definer set search_path='' as $$
declare p public.project_states; s public.project_setup_versions; a public.project_gate01_authorities; d public.project_gate01_decisions; unmet jsonb; o jsonb; k text; advancing boolean;
begin
 if auth.uid() is null then raise exception 'authentication_required'; end if;
 select * into p from public.project_states where id=project_state_input for update;
 if p.id is null or not public.is_workspace_member(p.workspace_id) then raise exception 'project_state_not_found_or_access_denied'; end if;
 if not public.has_app_permission(p.workspace_id,'project.gate01.decide') then raise exception 'missing_gate_decision_permission'; end if;
 if request_id_input is null or version_input is null or nullif(btrim(rationale_input),'') is null or disposition_input is null or disposition_input not in ('go','conditional_go','hold','no_go') or obligations_input is null or jsonb_typeof(obligations_input)<>'array' then raise exception 'invalid_gate_decision'; end if;
 select * into d from public.project_gate01_decisions where project_state_id=p.id and request_id=request_id_input;
 if d.id is not null then
   if d.actor_user_id<>auth.uid() or d.authority_id is distinct from authority_id_input or d.disposition<>disposition_input or d.rationale<>btrim(rationale_input) or d.obligations<>obligations_input or not exists(select 1 from public.project_setup_versions v where v.id=d.setup_version_id and v.version=version_input) then raise exception 'request_id_payload_mismatch'; end if;
   return d;
 end if;
 if p.stage<>'project_authorization_setup' or p.status<>'active' or p.archived_at is not null then raise exception 'gate_not_applicable'; end if;
 select * into s from public.project_setup_versions where project_state_id=p.id order by version desc limit 1;
 if s.id is null or s.version<>version_input then raise exception 'setup_version_conflict'; end if;
 select * into a from public.project_gate01_authorities where id=authority_id_input for share;
 if a.id is null or a.user_id<>auth.uid() or a.workspace_id<>p.workspace_id or (a.project_state_id is not null and a.project_state_id<>p.id) or a.revoked_at is not null or a.effective_from>now() or (a.effective_until is not null and a.effective_until<=now()) then raise exception 'owner_authority_unresolved'; end if;
 s.evidence:=private.project_contract_setup_evidence(p.id,s.evidence);
 unmet:=private.setup_unmet(s.evidence,p.workspace_id);
 advancing:=disposition_input in ('go','conditional_go');
 if advancing and exists(select 1 from jsonb_array_elements(s.evidence) e where e->>'materialBlocker'='true') then raise exception 'material_disqualifying_condition'; end if;
 if disposition_input='go' and (jsonb_array_length(unmet)>0 or jsonb_array_length(obligations_input)>0) then raise exception 'go_requires_satisfied_conditions'; end if;
 if disposition_input in ('hold','no_go') and jsonb_array_length(obligations_input)>0 then raise exception 'nonadvancing_decision_cannot_issue_obligations'; end if;
 if disposition_input='conditional_go' then
   if not a.permits_conditional_go or jsonb_array_length(obligations_input)=0 then raise exception 'conditional_go_not_permitted'; end if;
   for k in select jsonb_array_elements_text(unmet) loop
     if k not in ('communications','controls') then raise exception 'nonconditional_requirement:%',k; end if;
     if not exists(select 1 from jsonb_array_elements(obligations_input) obligation_row where obligation_row->>'requirement'=k) then raise exception 'missing_conditional_obligation:%',k; end if;
   end loop;
   if (select count(distinct value->>'requirement') from jsonb_array_elements(obligations_input))<>jsonb_array_length(obligations_input) then raise exception 'duplicate_conditional_obligation'; end if;
   for o in select value from jsonb_array_elements(obligations_input) loop
     if coalesce(o->>'requirement','') not in ('communications','controls') or not(coalesce(o->>'requirement','')=any(a.conditional_requirements)) then raise exception 'invalid_obligation_scope'; end if;
     foreach k in array array['description','reasonToAdvance','permittedLimits','ownerUserId','consequence'] loop
       if jsonb_typeof(o->k) is distinct from 'string' or nullif(btrim(o->>k),'') is null then raise exception 'incomplete_conditional_obligation'; end if;
     end loop;
     if not exists(select 1 from public.workspace_memberships m where m.workspace_id=p.workspace_id and m.user_id::text=o->>'ownerUserId' and m.status='active') then raise exception 'invalid_obligation_owner'; end if;
     if nullif(btrim(o->>'dueDate'),'') is null and nullif(btrim(o->>'dueTrigger'),'') is null then raise exception 'obligation_due_required'; end if;
     if nullif(btrim(o->>'dueDate'),'') is not null and (not isfinite((o->>'dueDate')::timestamptz) or (o->>'dueDate')::timestamptz<=now()) then raise exception 'obligation_overdue'; end if;
   end loop;
 end if;
 insert into public.project_gate01_decisions(project_state_id,setup_version_id,request_id,disposition,rationale,authority_id,authority_snapshot,evidence_snapshot,obligations,actor_user_id)
 values(p.id,s.id,request_id_input,disposition_input,btrim(rationale_input),a.id,to_jsonb(a),jsonb_build_object('authorizationRecordId',s.authorization_record_id,'evidence',s.evidence,'unmet',unmet),obligations_input,auth.uid()) returning * into d;
 if advancing then update public.project_states set stage='preconstruction_mobilization',commercial_stage='preconstruction_mobilization',updated_at=now() where id=p.id; end if;
 insert into public.audit_events(project_state_id,event_type,actor_user_id,payload,occurred_at) values(p.id,'gate01_decision_recorded',auth.uid(),jsonb_build_object('gate','gate_01','decisionId',d.id,'disposition',disposition_input,'advanced',advancing),now());
 return d;
end $$;

-- Ignore read-only contract aliases on Setup saves. Preserve earlier legacy facts
-- (including material flags) instead of allowing a second writable contract owner.
alter function private.save_project_setup_command(uuid,integer,uuid,jsonb) rename to save_project_setup_before_contract_review;
revoke all on function private.save_project_setup_before_contract_review(uuid,integer,uuid,jsonb) from public,anon,authenticated;
create function private.save_project_setup_command(project_state_input uuid,expected_version_input integer,request_id_input uuid,evidence_input jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; prior jsonb; historical jsonb; normalized jsonb;
begin
 perform private.read_project_setup_before_contract(project_state_input);
 perform 1 from public.project_states where id=project_state_input for update;
 result:=private.read_project_setup_before_contract(project_state_input);
 select evidence into prior from public.project_setup_versions where project_state_id=project_state_input and request_id=request_id_input;
 if not exists(select 1 from public.project_contract_versions where project_state_id=project_state_input) or prior=evidence_input then
  return private.save_project_setup_before_contract_review(project_state_input,expected_version_input,request_id_input,evidence_input);
 end if;
 if evidence_input is null or jsonb_typeof(evidence_input)<>'array' then raise exception 'invalid_setup_evidence'; end if;
 historical:=coalesce(prior,result->'evidence');
 select coalesce(jsonb_agg(e),'[]') into normalized from jsonb_array_elements(evidence_input) e where e->>'requirement' not in ('contracting_party','contract_review','commercial_terms','contractual_risks');
 normalized:=normalized||(select jsonb_agg(e) from jsonb_array_elements(historical) e where e->>'requirement' in ('contracting_party','contract_review','commercial_terms','contractual_risks'));
 return private.save_project_setup_before_contract_review(project_state_input,expected_version_input,request_id_input,normalized);
end $$;
revoke all on function private.save_project_setup_command(uuid,integer,uuid,jsonb) from public,anon;
grant execute on function private.save_project_setup_command(uuid,integer,uuid,jsonb) to authenticated;
