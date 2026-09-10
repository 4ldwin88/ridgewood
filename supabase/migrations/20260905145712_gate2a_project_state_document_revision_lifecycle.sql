create or replace function private.project_state_document_field_diff(old_data jsonb, new_data jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select coalesce(jsonb_object_agg(k, jsonb_build_object('before', old_data -> k, 'after', new_data -> k)), '{}'::jsonb)
  from (
    select key as k from jsonb_object_keys(coalesce(old_data,'{}'::jsonb)) key
    union
    select key as k from jsonb_object_keys(coalesce(new_data,'{}'::jsonb)) key
  ) keys
  where (old_data -> k) is distinct from (new_data -> k);
$$;

create or replace function private.publish_project_state_document_revision_command(target_revision_id uuid, change_note_input text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  ws uuid;
  ps uuid;
  record_id uuid;
  rev_no integer;
  current_data jsonb;
  prior_id uuid;
  prior_data jsonb;
  note text;
  diff jsonb;
begin
  if actor is null then raise exception 'authentication_required'; end if;
  select d.workspace_id,d.project_state_id,d.id,r.revision_number,coalesce(r.source_data,'{}'::jsonb)
    into ws,ps,record_id,rev_no,current_data
  from public.document_revisions r
  join public.document_records d on d.id=r.document_record_id
  where r.id=target_revision_id and r.state='draft' and r.archived_at is null
  for update of r;
  if ws is null or ps is null then raise exception 'draft_not_found_or_not_publishable'; end if;
  if not public.is_workspace_member(ws) then raise exception 'workspace_access_denied'; end if;
  if not public.has_app_permission(ws,'document.publish') then raise exception 'missing_permission'; end if;
  if not exists(select 1 from public.project_states p where p.id=ps and p.workspace_id=ws and p.archived_at is null and p.status in ('active','held')) then raise exception 'project_state_not_publishable'; end if;

  select r.id,coalesce(r.published_source_snapshot,r.source_data,'{}'::jsonb)
    into prior_id,prior_data
  from public.document_revisions r
  where r.document_record_id=record_id and r.state='published' and r.archived_at is null
  order by r.revision_number desc limit 1
  for update;

  note := case when prior_id is null then 'Initial publication' else nullif(btrim(coalesce(change_note_input,'')),'') end;
  if prior_id is not null and note is null then raise exception 'change_note_required'; end if;
  diff := private.project_state_document_field_diff(coalesce(prior_data,'{}'::jsonb),current_data);

  if prior_id is not null then
    update public.document_revisions set state='superseded' where id=prior_id;
  end if;
  update public.document_revisions
    set state='published', published_by=actor, published_at=now(), published_source_snapshot=current_data,
        change_reason=note, supersedes_revision_id=coalesce(supersedes_revision_id,prior_id), based_on_revision_id=coalesce(based_on_revision_id,prior_id)
  where id=target_revision_id;
  update public.document_records set updated_at=now() where id=record_id;
  insert into public.audit_events(project_state_id,event_type,actor_user_id,payload)
    values(ps,'document_revision_published',actor,jsonb_build_object('workspaceId',ws,'documentRecordId',record_id,'revisionId',target_revision_id,'revisionNumber',rev_no,'changeNote',note,'fieldDiff',diff,'supersedesRevisionId',prior_id));
  return target_revision_id;
end;
$$;

create or replace function private.create_project_state_document_revision_command(target_published_revision_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid:=auth.uid(); ws uuid; ps uuid; record_id uuid; next_no int; snapshot jsonb; new_id uuid:=gen_random_uuid();
begin
  if actor is null then raise exception 'authentication_required'; end if;
  select d.workspace_id,d.project_state_id,d.id,coalesce(r.published_source_snapshot,r.source_data,'{}'::jsonb)
    into ws,ps,record_id,snapshot
  from public.document_revisions r join public.document_records d on d.id=r.document_record_id
  where r.id=target_published_revision_id and r.state in ('published','superseded') and r.archived_at is null;
  if ws is null or ps is null then raise exception 'published_revision_not_found'; end if;
  if not public.is_workspace_member(ws) then raise exception 'workspace_access_denied'; end if;
  if not public.has_app_permission(ws,'document.create_revision') then raise exception 'missing_permission'; end if;
  if exists(select 1 from public.document_revisions where document_record_id=record_id and state='draft' and archived_at is null) then raise exception 'revision_draft_already_exists'; end if;
  select coalesce(max(revision_number),0)+1 into next_no from public.document_revisions where document_record_id=record_id;
  insert into public.document_revisions(id,document_record_id,revision_number,state,supersedes_revision_id,based_on_revision_id,created_by,created_at,source_data)
    values(new_id,record_id,next_no,'draft',target_published_revision_id,target_published_revision_id,actor,now(),snapshot);
  update public.document_records set updated_at=now() where id=record_id;
  insert into public.audit_events(project_state_id,event_type,actor_user_id,payload)
    values(ps,'document_revision_draft_created',actor,jsonb_build_object('workspaceId',ws,'documentRecordId',record_id,'revisionId',new_id,'basedOnRevisionId',target_published_revision_id));
  return new_id;
end;
$$;

create or replace function private.discard_project_state_document_draft_command(target_revision_id uuid, reason_input text default 'Draft discarded')
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare actor uuid:=auth.uid(); ws uuid; ps uuid; record_id uuid;
begin
  if actor is null then raise exception 'authentication_required'; end if;
  select d.workspace_id,d.project_state_id,d.id into ws,ps,record_id
  from public.document_revisions r join public.document_records d on d.id=r.document_record_id
  where r.id=target_revision_id and r.state='draft' and r.archived_at is null for update of r;
  if ws is null or ps is null then raise exception 'draft_not_found_or_not_discardable'; end if;
  if not public.is_workspace_member(ws) then raise exception 'workspace_access_denied'; end if;
  if not (public.has_app_permission(ws,'document.create_draft') or public.has_app_permission(ws,'document.create_revision')) then raise exception 'missing_permission'; end if;
  update public.document_revisions set archived_at=now(),archive_reason=coalesce(nullif(btrim(reason_input),''),'Draft discarded') where id=target_revision_id;
  update public.document_records set updated_at=now() where id=record_id;
  insert into public.audit_events(project_state_id,event_type,actor_user_id,payload)
    values(ps,'document_draft_discarded',actor,jsonb_build_object('workspaceId',ws,'documentRecordId',record_id,'revisionId',target_revision_id,'reason',coalesce(nullif(btrim(reason_input),''),'Draft discarded')));
  return target_revision_id;
end;
$$;

create or replace function public.publish_project_state_document_revision(target_revision_id uuid, change_note_input text default null)
returns uuid language sql security invoker set search_path='' as $$ select private.publish_project_state_document_revision_command(target_revision_id,change_note_input); $$;
create or replace function public.create_project_state_document_revision(target_published_revision_id uuid)
returns uuid language sql security invoker set search_path='' as $$ select private.create_project_state_document_revision_command(target_published_revision_id); $$;
create or replace function public.discard_project_state_document_draft(target_revision_id uuid, reason_input text default 'Draft discarded')
returns uuid language sql security invoker set search_path='' as $$ select private.discard_project_state_document_draft_command(target_revision_id,reason_input); $$;

revoke execute on function private.publish_project_state_document_revision_command(uuid,text) from public,anon,authenticated;
revoke execute on function private.create_project_state_document_revision_command(uuid) from public,anon,authenticated;
revoke execute on function private.discard_project_state_document_draft_command(uuid,text) from public,anon,authenticated;
revoke execute on function private.project_state_document_field_diff(jsonb,jsonb) from public,anon,authenticated;
grant usage on schema private to authenticated;
grant execute on function private.publish_project_state_document_revision_command(uuid,text) to authenticated;
grant execute on function private.create_project_state_document_revision_command(uuid) to authenticated;
grant execute on function private.discard_project_state_document_draft_command(uuid,text) to authenticated;
grant execute on function private.project_state_document_field_diff(jsonb,jsonb) to authenticated;
revoke execute on function public.publish_project_state_document_revision(uuid,text) from public,anon;
revoke execute on function public.create_project_state_document_revision(uuid) from public,anon;
revoke execute on function public.discard_project_state_document_draft(uuid,text) from public,anon;
grant execute on function public.publish_project_state_document_revision(uuid,text) to authenticated;
grant execute on function public.create_project_state_document_revision(uuid) to authenticated;
grant execute on function public.discard_project_state_document_draft(uuid,text) to authenticated;
