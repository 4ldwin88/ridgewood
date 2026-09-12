-- 5.4 preparation only. Shared obligation identities survive later stage views.
create table public.project_obligations (
 id uuid primary key, project_state_id uuid not null references public.project_states(id) on delete restrict,
 created_by uuid not null references auth.users(id), created_at timestamptz not null default now()
);
create index project_obligations_project on public.project_obligations(project_state_id);
create table public.project_obligation_plan_versions (
 id uuid primary key default gen_random_uuid(), project_state_id uuid not null references public.project_states(id) on delete restrict,
 authorization_record_id uuid not null references public.authorization_records(id) on delete restrict,
 version integer not null check(version>0), request_id uuid not null, items jsonb not null,
 references_snapshot jsonb not null, actor_user_id uuid not null references auth.users(id), created_at timestamptz not null default now(),
 unique(project_state_id,version), unique(project_state_id,request_id)
);
alter table public.project_obligations enable row level security;
alter table public.project_obligation_plan_versions enable row level security;
revoke all on public.project_obligations,public.project_obligation_plan_versions from public,anon,authenticated;
grant select on public.project_obligations,public.project_obligation_plan_versions to authenticated;
create policy obligation_read on public.project_obligations for select to authenticated using(exists(select 1 from public.project_states p where p.id=project_state_id and public.is_workspace_member(p.workspace_id)));
create policy obligation_plan_read on public.project_obligation_plan_versions for select to authenticated using(exists(select 1 from public.project_states p where p.id=project_state_id and public.is_workspace_member(p.workspace_id)));
create trigger obligation_identity_immutable before update or delete on public.project_obligations for each row execute function private.reject_setup_history_mutation();
create trigger obligation_plan_immutable before update or delete on public.project_obligation_plan_versions for each row execute function private.reject_setup_history_mutation();

create function private.obligation_plan_gaps(items_input jsonb) returns text[] language plpgsql immutable set search_path='' as $$
declare gaps text[]:='{}'; item jsonb; n integer:=0;
begin
 if jsonb_array_length(items_input)=0 then return array['Identify applicable obligations; an empty plan is not an exemption.']; end if;
 for item in select value from jsonb_array_elements(items_input) loop
  n:=n+1;
  if btrim(item->>'requirement')='' then gaps:=array_append(gaps,'Obligation '||n||': requirement'); end if;
  if item->>'type'='' then gaps:=array_append(gaps,'Obligation '||n||': type'); end if;
  if item->>'sourceRevisionId'='' then gaps:=array_append(gaps,'Obligation '||n||': governing source'); end if;
  if item->>'ownerUserId'='' then gaps:=array_append(gaps,'Obligation '||n||': accountable person'); end if;
  if item->>'dueDate'='' and btrim(item->>'dueTrigger')='' then gaps:=array_append(gaps,'Obligation '||n||': due date or trigger'); end if;
  if item->>'dueDate'<>'' and btrim(item->>'dueTrigger')<>'' and btrim(item->>'dueRelationship')='' then gaps:=array_append(gaps,'Obligation '||n||': relationship between deadline and trigger'); end if;
 end loop;
 return gaps;
end $$;
revoke all on function private.obligation_plan_gaps(jsonb) from public,anon,authenticated;

