-- Initial scope baseline review. Existing owner evidence is reused, never seeded.
insert into public.app_permissions(permission_key,description) values
 ('project.scope.review','Review an exact scope version with verified business authority and fresh strong assurance.') on conflict do nothing;
create table public.project_scope_review_decisions (
 decision_id uuid primary key references public.decisions(id) on delete restrict,
 project_state_id uuid not null references public.project_states(id) on delete restrict,
 scope_version_id uuid not null references public.project_scope_versions(id) on delete restrict,
 review_request_id uuid not null references public.project_scope_review_requests(id) on delete restrict,
 sequence integer not null check(sequence>0), request_id uuid not null,
 owner_authority_id uuid not null references public.workspace_business_owners(id),
 authority_snapshot jsonb not null, verification_snapshot jsonb not null, confirmations jsonb not null,
 contract_decision_id uuid references public.decisions(id), risk_snapshot jsonb not null,
 unique(project_state_id,request_id), unique(scope_version_id,sequence)
);
create table public.project_scope_baselines (
 id uuid primary key default gen_random_uuid(), project_state_id uuid not null unique references public.project_states(id) on delete restrict,
 scope_version_id uuid not null unique references public.project_scope_versions(id) on delete restrict,
 decision_id uuid not null unique references public.project_scope_review_decisions(decision_id), created_at timestamptz not null default now()
);
alter table public.project_scope_review_decisions enable row level security;
alter table public.project_scope_baselines enable row level security;
revoke all on public.project_scope_review_decisions,public.project_scope_baselines from public,anon,authenticated;
grant select on public.project_scope_review_decisions,public.project_scope_baselines to authenticated;
create policy scope_decisions_read on public.project_scope_review_decisions for select to authenticated using(exists(select 1 from public.project_states p where p.id=project_state_id and public.is_workspace_member(p.workspace_id)));
create policy scope_baselines_read on public.project_scope_baselines for select to authenticated using(exists(select 1 from public.project_states p where p.id=project_state_id and public.is_workspace_member(p.workspace_id)));
create trigger scope_decisions_immutable before update or delete on public.project_scope_review_decisions for each row execute function private.reject_setup_history_mutation();
create trigger scope_baselines_immutable before update or delete on public.project_scope_baselines for each row execute function private.reject_setup_history_mutation();
create function private.protect_scope_decision() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.project_scope_review_decisions where decision_id=old.id) then raise exception 'scope_decision_is_immutable'; end if;
 if tg_op='UPDATE' then return new; end if; return old;
end $$;
revoke all on function private.protect_scope_decision() from public,anon,authenticated;
create trigger protect_scope_decision before update or delete on public.decisions for each row execute function private.protect_scope_decision();

-- A published revision is source evidence, never approval. Currentness is checked
-- independently from the immutable payload retained in scope preparation.
create function private.scope_sources_current(v public.project_scope_versions) returns boolean language sql stable set search_path='' as $$
 select not exists(select 1 from jsonb_array_elements(v.items) e cross join lateral unnest(array[e->>'sourceRevisionId',e->>'criterionRevisionId',e->>'programRevisionId']) ref
 where ref<>'' and not exists(select 1 from public.document_revisions r join public.document_records d on d.id=r.document_record_id
 where r.id::text=ref and d.project_state_id=v.project_state_id and r.state='published' and r.published_source_snapshot is not null
 and exists(select 1 from jsonb_array_elements(v.references_snapshot->'revisions') frozen where frozen->>'id'=ref and frozen->'published_source_snapshot'=r.published_source_snapshot)))
