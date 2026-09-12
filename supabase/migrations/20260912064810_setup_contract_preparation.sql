-- Preparation is not contract approval. No existing projects or historical decisions are changed.
create table public.project_contract_versions (
 id uuid primary key default gen_random_uuid(),
 project_state_id uuid not null references public.project_states(id) on delete restrict,
 authorization_record_id uuid not null references public.authorization_records(id) on delete restrict,
 version integer not null check(version>0), request_id uuid not null,
 data jsonb not null check(jsonb_typeof(data)='object'),
 references_snapshot jsonb not null,
 actor_user_id uuid not null references auth.users(id), created_at timestamptz not null default now(),
 unique(project_state_id,version), unique(project_state_id,request_id)
);
alter table public.project_contract_versions enable row level security;
revoke all on public.project_contract_versions from public,anon,authenticated;
grant select on public.project_contract_versions to authenticated;
create policy contract_versions_read on public.project_contract_versions for select to authenticated using(exists(select 1 from public.project_states p where p.id=project_state_id and public.is_workspace_member(p.workspace_id)));
create trigger contract_versions_immutable before update or delete on public.project_contract_versions for each row execute function private.reject_setup_history_mutation();

create function private.read_project_contract_command(project_state_input uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare p public.project_states; v public.project_contract_versions;
begin
 if auth.uid() is null then raise exception 'authentication_required'; end if;
 select * into p from public.project_states where id=project_state_input;
 if p.id is null or not public.is_workspace_member(p.workspace_id) then raise exception 'project_state_not_found_or_access_denied'; end if;
 select * into v from public.project_contract_versions where project_state_id=p.id order by version desc limit 1;
 return jsonb_build_object('projectStateId',p.id,'version',coalesce(v.version,0),'data',v.data,'authorizationRecordId',v.authorization_record_id,
 'status','preparation','approvalVerified',false,
 'canEdit',p.stage='project_authorization_setup' and p.status='active' and p.archived_at is null and public.has_app_permission(p.workspace_id,'project.setup.edit'),
 'history',(select coalesce(jsonb_agg(jsonb_build_object('version',c.version,'createdAt',c.created_at,'actorUserId',c.actor_user_id) order by c.version desc),'[]') from public.project_contract_versions c where c.project_state_id=p.id),
 'parties',(select coalesce(jsonb_agg(jsonb_build_object('id',o.id,'label',o.name,'retired',o.is_retired) order by o.name),'[]') from public.organizations o where o.workspace_id=p.workspace_id),
 'agreements',(select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'label',d.title||' · revision '||r.revision_number) order by d.title,r.revision_number desc),'[]') from public.document_records d join public.document_revisions r on r.document_record_id=d.id where d.project_state_id=p.id and r.state in ('published','superseded') and r.published_source_snapshot is not null),
 'evidence',(select coalesce(jsonb_agg(jsonb_build_object('id',e.id,'label',e.title) order by e.title),'[]') from public.evidence_references e where e.project_state_id=p.id),
 'risks',(select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'label',r.title||' · '||r.status) order by r.title),'[]') from public.risk_issues r where r.project_state_id=p.id),
 'decisions',(select coalesce(jsonb_agg(jsonb_build_object('id',d.id,'label',d.decision_type||' · '||d.outcome) order by d.created_at desc),'[]') from public.decisions d where d.project_state_id=p.id));
end $$;