create function private.read_project_obligation_plan_command(project_state_input uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare p public.project_states; v public.project_obligation_plan_versions; a uuid; gaps text[];
begin
 if auth.uid() is null then raise exception 'authentication_required'; end if;
 select * into p from public.project_states where id=project_state_input;
 if p.id is null or not public.is_workspace_member(p.workspace_id) then raise exception 'project_state_not_found_or_access_denied'; end if;
 select * into v from public.project_obligation_plan_versions where project_state_id=p.id order by version desc limit 1;
 select authorization_record_id into a from public.project_setup_versions where project_state_id=p.id order by version desc limit 1;
 if a is null then select id into a from public.authorization_records where project_state_id=p.id and outcome='approved' order by created_at,id limit 1; end if;
 gaps:=private.obligation_plan_gaps(coalesce(v.items,'[]'));
 if exists(select 1 from jsonb_array_elements(coalesce(v.items,'[]')) e where e->>'ownerUserId'<>'' and not exists(select 1 from public.workspace_memberships m where m.workspace_id=p.workspace_id and m.user_id::text=e->>'ownerUserId' and m.status='active')) then gaps:=array_append(gaps,'Reassign inactive accountable people.'); end if;
 if exists(select 1 from jsonb_array_elements(coalesce(v.items,'[]')) e where e->>'sourceRevisionId'<>'' and not exists(select 1 from public.document_revisions r where r.id::text=e->>'sourceRevisionId' and r.state='published')) then gaps:=array_append(gaps,'Review superseded governing sources.'); end if;
 return jsonb_build_object('projectStateId',p.id,'version',coalesce(v.version,0),'items',coalesce(v.items,'[]'),'authorizationRecordId',coalesce(v.authorization_record_id,a),
 'canEdit',p.stage='project_authorization_setup' and p.status='active' and p.archived_at is null and public.has_app_permission(p.workspace_id,'project.setup.edit'),
 'planningGaps',gaps,'planComplete',cardinality(gaps)=0,'satisfactionVerified',false,
 'owners',(select coalesce(jsonb_agg(jsonb_build_object('id',m.user_id,'label',coalesce(u.email,m.user_id::text),'active',m.status='active') order by u.email),'[]') from public.workspace_memberships m join auth.users u on u.id=m.user_id where m.workspace_id=p.workspace_id),
 'sources',(select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'label',d.title||' · revision '||r.revision_number,'state',r.state) order by d.title,r.revision_number desc),'[]') from public.document_revisions r join public.document_records d on d.id=r.document_record_id where d.project_state_id=p.id and r.state in ('published','superseded') and r.published_source_snapshot is not null),
 'history',(select coalesce(jsonb_agg(jsonb_build_object('version',s.version,'createdAt',s.created_at,'items',s.items,'references',s.references_snapshot) order by s.version desc),'[]') from public.project_obligation_plan_versions s where s.project_state_id=p.id),
 'gateConditions',(select coalesce(jsonb_agg(jsonb_build_object('decisionId',d.id,'createdAt',d.created_at,'obligations',d.obligations) order by d.created_at desc),'[]') from public.project_gate01_decisions d where d.project_state_id=p.id and jsonb_array_length(d.obligations)>0));
end $$;

