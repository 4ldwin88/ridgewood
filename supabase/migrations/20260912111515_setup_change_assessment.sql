-- Changes owns assessment; Decisions owns independent internal review outcomes.
-- Internal review is not client/trade authorization, an instruction, or execution.
insert into public.app_permissions(permission_key,description) values
 ('project.change.review','Review an exact change assessment dimension with verified owner authority.') on conflict do nothing;
create table public.project_change_versions (
 id uuid primary key default gen_random_uuid(), change_id uuid not null references public.project_changes(id) on delete restrict,
 project_state_id uuid not null references public.project_states(id) on delete restrict, version integer not null check(version>0), request_id uuid not null,
 scope_version_id uuid references public.project_scope_versions(id) on delete restrict,
 baseline_id uuid references public.project_scope_baselines(id) on delete restrict,
 data jsonb not null, references_snapshot jsonb not null,
 actor_user_id uuid not null references auth.users(id), created_at timestamptz not null default now(), unique(change_id,version), unique(project_state_id,request_id)
);
create table public.project_change_review_requests (
 id uuid primary key default gen_random_uuid(), change_version_id uuid not null unique references public.project_change_versions(id) on delete restrict,
 project_state_id uuid not null references public.project_states(id) on delete restrict, request_id uuid not null,
 actor_user_id uuid not null references auth.users(id), created_at timestamptz not null default now(), unique(project_state_id,request_id)
);
create table public.project_change_dimension_decisions (
 decision_id uuid primary key references public.decisions(id) on delete restrict,
 project_state_id uuid not null references public.project_states(id) on delete restrict,
 change_version_id uuid not null references public.project_change_versions(id) on delete restrict,
 review_request_id uuid not null references public.project_change_review_requests(id) on delete restrict,
 dimension text not null check(dimension in ('scope','cost','time')), sequence integer not null check(sequence>0), request_id uuid not null,
 owner_authority_id uuid not null references public.workspace_business_owners(id), authority_snapshot jsonb not null,
 verification_snapshot jsonb not null, confirmed boolean not null, contract_decision_id uuid references public.decisions(id), risk_snapshot jsonb not null,
 unique(project_state_id,request_id), unique(change_version_id,dimension,sequence)
);
alter table public.project_change_versions enable row level security;
revoke all on public.project_change_versions from public,anon,authenticated;
grant select on public.project_change_versions to authenticated;
create policy project_change_versions_read on public.project_change_versions for select to authenticated using(exists(select 1 from public.project_states p where p.id=project_state_id and public.is_workspace_member(p.workspace_id)));
create trigger project_change_versions_immutable before update or delete on public.project_change_versions for each row execute function private.reject_setup_history_mutation();
alter table public.project_change_review_requests enable row level security;
revoke all on public.project_change_review_requests from public,anon,authenticated;
grant select on public.project_change_review_requests to authenticated;
create policy project_change_review_requests_read on public.project_change_review_requests for select to authenticated using(exists(select 1 from public.project_states p where p.id=project_state_id and public.is_workspace_member(p.workspace_id)));
create trigger project_change_review_requests_immutable before update or delete on public.project_change_review_requests for each row execute function private.reject_setup_history_mutation();
alter table public.project_change_dimension_decisions enable row level security;
revoke all on public.project_change_dimension_decisions from public,anon,authenticated;
grant select on public.project_change_dimension_decisions to authenticated;
create policy project_change_dimension_decisions_read on public.project_change_dimension_decisions for select to authenticated using(exists(select 1 from public.project_states p where p.id=project_state_id and public.is_workspace_member(p.workspace_id)));
create trigger project_change_dimension_decisions_immutable before update or delete on public.project_change_dimension_decisions for each row execute function private.reject_setup_history_mutation();
create function private.protect_change_dimension_decision() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.project_change_dimension_decisions where decision_id=old.id) then raise exception 'change_decision_is_immutable'; end if;
 if tg_op='DELETE' then return old; end if; return new;
