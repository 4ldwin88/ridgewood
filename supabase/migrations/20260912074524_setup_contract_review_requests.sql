-- Nonbinding review intake. No authority grant, approval or gate transition.
create table public.project_contract_review_requests (
 id uuid primary key default gen_random_uuid(),
 project_state_id uuid not null references public.project_states(id) on delete restrict,
 contract_version_id uuid not null unique references public.project_contract_versions(id) on delete restrict,
 request_id uuid not null,
 actor_user_id uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 unique(project_state_id, request_id)
);
alter table public.project_contract_review_requests enable row level security;
revoke all on public.project_contract_review_requests from public, anon, authenticated;
grant select on public.project_contract_review_requests to authenticated;
create policy contract_review_requests_read on public.project_contract_review_requests for select to authenticated
 using(exists(select 1 from public.project_states p where p.id=project_state_id and public.is_workspace_member(p.workspace_id)));
create trigger contract_review_requests_immutable before update or delete on public.project_contract_review_requests
 for each row execute function private.reject_setup_history_mutation();

create function private.contract_review_request_blockers(data_input jsonb) returns text[]
 language sql immutable set search_path='' as $$
 select array_remove(array[
  case when coalesce(jsonb_array_length(data_input->'partyIds'),0)=0 then 'Select contracting parties.' end,
  case when coalesce(data_input->>'agreementRevisionId','')='' and coalesce(data_input->>'agreementEvidenceId','')='' then 'Select an agreement publication or agreement evidence.' end,
  case when coalesce(data_input->>'compensationModel','') not in ('fixed','fee','mixed') then 'Assess the compensation model.' end,
  case when data_input->>'compensationModel' in ('fixed','mixed') and (coalesce(data_input->>'contractValue','')='' or coalesce(data_input->>'currency','')='') then 'Enter the stated value and currency.' end,
  case when data_input->>'compensationModel' in ('fee','mixed') and btrim(coalesce(data_input->>'feeBasis',''))='' then 'Enter the fee basis.' end,
  case when btrim(coalesce(data_input->>'paymentTerms',''))='' then 'Enter the payment terms.' end,
  case when coalesce(data_input->>'riskAssessment','') not in ('none_identified','linked') then 'Assess contractual risks.' end,
  case when data_input->>'riskAssessment'='linked' and jsonb_array_length(data_input->'riskIds')=0 then 'Link the identified risks or exceptions.' end,
  case when data_input->>'riskAssessment'='none_identified' and jsonb_array_length(data_input->'riskIds')>0 then 'Reconcile the risk assessment with its linked risks.' end
 ]::text[],null)
$$;
revoke all on function private.contract_review_request_blockers(jsonb) from public,anon,authenticated;

alter function private.read_project_contract_command(uuid) rename to read_project_contract_before_requests;
revoke all on function private.read_project_contract_before_requests(uuid) from public, anon, authenticated;
create function private.read_project_contract_command(project_state_input uuid) returns jsonb
 language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 result:=private.read_project_contract_before_requests(project_state_input);
 return result||jsonb_build_object('reviewRequestBlockers',to_jsonb(private.contract_review_request_blockers(result->'data')),'reviewRequests',(
  select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'version',v.version,'createdAt',r.created_at,
   'actorUserId',r.actor_user_id,'status',case when v.version=(result->>'version')::integer then 'pending' else 'superseded' end)
   order by v.version desc),'[]')
  from public.project_contract_review_requests r join public.project_contract_versions v on v.id=r.contract_version_id
  where r.project_state_id=project_state_input));
end $$;

create function private.request_project_contract_review_command(project_state_input uuid,version_input integer,request_id_input uuid)
 returns jsonb language plpgsql security definer set search_path='' as $$
declare p public.project_states; v public.project_contract_versions; previous public.project_contract_review_requests;
begin
 if auth.uid() is null then raise exception 'authentication_required'; end if;
 select * into p from public.project_states where id=project_state_input for update;
 if p.id is null or not public.is_workspace_member(p.workspace_id) then raise exception 'project_state_not_found_or_access_denied'; end if;
 if not public.has_app_permission(p.workspace_id,'project.setup.edit') then raise exception 'missing_setup_edit_permission'; end if;
 if request_id_input is null or version_input is null or version_input<1 then raise exception 'save_contract_before_request'; end if;
 select * into previous from public.project_contract_review_requests where project_state_id=p.id and request_id=request_id_input;
 if previous.id is not null then
  if previous.actor_user_id<>auth.uid() or not exists(select 1 from public.project_contract_versions c where c.id=previous.contract_version_id and c.version=version_input) then
   raise exception 'request_id_payload_mismatch';
  end if;
  return private.read_project_contract_command(p.id)||jsonb_build_object('submittedReviewId',previous.id,'submittedVersion',version_input);
 end if;
 if p.stage<>'project_authorization_setup' or p.status<>'active' or p.archived_at is not null then raise exception 'contract_edit_not_allowed'; end if;
 select * into v from public.project_contract_versions where project_state_id=p.id order by version desc limit 1;
 if v.id is null or v.version<>version_input then raise exception 'contract_version_conflict'; end if;
 if exists(select 1 from public.project_contract_review_requests where contract_version_id=v.id) then raise exception 'contract_review_already_requested'; end if;
 if cardinality(private.contract_review_request_blockers(v.data))>0 then raise exception 'incomplete_contract_review_basis'; end if;
 -- Submission sufficiency is distinct from authorized review, validity or risk acceptance.
 insert into public.project_contract_review_requests(project_state_id,contract_version_id,request_id,actor_user_id)
 values(p.id,v.id,request_id_input,auth.uid()) returning * into previous;
 insert into public.audit_events(project_state_id,event_type,actor_user_id,payload,occurred_at)
 values(p.id,'contract_review_requested',auth.uid(),jsonb_build_object('reviewRequestId',previous.id,'contractVersionId',v.id,'version',v.version,'requestId',request_id_input),now());
 return private.read_project_contract_command(p.id)||jsonb_build_object('submittedReviewId',previous.id,'submittedVersion',v.version);
end $$;
create function public.request_project_contract_review(project_state_input uuid,version_input integer,request_id_input uuid)
 returns jsonb language sql security invoker set search_path='' as $$
 select private.request_project_contract_review_command(project_state_input,version_input,request_id_input)
$$;
revoke all on function private.read_project_contract_command(uuid),private.request_project_contract_review_command(uuid,integer,uuid),public.request_project_contract_review(uuid,integer,uuid) from public,anon;
grant execute on function private.read_project_contract_command(uuid),private.request_project_contract_review_command(uuid,integer,uuid),public.request_project_contract_review(uuid,integer,uuid) to authenticated;
