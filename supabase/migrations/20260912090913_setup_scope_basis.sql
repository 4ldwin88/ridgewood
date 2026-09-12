-- Canonical Scope module preparation. No approved baseline or change authority is inferred.
create table public.scope_items (
 id uuid primary key, project_state_id uuid not null references public.project_states(id) on delete restrict,
 created_by uuid not null references auth.users(id), created_at timestamptz not null default now()
);
create table public.project_scope_versions (
 id uuid primary key default gen_random_uuid(), project_state_id uuid not null references public.project_states(id) on delete restrict,
 authorization_record_id uuid not null references public.authorization_records(id) on delete restrict,
 version integer not null check(version>0), request_id uuid not null, items jsonb not null,
 references_snapshot jsonb not null, actor_user_id uuid not null references auth.users(id), created_at timestamptz not null default now(),
 unique(project_state_id,version), unique(project_state_id,request_id)
);
create table public.project_scope_review_requests (
 id uuid primary key default gen_random_uuid(), project_state_id uuid not null references public.project_states(id) on delete restrict,
 scope_version_id uuid not null unique references public.project_scope_versions(id) on delete restrict,
 request_id uuid not null, actor_user_id uuid not null references auth.users(id), created_at timestamptz not null default now(), unique(project_state_id,request_id)
);
alter table public.scope_items enable row level security;
alter table public.project_scope_versions enable row level security;
alter table public.project_scope_review_requests enable row level security;
revoke all on public.scope_items,public.project_scope_versions,public.project_scope_review_requests from public,anon,authenticated;
grant select on public.scope_items,public.project_scope_versions,public.project_scope_review_requests to authenticated;
create policy scope_items_read on public.scope_items for select to authenticated using(exists(select 1 from public.project_states p where p.id=project_state_id and public.is_workspace_member(p.workspace_id)));
create policy scope_versions_read on public.project_scope_versions for select to authenticated using(exists(select 1 from public.project_states p where p.id=project_state_id and public.is_workspace_member(p.workspace_id)));
create policy scope_requests_read on public.project_scope_review_requests for select to authenticated using(exists(select 1 from public.project_states p where p.id=project_state_id and public.is_workspace_member(p.workspace_id)));
create trigger scope_items_immutable before update or delete on public.scope_items for each row execute function private.reject_setup_history_mutation();
create trigger scope_versions_immutable before update or delete on public.project_scope_versions for each row execute function private.reject_setup_history_mutation();
create trigger scope_requests_immutable before update or delete on public.project_scope_review_requests for each row execute function private.reject_setup_history_mutation();

create function private.scope_review_blockers(items_input jsonb) returns text[] language plpgsql immutable set search_path='' as $$
declare reasons text[]:='{}'; item jsonb; n integer:=0;
begin
 if jsonb_array_length(items_input)=0 then return array['Add at least one scope component']; end if;
 for item in select value from jsonb_array_elements(items_input) loop
  n:=n+1;
  if btrim(item->>'description')='' then reasons:=array_append(reasons,'Item '||n||': description'); end if;
  if item->>'classification'='' then reasons:=array_append(reasons,'Item '||n||': classification'); end if;
  if item->>'classification' in ('inclusion','interface','owner_supplied','allowance') and item->>'partyId'='' then reasons:=array_append(reasons,'Item '||n||': responsible party'); end if;
  if item->>'sourceRevisionId'='' then reasons:=array_append(reasons,'Item '||n||': governing source revision'); end if;
  if item->>'criterionRevisionId'='' and btrim(item->>'acceptanceCriteria')='' then reasons:=array_append(reasons,'Item '||n||': acceptance criterion or specification reference'); end if;
 end loop;
 return reasons;
