-- A client proposal release is neither client acceptance nor an instruction to work.
insert into public.app_permissions(permission_key,description) values ('project.change.proposal.release','Authorize an exact client change proposal for release with verified owner authority.') on conflict do nothing;
create table public.project_change_proposal_versions (
 id uuid primary key default gen_random_uuid(),project_state_id uuid not null references public.project_states(id),change_id uuid not null references public.project_changes(id),assessment_id uuid not null references public.project_change_versions(id),
 version integer not null check(version>0),request_id uuid not null,data jsonb not null,source_snapshot jsonb not null,actor_user_id uuid not null references auth.users(id),created_at timestamptz not null default now(),unique(change_id,version),unique(project_state_id,request_id)
);
create table public.project_change_proposal_decisions (
 decision_id uuid primary key references public.decisions(id),project_state_id uuid not null references public.project_states(id),proposal_id uuid not null references public.project_change_proposal_versions(id),sequence integer not null check(sequence>0),request_id uuid not null,
 owner_authority_id uuid not null references public.workspace_business_owners(id),authority_snapshot jsonb not null,verification_snapshot jsonb not null,assessment_decisions jsonb not null,confirmed boolean not null,unique(proposal_id,sequence),unique(project_state_id,request_id)
);
alter table public.project_change_proposal_versions enable row level security;
alter table public.project_change_proposal_decisions enable row level security;
revoke all on public.project_change_proposal_versions,public.project_change_proposal_decisions from public,anon,authenticated;
grant select on public.project_change_proposal_versions,public.project_change_proposal_decisions to authenticated;
create policy change_proposals_read on public.project_change_proposal_versions for select to authenticated using(exists(select 1 from public.project_states p where p.id=project_state_id and public.is_workspace_member(p.workspace_id)));
create policy change_proposal_decisions_read on public.project_change_proposal_decisions for select to authenticated using(exists(select 1 from public.project_states p where p.id=project_state_id and public.is_workspace_member(p.workspace_id)));
create trigger change_proposals_immutable before update or delete on public.project_change_proposal_versions for each row execute function private.reject_setup_history_mutation();
create trigger change_proposal_decisions_immutable before update or delete on public.project_change_proposal_decisions for each row execute function private.reject_setup_history_mutation();
create function private.protect_change_proposal_decision() returns trigger language plpgsql security definer set search_path='' as $$begin
 if exists(select 1 from public.project_change_proposal_decisions where decision_id=old.id) then raise exception 'change_proposal_decision_is_immutable'; end if;
 if tg_op='DELETE' then return old; end if; return new;
end $$;
revoke all on function private.protect_change_proposal_decision() from public,anon,authenticated;
create trigger protect_change_proposal_decision before update or delete on public.decisions for each row execute function private.protect_change_proposal_decision();
create function private.change_internal_decision_ids(assessment_input uuid) returns jsonb language sql stable set search_path='' as $$
 select coalesce(jsonb_agg(d.decision_id order by d.dimension),'[]') from (select distinct on(dimension) dimension,decision_id from public.project_change_dimension_decisions where change_version_id=assessment_input order by dimension,sequence desc) d