$$;
revoke all on function private.scope_sources_current(public.project_scope_versions) from public,anon,authenticated;
alter function private.read_project_scope_command(uuid) rename to read_project_scope_before_review;
revoke all on function private.read_project_scope_before_review(uuid) from public,anon,authenticated;
create function private.read_project_scope_command(project_state_input uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; p public.project_states; v public.project_scope_versions; b public.project_scope_baselines; latest public.project_scope_review_decisions; outcome text; contract jsonb; verified boolean; reasons text[]:='{}';
begin
 result:=private.read_project_scope_before_review(project_state_input);
 select * into p from public.project_states where id=project_state_input;
 select * into v from public.project_scope_versions where project_state_id=p.id order by version desc limit 1;
 select * into b from public.project_scope_baselines where project_state_id=p.id;
 select * into latest from public.project_scope_review_decisions where scope_version_id=v.id order by sequence desc limit 1;
 select d.outcome into outcome from public.decisions d where d.id=latest.decision_id;
 contract:=private.read_project_contract_command(p.id);
 if cardinality(private.scope_review_blockers(coalesce(v.items,'[]')))>0 then reasons:=array_append(reasons,'Complete and submit the scope preparation.'); end if;
 if contract->>'approvalVerified' is distinct from 'true' then reasons:=array_append(reasons,'Current authorized contract review is required.'); end if;
 if v.id is not null and not private.scope_sources_current(v) then reasons:=array_append(reasons,'A referenced publication is no longer current. Prepare and review the correct source.'); end if;
 if exists(select 1 from jsonb_array_elements((select evidence from public.project_setup_versions where project_state_id=p.id order by version desc limit 1)) e where e->>'requirement'='scope' and e->>'materialBlocker'='true') then reasons:=array_append(reasons,'A material scope blocker requires governed resolution.'); end if;
 if b.id is not null and b.scope_version_id<>v.id then reasons:=array_append(reasons,'A later preparation is a proposed change. Governed change approval is required; the original baseline remains intact.'); end if;
 verified:=coalesce(outcome='approved' and b.scope_version_id=v.id and cardinality(reasons)=0
  and latest.contract_decision_id::text=contract->'reviewDecisions'->0->>'id'
  and latest.risk_snapshot=private.contract_risk_snapshot(p.id),false);
 return result||jsonb_build_object('approvedBaselineId',b.id,'approvalVerified',verified,'reviewSequence',coalesce(latest.sequence,0),
 'status',case when verified then 'approved' when b.id is not null then 'review_required' else coalesce(outcome,'preparation') end,
 'approvalBlockers',reasons,'reviewAccess',jsonb_build_object('hasPermission',public.has_app_permission(p.workspace_id,'project.scope.review'),'strongSession',private.contract_strong_session(),
 'ownerAuthorities',(select coalesce(jsonb_agg(jsonb_build_object('id',o.id,'reference',o.evidence_reference)),'[]') from public.workspace_business_owners o where o.workspace_id=p.workspace_id and o.user_id=auth.uid() and o.revoked_at is null and o.effective_from<=now() and (o.effective_until is null or o.effective_until>now()))),
 'baseline',(select jsonb_build_object('id',b.id,'version',s.version,'decisionId',b.decision_id,'createdAt',b.created_at,'items',s.items,'references',s.references_snapshot,'authorizationRecordId',s.authorization_record_id) from public.project_scope_versions s where s.id=b.scope_version_id),
 'reviewDecisions',(select coalesce(jsonb_agg(jsonb_build_object('id',d.id,'version',s.version,'sequence',r.sequence,'outcome',d.outcome,'rationale',d.rationale,'actorUserId',d.actor_user_id,'createdAt',d.created_at,'authorityReference',r.authority_snapshot->>'evidence_reference','contractDecisionId',r.contract_decision_id) order by s.version desc,r.sequence desc),'[]') from public.project_scope_review_decisions r join public.decisions d on d.id=r.decision_id join public.project_scope_versions s on s.id=r.scope_version_id where r.project_state_id=p.id),
 'requests',(select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'version',s.version,'createdAt',r.created_at,'status',case when exists(select 1 from public.project_scope_review_decisions d where d.review_request_id=r.id) then 'reviewed' when s.version=v.version then 'pending' else 'superseded' end) order by s.version desc),'[]') from public.project_scope_review_requests r join public.project_scope_versions s on s.id=r.scope_version_id where r.project_state_id=p.id));
