-- Scope owns clarifications; Changes owns potential departures. Neither is an instruction.
create table public.project_scope_queries (
 id uuid primary key default gen_random_uuid(), project_state_id uuid not null references public.project_states(id) on delete restrict,
 scope_version_id uuid not null references public.project_scope_versions(id) on delete restrict,
 request_id uuid not null, data jsonb not null, source_snapshot jsonb not null,
 actor_user_id uuid not null references auth.users(id), created_at timestamptz not null default now(), unique(project_state_id,request_id)
);
create table public.project_scope_query_responses (
 id uuid primary key default gen_random_uuid(), project_state_id uuid not null references public.project_states(id) on delete restrict,
 query_id uuid not null unique references public.project_scope_queries(id) on delete restrict,
 request_id uuid not null, outcome text not null check(outcome in ('clarification','potential_change')),
 response text not null, no_impact boolean not null, owner_authority_id uuid references public.workspace_business_owners(id) on delete restrict,
 authority_snapshot jsonb, verification_snapshot jsonb, actor_user_id uuid not null references auth.users(id), created_at timestamptz not null default now(), unique(project_state_id,request_id)
);
-- Intake identity only. Description, ownership and source are referenced from the
-- immutable originating query/response, not copied into another writable form.
create table public.project_changes (
 id uuid primary key default gen_random_uuid(), project_state_id uuid not null references public.project_states(id) on delete restrict,
 source_query_response_id uuid not null unique references public.project_scope_query_responses(id) on delete restrict,
 status text not null default 'potential' check(status='potential'), created_at timestamptz not null default now()
);
alter table public.project_scope_queries enable row level security;
alter table public.project_scope_query_responses enable row level security;
alter table public.project_changes enable row level security;
revoke all on public.project_scope_queries,public.project_scope_query_responses,public.project_changes from public,anon,authenticated;
grant select on public.project_scope_queries,public.project_scope_query_responses,public.project_changes to authenticated;
create policy scope_queries_read on public.project_scope_queries for select to authenticated using(exists(select 1 from public.project_states p where p.id=project_state_id and public.is_workspace_member(p.workspace_id)));
create policy scope_query_responses_read on public.project_scope_query_responses for select to authenticated using(exists(select 1 from public.project_states p where p.id=project_state_id and public.is_workspace_member(p.workspace_id)));
create policy project_changes_read on public.project_changes for select to authenticated using(exists(select 1 from public.project_states p where p.id=project_state_id and public.is_workspace_member(p.workspace_id)));
create trigger scope_queries_immutable before update or delete on public.project_scope_queries for each row execute function private.reject_setup_history_mutation();
create trigger scope_query_responses_immutable before update or delete on public.project_scope_query_responses for each row execute function private.reject_setup_history_mutation();
create trigger project_changes_intake_immutable before update or delete on public.project_changes for each row execute function private.reject_setup_history_mutation();

create function private.scope_queries_unresolved(project_state_input uuid) returns boolean language sql stable set search_path='' as $$
 select exists(select 1 from public.project_scope_queries q left join public.project_scope_query_responses r on r.query_id=q.id
 where q.project_state_id=project_state_input and (r.id is null or r.outcome='potential_change'))