$$;
revoke all on function private.change_internal_decision_ids(uuid) from public,anon,authenticated;
create function private.read_change_proposal_command(project_state_input uuid,change_id_input uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare c jsonb; p public.project_states; v public.project_change_proposal_versions; a public.project_change_versions; latest public.project_change_proposal_decisions; outcome text; reasons text[]:='{}'; k text;
begin
 c:=private.read_project_change_command(project_state_input,change_id_input);
 select * into p from public.project_states where id=project_state_input;
 select * into v from public.project_change_proposal_versions where change_id=change_id_input order by version desc limit 1;
 select * into a from public.project_change_versions where id=v.assessment_id;
 select * into latest from public.project_change_proposal_decisions where proposal_id=v.id order by sequence desc limit 1;
 select d.outcome into outcome from public.decisions d where d.id=latest.decision_id;
 if p.stage<>'project_authorization_setup' or p.status<>'active' or p.archived_at is not null then reasons:=array_append(reasons,'The project does not currently permit Setup proposal release.'); end if;
 foreach k in array array['recipientPartyId','clientAmount','feeTreatment','commercialTerms','proposalRevisionId'] loop
  if nullif(btrim(v.data->>k),'') is null then reasons:=array_append(reasons,'Complete '||k||' in the saved proposal.'); end if;
 end loop;
 if c->>'internalApproved' is distinct from 'true' then reasons:=array_append(reasons,'Current independent scope, cost and time approval is required.'); end if;
 if a.version is distinct from (c->>'version')::integer then reasons:=array_append(reasons,'The proposal refers to an earlier assessment; save against the latest assessment.'); end if;
 if not exists(select 1 from public.organizations o where o.id::text=v.data->>'recipientPartyId' and o.workspace_id=p.workspace_id and not o.is_retired) then reasons:=array_append(reasons,'Select an active recipient organization; the owner must verify its client role.'); end if;
 if not coalesce((private.read_project_contract_command(p.id)->'data'->'partyIds') ? (v.data->>'recipientPartyId'),false) then reasons:=array_append(reasons,'The recipient must be a party to the current reviewed contract; verify its client role.'); end if;
 if not exists(select 1 from public.document_revisions r join public.document_records d on d.id=r.document_record_id where r.id::text=v.data->>'proposalRevisionId' and d.project_state_id=p.id and r.state='published' and r.published_source_snapshot is not null and r.published_source_snapshot=v.source_snapshot->'payload') then reasons:=array_append(reasons,'The exact proposal publication must remain current.'); end if;
 if nullif(v.data->>'validUntil','') is not null and (v.data->>'validUntil')::date<current_date then reasons:=array_append(reasons,'The stated proposal validity date has passed.'); end if;
 return jsonb_build_object('projectStateId',p.id,'changeId',change_id_input,'assessment',c,'basisVersion',coalesce(a.version,(c->>'version')::integer),'basis',coalesce(a.data,c->'data'),'version',coalesce(v.version,0),'data',v.data,'sourceSnapshot',v.source_snapshot,'blockers',reasons,'sequence',coalesce(latest.sequence,0),
 'releaseAuthorized',coalesce(outcome='approved' and cardinality(reasons)=0 and latest.assessment_decisions=private.change_internal_decision_ids(a.id),false),'clientAccepted',false,'workAuthorized',false,'canEdit',c->'canEdit',
 'reviewAccess',jsonb_build_object('hasPermission',public.has_app_permission(p.workspace_id,'project.change.proposal.release'),'strongSession',private.contract_strong_session(),'ownerAuthorities',c->'reviewAccess'->'ownerAuthorities'),
 'parties',(select coalesce(jsonb_agg(jsonb_build_object('id',o.id,'label',o.name,'retired',o.is_retired) order by o.name),'[]') from public.organizations o where o.workspace_id=p.workspace_id),
 'history',(select coalesce(jsonb_agg(jsonb_build_object('version',pv.version,'assessmentVersion',cv.version,'basis',cv.data,'data',pv.data,'sourceSnapshot',pv.source_snapshot,'createdAt',pv.created_at,'actorUserId',pv.actor_user_id) order by pv.version desc),'[]') from public.project_change_proposal_versions pv join public.project_change_versions cv on cv.id=pv.assessment_id where pv.change_id=change_id_input),
 'decisions',(select coalesce(jsonb_agg(jsonb_build_object('id',d.id,'version',pv.version,'sequence',r.sequence,'outcome',d.outcome,'rationale',d.rationale,'authorityReference',r.authority_snapshot->>'evidence_reference','createdAt',d.created_at,'actorUserId',d.actor_user_id) order by pv.version desc,r.sequence desc),'[]') from public.project_change_proposal_decisions r join public.decisions d on d.id=r.decision_id join public.project_change_proposal_versions pv on pv.id=r.proposal_id where pv.change_id=change_id_input));
end $$;
create function private.save_change_proposal_command(project_state_input uuid,change_id_input uuid,assessment_version_input integer,expected_version_input integer,request_id_input uuid,data_input jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare p public.project_states; a public.project_change_versions; prior public.project_change_proposal_versions; k text; snapshot jsonb; until_date date;
begin
 perform private.read_project_change_command(project_state_input,change_id_input);
 select * into p from public.project_states where id=project_state_input for update;
 if not public.has_app_permission(p.workspace_id,'project.setup.edit') then raise exception 'missing_setup_edit_permission'; end if;
 if expected_version_input is null or expected_version_input<0 or assessment_version_input is null or assessment_version_input<1 or request_id_input is null or jsonb_typeof(data_input) is distinct from 'object' then raise exception 'invalid_change_proposal'; end if;
 if (select count(*) from jsonb_object_keys(data_input))<>6 then raise exception 'invalid_change_proposal'; end if;
 foreach k in array array['recipientPartyId','clientAmount','feeTreatment','commercialTerms','proposalRevisionId','validUntil'] loop
  if jsonb_typeof(data_input->k) is distinct from 'string' or length(data_input->>k)>4000 then raise exception 'invalid_change_proposal'; end if;
 end loop;
 if data_input->>'clientAmount'<>'' and (data_input->>'clientAmount')!~'(^-?(0|[1-9][0-9]{0,11})(\.[0-9]{1,2})?$)' then raise exception 'invalid_proposal_amount'; end if;
 if data_input->>'validUntil'<>'' then
  begin until_date:=(data_input->>'validUntil')::date; exception when others then raise exception 'invalid_proposal_date'; end;
  if not isfinite(until_date) or to_char(until_date,'YYYY-MM-DD')<>data_input->>'validUntil' then raise exception 'invalid_proposal_date'; end if;
 end if;
 select * into prior from public.project_change_proposal_versions where project_state_id=p.id and request_id=request_id_input;
 if prior.id is not null then
  if prior.change_id<>change_id_input or prior.version<>expected_version_input+1 or prior.actor_user_id<>auth.uid() or prior.data<>data_input or not exists(select 1 from public.project_change_versions cv where cv.id=prior.assessment_id and cv.version=assessment_version_input) then raise exception 'request_id_payload_mismatch'; end if;
  return private.read_change_proposal_command(p.id,change_id_input)||jsonb_build_object('savedVersion',prior.version);
 end if;
 if p.stage<>'project_authorization_setup' or p.status<>'active' or p.archived_at is not null then raise exception 'change_proposal_not_applicable'; end if;
 select * into a from public.project_change_versions where change_id=change_id_input order by version desc limit 1;
 if a.id is null or a.version<>assessment_version_input then raise exception 'change_version_conflict'; end if;
 if coalesce((select max(version) from public.project_change_proposal_versions where change_id=change_id_input),0)<>expected_version_input then raise exception 'change_proposal_version_conflict'; end if;
 if data_input->>'recipientPartyId'<>'' and not exists(select 1 from public.organizations o where o.id::text=data_input->>'recipientPartyId' and o.workspace_id=p.workspace_id and not o.is_retired) then raise exception 'invalid_proposal_recipient'; end if;
 if data_input->>'proposalRevisionId'<>'' then
  perform 1 from public.document_revisions r where r.id::text=data_input->>'proposalRevisionId' for share;
  select jsonb_build_object('documentId',d.id,'revisionId',r.id,'title',d.title,'revisionNumber',r.revision_number,'documentType',d.document_type,'category',d.category_key,'publishedAt',r.published_at,'publishedBy',r.published_by,'payload',r.published_source_snapshot) into snapshot from public.document_revisions r join public.document_records d on d.id=r.document_record_id where r.id::text=data_input->>'proposalRevisionId' and d.project_state_id=p.id and r.state='published' and r.published_source_snapshot is not null;
  if snapshot is null then raise exception 'invalid_proposal_publication'; end if;
 end if;
 perform 1 from public.organizations where id::text=data_input->>'recipientPartyId' for share;
 snapshot:=coalesce(snapshot,'{}')||jsonb_build_object('recipient',(select jsonb_build_object('id',o.id,'label',o.name) from public.organizations o where o.id::text=data_input->>'recipientPartyId' and o.workspace_id=p.workspace_id));
 insert into public.project_change_proposal_versions(project_state_id,change_id,assessment_id,version,request_id,data,source_snapshot,actor_user_id) values(p.id,change_id_input,a.id,expected_version_input+1,request_id_input,data_input,coalesce(snapshot,'{}'),auth.uid());
 insert into public.audit_events(project_state_id,event_type,actor_user_id,payload,occurred_at) values(p.id,'change_proposal_saved',auth.uid(),jsonb_build_object('changeId',change_id_input,'version',expected_version_input+1),now());
 return private.read_change_proposal_command(p.id,change_id_input)||jsonb_build_object('savedVersion',expected_version_input+1);
end $$;
create function private.decide_change_proposal_command(project_state_input uuid,change_id_input uuid,version_input integer,sequence_input integer,request_id_input uuid,authority_id_input uuid,outcome_input text,rationale_input text,confirmed_input boolean) returns jsonb language plpgsql security definer set search_path='' as $$
declare p public.project_states; v public.project_change_proposal_versions; prior public.project_change_proposal_decisions; owner_record public.workspace_business_owners; d public.decisions; assessment public.project_change_versions; proposed public.project_scope_versions; state jsonb;
begin
 perform private.read_project_change_command(project_state_input,change_id_input);
 select * into p from public.project_states where id=project_state_input for update;
 if not public.has_app_permission(p.workspace_id,'project.change.proposal.release') then raise exception 'missing_proposal_release_permission'; end if;
 if request_id_input is null or version_input is null or version_input<1 or sequence_input is null or sequence_input<0 or outcome_input is null or outcome_input not in ('approved','held','rejected') or nullif(btrim(rationale_input),'') is null or length(rationale_input)>4000 or confirmed_input is null then raise exception 'invalid_proposal_decision'; end if;
 select * into prior from public.project_change_proposal_decisions where project_state_id=p.id and request_id=request_id_input;
 if prior.decision_id is not null then
  select * into d from public.decisions where id=prior.decision_id;
  if d.actor_user_id<>auth.uid() or prior.owner_authority_id is distinct from authority_id_input or prior.sequence<>sequence_input+1 or d.outcome<>outcome_input or d.rationale<>btrim(rationale_input) or prior.confirmed<>confirmed_input or not exists(select 1 from public.project_change_proposal_versions pv where pv.id=prior.proposal_id and pv.change_id=change_id_input and pv.version=version_input) then raise exception 'request_id_payload_mismatch'; end if;
  return private.read_change_proposal_command(p.id,change_id_input)||jsonb_build_object('savedDecisionId',d.id);
 end if;
 if p.stage<>'project_authorization_setup' or p.status<>'active' or p.archived_at is not null then raise exception 'change_proposal_not_applicable'; end if;
 select * into owner_record from public.workspace_business_owners where id=authority_id_input for share;
 if owner_record.id is null or owner_record.workspace_id<>p.workspace_id or owner_record.user_id<>auth.uid() or owner_record.revoked_at is not null or owner_record.effective_from>now() or (owner_record.effective_until is not null and owner_record.effective_until<=now()) then raise exception 'proposal_owner_authority_required'; end if;
 if not private.contract_strong_session() then raise exception 'proposal_strong_verification_required'; end if;
 select * into v from public.project_change_proposal_versions where change_id=change_id_input order by version desc limit 1;
 if v.id is null or v.version<>version_input then raise exception 'change_proposal_version_conflict'; end if;
 if coalesce((select max(sequence) from public.project_change_proposal_decisions where proposal_id=v.id),0)<>sequence_input then raise exception 'proposal_decision_sequence_conflict'; end if;
 select * into assessment from public.project_change_versions where id=v.assessment_id;
 if outcome_input='approved' then
  if not confirmed_input then raise exception 'proposal_confirmation_required'; end if;
  select * into proposed from public.project_scope_versions where id=assessment.scope_version_id;
  perform 1 from public.organizations where id::text=v.data->>'recipientPartyId' for share;
  perform 1 from public.document_revisions r where r.id::text=v.data->>'proposalRevisionId' or r.id::text in(select jsonb_array_elements_text(assessment.data->'basisRevisionIds')) or exists(select 1 from jsonb_array_elements(proposed.items) e where r.id::text in(e->>'sourceRevisionId',e->>'criterionRevisionId',e->>'programRevisionId')) order by r.id for share;
  state:=private.read_change_proposal_command(p.id,change_id_input);
  if jsonb_array_length(state->'blockers')>0 then raise exception 'proposal_release_basis_unresolved'; end if;
 end if;
 insert into public.decisions(project_state_id,decision_type,outcome,rationale,authority_basis,actor_user_id,capability_key) values(p.id,'change_proposal_release',outcome_input,btrim(rationale_input),owner_record.evidence_reference,auth.uid(),'change_control') returning * into d;
 insert into public.project_change_proposal_decisions(decision_id,project_state_id,proposal_id,sequence,request_id,owner_authority_id,authority_snapshot,verification_snapshot,assessment_decisions,confirmed) values(d.id,p.id,v.id,sequence_input+1,request_id_input,owner_record.id,to_jsonb(owner_record),jsonb_build_object('aal',auth.jwt()->>'aal','sessionId',auth.jwt()->>'session_id','amr',auth.jwt()->'amr','checkedAt',now()),private.change_internal_decision_ids(assessment.id),confirmed_input);
 insert into public.audit_events(project_state_id,event_type,actor_user_id,payload,occurred_at) values(p.id,'change_proposal_release_decided',auth.uid(),jsonb_build_object('changeId',change_id_input,'proposalVersion',v.version,'decisionId',d.id),now());
 return private.read_change_proposal_command(p.id,change_id_input)||jsonb_build_object('savedDecisionId',d.id);
end $$;
create function public.read_change_proposal(project_state_input uuid,change_id_input uuid) returns jsonb language sql security invoker set search_path='' as $$select private.read_change_proposal_command(project_state_input,change_id_input)$$;
create function public.save_change_proposal(project_state_input uuid,change_id_input uuid,assessment_version_input integer,expected_version_input integer,request_id_input uuid,data_input jsonb) returns jsonb language sql security invoker set search_path='' as $$select private.save_change_proposal_command(project_state_input,change_id_input,assessment_version_input,expected_version_input,request_id_input,data_input)$$;
create function public.decide_change_proposal(project_state_input uuid,change_id_input uuid,version_input integer,sequence_input integer,request_id_input uuid,authority_id_input uuid,outcome_input text,rationale_input text,confirmed_input boolean) returns jsonb language sql security invoker set search_path='' as $$select private.decide_change_proposal_command(project_state_input,change_id_input,version_input,sequence_input,request_id_input,authority_id_input,outcome_input,rationale_input,confirmed_input)$$;
revoke all on function private.read_change_proposal_command(uuid,uuid),private.save_change_proposal_command(uuid,uuid,integer,integer,uuid,jsonb),private.decide_change_proposal_command(uuid,uuid,integer,integer,uuid,uuid,text,text,boolean),public.read_change_proposal(uuid,uuid),public.save_change_proposal(uuid,uuid,integer,integer,uuid,jsonb),public.decide_change_proposal(uuid,uuid,integer,integer,uuid,uuid,text,text,boolean) from public,anon;
grant execute on function private.read_change_proposal_command(uuid,uuid),private.save_change_proposal_command(uuid,uuid,integer,integer,uuid,jsonb),private.decide_change_proposal_command(uuid,uuid,integer,integer,uuid,uuid,text,text,boolean),public.read_change_proposal(uuid,uuid),public.save_change_proposal(uuid,uuid,integer,integer,uuid,jsonb),public.decide_change_proposal(uuid,uuid,integer,integer,uuid,uuid,text,text,boolean) to authenticated;
