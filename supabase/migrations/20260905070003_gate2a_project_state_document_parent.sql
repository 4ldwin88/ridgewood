alter table public.document_records
  alter column project_state_id set not null;

alter table public.document_records
  add constraint document_records_project_state_fk
  foreign key (project_state_id) references public.project_states(id) on delete cascade;

create index if not exists document_records_project_state_idx
  on public.document_records(project_state_id, package_key, category_key, sort_order);

create or replace function public.create_project_state_document_draft(
  target_project_state_id uuid,
  package_key_input text,
  category_key_input text,
  document_type_input text,
  title_input text,
  initial_data jsonb default '{}'::jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  ws uuid;
  record_id uuid := gen_random_uuid();
  revision_id uuid := gen_random_uuid();
begin
  if actor is null then raise exception 'unauthenticated'; end if;
  select workspace_id into ws from public.project_states where id = target_project_state_id;
  if ws is null then raise exception 'project_state_not_found'; end if;
  if not public.is_workspace_member(ws) then raise exception 'workspace_denied'; end if;
  if not public.has_app_permission(ws, 'document.create_draft') then raise exception 'permission_denied'; end if;

  insert into public.document_records(
    id, project_state_id, package_key, category_key, document_type, title,
    sort_order, owner_user_id, created_at, updated_at, workspace_id
  ) values (
    record_id, target_project_state_id, package_key_input, category_key_input,
    document_type_input, title_input, 0, actor, now(), now(), ws
  );

  insert into public.document_revisions(
    id, document_record_id, revision_number, state, created_by, created_at, source_data
  ) values (
    revision_id, record_id, 1, 'draft', actor, now(), coalesce(initial_data, '{}'::jsonb)
  );

  insert into public.audit_events(project_state_id, event_type, actor_user_id, payload)
  values (target_project_state_id, 'document_draft_created', actor,
    jsonb_build_object('workspaceId', ws, 'documentRecordId', record_id, 'revisionId', revision_id));

  return revision_id;
end $$;

revoke all on function public.create_project_state_document_draft(uuid,text,text,text,text,jsonb) from public, anon;
grant execute on function public.create_project_state_document_draft(uuid,text,text,text,text,jsonb) to authenticated, service_role;