$$;
revoke all on function private.scope_queries_unresolved(uuid) from public,anon,authenticated;
alter function private.read_project_scope_command(uuid) rename to read_project_scope_before_queries;
revoke all on function private.read_project_scope_before_queries(uuid) from public,anon,authenticated;
create function private.read_project_scope_command(project_state_input uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; unresolved boolean;
begin
 result:=private.read_project_scope_before_queries(project_state_input);
 unresolved:=private.scope_queries_unresolved(project_state_input);
 if unresolved then result:=result||jsonb_build_object('approvalVerified',false,'status','review_required','approvalBlockers',result->'approvalBlockers'||'["Resolve open scope questions and obtain governed disposition of potential changes before readiness can be confirmed."]'::jsonb); end if;
 return result||jsonb_build_object(
 'queryOwners',(select coalesce(jsonb_agg(jsonb_build_object('id',m.user_id,'label',coalesce(nullif(pr.display_name,''),m.user_id::text)) order by m.user_id),'[]') from public.project_states p join public.workspace_memberships m on m.workspace_id=p.workspace_id left join public.profiles pr on pr.user_id=m.user_id where p.id=project_state_input and m.status='active'),
 'queries',(select coalesce(jsonb_agg(jsonb_build_object('id',q.id,'version',v.version,'data',q.data,'createdAt',q.created_at,'actorUserId',q.actor_user_id,'sourceSnapshot',q.source_snapshot,
 'response',case when r.id is null then null else jsonb_build_object('id',r.id,'outcome',r.outcome,'text',r.response,'actorUserId',r.actor_user_id,'createdAt',r.created_at,'authorityReference',r.authority_snapshot->>'evidence_reference','changeId',c.id) end) order by q.created_at,q.id),'[]') from public.project_scope_queries q join public.project_scope_versions v on v.id=q.scope_version_id left join public.project_scope_query_responses r on r.query_id=q.id left join public.project_changes c on c.source_query_response_id=r.id where q.project_state_id=project_state_input));
end $$;

create function private.capture_project_scope_query_command(project_state_input uuid,version_input integer,request_id_input uuid,data_input jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare p public.project_states; v public.project_scope_versions; q public.project_scope_queries; k text; source jsonb; identified date;
begin
 if auth.uid() is null then raise exception 'authentication_required'; end if;
 select * into p from public.project_states where id=project_state_input for update;
 if p.id is null or not public.is_workspace_member(p.workspace_id) then raise exception 'project_state_not_found_or_access_denied'; end if;
 if not public.has_app_permission(p.workspace_id,'project.setup.edit') then raise exception 'missing_setup_edit_permission'; end if;
 if request_id_input is null or version_input is null or version_input<1 or data_input is null or jsonb_typeof(data_input)<>'object' then raise exception 'invalid_scope_query'; end if;
 if (select count(*) from jsonb_object_keys(data_input))<>6 then raise exception 'invalid_scope_query'; end if;
 foreach k in array array['scopeItemId','question','identifiedOn','ownerUserId','sourceRevisionId'] loop
  if jsonb_typeof(data_input->k) is distinct from 'string' or nullif(btrim(data_input->>k),'') is null then raise exception 'invalid_scope_query'; end if;
 end loop;
 if length(data_input->>'question')>4000 or jsonb_typeof(data_input->'partyIds') is distinct from 'array' then raise exception 'invalid_scope_query'; end if;
 if jsonb_array_length(data_input->'partyIds')>100 then raise exception 'invalid_scope_query'; end if;
 select * into q from public.project_scope_queries where project_state_id=p.id and request_id=request_id_input;
 if q.id is not null then
  if q.actor_user_id<>auth.uid() or q.data<>data_input or not exists(select 1 from public.project_scope_versions s where s.id=q.scope_version_id and s.version=version_input) then raise exception 'request_id_payload_mismatch'; end if;
  return private.read_project_scope_command(p.id)||jsonb_build_object('savedQueryId',q.id);
 end if;
 if p.stage<>'project_authorization_setup' or p.status<>'active' or p.archived_at is not null then raise exception 'scope_edit_not_allowed'; end if;
 select * into v from public.project_scope_versions where project_state_id=p.id order by version desc limit 1;
 if v.id is null or v.version<>version_input then raise exception 'scope_version_conflict'; end if;
 if not exists(select 1 from jsonb_array_elements(v.items) e where e->>'id'=data_input->>'scopeItemId') then raise exception 'invalid_scope_query_item'; end if;
 if not exists(select 1 from public.workspace_memberships m where m.workspace_id=p.workspace_id and m.user_id::text=data_input->>'ownerUserId' and m.status='active') then raise exception 'invalid_scope_query_owner'; end if;
 if exists(select 1 from jsonb_array_elements(data_input->'partyIds') e where jsonb_typeof(e)<>'string' or not exists(select 1 from public.organizations o where o.id::text=e#>>'{}' and o.workspace_id=p.workspace_id and not o.is_retired)) or (select count(*)<>count(distinct e) from jsonb_array_elements(data_input->'partyIds') e) then raise exception 'invalid_scope_query_parties'; end if;
 begin identified:=(data_input->>'identifiedOn')::date; exception when others then raise exception 'invalid_scope_query_date'; end;
 if to_char(identified,'YYYY-MM-DD')<>data_input->>'identifiedOn' or identified>current_date then raise exception 'invalid_scope_query_date'; end if;
 select jsonb_build_object('revisionId',r.id,'title',d.title,'revisionNumber',r.revision_number,'documentId',d.id,'documentType',d.document_type,'category',d.category_key,'publishedAt',r.published_at,'publishedBy',r.published_by,'payload',r.published_source_snapshot) into source from public.document_revisions r join public.document_records d on d.id=r.document_record_id where r.id::text=data_input->>'sourceRevisionId' and d.project_state_id=p.id and r.state='published' and r.published_source_snapshot is not null for share of r;
 if source is null then raise exception 'invalid_scope_source'; end if;
 insert into public.project_scope_queries(project_state_id,scope_version_id,request_id,data,source_snapshot,actor_user_id) values(p.id,v.id,request_id_input,data_input,source,auth.uid()) returning * into q;
 insert into public.audit_events(project_state_id,event_type,actor_user_id,payload,occurred_at) values(p.id,'scope_query_captured',auth.uid(),jsonb_build_object('queryId',q.id,'scopeVersionId',v.id),now());
 return private.read_project_scope_command(p.id)||jsonb_build_object('savedQueryId',q.id);
end $$;

create function private.respond_project_scope_query_command(project_state_input uuid,query_id_input uuid,request_id_input uuid,outcome_input text,response_input text,authority_id_input uuid,no_impact_input boolean) returns jsonb language plpgsql security definer set search_path='' as $$
declare p public.project_states; q public.project_scope_queries; r public.project_scope_query_responses; a public.workspace_business_owners;
begin
 if auth.uid() is null then raise exception 'authentication_required'; end if;
 select * into p from public.project_states where id=project_state_input for update;
 if p.id is null or not public.is_workspace_member(p.workspace_id) then raise exception 'project_state_not_found_or_access_denied'; end if;
 if not public.has_app_permission(p.workspace_id,'project.setup.edit') then raise exception 'missing_setup_edit_permission'; end if;
 if query_id_input is null or request_id_input is null or outcome_input is null or outcome_input not in ('clarification','potential_change') or nullif(btrim(response_input),'') is null or length(response_input)>4000 or no_impact_input is null then raise exception 'invalid_scope_query_response'; end if;
 select * into r from public.project_scope_query_responses where project_state_id=p.id and request_id=request_id_input;
 if r.id is not null then
  if r.actor_user_id<>auth.uid() or r.query_id<>query_id_input or r.outcome<>outcome_input or r.response<>btrim(response_input) or r.owner_authority_id is distinct from authority_id_input or r.no_impact<>no_impact_input then raise exception 'request_id_payload_mismatch'; end if;
  return private.read_project_scope_command(p.id)||jsonb_build_object('savedResponseId',r.id);
 end if;
 if p.stage<>'project_authorization_setup' or p.status<>'active' or p.archived_at is not null then raise exception 'scope_edit_not_allowed'; end if;
 select * into q from public.project_scope_queries where id=query_id_input and project_state_id=p.id;
 if q.id is null then raise exception 'scope_query_not_found'; end if;
 if exists(select 1 from public.project_scope_query_responses where query_id=q.id) then raise exception 'scope_query_already_responded'; end if;
 if outcome_input='clarification' then
  if not public.has_app_permission(p.workspace_id,'project.scope.review') then raise exception 'missing_scope_review_permission'; end if;
  select * into a from public.workspace_business_owners where id=authority_id_input for share;
  if a.id is null or a.workspace_id<>p.workspace_id or a.user_id<>auth.uid() or a.revoked_at is not null or a.effective_from>now() or (a.effective_until is not null and a.effective_until<=now()) then raise exception 'scope_owner_authority_required'; end if;
  if not private.contract_strong_session() then raise exception 'scope_strong_verification_required'; end if;
  if not no_impact_input then raise exception 'scope_no_impact_confirmation_required'; end if;
  if q.scope_version_id<>(select id from public.project_scope_versions where project_state_id=p.id order by version desc limit 1) then raise exception 'scope_query_basis_changed'; end if;
  perform 1 from public.document_revisions where id::text=q.data->>'sourceRevisionId' for share;
  if not exists(select 1 from public.document_revisions where id::text=q.data->>'sourceRevisionId' and state='published' and published_source_snapshot=q.source_snapshot->'payload') then raise exception 'scope_source_not_current'; end if;
 else
  if no_impact_input or authority_id_input is not null then raise exception 'invalid_scope_change_referral'; end if;
 end if;
 insert into public.project_scope_query_responses(project_state_id,query_id,request_id,outcome,response,no_impact,owner_authority_id,authority_snapshot,verification_snapshot,actor_user_id)
 values(p.id,q.id,request_id_input,outcome_input,btrim(response_input),no_impact_input,authority_id_input,case when a.id is not null then to_jsonb(a) end,case when a.id is not null then jsonb_build_object('aal',auth.jwt()->>'aal','sessionId',auth.jwt()->>'session_id','verifiedAt',now()) end,auth.uid()) returning * into r;
 if outcome_input='potential_change' then insert into public.project_changes(project_state_id,source_query_response_id) values(p.id,r.id); end if;
 insert into public.audit_events(project_state_id,event_type,actor_user_id,payload,occurred_at) values(p.id,'scope_query_responded',auth.uid(),jsonb_build_object('queryId',q.id,'responseId',r.id,'outcome',r.outcome),now());
 return private.read_project_scope_command(p.id)||jsonb_build_object('savedResponseId',r.id);
end $$;

-- Existing Setup and Gate projections call the current Scope reader. Also block
-- an initial approval while questions or potential departures remain unresolved.
alter function private.decide_project_scope_review_command(uuid,integer,integer,uuid,uuid,text,text,jsonb) rename to decide_project_scope_before_queries;
revoke all on function private.decide_project_scope_before_queries(uuid,integer,integer,uuid,uuid,text,text,jsonb) from public,anon,authenticated;
create function private.decide_project_scope_review_command(project_state_input uuid,version_input integer,sequence_input integer,request_id_input uuid,authority_id_input uuid,outcome_input text,rationale_input text,confirmations_input jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 perform private.read_project_scope_command(project_state_input);
 perform 1 from public.project_states where id=project_state_input for update;
 if outcome_input='approved' and private.scope_queries_unresolved(project_state_input) and not exists(select 1 from public.project_scope_review_decisions where project_state_id=project_state_input and request_id=request_id_input) then raise exception 'scope_queries_unresolved'; end if;
 return private.decide_project_scope_before_queries(project_state_input,version_input,sequence_input,request_id_input,authority_id_input,outcome_input,rationale_input,confirmations_input);
end $$;
create function public.capture_project_scope_query(project_state_input uuid,version_input integer,request_id_input uuid,data_input jsonb) returns jsonb language sql security invoker set search_path='' as $$select private.capture_project_scope_query_command(project_state_input,version_input,request_id_input,data_input)$$;
create function public.respond_project_scope_query(project_state_input uuid,query_id_input uuid,request_id_input uuid,outcome_input text,response_input text,authority_id_input uuid,no_impact_input boolean) returns jsonb language sql security invoker set search_path='' as $$select private.respond_project_scope_query_command(project_state_input,query_id_input,request_id_input,outcome_input,response_input,authority_id_input,no_impact_input)$$;
revoke all on function private.read_project_scope_command(uuid),private.decide_project_scope_review_command(uuid,integer,integer,uuid,uuid,text,text,jsonb),private.capture_project_scope_query_command(uuid,integer,uuid,jsonb),private.respond_project_scope_query_command(uuid,uuid,uuid,text,text,uuid,boolean),public.capture_project_scope_query(uuid,integer,uuid,jsonb),public.respond_project_scope_query(uuid,uuid,uuid,text,text,uuid,boolean) from public,anon;
grant execute on function private.read_project_scope_command(uuid),private.decide_project_scope_review_command(uuid,integer,integer,uuid,uuid,text,text,jsonb),private.capture_project_scope_query_command(uuid,integer,uuid,jsonb),private.respond_project_scope_query_command(uuid,uuid,uuid,text,text,uuid,boolean),public.capture_project_scope_query(uuid,integer,uuid,jsonb),public.respond_project_scope_query(uuid,uuid,uuid,text,text,uuid,boolean) to authenticated;