end $$;
revoke all on function private.scope_review_blockers(jsonb) from public,anon,authenticated;
create function private.read_project_scope_command(project_state_input uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare p public.project_states; v public.project_scope_versions; a uuid;
begin
 if auth.uid() is null then raise exception 'authentication_required'; end if;
 select * into p from public.project_states where id=project_state_input;
 if p.id is null or not public.is_workspace_member(p.workspace_id) then raise exception 'project_state_not_found_or_access_denied'; end if;
 select * into v from public.project_scope_versions where project_state_id=p.id order by version desc limit 1;
 select authorization_record_id into a from public.project_setup_versions where project_state_id=p.id order by version desc limit 1;
 if a is null then select id into a from public.authorization_records where project_state_id=p.id and outcome='approved' order by created_at,id limit 1; end if;
 return jsonb_build_object('projectStateId',p.id,'version',coalesce(v.version,0),'items',coalesce(v.items,'[]'),'authorizationRecordId',coalesce(v.authorization_record_id,a),
  'approvedBaselineId',null,'status','preparation','canEdit',p.stage='project_authorization_setup' and p.status='active' and p.archived_at is null and public.has_app_permission(p.workspace_id,'project.setup.edit'),
  'blockers',private.scope_review_blockers(coalesce(v.items,'[]')),
  'parties',(select coalesce(jsonb_agg(jsonb_build_object('id',o.id,'label',o.name,'retired',o.is_retired) order by o.name),'[]') from public.organizations o where o.workspace_id=p.workspace_id),
  'sources',(select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'label',d.title||' · revision '||r.revision_number,'category',d.category_key,'state',r.state,'snapshot',r.published_source_snapshot,'documentId',d.id,'documentType',d.document_type,'revisionNumber',r.revision_number,'publishedAt',r.published_at,'publishedBy',r.published_by) order by d.title,r.revision_number desc),'[]') from public.document_revisions r join public.document_records d on d.id=r.document_record_id where d.project_state_id=p.id and r.state in ('published','superseded') and r.published_source_snapshot is not null),
  'requests',(select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'version',s.version,'createdAt',r.created_at,'status',case when s.version=v.version then 'pending' else 'superseded' end) order by s.version desc),'[]') from public.project_scope_review_requests r join public.project_scope_versions s on s.id=r.scope_version_id where r.project_state_id=p.id),
  'history',(select coalesce(jsonb_agg(jsonb_build_object('version',s.version,'createdAt',s.created_at,'items',s.items,'references',s.references_snapshot) order by s.version desc),'[]') from public.project_scope_versions s where s.project_state_id=p.id));
