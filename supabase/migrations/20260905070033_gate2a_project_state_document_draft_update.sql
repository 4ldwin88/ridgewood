create or replace function public.update_project_state_document_draft(target_revision_id uuid, source_data_input jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare actor uuid := auth.uid(); ws uuid; ps uuid;
begin
  if actor is null then raise exception 'unauthenticated'; end if;
  select d.workspace_id, d.project_state_id into ws, ps
  from public.document_revisions r
  join public.document_records d on d.id = r.document_record_id
  where r.id = target_revision_id and r.state = 'draft';
  if ws is null or ps is null then raise exception 'draft_not_found_or_not_editable'; end if;
  if not public.is_workspace_member(ws) then raise exception 'workspace_denied'; end if;
  if not public.has_app_permission(ws, 'document.create_draft') then raise exception 'permission_denied'; end if;
  update public.document_revisions set source_data = coalesce(source_data_input, '{}'::jsonb)
  where id = target_revision_id and state = 'draft';
  update public.document_records d set updated_at = now()
  from public.document_revisions r where r.id = target_revision_id and d.id = r.document_record_id;
  insert into public.audit_events(project_state_id,event_type,actor_user_id,payload)
  values(ps,'document_draft_updated',actor,jsonb_build_object('workspaceId',ws,'revisionId',target_revision_id));
  return target_revision_id;
end $$;

revoke all on function public.update_project_state_document_draft(uuid,jsonb) from public, anon;
grant execute on function public.update_project_state_document_draft(uuid,jsonb) to authenticated, service_role;