create function private.save_project_obligation_plan_command(project_state_input uuid,expected_version_input integer,request_id_input uuid,items_input jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare p public.project_states; v public.project_obligation_plan_versions; previous public.project_obligation_plan_versions; a uuid; item jsonb; k text; refs jsonb;
begin
 if auth.uid() is null then raise exception 'authentication_required'; end if;
 select * into p from public.project_states where id=project_state_input for update;
 if p.id is null or not public.is_workspace_member(p.workspace_id) then raise exception 'project_state_not_found_or_access_denied'; end if;
 if not public.has_app_permission(p.workspace_id,'project.setup.edit') then raise exception 'missing_setup_edit_permission'; end if;
 if request_id_input is null or expected_version_input is null or expected_version_input<0 then raise exception 'invalid_obligation_request'; end if;
 select * into previous from public.project_obligation_plan_versions where project_state_id=p.id and request_id=request_id_input;
 if previous.id is not null then
  if previous.actor_user_id<>auth.uid() or previous.version<>expected_version_input+1 or previous.items is distinct from items_input then raise exception 'request_id_payload_mismatch'; end if;
  return private.read_project_obligation_plan_command(p.id)||jsonb_build_object('savedVersion',previous.version);
 end if;
 if p.stage<>'project_authorization_setup' or p.status<>'active' or p.archived_at is not null then raise exception 'obligation_edit_not_allowed'; end if;
 select * into v from public.project_obligation_plan_versions where project_state_id=p.id order by version desc limit 1;
 if expected_version_input<>coalesce(v.version,0) then raise exception 'obligation_version_conflict'; end if;
 select authorization_record_id into a from public.project_setup_versions where project_state_id=p.id order by version desc limit 1;
 if a is null then select id into a from public.authorization_records where project_state_id=p.id and outcome='approved' order by created_at,id limit 1; end if;
 if a is null then raise exception 'missing_frozen_authorization'; end if;
 if items_input is null or jsonb_typeof(items_input)<>'array' or length(items_input::text)>200000 or jsonb_array_length(items_input)>100 then raise exception 'invalid_obligation_items'; end if;
 if (select count(distinct e->>'id') from jsonb_array_elements(items_input) e)<>jsonb_array_length(items_input) then raise exception 'duplicate_obligation'; end if;
 -- No remove/waive command: previously recorded obligations cannot disappear.
 if exists(select 1 from public.project_obligations o where o.project_state_id=p.id and not exists(select 1 from jsonb_array_elements(items_input) e where e->>'id'=o.id::text)) then raise exception 'obligation_removal_requires_governance'; end if;
 for item in select value from jsonb_array_elements(items_input) loop
  if jsonb_typeof(item)<>'object' then raise exception 'invalid_obligation_fields'; end if;
  if (select count(*) from jsonb_object_keys(item))<>8 then raise exception 'invalid_obligation_fields'; end if;
  foreach k in array array['id','type','requirement','sourceRevisionId','ownerUserId','dueDate','dueTrigger','dueRelationship'] loop
   if jsonb_typeof(item->k) is distinct from 'string' or length(item->>k)>500 then raise exception 'invalid_obligation_fields'; end if;
  end loop;
  if item->>'id' !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then raise exception 'invalid_obligation_identity'; end if;
  if item->>'type' not in ('','contract','permit','insurance','safety_regulatory','warranty','other') then raise exception 'invalid_obligation_type'; end if;
  if exists(select 1 from public.project_obligations o where o.id::text=item->>'id' and o.project_state_id<>p.id) then raise exception 'obligation_wrong_project'; end if;
  if item->>'ownerUserId'<>'' and not exists(select 1 from public.workspace_memberships m where m.workspace_id=p.workspace_id and m.user_id::text=item->>'ownerUserId' and (m.status='active' or exists(select 1 from jsonb_array_elements(coalesce(v.items,'[]')) old where old->>'id'=item->>'id' and old->>'ownerUserId'=item->>'ownerUserId'))) then raise exception 'invalid_obligation_owner'; end if;
  if item->>'sourceRevisionId'<>'' then
   perform 1 from public.document_revisions r join public.document_records d on d.id=r.document_record_id where r.id::text=item->>'sourceRevisionId' and d.project_state_id=p.id and r.state in ('published','superseded') and r.published_source_snapshot is not null for share of r;
   if not found then raise exception 'invalid_obligation_source'; end if;
  end if;
  if item->>'dueDate'<>'' then
   begin
    if item->>'dueDate' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' or not isfinite((item->>'dueDate')::date) then raise exception 'invalid_obligation_date'; end if;
   exception when datetime_field_overflow or invalid_datetime_format then raise exception 'invalid_obligation_date'; end;
  end if;
  insert into public.project_obligations(id,project_state_id,created_by) values((item->>'id')::uuid,p.id,auth.uid()) on conflict(id) do nothing;
  if not exists(select 1 from public.project_obligations o where o.id=(item->>'id')::uuid and o.project_state_id=p.id) then raise exception 'obligation_wrong_project'; end if;
 end loop;
 refs:=jsonb_build_object('revisions',(select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'documentId',d.id,'documentType',d.document_type,'category',d.category_key,'title',d.title,'revisionNumber',r.revision_number,'publishedAt',r.published_at,'publishedBy',r.published_by,'payload',r.published_source_snapshot)),'[]') from public.document_revisions r join public.document_records d on d.id=r.document_record_id where exists(select 1 from jsonb_array_elements(items_input) e where r.id::text=e->>'sourceRevisionId')),
 'owners',(select coalesce(jsonb_agg(jsonb_build_object('id',m.user_id,'label',coalesce(u.email,m.user_id::text))),'[]') from public.workspace_memberships m join auth.users u on u.id=m.user_id where m.workspace_id=p.workspace_id and exists(select 1 from jsonb_array_elements(items_input) e where e->>'ownerUserId'=m.user_id::text)));
 insert into public.project_obligation_plan_versions(project_state_id,authorization_record_id,version,request_id,items,references_snapshot,actor_user_id) values(p.id,coalesce(v.authorization_record_id,a),expected_version_input+1,request_id_input,items_input,refs,auth.uid());
 insert into public.audit_events(project_state_id,event_type,actor_user_id,payload,occurred_at) values(p.id,'obligation_plan_saved',auth.uid(),jsonb_build_object('version',expected_version_input+1,'requestId',request_id_input),now());
 return private.read_project_obligation_plan_command(p.id)||jsonb_build_object('savedVersion',expected_version_input+1);
end $$;
create function public.read_project_obligation_plan(project_state_input uuid) returns jsonb language sql security invoker set search_path='' as $$select private.read_project_obligation_plan_command(project_state_input)$$;
create function public.save_project_obligation_plan(project_state_input uuid,expected_version_input integer,request_id_input uuid,items_input jsonb) returns jsonb language sql security invoker set search_path='' as $$select private.save_project_obligation_plan_command(project_state_input,expected_version_input,request_id_input,items_input)$$;
revoke all on function public.read_project_obligation_plan(uuid),public.save_project_obligation_plan(uuid,integer,uuid,jsonb),private.read_project_obligation_plan_command(uuid),private.save_project_obligation_plan_command(uuid,integer,uuid,jsonb) from public,anon;
grant execute on function public.read_project_obligation_plan(uuid),public.save_project_obligation_plan(uuid,integer,uuid,jsonb),private.read_project_obligation_plan_command(uuid),private.save_project_obligation_plan_command(uuid,integer,uuid,jsonb) to authenticated;