end $$;
revoke all on function private.protect_change_dimension_decision() from public,anon,authenticated;
create trigger protect_change_dimension_decision before update or delete on public.decisions for each row execute function private.protect_change_dimension_decision();

create function private.change_assessment_required(data_input jsonb) returns text[] language plpgsql immutable set search_path='' as $$
declare reasons text[]:='{}';
begin
 if nullif(btrim(data_input->>'description'),'') is null then reasons:=array_append(reasons,'Describe the proposed departure.'); end if;
 if nullif(data_input->>'proposedScopeVersion','') is null then reasons:=array_append(reasons,'Select the proposed saved scope version.'); end if;
 if data_input->>'costAssessment' is distinct from 'assessed' or nullif(data_input->>'costAmount','') is null or nullif(data_input->>'currency','') is null then reasons:=array_append(reasons,'Assess cost separately, including an explicit reviewed zero if applicable.'); end if;
 if data_input->>'timeAssessment' is distinct from 'assessed' or nullif(data_input->>'timeDays','') is null or nullif(data_input->>'calendarBasis','') is null then reasons:=array_append(reasons,'Assess signed time impact and its calendar basis.'); end if;
 if nullif(btrim(data_input->>'otherImpacts'),'') is null then reasons:=array_append(reasons,'Assess procurement, quality, safety, permits, responsibilities and notice implications.'); end if;
 if nullif(data_input->>'materialAssessment','') is null then reasons:=array_append(reasons,'Assess material blockers and exceptions.'); end if;
 if coalesce(jsonb_array_length(data_input->'basisRevisionIds'),0)=0 then reasons:=array_append(reasons,'Link current published impact and pricing evidence.'); end if;
 return reasons;
end $$;
create function private.change_sources_current(v public.project_change_versions) returns boolean language sql stable set search_path='' as $$
 select not exists(select 1 from jsonb_array_elements_text(v.data->'basisRevisionIds') ref
 where not exists(select 1 from public.document_revisions r join public.document_records d on d.id=r.document_record_id
 where r.id::text=ref and d.project_state_id=v.project_state_id and r.state='published' and r.published_source_snapshot is not null
 and exists(select 1 from jsonb_array_elements(v.references_snapshot) f where f->>'id'=ref and f->'published_source_snapshot'=r.published_source_snapshot)))
$$;
revoke all on function private.change_assessment_required(jsonb),private.change_sources_current(public.project_change_versions) from public,anon,authenticated;