create function private.save_project_contract_command(project_state_input uuid,expected_version_input integer,request_id_input uuid,data_input jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare p public.project_states; v public.project_contract_versions; previous public.project_contract_versions; a uuid; k text; item text; refs jsonb;
begin
 if auth.uid() is null then raise exception 'authentication_required'; end if;
 select * into p from public.project_states where id=project_state_input for update;
 if p.id is null or not public.is_workspace_member(p.workspace_id) then raise exception 'project_state_not_found_or_access_denied'; end if;
 if not public.has_app_permission(p.workspace_id,'project.setup.edit') then raise exception 'missing_setup_edit_permission'; end if;
 if request_id_input is null or expected_version_input is null or expected_version_input<0 then raise exception 'invalid_contract_request'; end if;
 select * into previous from public.project_contract_versions where project_state_id=p.id and request_id=request_id_input;
 if previous.id is not null then
  if previous.actor_user_id<>auth.uid() or previous.version<>expected_version_input+1 or previous.data is distinct from data_input then raise exception 'request_id_payload_mismatch'; end if;
  return private.read_project_contract_command(p.id)||jsonb_build_object('savedVersion',previous.version);
 end if;
 if p.stage<>'project_authorization_setup' or p.status<>'active' or p.archived_at is not null then raise exception 'contract_edit_not_allowed'; end if;
 select * into v from public.project_contract_versions where project_state_id=p.id order by version desc limit 1;
 if expected_version_input<>coalesce(v.version,0) then raise exception 'contract_version_conflict'; end if;
 select authorization_record_id into a from public.project_setup_versions where project_state_id=p.id order by version desc limit 1;
 if a is null then select id into a from public.authorization_records where project_state_id=p.id and outcome='approved' order by created_at,id limit 1; end if;
 if a is null then raise exception 'missing_frozen_authorization'; end if;
 if data_input is null or jsonb_typeof(data_input)<>'object' or length(data_input::text)>30000 then raise exception 'invalid_contract_data'; end if;
 if (select count(*) from jsonb_object_keys(data_input))<>13 then raise exception 'invalid_contract_fields'; end if;
 foreach k in array array['agreementRevisionId','agreementEvidenceId','compensationModel','contractValue','currency','feeBasis','paymentTerms','reviewDecisionId','riskAssessment','effectiveFrom','effectiveUntil'] loop
  if jsonb_typeof(data_input->k) is distinct from 'string' or length(data_input->>k)>4000 then raise exception 'invalid_contract_fields'; end if;
 end loop;
 foreach k in array array['partyIds','riskIds'] loop
  if jsonb_typeof(data_input->k) is distinct from 'array' then raise exception 'invalid_contract_fields'; end if;
  if (select count(*) from jsonb_array_elements(data_input->k))<>(select count(distinct value) from jsonb_array_elements(data_input->k)) then raise exception 'duplicate_contract_reference'; end if;
 end loop;
 if data_input->>'compensationModel' not in ('','fixed','fee','mixed') or data_input->>'riskAssessment' not in ('','none_identified','linked') then raise exception 'invalid_contract_assessment'; end if;
 if data_input->>'contractValue'<>'' and (data_input->>'contractValue' !~ '^[0-9]{1,12}(\.[0-9]{1,2})?$' or data_input->>'currency' !~ '^[A-Z]{3}$') then raise exception 'invalid_contract_money'; end if;
 foreach k in array array['effectiveFrom','effectiveUntil'] loop
  if data_input->>k<>'' then
   if data_input->>k !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'invalid_contract_date'; end if;
   perform (data_input->>k)::date;
  end if;
 end loop;
 if data_input->>'effectiveFrom'<>'' and data_input->>'effectiveUntil'<>'' and (data_input->>'effectiveUntil')::date<(data_input->>'effectiveFrom')::date then raise exception 'invalid_contract_date_order'; end if;
 for item in select jsonb_array_elements_text(data_input->'partyIds') loop
  if not exists(select 1 from public.organizations o where o.id::text=item and o.workspace_id=p.workspace_id and (not o.is_retired or coalesce(v.data->'partyIds','[]') ? item)) then raise exception 'invalid_contract_party'; end if;
 end loop;
 for item in select jsonb_array_elements_text(data_input->'riskIds') loop
  if not exists(select 1 from public.risk_issues r where r.id::text=item and r.project_state_id=p.id) then raise exception 'invalid_contract_risk'; end if;
 end loop;
 if data_input->>'agreementRevisionId'<>'' and not exists(select 1 from public.document_revisions r join public.document_records d on d.id=r.document_record_id where r.id::text=data_input->>'agreementRevisionId' and d.project_state_id=p.id and r.state in ('published','superseded') and r.published_source_snapshot is not null) then raise exception 'invalid_contract_agreement'; end if;
 if data_input->>'agreementEvidenceId'<>'' and not exists(select 1 from public.evidence_references e where e.id::text=data_input->>'agreementEvidenceId' and e.project_state_id=p.id) then raise exception 'invalid_contract_evidence'; end if;
 if data_input->>'reviewDecisionId'<>'' and not exists(select 1 from public.decisions d where d.id::text=data_input->>'reviewDecisionId' and d.project_state_id=p.id) then raise exception 'invalid_contract_decision'; end if;
 refs:=jsonb_build_object('parties',(select coalesce(jsonb_agg(to_jsonb(o)),'[]') from public.organizations o where data_input->'partyIds' ? o.id::text and o.workspace_id=p.workspace_id),
 'agreement',(select to_jsonb(r) from public.document_revisions r join public.document_records d on d.id=r.document_record_id where r.id::text=data_input->>'agreementRevisionId' and d.project_state_id=p.id),
 'evidence',(select to_jsonb(e) from public.evidence_references e where e.id::text=data_input->>'agreementEvidenceId' and e.project_state_id=p.id),
 'decision',(select to_jsonb(d) from public.decisions d where d.id::text=data_input->>'reviewDecisionId' and d.project_state_id=p.id),
 'risks',(select coalesce(jsonb_agg(to_jsonb(r)),'[]') from public.risk_issues r where data_input->'riskIds' ? r.id::text and r.project_state_id=p.id));
 insert into public.project_contract_versions(project_state_id,authorization_record_id,version,request_id,data,references_snapshot,actor_user_id)
 values(p.id,coalesce(v.authorization_record_id,a),expected_version_input+1,request_id_input,data_input,refs,auth.uid());
 insert into public.audit_events(project_state_id,event_type,actor_user_id,payload,occurred_at) values(p.id,'contract_preparation_saved',auth.uid(),jsonb_build_object('version',expected_version_input+1,'requestId',request_id_input),now());
 return private.read_project_contract_command(p.id)||jsonb_build_object('savedVersion',expected_version_input+1);
end $$;
create function public.read_project_contract(project_state_input uuid) returns jsonb language sql security invoker set search_path='' as $$ select private.read_project_contract_command(project_state_input) $$;
create function public.save_project_contract(project_state_input uuid,expected_version_input integer,request_id_input uuid,data_input jsonb) returns jsonb language sql security invoker set search_path='' as $$ select private.save_project_contract_command(project_state_input,expected_version_input,request_id_input,data_input) $$;
revoke all on function private.read_project_contract_command(uuid),private.save_project_contract_command(uuid,integer,uuid,jsonb),public.read_project_contract(uuid),public.save_project_contract(uuid,integer,uuid,jsonb) from public,anon;
grant execute on function private.read_project_contract_command(uuid),private.save_project_contract_command(uuid,integer,uuid,jsonb),public.read_project_contract(uuid),public.save_project_contract(uuid,integer,uuid,jsonb) to authenticated;

-- New preparation cannot be bypassed by the legacy manually satisfied checklist.
-- Historical projects without this new record retain their existing contract.
alter function private.read_project_setup_command(uuid) rename to read_project_setup_before_contract;
revoke all on function private.read_project_setup_before_contract(uuid) from public,anon,authenticated;
create function private.read_project_setup_command(project_state_input uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 result:=private.read_project_setup_before_contract(project_state_input);
 if exists(select 1 from public.project_contract_versions where project_state_id=project_state_input) then
  result:=result||jsonb_build_object('contractPreparationVersion',(select max(version) from public.project_contract_versions where project_state_id=project_state_input),'unmet',(select jsonb_agg(distinct value) from jsonb_array_elements(result->'unmet'||'["contracting_party","contract_review","commercial_terms","contractual_risks"]'::jsonb)), 'approvalBlocker','Contract preparation requires a separately verified authorized review. This connection is not yet available.');
 end if;
 return result;
end $$;
alter function private.decide_project_gate01_command(uuid,integer,uuid,uuid,text,text,jsonb) rename to decide_project_gate01_before_contract;
revoke all on function private.decide_project_gate01_before_contract(uuid,integer,uuid,uuid,text,text,jsonb) from public,anon,authenticated;
create function private.decide_project_gate01_command(project_state_input uuid,version_input integer,request_id_input uuid,authority_id_input uuid,disposition_input text,rationale_input text,obligations_input jsonb) returns public.project_gate01_decisions language plpgsql security definer set search_path='' as $$
begin
 perform private.read_project_setup_command(project_state_input);
 -- Serialize the new preparation with the existing exactly-once gate command.
 perform 1 from public.project_states where id=project_state_input for update;
 if disposition_input in ('go','conditional_go') and exists(select 1 from public.project_contract_versions where project_state_id=project_state_input) then raise exception 'contract_authorized_review_required'; end if;
 return private.decide_project_gate01_before_contract(project_state_input,version_input,request_id_input,authority_id_input,disposition_input,rationale_input,obligations_input);
end $$;
revoke all on function private.read_project_setup_command(uuid),private.decide_project_gate01_command(uuid,integer,uuid,uuid,text,text,jsonb) from public,anon;
grant execute on function private.read_project_setup_command(uuid),private.decide_project_gate01_command(uuid,integer,uuid,uuid,text,text,jsonb) to authenticated;