-- Preparation does not establish reviewed applicability or discharge obligations.
-- Legacy projects remain unchanged until the new plan is saved.
alter function private.read_project_setup_command(uuid) rename to read_project_setup_before_obligations;
revoke all on function private.read_project_setup_before_obligations(uuid) from public,anon,authenticated;
create function private.read_project_setup_command(project_state_input uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; v integer;
begin
 result:=private.read_project_setup_before_obligations(project_state_input);
 select max(version) into v from public.project_obligation_plan_versions where project_state_id=project_state_input;
 if v is null then return result; end if;
 return result||jsonb_build_object('obligationPlanVersion',v,'unmet',(select jsonb_agg(distinct e) from jsonb_array_elements(result->'unmet'||'["permits"]'::jsonb) e),'approvalBlocker',coalesce(result->>'approvalBlocker','')||' The 5.4 obligation plan needs a separate verified applicability/readiness review; saving it grants no clearance.');
end $$;
alter function private.save_project_setup_command(uuid,integer,uuid,jsonb) rename to save_project_setup_before_obligations;
revoke all on function private.save_project_setup_before_obligations(uuid,integer,uuid,jsonb) from public,anon,authenticated;
create function private.save_project_setup_command(project_state_input uuid,expected_version_input integer,request_id_input uuid,evidence_input jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; prior jsonb; normalized jsonb;
begin
 perform private.read_project_setup_before_obligations(project_state_input);
 perform 1 from public.project_states where id=project_state_input for update;
 if not exists(select 1 from public.project_obligation_plan_versions where project_state_id=project_state_input) then return private.save_project_setup_before_obligations(project_state_input,expected_version_input,request_id_input,evidence_input); end if;
 select evidence into prior from public.project_setup_versions where project_state_id=project_state_input and request_id=request_id_input;
 if prior=evidence_input then return private.save_project_setup_before_obligations(project_state_input,expected_version_input,request_id_input,evidence_input); end if;
 if evidence_input is null or jsonb_typeof(evidence_input)<>'array' then raise exception 'invalid_setup_evidence'; end if;
 result:=private.read_project_setup_before_obligations(project_state_input);
 select coalesce(jsonb_agg(e),'[]') into normalized from jsonb_array_elements(evidence_input) e where e->>'requirement'<>'permits';
 normalized:=normalized||private.setup_preserved_aliases(coalesce(prior,result->'evidence'),array['permits']);
 return private.save_project_setup_before_obligations(project_state_input,expected_version_input,request_id_input,normalized);
end $$;
alter function private.decide_project_gate01_command(uuid,integer,uuid,uuid,text,text,jsonb) rename to decide_project_gate01_before_obligations;
revoke all on function private.decide_project_gate01_before_obligations(uuid,integer,uuid,uuid,text,text,jsonb) from public,anon,authenticated;
create function private.decide_project_gate01_command(project_state_input uuid,version_input integer,request_id_input uuid,authority_id_input uuid,disposition_input text,rationale_input text,obligations_input jsonb) returns public.project_gate01_decisions language plpgsql security definer set search_path='' as $$
begin
 perform private.read_project_setup_before_obligations(project_state_input);
 perform 1 from public.project_states where id=project_state_input for update;
 if disposition_input in ('go','conditional_go') and exists(select 1 from public.project_obligation_plan_versions where project_state_id=project_state_input) and not exists(select 1 from public.project_gate01_decisions where project_state_id=project_state_input and request_id=request_id_input) then raise exception 'obligation_plan_review_required'; end if;
 return private.decide_project_gate01_before_obligations(project_state_input,version_input,request_id_input,authority_id_input,disposition_input,rationale_input,obligations_input);
end $$;
revoke all on function private.read_project_setup_command(uuid),private.save_project_setup_command(uuid,integer,uuid,jsonb),private.decide_project_gate01_command(uuid,integer,uuid,uuid,text,text,jsonb) from public,anon;
grant execute on function private.read_project_setup_command(uuid),private.save_project_setup_command(uuid,integer,uuid,jsonb),private.decide_project_gate01_command(uuid,integer,uuid,uuid,text,text,jsonb) to authenticated;