create function private.read_project_change_command(project_state_input uuid,change_id_input uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare p public.project_states; c public.project_changes; v public.project_change_versions; proposed public.project_scope_versions; s jsonb; contract jsonb; risks jsonb; reasons text[]; dimensions jsonb;
begin
 if auth.uid() is null then raise exception 'authentication_required'; end if;
 select * into p from public.project_states where id=project_state_input;
 if p.id is null or not public.is_workspace_member(p.workspace_id) then raise exception 'project_state_not_found_or_access_denied'; end if;
 select * into c from public.project_changes where id=change_id_input and project_state_id=p.id;
 if c.id is null then raise exception 'change_not_found'; end if;
 select * into v from public.project_change_versions where change_id=c.id order by version desc limit 1;
 select * into proposed from public.project_scope_versions where id=v.scope_version_id;
 s:=private.read_project_scope_command(p.id); contract:=private.read_project_contract_command(p.id); risks:=private.contract_risk_snapshot(p.id);
 reasons:=private.change_assessment_required(v.data);
 if v.baseline_id is null or not exists(select 1 from public.project_scope_baselines where id=v.baseline_id and project_state_id=p.id) then reasons:=array_append(reasons,'An original approved scope baseline is required.'); end if;
 if proposed.id is null or proposed.version is distinct from (s->>'version')::integer then reasons:=array_append(reasons,'The proposed scope must be the current saved preparation.'); end if;
 if proposed.id is not null then reasons:=reasons||private.scope_review_blockers(proposed.items); end if;
 if exists(select 1 from jsonb_array_elements((select evidence from public.project_setup_versions where project_state_id=p.id order by version desc limit 1)) e where e->>'requirement'='scope' and e->>'materialBlocker'='true') then reasons:=array_append(reasons,'A material scope blocker requires governed resolution.'); end if;
 if proposed.id is not null and not private.scope_sources_current(proposed) then reasons:=array_append(reasons,'A proposed scope publication is no longer current.'); end if;
 if v.id is not null and not private.change_sources_current(v) then reasons:=array_append(reasons,'Impact or pricing evidence is no longer current.'); end if;
 if v.data->>'materialAssessment' is distinct from 'none_identified' then reasons:=array_append(reasons,'Material blockers require governed resolution; no exception is granted here.'); end if;
 if contract->>'approvalVerified' is distinct from 'true' then reasons:=array_append(reasons,'Current authorized contract review is required.'); end if;
 if proposed.id is not null and proposed.authorization_record_id::text is distinct from contract->>'authorizationRecordId' then reasons:=array_append(reasons,'Scope and contract must retain the same frozen authorization.'); end if;
 select jsonb_object_agg(dim,jsonb_build_object('sequence',coalesce(r.sequence,0),'outcome',d.outcome,'current',coalesce(d.outcome='approved' and cardinality(reasons)=0 and r.contract_decision_id::text=contract->'reviewDecisions'->0->>'id' and r.risk_snapshot=risks,false))) into dimensions
 from unnest(array['scope','cost','time']) dim left join lateral(select * from public.project_change_dimension_decisions x where x.change_version_id=v.id and x.dimension=dim order by x.sequence desc limit 1) r on true left join public.decisions d on d.id=r.decision_id;
 return jsonb_build_object('projectStateId',p.id,'changeId',c.id,'version',coalesce(v.version,0),'data',v.data,'baselineId',v.baseline_id,'dimensions',dimensions,'blockers',reasons,
 'internalApproved',not exists(select 1 from jsonb_each(dimensions) x where x.value->>'current' is distinct from 'true'),'workAuthorized',false,
 'executionBlockers',jsonb_build_array('Client and trade authorization must be verified independently.','An authorized instruction and governed module integration are still required.','No spending, baseline update or changed work is authorized by this internal review.'),
 'origin',(select jsonb_build_object('queryId',q.id,'question',q.data->>'question','response',r.response,'scopeVersion',sv.version,'ownerUserId',q.data->>'ownerUserId','identifiedOn',q.data->>'identifiedOn') from public.project_scope_query_responses r join public.project_scope_queries q on q.id=r.query_id join public.project_scope_versions sv on sv.id=q.scope_version_id where r.id=c.source_query_response_id),
 'canEdit',s->'canEdit','reviewAccess',jsonb_build_object('hasPermission',public.has_app_permission(p.workspace_id,'project.change.review'),'strongSession',private.contract_strong_session(),'ownerAuthorities',s->'reviewAccess'->'ownerAuthorities'),
 'sources',s->'sources','scopeHistory',s->'history','baseline',s->'baseline',
 'requests',(select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'version',cv.version,'status',case when cv.id=v.id then 'current' else 'superseded' end) order by cv.version desc),'[]') from public.project_change_review_requests r join public.project_change_versions cv on cv.id=r.change_version_id where cv.change_id=c.id),
 'history',(select coalesce(jsonb_agg(jsonb_build_object('version',cv.version,'data',cv.data,'createdAt',cv.created_at,'actorUserId',cv.actor_user_id,'references',cv.references_snapshot) order by cv.version desc),'[]') from public.project_change_versions cv where cv.change_id=c.id),
 'decisions',(select coalesce(jsonb_agg(jsonb_build_object('id',d.id,'version',cv.version,'dimension',r.dimension,'sequence',r.sequence,'outcome',d.outcome,'rationale',d.rationale,'createdAt',d.created_at,'actorUserId',d.actor_user_id,'authorityReference',r.authority_snapshot->>'evidence_reference') order by cv.version desc,d.created_at desc,d.id),'[]') from public.project_change_dimension_decisions r join public.decisions d on d.id=r.decision_id join public.project_change_versions cv on cv.id=r.change_version_id where cv.change_id=c.id));