end $$;
create function private.save_project_scope_command(project_state_input uuid,expected_version_input integer,request_id_input uuid,items_input jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare p public.project_states; v public.project_scope_versions; previous public.project_scope_versions; a uuid; item jsonb; k text; refs jsonb;
begin
 if auth.uid() is null then raise exception 'authentication_required'; end if;
 select * into p from public.project_states where id=project_state_input for update;
 if p.id is null or not public.is_workspace_member(p.workspace_id) then raise exception 'project_state_not_found_or_access_denied'; end if;
 if not public.has_app_permission(p.workspace_id,'project.setup.edit') then raise exception 'missing_setup_edit_permission'; end if;
 if request_id_input is null or expected_version_input is null or expected_version_input<0 then raise exception 'invalid_scope_request'; end if;
 select * into previous from public.project_scope_versions where project_state_id=p.id and request_id=request_id_input;
 if previous.id is not null then
  if previous.actor_user_id<>auth.uid() or previous.version<>expected_version_input+1 or previous.items is distinct from items_input then raise exception 'request_id_payload_mismatch'; end if;
  return private.read_project_scope_command(p.id)||jsonb_build_object('savedVersion',previous.version);
 end if;
 if p.stage<>'project_authorization_setup' or p.status<>'active' or p.archived_at is not null then raise exception 'scope_edit_not_allowed'; end if;
 select * into v from public.project_scope_versions where project_state_id=p.id order by version desc limit 1;
 if expected_version_input<>coalesce(v.version,0) then raise exception 'scope_version_conflict'; end if;
 select authorization_record_id into a from public.project_setup_versions where project_state_id=p.id order by version desc limit 1;
 if a is null then select id into a from public.authorization_records where project_state_id=p.id and outcome='approved' order by created_at,id limit 1; end if;
 if a is null then raise exception 'missing_frozen_authorization'; end if;
 if items_input is null or jsonb_typeof(items_input)<>'array' or length(items_input::text)>200000 or jsonb_array_length(items_input)>100 then raise exception 'invalid_scope_items'; end if;
 if (select count(distinct e->>'id') from jsonb_array_elements(items_input) e)<>jsonb_array_length(items_input) then raise exception 'duplicate_scope_item'; end if;
 for item in select value from jsonb_array_elements(items_input) loop
  if jsonb_typeof(item)<>'object' then raise exception 'invalid_scope_item'; end if;
  if (select count(*) from jsonb_object_keys(item))<>8 then raise exception 'invalid_scope_fields'; end if;
  foreach k in array array['id','description','classification','partyId','sourceRevisionId','criterionRevisionId','acceptanceCriteria','programRevisionId'] loop
   if jsonb_typeof(item->k) is distinct from 'string' or length(item->>k)>4000 then raise exception 'invalid_scope_fields'; end if;
  end loop;
  if item->>'id' !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' or length(item->>'description')>500 then raise exception 'invalid_scope_identity_or_description'; end if;
  if item->>'classification' not in ('','inclusion','exclusion','allowance','interface','owner_supplied') then raise exception 'invalid_scope_classification'; end if;
  if exists(select 1 from public.scope_items s where s.id::text=item->>'id' and s.project_state_id<>p.id) then raise exception 'scope_item_wrong_project'; end if;
  if item->>'partyId'<>'' and not exists(select 1 from public.organizations o where o.id::text=item->>'partyId' and o.workspace_id=p.workspace_id and (not o.is_retired or exists(select 1 from jsonb_array_elements(coalesce(v.items,'[]')) old where old->>'id'=item->>'id' and old->>'partyId'=item->>'partyId'))) then raise exception 'invalid_scope_party'; end if;
  foreach k in array array['sourceRevisionId','criterionRevisionId','programRevisionId'] loop
   if item->>k<>'' and not exists(select 1 from public.document_revisions r join public.document_records d on d.id=r.document_record_id where r.id::text=item->>k and d.project_state_id=p.id and r.state in ('published','superseded') and r.published_source_snapshot is not null and (k<>'programRevisionId' or d.category_key='product_program')) then raise exception 'invalid_scope_source'; end if;
  end loop;
  insert into public.scope_items(id,project_state_id,created_by) values((item->>'id')::uuid,p.id,auth.uid()) on conflict(id) do nothing;
  if not exists(select 1 from public.scope_items s where s.id=(item->>'id')::uuid and s.project_state_id=p.id) then raise exception 'scope_item_wrong_project'; end if;
 end loop;
 refs:=jsonb_build_object('revisions',(select coalesce(jsonb_agg(to_jsonb(r)),'[]') from public.document_revisions r where exists(select 1 from jsonb_array_elements(items_input) e where r.id::text in (e->>'sourceRevisionId',e->>'criterionRevisionId',e->>'programRevisionId'))),
 'parties',(select coalesce(jsonb_agg(to_jsonb(o)),'[]') from public.organizations o where exists(select 1 from jsonb_array_elements(items_input) e where o.id::text=e->>'partyId')));
 insert into public.project_scope_versions(project_state_id,authorization_record_id,version,request_id,items,references_snapshot,actor_user_id) values(p.id,coalesce(v.authorization_record_id,a),expected_version_input+1,request_id_input,items_input,refs,auth.uid());
 insert into public.audit_events(project_state_id,event_type,actor_user_id,payload,occurred_at) values(p.id,'scope_preparation_saved',auth.uid(),jsonb_build_object('version',expected_version_input+1,'requestId',request_id_input),now());
 return private.read_project_scope_command(p.id)||jsonb_build_object('savedVersion',expected_version_input+1);
end $$;
create function private.request_project_scope_review_command(project_state_input uuid,version_input integer,request_id_input uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare p public.project_states; v public.project_scope_versions; previous public.project_scope_review_requests;
begin
 if auth.uid() is null then raise exception 'authentication_required'; end if;
 select * into p from public.project_states where id=project_state_input for update;
 if p.id is null or not public.is_workspace_member(p.workspace_id) then raise exception 'project_state_not_found_or_access_denied'; end if;
 if not public.has_app_permission(p.workspace_id,'project.setup.edit') then raise exception 'missing_setup_edit_permission'; end if;
 if request_id_input is null or version_input is null or version_input<1 then raise exception 'invalid_scope_request'; end if;
 select * into previous from public.project_scope_review_requests where project_state_id=p.id and request_id=request_id_input;
 if previous.id is not null then
  if previous.actor_user_id<>auth.uid() or not exists(select 1 from public.project_scope_versions s where s.id=previous.scope_version_id and s.version=version_input) then raise exception 'request_id_payload_mismatch'; end if;
  return private.read_project_scope_command(p.id)||jsonb_build_object('submittedVersion',version_input);
 end if;
 if p.stage<>'project_authorization_setup' or p.status<>'active' or p.archived_at is not null then raise exception 'scope_edit_not_allowed'; end if;
 select * into v from public.project_scope_versions where project_state_id=p.id order by version desc limit 1;
 if v.id is null or v.version<>version_input then raise exception 'scope_version_conflict'; end if;
 if exists(select 1 from public.project_scope_review_requests where scope_version_id=v.id) then raise exception 'scope_review_already_requested'; end if;
 if cardinality(private.scope_review_blockers(v.items))>0 then raise exception 'incomplete_scope_review_basis'; end if;
 insert into public.project_scope_review_requests(project_state_id,scope_version_id,request_id,actor_user_id) values(p.id,v.id,request_id_input,auth.uid());
 insert into public.audit_events(project_state_id,event_type,actor_user_id,payload,occurred_at) values(p.id,'scope_review_requested',auth.uid(),jsonb_build_object('scopeVersionId',v.id,'requestId',request_id_input),now());
 return private.read_project_scope_command(p.id)||jsonb_build_object('submittedVersion',version_input);
end $$;
create function public.read_project_scope(project_state_input uuid) returns jsonb language sql security invoker set search_path='' as $$select private.read_project_scope_command(project_state_input)$$;
create function public.save_project_scope(project_state_input uuid,expected_version_input integer,request_id_input uuid,items_input jsonb) returns jsonb language sql security invoker set search_path='' as $$select private.save_project_scope_command(project_state_input,expected_version_input,request_id_input,items_input)$$;
create function public.request_project_scope_review(project_state_input uuid,version_input integer,request_id_input uuid) returns jsonb language sql security invoker set search_path='' as $$select private.request_project_scope_review_command(project_state_input,version_input,request_id_input)$$;
revoke all on function public.read_project_scope(uuid),public.save_project_scope(uuid,integer,uuid,jsonb),public.request_project_scope_review(uuid,integer,uuid),private.read_project_scope_command(uuid),private.save_project_scope_command(uuid,integer,uuid,jsonb),private.request_project_scope_review_command(uuid,integer,uuid) from public,anon;
grant execute on function public.read_project_scope(uuid),public.save_project_scope(uuid,integer,uuid,jsonb),public.request_project_scope_review(uuid,integer,uuid),private.read_project_scope_command(uuid),private.save_project_scope_command(uuid,integer,uuid,jsonb),private.request_project_scope_review_command(uuid,integer,uuid) to authenticated;

-- Existing approved historical Setup keeps its behavior until this module is used.
alter function private.read_project_setup_command(uuid) rename to read_project_setup_before_scope;
revoke all on function private.read_project_setup_before_scope(uuid) from public,anon,authenticated;
create function private.read_project_setup_command(project_state_input uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; v integer;
begin
 result:=private.read_project_setup_before_scope(project_state_input);
 select max(version) into v from public.project_scope_versions where project_state_id=project_state_input;
 if v is null then return result; end if;
 return result||jsonb_build_object('scopePreparationVersion',v,'unmet',(select jsonb_agg(distinct e) from jsonb_array_elements(result->'unmet'||'["scope"]'::jsonb) e),'approvalBlocker',coalesce(result->>'approvalBlocker','')||' Scope preparation requires an authorized baseline decision; no approval is inferred.');
end $$;
alter function private.decide_project_gate01_command(uuid,integer,uuid,uuid,text,text,jsonb) rename to decide_project_gate01_before_scope;
revoke all on function private.decide_project_gate01_before_scope(uuid,integer,uuid,uuid,text,text,jsonb) from public,anon,authenticated;
create function private.decide_project_gate01_command(project_state_input uuid,version_input integer,request_id_input uuid,authority_id_input uuid,disposition_input text,rationale_input text,obligations_input jsonb) returns public.project_gate01_decisions language plpgsql security definer set search_path='' as $$
begin
 perform private.read_project_scope_command(project_state_input);
 perform 1 from public.project_states where id=project_state_input for update;
 if disposition_input in ('go','conditional_go') and exists(select 1 from public.project_scope_versions where project_state_id=project_state_input)
  and not exists(select 1 from public.project_gate01_decisions where project_state_id=project_state_input and request_id=request_id_input) then raise exception 'scope_authorized_baseline_required'; end if;
 return private.decide_project_gate01_before_scope(project_state_input,version_input,request_id_input,authority_id_input,disposition_input,rationale_input,obligations_input);
end $$;
revoke all on function private.read_project_setup_command(uuid),private.decide_project_gate01_command(uuid,integer,uuid,uuid,text,text,jsonb) from public,anon;
grant execute on function private.read_project_setup_command(uuid),private.decide_project_gate01_command(uuid,integer,uuid,uuid,text,text,jsonb) to authenticated;

-- Ignore read-only contract aliases on Setup saves. Preserve earlier legacy facts
-- (including material flags) instead of allowing a second writable contract owner.
alter function private.save_project_setup_command(uuid,integer,uuid,jsonb) rename to save_project_setup_before_scope;
revoke all on function private.save_project_setup_before_scope(uuid,integer,uuid,jsonb) from public,anon,authenticated;
create function private.save_project_setup_command(project_state_input uuid,expected_version_input integer,request_id_input uuid,evidence_input jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; prior jsonb; historical jsonb; normalized jsonb;
begin
 perform private.read_project_setup_before_contract(project_state_input);
 perform 1 from public.project_states where id=project_state_input for update;
 result:=private.read_project_setup_before_contract(project_state_input);
 select evidence into prior from public.project_setup_versions where project_state_id=project_state_input and request_id=request_id_input;
 if not exists(select 1 from public.project_scope_versions where project_state_id=project_state_input) or prior=evidence_input then
  return private.save_project_setup_before_scope(project_state_input,expected_version_input,request_id_input,evidence_input);
 end if;
 if evidence_input is null or jsonb_typeof(evidence_input)<>'array' then raise exception 'invalid_setup_evidence'; end if;
 historical:=coalesce(prior,result->'evidence');
 select coalesce(jsonb_agg(e),'[]') into normalized from jsonb_array_elements(evidence_input) e where e->>'requirement' not in ('scope');
 normalized:=normalized||(select jsonb_agg(e) from jsonb_array_elements(historical) e where e->>'requirement' in ('scope'));
 return private.save_project_setup_before_scope(project_state_input,expected_version_input,request_id_input,normalized);
end $$;
revoke all on function private.save_project_setup_command(uuid,integer,uuid,jsonb) from public,anon;
grant execute on function private.save_project_setup_command(uuid,integer,uuid,jsonb) to authenticated;