end $$;
create function private.decide_project_scope_review_command(project_state_input uuid,version_input integer,sequence_input integer,request_id_input uuid,authority_id_input uuid,outcome_input text,rationale_input text,confirmations_input jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare p public.project_states; v public.project_scope_versions; a public.workspace_business_owners; prior public.project_scope_review_decisions; d public.decisions; request_record uuid; next_sequence integer; contract jsonb; risks jsonb; k text;
begin
 if auth.uid() is null then raise exception 'authentication_required'; end if;
 select * into p from public.project_states where id=project_state_input for update;
 if p.id is null or not public.is_workspace_member(p.workspace_id) then raise exception 'project_state_not_found_or_access_denied'; end if;
 if not public.has_app_permission(p.workspace_id,'project.scope.review') then raise exception 'missing_scope_review_permission'; end if;
 if request_id_input is null or version_input is null or version_input<1 or sequence_input is null or sequence_input<0 or outcome_input is null or outcome_input not in ('approved','held','rejected') or nullif(btrim(rationale_input),'') is null or length(rationale_input)>4000 or confirmations_input is null or jsonb_typeof(confirmations_input)<>'object' then raise exception 'invalid_scope_review_decision'; end if;
 if (select count(*) from jsonb_object_keys(confirmations_input))<>3 then raise exception 'invalid_scope_confirmations'; end if;
 foreach k in array array['withinAuthorizedBasis','boundariesReviewed','noUnresolvedScopeBlockers'] loop
  if jsonb_typeof(confirmations_input->k) is distinct from 'boolean' then raise exception 'invalid_scope_confirmations'; end if;
 end loop;
 select * into prior from public.project_scope_review_decisions where project_state_id=p.id and request_id=request_id_input;
 if prior.decision_id is not null then
  select * into d from public.decisions where id=prior.decision_id;
  if d.actor_user_id<>auth.uid() or prior.owner_authority_id is distinct from authority_id_input or prior.sequence<>sequence_input+1 or d.outcome<>outcome_input or d.rationale<>btrim(rationale_input) or prior.confirmations<>confirmations_input or not exists(select 1 from public.project_scope_versions s where s.id=prior.scope_version_id and s.version=version_input) then raise exception 'request_id_payload_mismatch'; end if;
  return private.read_project_scope_command(p.id)||jsonb_build_object('savedDecisionId',d.id);
 end if;
 if p.stage<>'project_authorization_setup' or p.status<>'active' or p.archived_at is not null then raise exception 'scope_review_not_applicable'; end if;
 select * into a from public.workspace_business_owners where id=authority_id_input for share;
 if a.id is null or a.workspace_id<>p.workspace_id or a.user_id<>auth.uid() or a.revoked_at is not null or a.effective_from>now() or (a.effective_until is not null and a.effective_until<=now()) then raise exception 'scope_owner_authority_required'; end if;
 if not private.contract_strong_session() then raise exception 'scope_strong_verification_required'; end if;
 select * into v from public.project_scope_versions where project_state_id=p.id order by version desc limit 1;
 if v.id is null or v.version<>version_input then raise exception 'scope_version_conflict'; end if;
 select coalesce(max(sequence),0)+1 into next_sequence from public.project_scope_review_decisions where scope_version_id=v.id;
 if next_sequence<>sequence_input+1 then raise exception 'scope_review_sequence_conflict'; end if;
 select id into request_record from public.project_scope_review_requests where scope_version_id=v.id;
 if request_record is null then raise exception 'scope_review_request_required'; end if;
 contract:=private.read_project_contract_command(p.id); risks:=private.contract_risk_snapshot(p.id);
 if outcome_input='approved' then
  if exists(select 1 from public.project_scope_baselines where project_state_id=p.id and scope_version_id<>v.id) then raise exception 'scope_change_approval_required'; end if;
  if cardinality(private.scope_review_blockers(v.items))>0 then raise exception 'incomplete_scope_review_basis'; end if;
  if exists(select 1 from jsonb_each(confirmations_input) x where x.value<>'true'::jsonb) then raise exception 'scope_confirmations_required'; end if;
  if contract->>'approvalVerified' is distinct from 'true' then raise exception 'scope_contract_approval_required'; end if;
  if not exists(select 1 from public.project_contract_versions c where c.project_state_id=p.id and c.version=(contract->>'version')::integer and c.authorization_record_id=v.authorization_record_id) then raise exception 'scope_authorization_basis_mismatch'; end if;
  -- Hold source rows through decision insertion; source supersession cannot race approval.
  perform 1 from public.document_revisions r where exists(select 1 from jsonb_array_elements(v.items) e where r.id::text in(e->>'sourceRevisionId',e->>'criterionRevisionId',e->>'programRevisionId')) order by r.id for share;
  if not private.scope_sources_current(v) then raise exception 'scope_source_not_current'; end if;
  if exists(select 1 from jsonb_array_elements((select evidence from public.project_setup_versions where project_state_id=p.id order by version desc limit 1)) e where e->>'requirement'='scope' and e->>'materialBlocker'='true') then raise exception 'scope_material_resolution_required'; end if;
 end if;
 insert into public.decisions(project_state_id,decision_type,outcome,rationale,authority_basis,actor_user_id,capability_key)
 values(p.id,'scope_baseline_review',outcome_input,btrim(rationale_input),a.evidence_reference,auth.uid(),'setup_scope') returning * into d;
 insert into public.project_scope_review_decisions(decision_id,project_state_id,scope_version_id,review_request_id,sequence,request_id,owner_authority_id,authority_snapshot,verification_snapshot,confirmations,contract_decision_id,risk_snapshot)
 values(d.id,p.id,v.id,request_record,next_sequence,request_id_input,a.id,to_jsonb(a),jsonb_build_object('aal',auth.jwt()->>'aal','sessionId',auth.jwt()->>'session_id','amr',auth.jwt()->'amr','checkedAt',now()),confirmations_input,(contract->'reviewDecisions'->0->>'id')::uuid,risks);
 if outcome_input='approved' then insert into public.project_scope_baselines(project_state_id,scope_version_id,decision_id) values(p.id,v.id,d.id) on conflict(project_state_id) do nothing; end if;
 insert into public.audit_events(project_state_id,event_type,actor_user_id,payload,occurred_at) values(p.id,'scope_review_decided',auth.uid(),jsonb_build_object('decisionId',d.id,'scopeVersionId',v.id,'sequence',next_sequence,'outcome',outcome_input),now());
 return private.read_project_scope_command(p.id)||jsonb_build_object('savedDecisionId',d.id);
end $$;
create function public.decide_project_scope_review(project_state_input uuid,version_input integer,sequence_input integer,request_id_input uuid,authority_id_input uuid,outcome_input text,rationale_input text,confirmations_input jsonb) returns jsonb language sql security invoker set search_path='' as $$select private.decide_project_scope_review_command(project_state_input,version_input,sequence_input,request_id_input,authority_id_input,outcome_input,rationale_input,confirmations_input)$$;
revoke all on function private.read_project_scope_command(uuid),private.decide_project_scope_review_command(uuid,integer,integer,uuid,uuid,text,text,jsonb),public.decide_project_scope_review(uuid,integer,integer,uuid,uuid,text,text,jsonb) from public,anon;
grant execute on function private.read_project_scope_command(uuid),private.decide_project_scope_review_command(uuid,integer,integer,uuid,uuid,text,text,jsonb),public.decide_project_scope_review(uuid,integer,integer,uuid,uuid,text,text,jsonb) to authenticated;

create function private.project_scope_setup_evidence(project_state_input uuid,evidence_input jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare s jsonb; result jsonb; prior jsonb; decision jsonb;
begin
 s:=private.read_project_scope_command(project_state_input);
 if (s->>'version')::integer=0 then return evidence_input; end if;
 decision:=s->'reviewDecisions'->0;
 select e into prior from jsonb_array_elements(coalesce(evidence_input,'[]')) e where e->>'requirement'='scope';
 select coalesce(jsonb_agg(e),'[]') into result from jsonb_array_elements(coalesce(evidence_input,'[]')) e where e->>'requirement'<>'scope';
 return result||jsonb_build_array(jsonb_build_object('requirement','scope','state',case when s->>'approvalVerified'='true' then 'satisfied' else 'unresolved' end,'details','Scope version '||(s->>'version')||' · '||(s->>'status'),'evidenceReference',coalesce(decision->>'id',''),'accountableUserId',coalesce(decision->>'actorUserId',''),'materialBlocker',coalesce(prior->'materialBlocker','false'::jsonb)));
end $$;
revoke all on function private.project_scope_setup_evidence(uuid,jsonb) from public,anon,authenticated;
create or replace function private.read_project_setup_command(project_state_input uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; v integer; projected jsonb; workspace uuid;
begin
 result:=private.read_project_setup_before_scope(project_state_input);
 select max(version) into v from public.project_scope_versions where project_state_id=project_state_input;
 if v is null then return result; end if;
 select workspace_id into workspace from public.project_states where id=project_state_input;
 projected:=private.project_scope_setup_evidence(project_state_input,result->'evidence');
 return result||jsonb_build_object('scopePreparationVersion',v,'evidence',projected,'unmet',private.setup_unmet(projected,workspace),'approvalBlocker','Scope and contract readiness require their current authorized decisions. Gate authority and other Setup requirements remain separate.');
end $$;
create or replace function private.decide_project_gate01_command(project_state_input uuid,version_input integer,request_id_input uuid,authority_id_input uuid,disposition_input text,rationale_input text,obligations_input jsonb) returns public.project_gate01_decisions language plpgsql security definer set search_path='' as $$
begin
 perform private.read_project_scope_command(project_state_input);
 perform 1 from public.project_states where id=project_state_input for update;
 if disposition_input in ('go','conditional_go') and exists(select 1 from public.project_scope_versions where project_state_id=project_state_input) and not exists(select 1 from public.project_gate01_decisions where project_state_id=project_state_input and request_id=request_id_input)
 and private.read_project_scope_command(project_state_input)->>'approvalVerified' is distinct from 'true' then raise exception 'scope_authorized_baseline_required'; end if;
 return private.decide_project_gate01_before_scope(project_state_input,version_input,request_id_input,authority_id_input,disposition_input,rationale_input,obligations_input);
end $$;

-- Preserve existing gate semantics, projecting the canonical scope decision too.
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
 s.evidence:=private.project_scope_setup_evidence(p.id,private.project_contract_setup_evidence(p.id,s.evidence));
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