end $$;

create function private.save_project_change_command(project_state_input uuid,change_id_input uuid,expected_version_input integer,request_id_input uuid,data_input jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare p public.project_states; prior public.project_change_versions; v public.project_change_versions; proposed public.project_scope_versions; k text; refs jsonb; b uuid;
begin
 if auth.uid() is null then raise exception 'authentication_required'; end if;
 select * into p from public.project_states where id=project_state_input for update;
 if p.id is null or not public.is_workspace_member(p.workspace_id) then raise exception 'project_state_not_found_or_access_denied'; end if;
 if not public.has_app_permission(p.workspace_id,'project.setup.edit') then raise exception 'missing_setup_edit_permission'; end if;
 if not exists(select 1 from public.project_changes where id=change_id_input and project_state_id=p.id) then raise exception 'change_not_found'; end if;
 if expected_version_input is null or expected_version_input<0 or request_id_input is null or data_input is null or jsonb_typeof(data_input)<>'object' then raise exception 'invalid_change_assessment'; end if;
 if (select count(*) from jsonb_object_keys(data_input))<>12 then raise exception 'invalid_change_assessment'; end if;
 foreach k in array array['description','proposedScopeVersion','costAssessment','costAmount','currency','timeAssessment','timeDays','calendarBasis','assumptions','otherImpacts','materialAssessment'] loop
  if jsonb_typeof(data_input->k) is distinct from 'string' or length(data_input->>k)>4000 then raise exception 'invalid_change_assessment'; end if;
 end loop;
 if length(data_input->>'description')>500 or data_input->>'costAssessment' not in ('','assessed') or data_input->>'timeAssessment' not in ('','assessed') or data_input->>'calendarBasis' not in ('','working_days','calendar_days') or data_input->>'materialAssessment' not in ('','none_identified','identified') or jsonb_typeof(data_input->'basisRevisionIds') is distinct from 'array' then raise exception 'invalid_change_assessment'; end if;
 if data_input->>'costAmount'<>'' and (data_input->>'costAmount') !~ '^-?(0|[1-9][0-9]{0,11})(\.[0-9]{1,2})?$' then raise exception 'invalid_change_money'; end if;
 if data_input->>'currency'<>'' and (data_input->>'currency') !~ '^[A-Z]{3}$' then raise exception 'invalid_change_currency'; end if;
 if data_input->>'timeDays'<>'' and (data_input->>'timeDays') !~ '^-?(0|[1-9][0-9]{0,7})$' then raise exception 'invalid_change_days'; end if;
 select * into prior from public.project_change_versions where project_state_id=p.id and request_id=request_id_input;
 if prior.id is not null then
  if prior.change_id<>change_id_input or prior.version<>expected_version_input+1 or prior.actor_user_id<>auth.uid() or prior.data<>data_input then raise exception 'request_id_payload_mismatch'; end if;
  return private.read_project_change_command(p.id,change_id_input)||jsonb_build_object('savedVersion',prior.version);
 end if;
 if p.stage<>'project_authorization_setup' or p.status<>'active' or p.archived_at is not null then raise exception 'change_edit_not_allowed'; end if;
 if coalesce((select max(version) from public.project_change_versions where change_id=change_id_input),0)<>expected_version_input then raise exception 'change_version_conflict'; end if;
 if data_input->>'proposedScopeVersion'<>'' then
  select * into proposed from public.project_scope_versions where project_state_id=p.id and version::text=data_input->>'proposedScopeVersion';
  if proposed.id is null then raise exception 'invalid_change_scope'; end if;
 end if;
 if jsonb_array_length(data_input->'basisRevisionIds')>50 or (select count(*)<>count(distinct e) from jsonb_array_elements(data_input->'basisRevisionIds') e) then raise exception 'invalid_change_sources'; end if;
 if exists(select 1 from jsonb_array_elements(data_input->'basisRevisionIds') e where jsonb_typeof(e)<>'string' or not exists(select 1 from public.document_revisions r join public.document_records d on d.id=r.document_record_id where r.id::text=e#>>'{}' and d.project_state_id=p.id and r.state='published' and r.published_source_snapshot is not null)) then raise exception 'invalid_change_sources'; end if;
 perform 1 from public.document_revisions where id::text in(select jsonb_array_elements_text(data_input->'basisRevisionIds')) order by id for share;
 select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'documentId',d.id,'title',d.title,'documentType',d.document_type,'category',d.category_key,'publishedAt',r.published_at,'publishedBy',r.published_by,'revisionNumber',r.revision_number,'published_source_snapshot',r.published_source_snapshot) order by r.id),'[]') into refs from public.document_revisions r join public.document_records d on d.id=r.document_record_id where r.id::text in(select jsonb_array_elements_text(data_input->'basisRevisionIds'));
 select id into b from public.project_scope_baselines where project_state_id=p.id;
 insert into public.project_change_versions(change_id,project_state_id,version,request_id,scope_version_id,baseline_id,data,references_snapshot,actor_user_id) values(change_id_input,p.id,expected_version_input+1,request_id_input,proposed.id,b,data_input,refs,auth.uid()) returning * into v;
 insert into public.audit_events(project_state_id,event_type,actor_user_id,payload,occurred_at) values(p.id,'change_assessment_saved',auth.uid(),jsonb_build_object('changeId',change_id_input,'version',v.version),now());
 return private.read_project_change_command(p.id,change_id_input)||jsonb_build_object('savedVersion',v.version);
