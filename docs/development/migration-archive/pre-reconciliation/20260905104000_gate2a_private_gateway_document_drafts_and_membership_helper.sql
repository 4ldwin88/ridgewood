create or replace function private.is_workspace_member(target_workspace_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.workspace_memberships m where m.workspace_id=target_workspace_id and m.user_id=(select auth.uid()) and m.status='active');
$$;
revoke all on function private.is_workspace_member(uuid) from public, anon;
grant execute on function private.is_workspace_member(uuid) to authenticated, service_role;

create or replace function public.is_workspace_member(target_workspace_id uuid)
returns boolean language sql stable security invoker set search_path = '' as $$ select private.is_workspace_member(target_workspace_id); $$;
revoke all on function public.is_workspace_member(uuid) from public, anon;
grant execute on function public.is_workspace_member(uuid) to authenticated, service_role;

create or replace function private.create_project_state_document_draft_command(target_project_state_id uuid, package_key_input text, category_key_input text, document_type_input text, title_input text, initial_data jsonb default '{}'::jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); ws uuid; record_id uuid := gen_random_uuid(); revision_id uuid := gen_random_uuid();
begin
  if actor is null then raise exception 'unauthenticated'; end if;
  select workspace_id into ws from public.project_states where id=target_project_state_id;
  if ws is null then raise exception 'project_state_not_found'; end if;
  if not private.is_workspace_member(ws) then raise exception 'workspace_denied'; end if;
  if not public.has_app_permission(ws,'document.create_draft') then raise exception 'permission_denied'; end if;
  insert into public.document_records(id,project_state_id,package_key,category_key,document_type,title,sort_order,owner_user_id,created_at,updated_at,workspace_id) values(record_id,target_project_state_id,package_key_input,category_key_input,document_type_input,title_input,0,actor,pg_catalog.now(),pg_catalog.now(),ws);
  insert into public.document_revisions(id,document_record_id,revision_number,state,created_by,created_at,source_data) values(revision_id,record_id,1,'draft',actor,pg_catalog.now(),coalesce(initial_data,'{}'::jsonb));
  insert into public.audit_events(project_state_id,event_type,actor_user_id,payload) values(target_project_state_id,'document_draft_created',actor,jsonb_build_object('workspaceId',ws,'documentRecordId',record_id,'revisionId',revision_id));
  return revision_id;
end $$;
revoke all on function private.create_project_state_document_draft_command(uuid,text,text,text,text,jsonb) from public, anon;
grant execute on function private.create_project_state_document_draft_command(uuid,text,text,text,text,jsonb) to authenticated, service_role;

create or replace function public.create_project_state_document_draft(target_project_state_id uuid, package_key_input text, category_key_input text, document_type_input text, title_input text, initial_data jsonb default '{}'::jsonb)
returns uuid language sql security invoker set search_path = '' as $$ select private.create_project_state_document_draft_command(target_project_state_id,package_key_input,category_key_input,document_type_input,title_input,initial_data); $$;
revoke all on function public.create_project_state_document_draft(uuid,text,text,text,text,jsonb) from public, anon;
grant execute on function public.create_project_state_document_draft(uuid,text,text,text,text,jsonb) to authenticated, service_role;

create or replace function private.update_project_state_document_draft_command(target_revision_id uuid, source_data_input jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); ws uuid; ps uuid;
begin
  if actor is null then raise exception 'unauthenticated'; end if;
  select d.workspace_id,d.project_state_id into ws,ps from public.document_revisions r join public.document_records d on d.id=r.document_record_id where r.id=target_revision_id and r.state='draft';
  if ws is null or ps is null then raise exception 'draft_not_found_or_not_editable'; end if;
  if not private.is_workspace_member(ws) then raise exception 'workspace_denied'; end if;
  if not public.has_app_permission(ws,'document.create_draft') then raise exception 'permission_denied'; end if;
  update public.document_revisions set source_data=coalesce(source_data_input,'{}'::jsonb) where id=target_revision_id and state='draft';
  update public.document_records d set updated_at=pg_catalog.now() from public.document_revisions r where r.id=target_revision_id and d.id=r.document_record_id;
  insert into public.audit_events(project_state_id,event_type,actor_user_id,payload) values(ps,'document_draft_updated',actor,jsonb_build_object('workspaceId',ws,'revisionId',target_revision_id));
  return target_revision_id;
end $$;
revoke all on function private.update_project_state_document_draft_command(uuid,jsonb) from public, anon;
grant execute on function private.update_project_state_document_draft_command(uuid,jsonb) to authenticated, service_role;

create or replace function public.update_project_state_document_draft(target_revision_id uuid, source_data_input jsonb)
returns uuid language sql security invoker set search_path = '' as $$ select private.update_project_state_document_draft_command(target_revision_id,source_data_input); $$;
revoke all on function public.update_project_state_document_draft(uuid,jsonb) from public, anon;
grant execute on function public.update_project_state_document_draft(uuid,jsonb) to authenticated, service_role;