end $$;

create function private.request_project_change_review_command(project_state_input uuid,change_id_input uuid,version_input integer,request_id_input uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare p public.project_states; v public.project_change_versions; prior public.project_change_review_requests;
begin
 perform private.read_project_change_command(project_state_input,change_id_input);
 select * into p from public.project_states where id=project_state_input for update;
 if not public.has_app_permission(p.workspace_id,'project.setup.edit') then raise exception 'missing_setup_edit_permission'; end if;
 if version_input is null or version_input<1 or request_id_input is null then raise exception 'invalid_change_review_request'; end if;
 select * into prior from public.project_change_review_requests where project_state_id=p.id and request_id=request_id_input;
 if prior.id is not null then
  if prior.actor_user_id<>auth.uid() or not exists(select 1 from public.project_change_versions cv where cv.id=prior.change_version_id and cv.change_id=change_id_input and cv.version=version_input) then raise exception 'request_id_payload_mismatch'; end if;
  return private.read_project_change_command(p.id,change_id_input)||jsonb_build_object('submittedVersion',version_input);
 end if;
 if p.stage<>'project_authorization_setup' or p.status<>'active' or p.archived_at is not null then raise exception 'change_edit_not_allowed'; end if;
 select * into v from public.project_change_versions where change_id=change_id_input order by version desc limit 1;
 if v.id is null or v.version<>version_input then raise exception 'change_version_conflict'; end if;
 if cardinality(private.change_assessment_required(v.data))>0 or v.baseline_id is null then raise exception 'incomplete_change_assessment'; end if;
 if exists(select 1 from public.project_change_review_requests where change_version_id=v.id) then raise exception 'change_review_already_requested'; end if;
 insert into public.project_change_review_requests(change_version_id,project_state_id,request_id,actor_user_id) values(v.id,p.id,request_id_input,auth.uid());
 insert into public.audit_events(project_state_id,event_type,actor_user_id,payload,occurred_at) values(p.id,'change_review_requested',auth.uid(),jsonb_build_object('changeId',change_id_input,'version',v.version),now());
 return private.read_project_change_command(p.id,change_id_input)||jsonb_build_object('submittedVersion',v.version);
end $$;

create function private.decide_project_change_dimension_command(project_state_input uuid,change_id_input uuid,version_input integer,dimension_input text,sequence_input integer,request_id_input uuid,authority_id_input uuid,outcome_input text,rationale_input text,confirmed_input boolean) returns jsonb language plpgsql security definer set search_path='' as $$
declare p public.project_states; v public.project_change_versions; proposed public.project_scope_versions; a public.workspace_business_owners; prior public.project_change_dimension_decisions; d public.decisions; request_record uuid; contract jsonb; assessment jsonb;
begin
 perform private.read_project_change_command(project_state_input,change_id_input);
 select * into p from public.project_states where id=project_state_input for update;
 if not public.has_app_permission(p.workspace_id,'project.change.review') then raise exception 'missing_change_review_permission'; end if;
 if request_id_input is null or version_input is null or version_input<1 or sequence_input is null or sequence_input<0 or dimension_input is null or dimension_input not in ('scope','cost','time') or outcome_input is null or outcome_input not in ('approved','held','rejected') or nullif(btrim(rationale_input),'') is null or length(rationale_input)>4000 or confirmed_input is null then raise exception 'invalid_change_review_decision'; end if;
 select * into prior from public.project_change_dimension_decisions where project_state_id=p.id and request_id=request_id_input;
 if prior.decision_id is not null then
  select * into d from public.decisions where id=prior.decision_id;
  if d.actor_user_id<>auth.uid() or prior.owner_authority_id is distinct from authority_id_input or prior.sequence<>sequence_input+1 or prior.dimension<>dimension_input or d.outcome<>outcome_input or d.rationale<>btrim(rationale_input) or prior.confirmed<>confirmed_input or not exists(select 1 from public.project_change_versions cv where cv.id=prior.change_version_id and cv.change_id=change_id_input and cv.version=version_input) then raise exception 'request_id_payload_mismatch'; end if;
  return private.read_project_change_command(p.id,change_id_input)||jsonb_build_object('savedDecisionId',d.id);
 end if;
 if p.stage<>'project_authorization_setup' or p.status<>'active' or p.archived_at is not null then raise exception 'change_review_not_applicable'; end if;
 select * into a from public.workspace_business_owners where id=authority_id_input for share;
 if a.id is null or a.workspace_id<>p.workspace_id or a.user_id<>auth.uid() or a.revoked_at is not null or a.effective_from>now() or (a.effective_until is not null and a.effective_until<=now()) then raise exception 'change_owner_authority_required'; end if;
 if not private.contract_strong_session() then raise exception 'change_strong_verification_required'; end if;
 select * into v from public.project_change_versions where change_id=change_id_input order by version desc limit 1;
 if v.id is null or v.version<>version_input then raise exception 'change_version_conflict'; end if;
 if coalesce((select max(sequence) from public.project_change_dimension_decisions where change_version_id=v.id and dimension=dimension_input),0)<>sequence_input then raise exception 'change_review_sequence_conflict'; end if;
 select id into request_record from public.project_change_review_requests where change_version_id=v.id;
 if request_record is null then raise exception 'change_review_request_required'; end if;
 if outcome_input='approved' then
  if not confirmed_input then raise exception 'change_dimension_confirmation_required'; end if;
  select * into proposed from public.project_scope_versions where id=v.scope_version_id;
  perform 1 from public.document_revisions r where r.id::text in(select jsonb_array_elements_text(v.data->'basisRevisionIds')) or exists(select 1 from jsonb_array_elements(proposed.items) e where r.id::text in(e->>'sourceRevisionId',e->>'criterionRevisionId',e->>'programRevisionId')) order by r.id for share;
  assessment:=private.read_project_change_command(p.id,change_id_input);
  if jsonb_array_length(assessment->'blockers')>0 then raise exception 'change_approval_basis_unresolved'; end if;
 end if;
 contract:=private.read_project_contract_command(p.id);
 insert into public.decisions(project_state_id,decision_type,outcome,rationale,authority_basis,actor_user_id,capability_key)
 values(p.id,'change_internal_review',outcome_input,btrim(rationale_input),a.evidence_reference,auth.uid(),'change_control') returning * into d;
 insert into public.project_change_dimension_decisions(decision_id,project_state_id,change_version_id,review_request_id,dimension,sequence,request_id,owner_authority_id,authority_snapshot,verification_snapshot,confirmed,contract_decision_id,risk_snapshot)
 values(d.id,p.id,v.id,request_record,dimension_input,sequence_input+1,request_id_input,a.id,to_jsonb(a),jsonb_build_object('aal',auth.jwt()->>'aal','sessionId',auth.jwt()->>'session_id','amr',auth.jwt()->'amr','checkedAt',now()),confirmed_input,(contract->'reviewDecisions'->0->>'id')::uuid,private.contract_risk_snapshot(p.id));
 insert into public.audit_events(project_state_id,event_type,actor_user_id,payload,occurred_at) values(p.id,'change_dimension_reviewed',auth.uid(),jsonb_build_object('changeId',change_id_input,'version',v.version,'dimension',dimension_input,'decisionId',d.id),now());
 return private.read_project_change_command(p.id,change_id_input)||jsonb_build_object('savedDecisionId',d.id);
end $$;
create function public.read_project_change(project_state_input uuid,change_id_input uuid) returns jsonb language sql security invoker set search_path='' as $$select private.read_project_change_command(project_state_input,change_id_input)$$;
create function public.save_project_change(project_state_input uuid,change_id_input uuid,expected_version_input integer,request_id_input uuid,data_input jsonb) returns jsonb language sql security invoker set search_path='' as $$select private.save_project_change_command(project_state_input,change_id_input,expected_version_input,request_id_input,data_input)$$;
create function public.request_project_change_review(project_state_input uuid,change_id_input uuid,version_input integer,request_id_input uuid) returns jsonb language sql security invoker set search_path='' as $$select private.request_project_change_review_command(project_state_input,change_id_input,version_input,request_id_input)$$;
create function public.decide_project_change_dimension(project_state_input uuid,change_id_input uuid,version_input integer,dimension_input text,sequence_input integer,request_id_input uuid,authority_id_input uuid,outcome_input text,rationale_input text,confirmed_input boolean) returns jsonb language sql security invoker set search_path='' as $$select private.decide_project_change_dimension_command(project_state_input,change_id_input,version_input,dimension_input,sequence_input,request_id_input,authority_id_input,outcome_input,rationale_input,confirmed_input)$$;
revoke all on function private.read_project_change_command(uuid,uuid),private.save_project_change_command(uuid,uuid,integer,uuid,jsonb),private.request_project_change_review_command(uuid,uuid,integer,uuid),private.decide_project_change_dimension_command(uuid,uuid,integer,text,integer,uuid,uuid,text,text,boolean),public.read_project_change(uuid,uuid),public.save_project_change(uuid,uuid,integer,uuid,jsonb),public.request_project_change_review(uuid,uuid,integer,uuid),public.decide_project_change_dimension(uuid,uuid,integer,text,integer,uuid,uuid,text,text,boolean) from public,anon;
grant execute on function private.read_project_change_command(uuid,uuid),private.save_project_change_command(uuid,uuid,integer,uuid,jsonb),private.request_project_change_review_command(uuid,uuid,integer,uuid),private.decide_project_change_dimension_command(uuid,uuid,integer,text,integer,uuid,uuid,text,text,boolean),public.read_project_change(uuid,uuid),public.save_project_change(uuid,uuid,integer,uuid,jsonb),public.request_project_change_review(uuid,uuid,integer,uuid),public.decide_project_change_dimension(uuid,uuid,integer,text,integer,uuid,uuid,text,text,boolean) to authenticated;
